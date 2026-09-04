/** Asserts the synthesis half of the projection against the normative contract (`packages/sdk/contracts`). */
import {readFileSync} from 'node:fs';
import {expect, test} from 'vitest';
import {STAMP_KEY} from './composition';
import {readWiring, SYNTHESIZER_OUTPUT_SCHEMA, WIRING_KEY, WIRING_SCHEMA} from './synthesis';

const contract = JSON.parse(
  readFileSync(new URL('../../contracts/composition.v0.2.json', import.meta.url), 'utf8'),
) as {
  wiringKey: string;
  shapes: {synthesisWiring: {schemas: {synthesizerOutput: unknown; wiring: unknown}}};
};

test('the wiring key matches the contract', () => {
  expect(WIRING_KEY).toBe(contract.wiringKey);
  expect(WIRING_KEY).not.toBe(STAMP_KEY);
});

test('the embedded schemas are the contract schemas', () => {
  const {schemas} = contract.shapes.synthesisWiring;
  expect(SYNTHESIZER_OUTPUT_SCHEMA).toEqual(schemas.synthesizerOutput);
  expect(WIRING_SCHEMA).toEqual(schemas.wiring);
});

/** Structured-output constraint (SPEC phase-4 decision 12): no unions, no references, no recursion. */
test('both schemas are union-free and non-recursive', () => {
  const banned = new Set(['anyOf', 'oneOf', 'allOf', '$ref', '$defs', 'not', 'if']);
  const walk = (node: unknown, path: string) => {
    if (Array.isArray(node)) return node.forEach((n, i) => walk(n, `${path}[${i}]`));
    if (typeof node !== 'object' || node === null) return;
    for (const [key, value] of Object.entries(node)) {
      expect(banned.has(key), `${path}.${key}`).toBe(false);
      walk(value, `${path}.${key}`);
    }
  };
  walk(SYNTHESIZER_OUTPUT_SCHEMA, 'synthesizerOutput');
  walk(WIRING_SCHEMA, 'wiring');
});

const wiring = {
  fields: [
    {name: 'product', label: 'Camera'},
    {name: 'best', label: 'Best price'},
  ],
  entities: [
    {
      cells: [
        {op: 'value', args: [{surface: 'shop-a:list', pointer: '/items/0/name'}]},
        {
          op: 'min',
          args: [
            {surface: 'shop-a:list', pointer: '/items/0/price'},
            {surface: 'shop-b:list', pointer: '/products/0/price'},
          ],
        },
      ],
    },
  ],
  sort: {field: 'best', direction: 'asc'},
  computedAgainst: {'shop-a:list': 0, 'shop-b:list': 1},
};

test('readWiring returns the payload under the wiring key', () => {
  expect(readWiring({[STAMP_KEY]: {source: 'shell'}, [WIRING_KEY]: wiring})).toEqual(wiring);
});

test('readWiring rejects absent or malformed metadata', () => {
  expect(readWiring(undefined)).toBeUndefined();
  expect(readWiring({})).toBeUndefined();
  expect(readWiring({[WIRING_KEY]: 'wiring'})).toBeUndefined();
  expect(readWiring({[WIRING_KEY]: [wiring]})).toBeUndefined();
  const {computedAgainst: _dropped, ...noEnvelope} = wiring;
  void _dropped;
  expect(readWiring({[WIRING_KEY]: noEnvelope})).toBeUndefined();
});
