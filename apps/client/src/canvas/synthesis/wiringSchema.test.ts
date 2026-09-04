/**
 * The zod mirror against the sdk's own fixtures and contract (task-4.5 decision 11), and the
 * structural checks that separate a wiring the evaluator can run from one it cannot (12).
 */
import {describe, expect, test} from 'vitest';
import {WIRING_SCHEMA} from '@a2uiverse/sdk';
import {OPERATORS} from '@a2uiverse/shell-catalog';
import {validateWiring, WiringSchema} from './wiringSchema';

/** The sdk contract's own example shape. */
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

describe('WiringSchema', () => {
  test('accepts the contract example and every wiring the contract schema requires', () => {
    expect(WiringSchema.safeParse(wiring).success).toBe(true);
    // An empty entity list is a legal synthesis of nothing joinable yet.
    expect(WiringSchema.safeParse({...wiring, entities: []}).success).toBe(true);
  });

  test('mirrors the contract: the same required keys, no extras', () => {
    // The sdk's embedded schema is asserted equal to the contract file by the sdk's own test.
    const required = WIRING_SCHEMA.required;
    for (const key of required) {
      const {[key]: _dropped, ...without} = wiring as Record<string, unknown>;
      void _dropped;
      expect(WiringSchema.safeParse(without).success, `missing ${key}`).toBe(false);
    }
    expect(WiringSchema.safeParse({...wiring, extra: 1}).success).toBe(false);
  });

  test('rejects a malformed pointer, an unsafe field name, a bad direction, a negative generation', () => {
    const bad = (patch: (w: typeof wiring) => unknown) =>
      WiringSchema.safeParse(patch(structuredClone(wiring))).success;
    expect(bad(w => ((w.entities[0].cells[0].args[0].pointer = 'items/0'), w))).toBe(false);
    expect(bad(w => ((w.fields[0].name = 'a/b'), w))).toBe(false);
    expect(bad(w => ((w.sort.direction = 'up' as never), w))).toBe(false);
    expect(bad(w => ((w.computedAgainst['shop-a:list'] = -1), w))).toBe(false);
    expect(bad(w => ((w.fields = []), w))).toBe(false);
    expect(bad(w => ((w.entities[0].cells[0].args = []), w))).toBe(false);
  });
});

describe('validateWiring', () => {
  test('a good wiring passes with its typed value', () => {
    expect(validateWiring(wiring, OPERATORS)).toEqual({ok: true, wiring});
  });

  test('a shape failure reports the issue path', () => {
    const result = validateWiring({...wiring, sort: {field: 'best'}}, OPERATORS);
    expect(result).toMatchObject({ok: false, path: '/sort/direction'});
  });

  test('an undeclared sort field, a wrong-width entity, an unknown operator each fail structurally', () => {
    expect(
      validateWiring({...wiring, sort: {field: 'rating', direction: 'asc'}}, OPERATORS),
    ).toMatchObject({
      ok: false,
      path: '/sort/field',
    });
    const narrow = structuredClone(wiring);
    narrow.entities[0].cells.pop();
    expect(validateWiring(narrow, OPERATORS)).toMatchObject({ok: false, path: '/entities/0/cells'});
    const median = structuredClone(wiring);
    median.entities[0].cells[1].op = 'median';
    expect(validateWiring(median, OPERATORS)).toMatchObject({
      ok: false,
      path: '/entities/0/cells/1/op',
    });
  });

  test('a ref into a surface nobody holds is not a validation failure', () => {
    const elsewhere = structuredClone(wiring);
    elsewhere.entities[0].cells[0].args[0].surface = 'nowhere:at-all';
    expect(validateWiring(elsewhere, OPERATORS).ok).toBe(true);
  });
});
