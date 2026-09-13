import type {ProviderOptions} from '@ai-sdk/provider-utils';
import {createA2uiValidator, type A2uiCatalogSchema, type A2uiValidator} from '@a2uiverse/sdk';
import {generateText, stepCountIs, type LanguageModel, type ModelMessage} from 'ai';
import {extractTaggedBlock} from '../authoring/taggedBlock.js';
import type {ToolCallRecord} from '../journal/types.js';
import type {ShortlistEntry} from '../router/router.js';
import type {LayoutSurface} from './document.js';
import {buildPlannerTurn, buildRetryTurn, LAYOUT_SURFACE_TAG} from './prompt.js';
import {readerTools, type PlatformReaders} from './readers.js';
import {validateLayoutSurface} from './validate.js';

export interface PlanInput {
  utterance: string;
  shortlist: readonly ShortlistEntry[];
  /** The client conversation — what the this-canvas and recent-turns readers are bound to. */
  conversationId: string;
}

/** One attempt as journaled: the raw text the model returned and why it was refused, if it was. */
export interface PlanAttempt {
  text: string;
  errors: string[];
}

export type PlanOutcome =
  | {kind: 'planned'; document: LayoutSurface; attempts: PlanAttempt[]; toolCalls: ToolCallRecord[]}
  | {kind: 'malformed'; attempts: PlanAttempt[]; toolCalls: ToolCallRecord[]};

/** The phase's one model call (SPEC §5 ◆ Planner). A malformed outcome is a broken turn. */
export interface Planner {
  plan(input: PlanInput): Promise<PlanOutcome>;
}

/** The number of model calls a plan may spend: one, and one retry (task-6.4 decision 6). */
export const MAX_ATTEMPTS = 2;
/** Steps per attempt: the three readers and the answer (task-6.4 decision 5). */
export const MAX_STEPS = 4;

/**
 * The Planner (SPEC §5.6, task-6.4): text out, validated after, the Synthesizer's loop with the
 * readers as tools inside the one call. The model writes one tagged block; the block is extracted,
 * parsed and validated — the output schema, the tree against the Planner's pruned catalog, slot
 * accounting, the painter-owned props, the literal-only data model. A failure goes back to the
 * model once, in the same conversation — its failed answer and the reader results in place, the
 * findings appended — and a second failure is `malformed`. Each attempt has a four-step budget;
 * running out of it without a block is a failed attempt like any other.
 */
export class ModelPlanner implements Planner {
  readonly #model: LanguageModel;
  readonly #providerOptions: ProviderOptions | undefined;
  readonly #system: string;
  readonly #tree: A2uiValidator;
  readonly #readers: PlatformReaders;

  constructor(options: {
    model: LanguageModel;
    providerOptions?: ProviderOptions;
    systemPrompt: string;
    /** The shell catalog pruned to the layout surface's keep-set: the one the prompt shows. */
    catalog: A2uiCatalogSchema;
    readers: PlatformReaders;
  }) {
    this.#model = options.model;
    this.#providerOptions = options.providerOptions;
    this.#system = options.systemPrompt;
    this.#tree = createA2uiValidator({catalog: options.catalog});
    this.#readers = options.readers;
  }

  async plan(input: PlanInput): Promise<PlanOutcome> {
    const shortlist = input.shortlist.map(entry => entry.record.id);
    const tools = readerTools(this.#readers, input.conversationId);
    const attempts: PlanAttempt[] = [];
    const toolCalls: ToolCallRecord[] = [];
    let messages: ModelMessage[] = [{role: 'user', content: buildPlannerTurn(input)}];
    for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
      const result = await generateText({
        model: this.#model,
        system: this.#system,
        messages,
        tools,
        stopWhen: stepCountIs(MAX_STEPS),
        ...(this.#providerOptions ? {providerOptions: this.#providerOptions} : {}),
      });
      // Every step's messages — each reader call and its result, then the answer — stay in the
      // conversation the retry continues (task-6.4 decision 6); the result's own `response`
      // carries only the last step's.
      for (const step of result.steps) {
        for (const call of step.toolResults) {
          toolCalls.push({name: call.toolName, args: call.input, result: call.output});
        }
        messages = [...messages, ...step.response.messages];
      }
      const accepted = this.#accept(result.text, shortlist);
      attempts.push({text: result.text, errors: accepted.errors});
      if (accepted.ok) return {kind: 'planned', document: accepted.document, attempts, toolCalls};
      messages.push({role: 'user', content: buildRetryTurn(accepted.errors)});
    }
    return {kind: 'malformed', attempts, toolCalls};
  }

  #accept(
    text: string,
    shortlist: readonly string[],
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
    const validation = validateLayoutSurface(parsed, {tree: this.#tree, shortlist});
    if (!validation.ok) return {ok: false, errors: validation.errors};
    return {ok: true, document: validation.document, errors: []};
  }
}
