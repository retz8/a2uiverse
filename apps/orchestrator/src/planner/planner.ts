import {
  createA2uiValidator,
  type A2uiCatalogSchema,
  type A2uiComponent,
  type A2uiValidator,
} from '@a2uiverse/sdk';
import {stepCountIs, streamText, type LanguageModel, type ModelMessage} from 'ai';
import type {Effort, Reasoning} from '../model/getModel.js';
import {
  AttemptMeasurement,
  wholeMs,
  type ModelRequestRecord,
  type RequestClock,
} from '../model/requests.js';
import {TaggedBlockReader, type BlockPiece} from '../authoring/blockReader.js';
import {extractTaggedBlock} from '../authoring/taggedBlock.js';
import type {ToolCallRecord} from '../journal/types.js';
import type {ShortlistEntry} from '../router/router.js';
import type {DispatchEntry, LayoutSurface} from './document.js';
import {planKey, type PlanCache, type PlanCacheMark} from './planCache.js';
import {buildPlannerTurn, buildRetryTurn, LAYOUT_SURFACE_TAG, type SourcesOf} from './prompt.js';
import {readerTools, type PlatformReaders} from './readers.js';
import {searchesOf, type StoreSearch} from './storeSearch.js';
import {
  validateComponent,
  validateDataModel,
  validateDispatchList,
  validateLayoutSurface,
  type LayoutChecks,
} from './validate.js';

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
  /**
   * The plan followed as the model writes it (task 17.9): the turn told the moment the dispatch
   * list is committed, and each piece of the layout as it passes its own check. None, and nothing
   * is committed before the plan returns, every retry the whole answer.
   */
  stream?: PlanStream;
}

/** The dispatch list committed, as the turn is told it (task-17.9 decision 1). */
export interface CommittedPlan {
  /** The list as written, its accounts resolved: it stands for the rest of the plan. */
  dispatch: DispatchEntry[];
  /** The title, when it was written before the list. */
  title?: string;
  /** This plan's tool calls so far: the searches a gap's offer is drawn from. */
  toolCalls: ToolCallRecord[];
}

/** A piece of the layout as written, passing its own check (task-17.9 decisions 3, 6). */
export type LayoutPiece = {dataModel: Record<string, unknown>} | {component: A2uiComponent};

/** What the turn is told as the plan is written (task 17.9). */
export interface PlanStream {
  /** The dispatch list committed: its sources may be dispatched now. Told once. */
  committed(plan: CommittedPlan): void;
  /**
   * A piece of the layout, in the order written: only in the attempt that committed the list, a
   * piece written before the list told right after it, and none past the first that fails.
   */
  piece(piece: LayoutPiece): void;
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
 *
 * The answer is streamed and followed as it is written (task 17.9) when the turn asks: the
 * dispatch list committed the moment it passes its own checks, each piece of the layout told as it
 * passes its own. Once the list is committed it stands — the whole answer is checked against it,
 * a failure retried on the layout, the data model and the title alone, the list that retry writes
 * ignored, nothing of it told (decisions 2, 7).
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
    /** The list once committed (task-17.9 decision 1): the plan's from then on. */
    let committed: DispatchEntry[] | undefined;
    for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
      // Each step measured as it ends, from the SDK's own step result (task-17.5 decision 2).
      const measurement = new AttemptMeasurement('Planner', attempt + 1, input.clock);
      /** This attempt's tool calls as their results arrive, before its steps are read whole. */
      const arrived: ToolCallRecord[] = [];
      const checks = (): LayoutChecks => ({
        tree: this.#tree,
        shortlist,
        installed: this.#readers.installedApps().map(app => app.id),
        searches: searchesOf([...toolCalls, ...arrived]),
      });
      // An attempt before the commit is followed as it is written; one after it writes the layout
      // alone, drawn whole once checked (task-17.9 decision 7).
      const follower =
        input.stream && committed === undefined
          ? new AnswerFollower(input.stream, checks, dispatch => {
              committed = dispatch;
              return [...toolCalls, ...arrived];
            })
          : undefined;
      const result = streamText({
        model: this.#model,
        system: this.#system,
        messages,
        tools,
        stopWhen: stepCountIs(MAX_STEPS),
        ...(this.#reasoning ? {reasoning: this.#reasoning} : {}),
        ...(input.signal ? {abortSignal: input.signal} : {}),
        onStepEnd: step => measurement.take(step),
        // A failed request is read off the stream below.
        onError: () => {},
      });
      let failed: {error: unknown} | undefined;
      for await (const part of result.fullStream) {
        switch (part.type) {
          // The answer is the last step's text: a step begins it afresh.
          case 'start-step':
            follower?.restart();
            break;
          case 'text-delta':
            follower?.read(part.text);
            break;
          case 'tool-result':
            arrived.push({name: part.toolName, args: part.input, result: part.output});
            break;
          case 'error':
            failed ??= {error: part.error};
            break;
        }
      }
      input.signal?.throwIfAborted();
      if (failed) {
        measurement.failed(failed.error);
        throw failed.error;
      }
      requests.push(...measurement.records);
      const steps = await result.steps;
      // Every step's messages — each reader call and its result, then the answer — stay in the
      // conversation the retry continues (task-6.4 decision 6); the result's own `response`
      // carries only the last step's.
      for (const step of steps) {
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
      const text = await result.text;
      const accepted = this.#accept(text, shortlist, toolCalls, committed);
      attempts.push({text, errors: accepted.errors});
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
      messages.push({
        role: 'user',
        content: buildRetryTurn(accepted.errors, {listSent: committed !== undefined}),
      });
    }
    return {kind: 'malformed', attempts, toolCalls, ...measured()};
  }

  /** The answer checked whole; once the list is committed, against it (task-17.9 decision 2). */
  #accept(
    text: string,
    shortlist: readonly string[],
    toolCalls: readonly ToolCallRecord[],
    committed?: DispatchEntry[],
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
    if (committed !== undefined && isRecord(parsed)) parsed = {...parsed, dispatch: committed};
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

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

/** The tree's components, whose elements are read one by one. */
const COMPONENTS = ['tree', 'components'] as const;

/**
 * One attempt's answer followed as it is written (task 17.9): the dispatch list committed the
 * moment it passes its own checks, then each piece of the layout told as it passes its own — a
 * piece written before the list told right after it (decision 4) — and nothing past the first
 * piece that fails (decision 6). The whole answer is still read and checked at its end.
 */
class AnswerFollower {
  readonly #stream: PlanStream;
  readonly #checks: () => LayoutChecks;
  /** Records the commit on the plan; answers this plan's tool calls so far. */
  readonly #commit: (dispatch: DispatchEntry[]) => ToolCallRecord[];
  #reader = newReader();
  #title: string | undefined;
  /** The layout's pieces written before the list. */
  #waiting: BlockPiece[] = [];
  #dispatch: DispatchEntry[] | undefined;
  /** The components told, in order: what each next one is checked beside. */
  readonly #told: A2uiComponent[] = [];
  #telling = true;

  constructor(
    stream: PlanStream,
    checks: () => LayoutChecks,
    commit: (dispatch: DispatchEntry[]) => ToolCallRecord[],
  ) {
    this.#stream = stream;
    this.#checks = checks;
    this.#commit = commit;
  }

  /** A step begins: what an earlier step wrote is not the answer. */
  restart(): void {
    this.#reader = newReader();
    this.#title = undefined;
    this.#waiting = [];
  }

  read(text: string): void {
    for (const piece of this.#reader.push(text)) this.#take(piece);
  }

  #take(piece: BlockPiece): void {
    if (piece.kind === 'element') return this.#layout(piece);
    switch (piece.key) {
      case 'title':
        if (typeof piece.value === 'string' && piece.value.trim() !== '') this.#title = piece.value;
        return;
      case 'dispatch':
        return this.#committed(piece.value);
      case 'dataModel':
        return this.#layout(piece);
    }
  }

  #committed(list: unknown): void {
    if (this.#dispatch !== undefined) return;
    const checked = validateDispatchList(list, this.#checks());
    if (!checked.ok) return;
    this.#dispatch = checked.dispatch;
    const toolCalls = this.#commit(checked.dispatch);
    this.#stream.committed({
      dispatch: checked.dispatch,
      ...(this.#title !== undefined ? {title: this.#title} : {}),
      toolCalls,
    });
    const waiting = this.#waiting;
    this.#waiting = [];
    for (const piece of waiting) this.#layout(piece);
  }

  #layout(piece: BlockPiece): void {
    if (this.#dispatch === undefined) {
      this.#waiting.push(piece);
      return;
    }
    if (!this.#telling) return;
    if (piece.kind === 'member') {
      if (!validateDataModel(piece.value)) {
        this.#telling = false;
        return;
      }
      this.#stream.piece({dataModel: piece.value});
      return;
    }
    const checked = validateComponent(piece.value, {
      ...this.#checks(),
      dispatch: this.#dispatch,
      before: this.#told,
    });
    if (!checked.ok) {
      this.#telling = false;
      return;
    }
    this.#told.push(checked.component);
    this.#stream.piece({component: checked.component});
  }
}

function newReader(): TaggedBlockReader {
  return new TaggedBlockReader(LAYOUT_SURFACE_TAG, {elements: [COMPONENTS]});
}
