import {createGoogleGenerativeAI} from '@ai-sdk/google';
import type {ProviderOptions} from '@ai-sdk/provider-utils';
import type {LanguageModel} from 'ai';

/** Recorded default of the effort tunable (SPEC decision 9); the fan-out stance needs this rung (task 7.8). */
export const DEFAULT_PLANNER_MODEL_ID = 'gemini-3.7-flash';

/**
 * The Synthesizer's own default, used when `A2UIVERSE_PLANNER_MODEL` is not set either; the
 * entity join lands on this rung at low effort (task 7.13).
 */
export const DEFAULT_SYNTHESIZER_MODEL_ID = 'gemini-3.7-flash';

export interface PlannerSettings {
  /** Google AI Studio key, env `GOOGLE_API_KEY` (the a2ui-github convention). */
  googleApiKey: string;
  modelId: string;
  /** Planner latency is time-to-first-paint; start below the default. */
  effort: 'low' | 'default';
}

/** The provider seam (phase decision 9): one provider configured, swapped here when that changes. */
export function getModel(settings: PlannerSettings): LanguageModel {
  return createGoogleGenerativeAI({apiKey: settings.googleApiKey})(settings.modelId);
}

/** Provider options for the settings' effort level: `low` spends no thinking budget. */
export function plannerProviderOptions(
  settings: Pick<PlannerSettings, 'effort'>,
): ProviderOptions | undefined {
  if (settings.effort === 'low') return {google: {thinkingConfig: {thinkingBudget: 0}}};
  return undefined;
}
