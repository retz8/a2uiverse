import {createA2uiValidator, type A2uiCatalogSchema, type A2uiValidator} from '@a2uiverse/sdk';
import {generateText, stepCountIs, type LanguageModel, type ModelMessage} from 'ai';
import type {Effort, Reasoning} from '../model/getModel.js';
import {
  AttemptMeasurement,
  wholeMs,
  type ModelRequestRecord,
  type RequestClock,
} from '../model/requests.js';
import {extractTaggedBlock} from '../authoring/taggedBlock.js';
import type {ToolCallRecord} from '../journal/types.js';
import type {ShortlistEntry} from '../router/router.js';
import type {LayoutSurface} from './document.js';
import {planKey, type PlanCache, type PlanCacheMark} from './planCache.js';
import {buildPlannerTurn, buildRetryTurn, LAYOUT_SURFACE_TAG, type SourcesOf} from './prompt.js';
import {readerTools, type PlatformReaders} from './readers.js';
import {searchesOf, type StoreSearch} from './storeSearch.js';
import {validateLayoutSurface} from './validate.js';

export interface PlanInput {
  utterance: string;
  shortlist: readonly ShortlistEntry[];
  /**
   * The composition the question was asked from (task-9.3 decision 2) — what the `this_canvas` and
   * recent-turns readers are bound to; none on a root composition.
   */
  askedFrom?: string;
  /** Aborts the call when the composition is closed while it plans (task-9.3 decision 5). */
  signal?: AbortSignal;
  /** The turn's clock its requests are placed on, and the task their lines name (task 17.5). */
  clock?: RequestClock;
}

/** One attempt as journaled: the raw text the model returned and why it was refused, if it was. */
export interface PlanAttempt {
  text: string;
  errors: string[];
}

/** What the plan's model requests cost (task 17.5): absent from a Planner that makes none. */
export interface PlanMeasure {
  effort?: Effort;
  requests?: ModelRequestRecord[];
}

export type PlanOutcome = PlanMeasure &
  (
    | {
        kind: 'planned';
        document: LayoutSurface;
        attempts: PlanAttempt[];
        toolCalls: ToolCallRecord[];
        /** The plan cache's mark (task-17.6 decisions 7, 11): absent when it is off or a tool was called. */
        cache?: PlanCacheMark;
      }
    | {kind: 'malformed'; attempts: PlanAttempt[]; toolCalls: ToolCallRecord[]}
  );

/** The phase's one model call (SPEC §5 ◆ Planner). A malformed outcome is a broken turn. */
export interface Planner {
  plan(input: PlanInput): Promise<PlanOutcome>;
}

/** The number of model calls a plan may spend: one, and one retry (task-6.4 decision 6). */
export const MAX_ATTEMPTS = 2;
/** Steps per attempt: one per tool — the three readers and the search — and the answer (task-15.4 decision 5). */
export const MAX_STEPS = 5;

/**
 * The Planner (SPEC §5.6, task-6.4): text out, validated after, the Synthesizer's loop with the
 * readers as tools inside the one call. The model writes one tagged block; the block is extracted,
 * parsed and validated — the output schema, the tree against the Planner's pruned catalog, slot
 * accounting, the painter-owned props, the literal-only data model. A failure goes back to the
 * model once, in the same conversation — its failed answer and the reader results in place, the
 * findings appended — and a second failure is `malformed`. Each attempt has a five-step budget;
 * running out of it without a block is a failed attempt like any other. Beside the readers, the
 * marketplace's search when it is wired (task-15.4 decision 1); a gap is checked against this
 * plan's searches, both attempts' (decision 3). With the plan cache, the very same request is
 * answered from it, re-checked by the validator, and no model is called (task-17.6 decision 7).
 */
export class ModelPlanner implements Planner {
  readonly #model: LanguageModel;
  readonly #reasoning: Reasoning | undefined;
  readonly #effort: Effort | undefined;
  readonly #system: string;
  readonly #tree: A2uiValidator;
  readonly #readers: PlatformReaders;
  readonly #sourcesOf: SourcesOf;
  readonly #store: StoreSearch | undefined;
  readonly #cache: PlanCache | undefined;

  constructor(options: {
    model: LanguageModel;
    /** The effort tier's word (task-17.2 decision 4); none, and the provider does what it does. */
    reasoning?: Reasoning;
    /** The effort tier itself, stamped on the plan's record (task-17.5 decision 3). */
    effort?: Effort;
    systemPrompt: string;
    /** The shell catalog pruned to the layout surface's keep-set: the one the prompt shows. */
    catalog: A2uiCatalogSchema;
    readers: PlatformReaders;
    /**
     * Each shortlisted app's sources with their labels (task-12.4 decision 2, task-12.6 decision
     * 1); the bare app id alone when omitted.
     */
    sourcesOf?: SourcesOf;
    /** The marketplace's search (task-15.4 decision 1); none, and the Planner cannot search. */
    store?: StoreSearch;
    /** The plan cache (task-17.6 decision 10); none, and every plan is the model's. */
    cache?: PlanCache;
  }) {
    this.#model = options.model;
    this.#reasoning = options.reasoning;
    this.#effort = options.effort;
    this.#system = options.systemPrompt;
    this.#tree = createA2uiValidator({catalog: options.catalog});
    this.#readers = options.readers;
    this.#sourcesOf = options.sourcesOf ?? (appId => [{source: appId}]);
    this.#store = options.store;
    this.#cache = options.cache;
  }

  async plan(input: PlanInput): Promise<PlanOutcome> {
    const shortlist = input.shortlist.flatMap(entry =>
      this.#sourcesOf(entry.record.id).map(({source}) => source),
    );
    const tools = readerTools(this.#readers, input.askedFrom, this.#store);
    const attempts: PlanAttempt[] = [];
    const toolCalls: ToolCallRecord[] = [];
    const requests: ModelRequestRecord[] = [];
    const measured = (): PlanMeasure => ({
      ...(this.#effort ? {effort: this.#effort} : {}),
      requests,
    });
    const turn = buildPlannerTurn(input, this.#sourcesOf);
    const key =
      this.#cache !== undefined
        ? await planKey({
            model: this.#model,
            ...(this.#reasoning ? {reasoning: this.#reasoning} : {}),
            system: this.#system,
            tools,
            turn,
          })
        : undefined;
    if (key !== undefined) {
      const text = this.#cache?.get(key);
      if (text !== undefined) {
        const accepted = this.#accept(text, shortlist, []);
        if (accepted.ok) {
          return {
            kind: 'planned',
            document: accepted.document,
            attempts: [{text, errors: []}],
            toolCalls: [],
            cache: {key, hit: true},
          };
        }
        this.#cache?.evict(key, `refused on reuse: ${accepted.errors.join('; ')}`);
      }
    }
    let messages: ModelMessage[] = [{role: 'user', content: turn}];
    for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
      // Each step measured as it ends, from the SDK's own step result (task-17.5 decision 2).
      const measurement = new AttemptMeasurement('Planner', attempt + 1, input.clock);
      let result;
      try {
        result = await generateText({
          model: this.#model,
          system: this.#system,
          messages,
          tools,
          stopWhen: stepCountIs(MAX_STEPS),
          ...(this.#reasoning ? {reasoning: this.#reasoning} : {}),
          ...(input.signal ? {abortSignal: input.signal} : {}),
          onStepEnd: step => measurement.take(step),
        });
      } catch (err) {
        if (!input.signal?.aborted) measurement.failed(err);
        throw err;
      }
      requests.push(...measurement.records);
      // Every step's messages — each reader call and its result, then the answer — stay in the
      // conversation the retry continues (task-6.4 decision 6); the result's own `response`
      // carries only the last step's.
      for (const step of result.steps) {
        const executed = step.performance?.toolExecutionMs ?? {};
        for (const call of step.toolResults) {
          const ms = wholeMs(executed[call.toolCallId]);
          toolCalls.push({
            name: call.toolName,
            args: call.input,
            result: call.output,
            ...(ms !== undefined ? {ms} : {}),
          });
        }
        messages = [...messages, ...step.response.messages];
      }
      const accepted = this.#accept(result.text, shortlist, toolCalls);
      attempts.push({text: result.text, errors: accepted.errors});
      if (accepted.ok) {
        // Only a plan that called no tool is kept: a reader's or the Store's answer is the moment's.
        const cache = key !== undefined && toolCalls.length === 0 ? {cache: {key}} : {};
        return {
          kind: 'planned',
          document: accepted.document,
          attempts,
          toolCalls,
          ...cache,
          ...measured(),
        };
      }
      messages.push({role: 'user', content: buildRetryTurn(accepted.errors)});
    }
    return {kind: 'malformed', attempts, toolCalls, ...measured()};
  }

  #accept(
    text: string,
    shortlist: readonly string[],
    toolCalls: readonly ToolCallRecord[],
  ): {ok: true; document: LayoutSurface; errors: string[]} | {ok: false; errors: string[]} {
    const block = extractTaggedBlock(text, LAYOUT_SURFACE_TAG);
    if (!block.ok) return {ok: false, errors: [block.error]};
    let parsed: unknown;
    try {
      parsed = JSON.parse(block.body);
    } catch (err) {
      return {
        ok: false,
        errors: [
          `the block is not valid JSON: ${err instanceof Error ? err.message : String(err)}`,
        ],
      };
    }
    const installed = this.#readers.installedApps().map(app => app.id);
    const validation = validateLayoutSurface(parsed, {
      tree: this.#tree,
      shortlist,
      installed,
      searches: searchesOf(toolCalls),
    });
    if (!validation.ok) return {ok: false, errors: validation.errors};
    return {ok: true, document: validation.document, errors: []};
  }
}
