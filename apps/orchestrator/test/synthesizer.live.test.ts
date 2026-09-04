/**
 * Live smoke test of the real Synthesizer against Gemini — proves the provider accepts the sdk's
 * model-facing schema and returns something the checklist admits. Never runs in `pnpm verify`:
 *
 *   set -a; source .env; set +a
 *   A2UIVERSE_SYNTHESIZER_LIVE=1 pnpm --filter @a2uiverse/orchestrator test synthesizer.live
 */
import {describe, expect, test} from 'vitest';
import {loadConfig} from '../src/config.js';
import {Partitions} from '../src/composition/partitions.js';
import {getModel, plannerProviderOptions} from '../src/planner/getModel.js';
import {checkSynthesis} from '../src/synthesizer/checkSynthesis.js';
import {operatorVocabulary} from '../src/synthesizer/operators.js';
import {ModelSynthesizer} from '../src/synthesizer/synthesizer.js';

const live = process.env.A2UIVERSE_SYNTHESIZER_LIVE === '1' && !!process.env.GOOGLE_API_KEY;

describe.skipIf(!live)('ModelSynthesizer (live)', () => {
  test('merges two storefronts with matching ids into a sortable comparison', async () => {
    const config = loadConfig(process.env);
    const settings = {
      googleApiKey: config.googleApiKey!,
      modelId: config.synthesizerModelId,
      effort: config.synthesizerEffort,
    };
    const synth = new ModelSynthesizer({
      model: getModel(settings),
      providerOptions: plannerProviderOptions(settings),
    });
    const a = {
      items: [
        {id: 'x100', name: 'X100', price: 899},
        {id: 'x200', name: 'X200', price: 1299},
      ],
    };
    const b = {
      items: [
        {id: 'x100', name: 'X100', price: 949},
        {id: 'x200', name: 'X200', price: 1199},
      ],
    };
    const partitions = new Partitions();
    const paint = (surface: string, data: unknown) => ({
      kind: 'message' as const,
      messageId: 'm',
      role: 'agent' as const,
      parts: [
        {
          kind: 'data' as const,
          data: {version: 'v0.9', createSurface: {surfaceId: surface, catalogId: 'c'}},
        },
        {
          kind: 'data' as const,
          data: {version: 'v0.9', updateDataModel: {surfaceId: surface, value: data}},
        },
      ],
    });
    partitions.apply(paint('shop-a:list', a));
    partitions.apply(paint('shop-b:list', b));
    const operators = operatorVocabulary();

    const started = Date.now();
    const output = await synth.synthesize({
      utterance: 'compare camera prices across both stores',
      request: 'compare price per camera; best price first',
      sources: [
        {surface: 'shop-a:list', appId: 'shop-a', displayName: 'Shop A', data: a},
        {surface: 'shop-b:list', appId: 'shop-b', displayName: 'Shop B', data: b},
      ],
      operators,
    });
    console.log(`live synthesis in ${Date.now() - started}ms:`, JSON.stringify(output));

    expect(output.declined).toBe(false);
    expect(() =>
      checkSynthesis(output, {operators: operators.map(o => o.name), partitions}),
    ).not.toThrow();
    expect(output.entities.length).toBe(2);
    expect(output.fields.length).toBeGreaterThanOrEqual(2);
  }, 60_000);
});
