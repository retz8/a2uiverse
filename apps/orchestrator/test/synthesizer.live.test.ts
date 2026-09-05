/**
 * Live smoke test of the real Synthesizer against Gemini — proves the model answers the text
 * prompt with one tagged block the whole checklist admits (task-5.4 decision 11). Never runs in
 * `pnpm verify`:
 *
 *   set -a; source .env; set +a
 *   A2UIVERSE_SYNTHESIZER_LIVE=1 pnpm --filter @a2uiverse/orchestrator test synthesizer.live
 */
import {OPERATORS, SCHEMA_CATALOG} from '@a2uiverse/shell-catalog/schema';
import {describe, expect, test} from 'vitest';
import {loadConfig} from '../src/config.js';
import {Partitions} from '../src/composition/partitions.js';
import {getModel, plannerProviderOptions} from '../src/planner/getModel.js';
import {readShellCatalogFiles, synthesizerSystemPrompt} from '../src/synthesizer/prompt.js';
import {AiSdkSynthesisModel, Synthesizer} from '../src/synthesizer/synthesizer.js';

const live = process.env.A2UIVERSE_SYNTHESIZER_LIVE === '1' && !!process.env.GOOGLE_API_KEY;

describe.skipIf(!live)('Synthesizer (live)', () => {
  test('merges two storefronts with matching ids into a validated, sortable comparison', async () => {
    const config = loadConfig(process.env);
    const settings = {
      googleApiKey: config.googleApiKey!,
      modelId: config.synthesizerModelId,
      effort: config.synthesizerEffort,
    };
    const synthesizer = new Synthesizer({
      model: new AiSdkSynthesisModel({
        model: getModel(settings),
        providerOptions: plannerProviderOptions(settings),
      }),
      systemPrompt: synthesizerSystemPrompt(readShellCatalogFiles()),
      catalog: SCHEMA_CATALOG,
      operators: OPERATORS,
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

    const started = Date.now();
    const outcome = await synthesizer.synthesize(
      {
        utterance: 'compare camera prices across both stores',
        request: 'compare price per camera; best price first',
        sources: [
          {surface: 'shop-a:list', appId: 'shop-a', displayName: 'Shop A', data: a},
          {surface: 'shop-b:list', appId: 'shop-b', displayName: 'Shop B', data: b},
        ],
      },
      partitions,
    );
    console.log(`live synthesis in ${Date.now() - started}ms:`, JSON.stringify(outcome));

    expect(outcome.kind).toBe('synthesized');
    if (outcome.kind !== 'synthesized') return;
    expect(outcome.document.sorts.length).toBeGreaterThanOrEqual(1);
    expect(outcome.document.tree.components.some(c => c.component === 'DerivedValue')).toBe(true);
    expect(outcome.document.tree.components.some(c => c.component === 'SortControl')).toBe(true);
  }, 90_000);
});
