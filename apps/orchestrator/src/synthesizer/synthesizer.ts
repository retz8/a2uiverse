import type {ProviderOptions} from '@ai-sdk/provider-utils';
import {
  buildSynthesisTurn,
  extractSynthesisBlock,
  isDecline,
  validateSynthesizeDataModel,
  type ChangeAccount,
  type Synthesis,
  type SynthesisSource,
} from '@a2uiverse/sdk';
import {generateText, type LanguageModel} from 'ai';
import {checkSynthesis, type SynthesisChecks} from './checkSynthesis.js';

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
 * the block is extracted, parsed, validated by the sdk against the contract, then checked
 * against the shell catalog and the partitions; a failure goes back to the model once with its
 * findings and the failed document, and a second failure is `malformed`. Emits wiring, never
 * values; never sees generations.
 */
export class Synthesizer {
  readonly #model: SynthesisModel;
  readonly #system: string;
  readonly #catalog: SynthesisChecks['catalog'];
  readonly #operators: readonly string[];

  constructor(options: {
    model: SynthesisModel;
    systemPrompt: string;
    catalog: SynthesisChecks['catalog'];
    operators: readonly string[];
  }) {
    this.#model = options.model;
    this.#system = options.systemPrompt;
    this.#catalog = options.catalog;
    this.#operators = options.operators;
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
    | {ok: true; document: Synthesis | {declined: true; reason: string}; errors: string[]}
    | {ok: false; document?: unknown; errors: string[]} {
    const block = extractSynthesisBlock(text);
    if (!block.ok) return {ok: false, errors: [block.error]};
    let parsed: unknown;
    try {
      parsed = JSON.parse(block.json);
    } catch (err) {
      return {
        ok: false,
        document: block.json,
        errors: [
          `the block is not valid JSON: ${err instanceof Error ? err.message : String(err)}`,
        ],
      };
    }
    const validation = validateSynthesizeDataModel(parsed);
    if (!validation.ok) return {ok: false, document: parsed, errors: validation.errors};
    if (isDecline(validation.value)) return {ok: true, document: validation.value, errors: []};
    const errors = checkSynthesis(validation.value, {
      catalog: this.#catalog,
      operators: this.#operators,
      partitions,
    });
    if (errors.length > 0) return {ok: false, document: parsed, errors};
    return {ok: true, document: validation.value, errors: []};
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
