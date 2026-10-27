/**
 * The model seam (task 17.2): a model named by its provider, the effort tier as the SDK's
 * reasoning option, one key per provider.
 */
import {generateText, wrapLanguageModel} from 'ai';
import {MockLanguageModelV4} from 'ai/test';
import type {LanguageModelV4GenerateResult} from '@ai-sdk/provider';
import {afterEach, describe, expect, test, vi} from 'vitest';
import {
  getModel,
  keyVariableFor,
  missingKeys,
  parseModelName,
  reasoningFor,
  warningsLog,
} from '../src/model/getModel.js';
import {ModelPlanner} from '../src/planner/planner.js';
import {readPlannerFiles} from '../src/planner/prompt.js';
import type {PlatformReaders} from '../src/planner/readers.js';
import {AiSdkSynthesisModel} from '../src/synthesizer/synthesizer.js';

const keys = {googleApiKey: 'g', anthropicApiKey: 'a'};

const answer = (
  text: string,
  warnings: LanguageModelV4GenerateResult['warnings'] = [],
): LanguageModelV4GenerateResult => ({
  finishReason: {unified: 'stop', raw: undefined},
  usage: {
    inputTokens: {total: 1, noCache: 1, cacheRead: undefined, cacheWrite: undefined},
    outputTokens: {total: 1, text: 1, reasoning: undefined},
  },
  content: [{type: 'text', text}],
  warnings,
});

describe('the model name (task-17.2 decisions 2, 6)', () => {
  test('a bare name is Google, as before', () => {
    expect(parseModelName('gemini-3.8-flash', 'A2UIVERSE_PLANNER_MODEL')).toEqual({
      provider: 'google',
      model: 'gemini-3.8-flash',
    });
  });
  test('provider/model names the provider', () => {
    expect(parseModelName('anthropic/claude-haiku-5-5', 'A2UIVERSE_PLANNER_MODEL')).toEqual({
      provider: 'anthropic',
      model: 'claude-haiku-5-5',
    });
  });
  test('google/… is the bare name spelled in full', () => {
    expect(parseModelName('google/gemini-3.8-flash', 'A2UIVERSE_PLANNER_MODEL')).toEqual({
      provider: 'google',
      model: 'gemini-3.8-flash',
    });
  });
  test('an unknown provider throws, naming the variable and listing the registered providers', () => {
    expect(() => parseModelName('mistral/mistral-small', 'A2UIVERSE_SYNTHESIZER_MODEL')).toThrow(
      /A2UIVERSE_SYNTHESIZER_MODEL.*"mistral".*google.*anthropic/,
    );
  });
});

describe('the effort tier (task-17.2 decision 4)', () => {
  test('low is the SDK’s reasoning "none"; default leaves the provider to its own', () => {
    expect(reasoningFor('low')).toBe('none');
    expect(reasoningFor('default')).toBe('provider-default');
  });
});

describe('the keys (task-17.2 decision 3)', () => {
  test('each provider reads its own variable', () => {
    expect(keyVariableFor('google')).toBe('GOOGLE_API_KEY');
    expect(keyVariableFor('anthropic')).toBe('ANTHROPIC_API_KEY');
  });
  test('a Gemini-only setup without its key is one missing key, both seams needing it', () => {
    expect(
      missingKeys({
        plannerModelId: 'gemini-3.8-flash',
        synthesizerModelId: 'gemini-3.8-flash',
        googleApiKey: undefined,
        anthropicApiKey: undefined,
      }),
    ).toEqual([{variable: 'GOOGLE_API_KEY', seams: ['the Planner', 'the Synthesizer']}]);
  });
  test('a key no configured model needs is never mentioned', () => {
    expect(
      missingKeys({
        plannerModelId: 'gemini-3.8-flash',
        synthesizerModelId: 'gemini-3.8-flash',
        googleApiKey: 'g',
        anthropicApiKey: undefined,
      }),
    ).toEqual([]);
  });
  test('the Planner on Claude and the Synthesizer on Gemini, each missing its key', () => {
    expect(
      missingKeys({
        plannerModelId: 'anthropic/claude-haiku-5-5',
        synthesizerModelId: 'gemini-3.8-flash',
        googleApiKey: undefined,
        anthropicApiKey: undefined,
      }),
    ).toEqual([
      {variable: 'ANTHROPIC_API_KEY', seams: ['the Planner']},
      {variable: 'GOOGLE_API_KEY', seams: ['the Synthesizer']},
    ]);
  });
});

describe('the registry (task-17.2 decision 1)', () => {
  test('a bare name resolves on Google, a prefixed one on its provider', () => {
    const gemini = getModel({seam: 'Planner', keys, modelId: 'gemini-3.8-flash'});
    expect(gemini.provider).toMatch(/google/);
    expect(gemini.modelId).toBe('gemini-3.8-flash');
    const claude = getModel({seam: 'Planner', keys, modelId: 'anthropic/claude-haiku-5-5'});
    expect(claude.provider).toMatch(/anthropic/);
    expect(claude.modelId).toBe('claude-haiku-5-5');
  });
});

describe('the provider’s warnings (task-17.2 decision 7)', () => {
  afterEach(() => vi.restoreAllMocks());

  test('a call whose result carries a warning logs one line naming the seam, the model and the warning', async () => {
    const log = vi.spyOn(console, 'log').mockImplementation(() => {});
    const inner = new MockLanguageModelV4({
      modelId: 'claude-opus-5-5',
      doGenerate: answer('ok', [
        {
          type: 'compatibility',
          feature: 'reasoning',
          details: "reasoning 'none' is not supported by claude-opus-5-5; using effort 'low'",
        },
        {type: 'deprecated', setting: 'temperature', message: 'and another'},
      ]),
    });
    const model = wrapLanguageModel({model: inner, middleware: warningsLog('Synthesizer')});
    await generateText({model, prompt: 'x'});
    expect(log).toHaveBeenCalledTimes(1);
    expect(log.mock.calls[0][0]).toBe(
      "@a2uiverse/orchestrator: Synthesizer on claude-opus-5-5 — reasoning 'none' is not supported by claude-opus-5-5; using effort 'low'; and another",
    );
  });

  test('a clean call logs nothing', async () => {
    const log = vi.spyOn(console, 'log').mockImplementation(() => {});
    const inner = new MockLanguageModelV4({modelId: 'gemini-3.8-flash', doGenerate: answer('ok')});
    const model = wrapLanguageModel({model: inner, middleware: warningsLog('Planner')});
    await generateText({model, prompt: 'x'});
    expect(log).not.toHaveBeenCalled();
  });
});

describe('the callers carry the tier (task-17.2 decision 8)', () => {
  const readers: PlatformReaders = {
    installedApps: () => [],
    thisComposition: () => undefined,
    recentTurns: () => [],
  };

  test('the Planner passes the reasoning word on every call', async () => {
    const model = new MockLanguageModelV4({doGenerate: answer('not a plan')});
    const files = readPlannerFiles();
    const planner = new ModelPlanner({
      model,
      reasoning: 'none',
      systemPrompt: 'SYSTEM',
      catalog: files.catalog,
      readers,
    });
    await planner.plan({utterance: 'catch me up', shortlist: []});
    expect(model.doGenerateCalls.length).toBeGreaterThan(0);
    for (const call of model.doGenerateCalls) expect(call.reasoning).toBe('none');
  });

  test('the Synthesizer’s text seam passes the reasoning word', async () => {
    const model = new MockLanguageModelV4({doGenerate: answer('merged')});
    const text = await new AiSdkSynthesisModel({model, reasoning: 'provider-default'}).generate({
      system: 'S',
      prompt: 'P',
      input: {utterance: 'u', request: 'r', sources: []},
    });
    expect(text).toBe('merged');
    expect(model.doGenerateCalls[0]?.reasoning).toBe('provider-default');
  });
});
