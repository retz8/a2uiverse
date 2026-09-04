/** The IntegrityChecker (task-4.4 spec, phase decision 13): per-binding interface, generation-backed answer. */
import type {SynthesisWiring} from '@a2uiverse/sdk';
import {expect, test} from 'vitest';
import {checkWiring, refValid} from '../src/composition/integrity.js';

const wiring: SynthesisWiring = {
  fields: [{name: 'best', label: 'Best price'}],
  entities: [
    {
      cells: [
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
  computedAgainst: {'shop-a:list': 1, 'shop-b:list': 0},
};

test('a ref is valid while its surface generation matches what the wiring was computed against', () => {
  const gens = {'shop-a:list': 1, 'shop-b:list': 0};
  expect(
    refValid({surface: 'shop-a:list', pointer: '/items/0'}, wiring.computedAgainst, gens),
  ).toBe(true);
  expect(
    refValid({surface: 'shop-a:list', pointer: '/items/0'}, wiring.computedAgainst, {
      ...gens,
      'shop-a:list': 2,
    }),
  ).toBe(false);
});

test('the wiring is valid when every ref is; the invalid surfaces are named', () => {
  expect(checkWiring(wiring, {'shop-a:list': 1, 'shop-b:list': 0})).toEqual({
    valid: true,
    invalid: [],
  });
  expect(checkWiring(wiring, {'shop-a:list': 1, 'shop-b:list': 3})).toEqual({
    valid: false,
    invalid: ['shop-b:list'],
  });
});

test('a surface the wiring never referenced does not affect validity', () => {
  expect(checkWiring(wiring, {'shop-a:list': 1, 'shop-b:list': 0, 'other:x': 9}).valid).toBe(true);
});
