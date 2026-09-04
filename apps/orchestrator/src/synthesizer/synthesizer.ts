import type {ProviderOptions} from '@ai-sdk/provider-utils';
import {SYNTHESIZER_OUTPUT_SCHEMA, type SynthesizerOutput} from '@a2uiverse/sdk';
import {generateText, jsonSchema, Output, type LanguageModel} from 'ai';
import {SYNTHESIZER_SYSTEM_PROMPT, synthesizerPrompt} from './prompt.js';

export interface SynthesisSource {
  /** Namespaced surface id — what refs name. */
  surface: string;
  appId: string;
  displayName: string;
  /** The partition's live data model. */
  data: unknown;
}

export interface SynthesisInput {
  utterance: string;
  /** The Planner's request on the synthesis slot: its guidance to the merge. */
  request: string;
  sources: readonly SynthesisSource[];
  /** The shell catalog's operators, with their agent-facing descriptions. */
  operators: readonly {name: string; description: string}[];
}

/** The turn's second model call (SPEC §5, ◆ call #2). Emits wiring, never values; may decline. */
export interface Synthesizer {
  synthesize(input: SynthesisInput): Promise<SynthesizerOutput>;
}

/**
 * The model-facing schema is the sdk's, minus the meta keys a provider may refuse. A deep copy
 * because the sdk pins its schema `as const` (readonly) and the AI SDK wants a mutable JSONSchema7.
 */
const {$schema: _meta, title: _title, ...readonlySchema} = SYNTHESIZER_OUTPUT_SCHEMA;
void _meta;
void _title;
type Schema7 = Extract<Parameters<typeof jsonSchema>[0], {type?: unknown}>;
const outputSchema = structuredClone(readonlySchema) as unknown as Schema7;

export class ModelSynthesizer implements Synthesizer {
  #model: LanguageModel;
  #providerOptions: ProviderOptions | undefined;

  constructor(options: {model: LanguageModel; providerOptions?: ProviderOptions}) {
    this.#model = options.model;
    this.#providerOptions = options.providerOptions;
  }

  async synthesize(input: SynthesisInput): Promise<SynthesizerOutput> {
    const result = await generateText({
      model: this.#model,
      system: SYNTHESIZER_SYSTEM_PROMPT,
      prompt: synthesizerPrompt(input),
      output: Output.object({schema: jsonSchema<SynthesizerOutput>(outputSchema)}),
      ...(this.#providerOptions ? {providerOptions: this.#providerOptions} : {}),
    });
    return result.output;
  }
}
