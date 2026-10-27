/**
 * The model seam (task 17.2): the Planner's and the Synthesizer's model, named by its provider,
 * the effort tier carried as the AI SDK's reasoning option, one key per provider.
 */
import {createAnthropic} from '@ai-sdk/anthropic';
import {createGoogleGenerativeAI} from '@ai-sdk/google';
import {createProviderRegistry, type LanguageModel, type LanguageModelMiddleware} from 'ai';
import {logLine} from '../log.js';

/** Recorded default of the effort tunable (SPEC decision 9); the fan-out stance needs this rung (task 7.8). */
export const DEFAULT_PLANNER_MODEL_ID = 'gemini-3.8-flash';

/**
 * The Synthesizer's own default, used when `A2UIVERSE_PLANNER_MODEL` is not set either; the
 * entity join lands on this rung at low effort (task 7.13).
 */
export const DEFAULT_SYNTHESIZER_MODEL_ID = 'gemini-3.8-flash';

/** The registered providers (task-17.2 decision 1); a further one is its package and a line here. */
export const PROVIDERS = ['google', 'anthropic'] as const;
export type Provider = (typeof PROVIDERS)[number];

/** The effort tier, two words on both seams (task-17.2 decision 4). */
export type Effort = 'low' | 'default';

/** What a call carries for a tier: the SDK's reasoning word, each provider translating it for its model. */
export type Reasoning = 'none' | 'provider-default';

/** A model name taken apart: `provider/model`, a bare name being Google (task-17.2 decision 2). */
export interface ModelName {
  provider: Provider;
  model: string;
}

const KEY_VARIABLES: Record<Provider, string> = {
  google: 'GOOGLE_API_KEY',
  anthropic: 'ANTHROPIC_API_KEY',
};

/** The keys as the config holds them, one per provider (task-17.2 decision 3). */
export interface ModelKeys {
  googleApiKey: string | undefined;
  anthropicApiKey: string | undefined;
}

function isProvider(name: string): name is Provider {
  return (PROVIDERS as readonly string[]).includes(name);
}

/**
 * `provider/model`; no slash is Google, so a name set before the seam opened reaches Google as it
 * did. An unknown provider throws, naming the variable and the providers the seam knows
 * (task-17.2 decision 6); the model half is the provider's to judge, at the call.
 */
export function parseModelName(raw: string, variable: string): ModelName {
  const slash = raw.indexOf('/');
  if (slash < 0) return {provider: 'google', model: raw};
  const provider = raw.slice(0, slash);
  const model = raw.slice(slash + 1);
  if (!isProvider(provider)) {
    throw new Error(
      `${variable}: unknown provider "${provider}" in "${raw}"; the registered providers are ${PROVIDERS.join(', ')}`,
    );
  }
  return {provider, model};
}

/** `low` spends the least thinking the provider lets a request ask for; `default` leaves the provider to its own. */
export function reasoningFor(effort: Effort): Reasoning {
  return effort === 'low' ? 'none' : 'provider-default';
}

/** The environment variable a provider's key is read from. */
export function keyVariableFor(provider: Provider): string {
  return KEY_VARIABLES[provider];
}

/** The key the config holds for a provider, if any. */
export function keyFor(provider: Provider, keys: ModelKeys): string | undefined {
  return provider === 'google' ? keys.googleApiKey : keys.anthropicApiKey;
}

/** A key a configured model's provider needs and the config lacks. */
export interface MissingKey {
  variable: string;
  /** The seams that have no model until it is set, in the order the config names them. */
  seams: string[];
}

/**
 * The keys to warn about at boot (task-17.2 decision 3): one entry per missing key, naming the
 * seams that need it; a key no configured model needs is not an entry.
 */
export function missingKeys(
  config: ModelKeys & {plannerModelId: string; synthesizerModelId: string},
): MissingKey[] {
  const seams: Array<[string, ModelName]> = [
    ['the Planner', parseModelName(config.plannerModelId, 'A2UIVERSE_PLANNER_MODEL')],
    ['the Synthesizer', parseModelName(config.synthesizerModelId, 'A2UIVERSE_SYNTHESIZER_MODEL')],
  ];
  const missing: MissingKey[] = [];
  for (const [seam, {provider}] of seams) {
    if (keyFor(provider, config)) continue;
    const variable = keyVariableFor(provider);
    const entry = missing.find(m => m.variable === variable);
    if (entry) entry.seams.push(seam);
    else missing.push({variable, seams: [seam]});
  }
  return missing;
}

/** The seam a model serves, as its log lines name it. */
export type Seam = 'Planner' | 'Synthesizer';

export interface ModelSettings {
  seam: Seam;
  keys: ModelKeys;
  /** `provider/model`, or a bare Gemini name. */
  modelId: string;
}

/**
 * The provider registry (task-17.2 decision 1): the SDK's own, Google and Anthropic registered,
 * the kit's slash between provider and model, every call's warnings logged for the seam.
 */
export function getModel(settings: ModelSettings): LanguageModel {
  const {provider, model} = parseModelName(settings.modelId, 'model');
  const registry = createProviderRegistry(
    {
      google: createGoogleGenerativeAI({apiKey: settings.keys.googleApiKey}),
      anthropic: createAnthropic({apiKey: settings.keys.anthropicApiKey}),
    },
    {separator: '/', languageModelMiddleware: warningsLog(settings.seam)},
  );
  return registry.languageModel(`${provider}/${model}`);
}

/**
 * One log line per call whose result carries a warning from the provider (task-17.2 decision 7):
 * the seam, the model and what the provider said, the way it bent the request. A clean call logs
 * nothing.
 */
export function warningsLog(seam: Seam): LanguageModelMiddleware {
  return {
    specificationVersion: 'v4',
    wrapGenerate: async ({doGenerate, model}) => {
      const result = await doGenerate();
      const warnings = result.warnings ?? [];
      if (warnings.length > 0) {
        const said = warnings.map(w =>
          'message' in w ? w.message : (w.details ?? `${w.feature} unsupported`),
        );
        logLine(`${seam} on ${model.modelId} — ${said.join('; ')}`);
      }
      return result;
    },
  };
}
