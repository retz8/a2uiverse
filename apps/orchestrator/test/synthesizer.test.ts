import type {SynthesizerOutput} from '@a2uiverse/sdk';
import {OPERATORS} from '@a2uiverse/shell-catalog/operators';
import {MockLanguageModelV3} from 'ai/test';
import {describe, expect, test} from 'vitest';
import {Partitions} from '../src/composition/partitions.js';
import {checkSynthesis, MalformedSynthesisError} from '../src/synthesizer/checkSynthesis.js';
import {ModelSynthesizer, type SynthesisInput} from '../src/synthesizer/synthesizer.js';
import {synthesizerPrompt} from '../src/synthesizer/prompt.js';

const A = 'shop-a:list';
const B = 'shop-b:list';

function partitions(): Partitions {
  const p = new Partitions();
  const paint = (op: Record<string, unknown>) => ({
    kind: 'message' as const,
    messageId: 'm',
    role: 'agent' as const,
    parts: [{kind: 'data' as const, data: {version: 'v0.9', ...op}}],
  });
  p.apply(paint({createSurface: {surfaceId: A, catalogId: 'c'}}));
  p.apply(paint({updateDataModel: {surfaceId: A, value: {items: [{id: 'x100', price: 899}]}}}));
  p.apply(paint({createSurface: {surfaceId: B, catalogId: 'c'}}));
  p.apply(paint({updateDataModel: {surfaceId: B, value: {products: [{id: 'x100', price: 949}]}}}));
  return p;
}

const good: SynthesizerOutput = {
  declined: false,
  reason: '',
  fields: [
    {name: 'product', label: 'Camera'},
    {name: 'best', label: 'Best price'},
  ],
  entities: [
    {
      cells: [
        {op: 'value', args: [{surface: A, pointer: '/items/0/id'}]},
        {
          op: 'min',
          args: [
            {surface: A, pointer: '/items/0/price'},
            {surface: B, pointer: '/products/0/price'},
          ],
        },
      ],
    },
  ],
  sort: {field: 'best', direction: 'asc'},
};

const declined: SynthesizerOutput = {
  declined: true,
  reason: 'nothing joinable',
  fields: [],
  entities: [],
  sort: {field: '', direction: 'asc'},
};

const input: SynthesisInput = {
  utterance: 'compare camera prices',
  request: 'compare price per camera; best price first',
  sources: [
    {surface: A, appId: 'shop-a', displayName: 'Shop A', data: {items: [{id: 'x100', price: 899}]}},
    {
      surface: B,
      appId: 'shop-b',
      displayName: 'Shop B',
      data: {products: [{id: 'x100', price: 949}]},
    },
  ],
  operators: OPERATORS.map(name => ({name, description: `${name} op`})),
};

describe('checkSynthesis (task-4.4 decision 4)', () => {
  const ctx = () => ({operators: OPERATORS, partitions: partitions()});

  test('a well-formed synthesis passes; a decline always passes', () => {
    expect(() => checkSynthesis(good, ctx())).not.toThrow();
    expect(() => checkSynthesis(declined, ctx())).not.toThrow();
  });

  test('a non-declined output must declare at least one field', () => {
    expect(() => checkSynthesis({...declined, declined: false}, ctx())).toThrow(
      MalformedSynthesisError,
    );
  });

  test('an operator the shell catalog does not declare is malformed', () => {
    const bad = structuredClone(good);
    bad.entities[0]!.cells[1]!.op = 'median';
    expect(() => checkSynthesis(bad, ctx())).toThrow(/operator 'median'/);
  });

  test('the sort field must be a declared field', () => {
    const bad = {...good, sort: {field: 'price', direction: 'asc' as const}};
    expect(() => checkSynthesis(bad, ctx())).toThrow(/sort field 'price'/);
  });

  test('every entity has exactly as many cells as there are fields', () => {
    const bad = structuredClone(good);
    bad.entities[0]!.cells.pop();
    expect(() => checkSynthesis(bad, ctx())).toThrow(/entity 0 has 1 cell/);
  });

  test('a ref into an unknown surface, or one that does not resolve now, is malformed — not absent', () => {
    const unknown = structuredClone(good);
    unknown.entities[0]!.cells[0]!.args[0]!.surface = 'shop-c:list';
    expect(() => checkSynthesis(unknown, ctx())).toThrow(/surface 'shop-c:list'/);
    const dangling = structuredClone(good);
    dangling.entities[0]!.cells[0]!.args[0]!.pointer = '/items/7/id';
    expect(() => checkSynthesis(dangling, ctx())).toThrow(/does not resolve/);
  });
});

describe('prompt', () => {
  test("carries the Planner's request, every source's data by display name, and the operator vocabulary", () => {
    const text = synthesizerPrompt(input);
    expect(text).toContain('compare price per camera; best price first');
    expect(text).toContain('Shop A');
    expect(text).toContain('shop-b:list');
    expect(text).toContain('"price": 949');
    expect(text).toContain('min');
    expect(text).toContain('argmin');
  });
});

describe('ModelSynthesizer', () => {
  function modelReturning(text: string): MockLanguageModelV3 {
    return new MockLanguageModelV3({
      doGenerate: async () => ({
        finishReason: 'stop' as const,
        usage: {inputTokens: 1, outputTokens: 1, totalTokens: 2},
        content: [{type: 'text' as const, text}],
        warnings: [],
      }),
    });
  }

  test('parses the model output against the sdk schema', async () => {
    const synth = new ModelSynthesizer({model: modelReturning(JSON.stringify(good))});
    expect(await synth.synthesize(input)).toEqual(good);
  });

  test('a decline parses too', async () => {
    const synth = new ModelSynthesizer({model: modelReturning(JSON.stringify(declined))});
    expect(await synth.synthesize(input)).toEqual(declined);
  });
});
