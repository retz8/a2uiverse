import type {ProviderOptions} from '@ai-sdk/provider-utils';
import {generateText, Output, type LanguageModel} from 'ai';
import type {ShortlistEntry} from '../router/router.js';
import {checkPlan} from './checkPlan.js';
import {planSchema, type Plan} from './planSchema.js';
import {PLANNER_SYSTEM_PROMPT, plannerPrompt} from './prompt.js';

export interface PlanInput {
  utterance: string;
  shortlist: readonly ShortlistEntry[];
}

/** The phase's one model call (phase decision 9). Any failure here is a broken turn. */
export interface Planner {
  plan(input: PlanInput): Promise<Plan>;
}

export class ModelPlanner implements Planner {
  #model: LanguageModel;
  #providerOptions: ProviderOptions | undefined;

  constructor(options: {model: LanguageModel; providerOptions?: ProviderOptions}) {
    this.#model = options.model;
    this.#providerOptions = options.providerOptions;
  }

  async plan(input: PlanInput): Promise<Plan> {
    const result = await generateText({
      model: this.#model,
      system: PLANNER_SYSTEM_PROMPT,
      prompt: plannerPrompt(input),
      output: Output.object({schema: planSchema}),
      ...(this.#providerOptions ? {providerOptions: this.#providerOptions} : {}),
    });
    const plan = result.output;
    checkPlan(
      plan,
      input.shortlist.map(entry => entry.record.id),
    );
    return plan;
  }
}
