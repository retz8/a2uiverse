import type {ProviderOptions} from '@ai-sdk/provider-utils';
import {createA2uiValidator, type A2uiCatalogSchema, type A2uiValidator} from '@a2uiverse/sdk';
import {generateText, type LanguageModel} from 'ai';
import {extractTaggedBlock} from '../authoring/taggedBlock.js';
import {isDecline, type Synthesis, type SynthesizeDataModel} from './document.js';
import {
  buildSynthesisTurn,
  SYNTHESIS_TAG,
  type ChangeAccount,
  type SynthesisSource,
} from './prompt.js';
import {validateSynthesis, type SynthesisChecks} from './validate.js';

export type {SynthesisSource};

/** One call of the turn's second model (SPEC §5 ◆ #2): the input as the runtime knows it. */
export interface SynthesisInput {
  utterance: string;
  /** The Planner's request on the synthesis slot: its brief to the merge. */
  request: string;
  sources: readonly SynthesisSource[];
  /** The live document, on a re-synthesis (task-5.4 decision 6). */
  previous?: Synthesis;
  changes?: ChangeAccount;
}

/** What went to the model and what it answered. */
export interface SynthesisCall {
  system: string;
  prompt: string;
  input: SynthesisInput;
}

/** The text seam: one call, the raw text back. The AI SDK model behind it, or a fake. */
export interface SynthesisModel {
  generate(call: SynthesisCall): Promise<string>;
}

/** One attempt as journaled: the raw text the model returned and why it was refused, if it was. */
export interface SynthesisAttempt {
  text: string;
  errors: string[];
}

export type SynthesisOutcome =
  | {kind: 'synthesized'; document: Synthesis; attempts: SynthesisAttempt[]}
  | {kind: 'declined'; reason: string; attempts: SynthesisAttempt[]}
  | {kind: 'malformed'; attempts: SynthesisAttempt[]};

/** The number of model calls a synthesis may spend: one, and one retry (task-5.4 decision 4). */
export const MAX_ATTEMPTS = 2;

/**
 * The Synthesizer (SPEC §10): text out, validated after. The model writes one tagged block;
 * the block is extracted, parsed, and validated — the output schema, the tree against the
 * Synthesizer's pruned catalog, the derived-value rule, operators, and refs into the partitions;
 * a failure goes back to the model once with its findings and the failed document, and a second
 * failure is `malformed`. Emits wiring, never values.
 */
export class Synthesizer {
  readonly #model: SynthesisModel;
  readonly #system: string;
  readonly #tree: A2uiValidator;
  readonly #operators: readonly string[];

  constructor(options: {
    model: SynthesisModel;
    systemPrompt: string;
    /** The shell catalog pruned to the synthesis surface's keep-set: the one the prompt shows. */
    catalog: A2uiCatalogSchema;
  }) {
    this.#model = options.model;
    this.#system = options.systemPrompt;
    this.#tree = createA2uiValidator({catalog: options.catalog});
    this.#operators = Object.keys(options.catalog.functions ?? {});
  }

  async synthesize(
    input: SynthesisInput,
    partitions: SynthesisChecks['partitions'],
  ): Promise<SynthesisOutcome> {
    const attempts: SynthesisAttempt[] = [];
    let previous: unknown = input.previous;
    let errors: string[] | undefined;
    for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
      const prompt = buildSynthesisTurn({
        utterance: input.utterance,
        request: input.request,
        sources: input.sources,
        previous,
        ...(errors ? {errors} : {}),
        ...(input.changes && !errors ? {changes: input.changes} : {}),
      });
      const text = await this.#model.generate({system: this.#system, prompt, input});
      const result = this.#accept(text, partitions);
      attempts.push({text, errors: result.errors});
      if (result.ok) {
        const {document} = result;
        return isDecline(document)
          ? {kind: 'declined', reason: document.reason, attempts}
          : {kind: 'synthesized', document, attempts};
      }
      previous = result.document ?? text;
      errors = result.errors;
    }
    return {kind: 'malformed', attempts};
  }

  #accept(
    text: string,
    partitions: SynthesisChecks['partitions'],
  ):
    | {ok: true; document: SynthesizeDataModel; errors: string[]}
    | {ok: false; document?: unknown; errors: string[]} {
    const block = extractTaggedBlock(text, SYNTHESIS_TAG);
    if (!block.ok) return {ok: false, errors: [block.error]};
    let parsed: unknown;
    try {
      parsed = JSON.parse(block.body);
    } catch (err) {
      return {
        ok: false,
        document: block.body,
        errors: [
          `the block is not valid JSON: ${err instanceof Error ? err.message : String(err)}`,
        ],
      };
    }
    const validation = validateSynthesis(parsed, {
      tree: this.#tree,
      operators: this.#operators,
      partitions,
    });
    if (!validation.ok) return {ok: false, document: parsed, errors: validation.errors};
    return {ok: true, document: validation.document, errors: []};
  }
}

/** The AI SDK behind the text seam; effort via provider options as the Planner. */
export class AiSdkSynthesisModel implements SynthesisModel {
  #model: LanguageModel;
  #providerOptions: ProviderOptions | undefined;

  constructor(options: {model: LanguageModel; providerOptions?: ProviderOptions}) {
    this.#model = options.model;
    this.#providerOptions = options.providerOptions;
  }

  async generate(call: SynthesisCall): Promise<string> {
    const result = await generateText({
      model: this.#model,
      system: call.system,
      prompt: call.prompt,
      ...(this.#providerOptions ? {providerOptions: this.#providerOptions} : {}),
    });
    return result.text;
  }
}
