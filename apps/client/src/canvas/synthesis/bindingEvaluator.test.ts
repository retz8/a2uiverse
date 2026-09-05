/**
 * The BindingEvaluator as a table (task-4.5 decision 1, carried into 5.5 and 5.10): payload +
 * partitions + the user's choices in, the synthesis surface's data model out. The sdk's camera
 * comparison — keyed refs over two shapes — is the fixture. Refs select by key, so a reorder
 * under a ref changes nothing and there is no stale case to drive.
 */
import {describe, expect, test} from 'vitest';
import type {SynthesisPayload} from '@a2uiverse/sdk';
import {CATALOG} from '@a2uiverse/shell-catalog';
import type {CellObject} from '@a2uiverse/shell-catalog';
import {
  PAYLOAD,
  SHOP_A,
  SHOP_A_ITEMS,
  SHOP_A_REVERSED,
  SHOP_B,
  SHOP_B_PRODUCTS,
} from '../../beats/synthesisFixture';
import {choiceInForce, choicesOf, evaluate, type SortChoice} from './bindingEvaluator';

const A = SHOP_A;
const B = SHOP_B;

const stores = (items = SHOP_A_ITEMS, products = SHOP_B_PRODUCTS): Record<string, unknown> => ({
  [A]: {items},
  [B]: {products},
});

const models = (partitions: Record<string, unknown>) => (surface: string) => partitions[surface];

type Row = Record<'name' | 'priceA' | 'priceB' | 'best', CellObject>;

const run = (
  payload: SynthesisPayload,
  partitions: Record<string, unknown>,
  extra: {choices?: Map<string, SortChoice>} = {},
) =>
  evaluate({
    payload,
    models: models(partitions),
    choices: extra.choices,
    functions: CATALOG.functions,
  });

const rows = (out: ReturnType<typeof run>) => out.rows as Row[];

describe('evaluate over the example', () => {
  test('keyed refs across two shapes: every cell complete, rows ordered by best price, the declaration at /sorts/0', () => {
    const out = run(PAYLOAD, stores());
    expect(rows(out).map(r => r.name.value)).toEqual(['Lumen X100', 'Verity A7']);
    expect(rows(out).map(r => r.best)).toEqual([
      {value: 1299, contributed: 2, of: 2, absent: []},
      {value: 1799, contributed: 2, of: 2, absent: []},
    ]);
    expect(rows(out)[0]!.priceB).toEqual({value: 1349, contributed: 1, of: 1, absent: []});
    expect(out.sorts).toEqual(PAYLOAD.sorts);
    expect(Object.keys(out).sort()).toEqual(['rows', 'sorts']);
  });

  test('the shape is the derived model’s: branches keep their keys, formulas become cells', () => {
    const payload: SynthesisPayload = {
      dataModel: {
        counts: {a: {op: 'count', args: [{surface: A, pointer: '/items'}]}},
        nested: [
          {deep: {op: 'value', args: [{surface: B, pointer: '/products[sku="verity-a7"]/title'}]}},
        ],
      },
      sorts: [],
    };
    const out = run(payload, stores());
    expect(out).toEqual({
      counts: {a: {value: 1, contributed: 1, of: 1, absent: []}},
      nested: [{deep: {value: 'Verity A7 body', contributed: 1, of: 1, absent: []}}],
      sorts: [],
    });
  });

  test('a choice by array path wins while its key is an option; another key, or another path, falls back', () => {
    const byName = run(PAYLOAD, stores(), {
      choices: new Map([['/rows', {key: '/name', direction: 'desc'}]]),
    });
    expect(rows(byName).map(r => r.name.value)).toEqual(['Verity A7', 'Lumen X100']);
    expect(byName.sorts[0]).toMatchObject({key: '/name', direction: 'desc'});
    const unknownKey = run(PAYLOAD, stores(), {
      choices: new Map([['/rows', {key: '/rating', direction: 'desc'}]]),
    });
    expect(unknownKey.sorts[0]).toMatchObject({key: '/best', direction: 'asc'});
    const otherPath = run(PAYLOAD, stores(), {
      choices: new Map([['/entries', {key: '/best', direction: 'desc'}]]),
    });
    expect(rows(otherPath).map(r => r.name.value)).toEqual(['Lumen X100', 'Verity A7']);
  });

  test('absent: a drill-down drops one source, the formula computes over the rest, the gap names its surface', () => {
    const out = run(PAYLOAD, {[A]: {items: SHOP_A_ITEMS}, [B]: {detail: {sku: 'lumen-x100'}}});
    expect(rows(out)[0]!.priceB).toEqual({value: undefined, contributed: 0, of: 1, absent: [B]});
    expect(rows(out)[0]!.best).toEqual({value: 1299, contributed: 1, of: 2, absent: [B]});
  });

  test('absent: null is no value, a surface the client does not hold resolves nothing, and an ambiguous key is absent', () => {
    const out = run(PAYLOAD, {
      [A]: {items: SHOP_A_ITEMS.map(i => (i.id === 'lumen-x100' ? {...i, price: null} : i))},
    });
    // With no best price at all, the Lumen X100 row sorts last.
    const lumen = rows(out).find(r => r.name.value === 'Lumen X100')!;
    expect(rows(out).indexOf(lumen)).toBe(1);
    expect(lumen.priceA).toMatchObject({contributed: 0, absent: [A]});
    expect(lumen.best).toMatchObject({contributed: 0, absent: [A, B]});
    expect(rows(out)[0]!.priceB).toMatchObject({contributed: 0, absent: [B]});
    const twice = run(PAYLOAD, stores([SHOP_A_ITEMS[0]!, SHOP_A_ITEMS[0]!]));
    expect(rows(twice)[0]!.priceA).toMatchObject({contributed: 0, absent: [A]});
  });

  test('a formula with no refs is absent by construction, 0 of 0, naming no source', () => {
    const payload: SynthesisPayload = {
      dataModel: {none: {op: 'value', args: []}},
      sorts: [],
    };
    expect(run(payload, stores()).none).toEqual({
      value: undefined,
      contributed: 0,
      of: 0,
      absent: [],
    });
  });

  test('argmin and argmax write the winning app id', () => {
    const payload: SynthesisPayload = {
      dataModel: {
        cheapest: {
          op: 'argmin',
          args: [
            {surface: A, pointer: '/items[id="verity-a7"]/price'},
            {surface: B, pointer: '/products[sku="verity-a7"]/price'},
          ],
        },
        dearest: {
          op: 'argmax',
          args: [
            {surface: A, pointer: '/items[id="verity-a7"]/price'},
            {surface: B, pointer: '/products[sku="verity-a7"]/price'},
          ],
        },
      },
      sorts: [],
    };
    const out = run(payload, stores());
    expect((out.cheapest as CellObject).value).toBe('shop-b');
    expect((out.dearest as CellObject).value).toBe('shop-a');
  });
});

describe('a reorder under a keyed ref (task-5.10 decision 1)', () => {
  test('the values follow the keys, and no cell is marked', () => {
    // The property the collapse buys: shop A's list reversed in place re-points nothing.
    const out = run(PAYLOAD, stores(SHOP_A_REVERSED));
    expect(rows(out).map(r => r.name.value)).toEqual(['Lumen X100', 'Verity A7']);
    expect(rows(out).map(r => r.priceA.value)).toEqual([1299, 1849]);
    for (const row of rows(out))
      for (const cell of Object.values(row)) expect(cell).not.toHaveProperty('stale');
  });

  test('a key that leaves the list is absent, not silently re-pointed onto its neighbour', () => {
    const out = run(PAYLOAD, stores([SHOP_A_ITEMS[1]!]));
    const dropped = rows(out).find(r => r.name.value === undefined);
    expect(dropped?.priceA).toMatchObject({contributed: 0, absent: [A]});
  });
});

describe('sort', () => {
  // Elements are addressed by key, so the fixture rows carry one: `{k, v}` per value.
  const keyed = (values: unknown[]) => values.map((v, i) => ({k: `k${i}`, v}));
  const list = (values: unknown[]): SynthesisPayload => ({
    dataModel: {
      list: values.map((_, i) => ({
        v: {op: 'value', args: [{surface: A, pointer: `/values[k="k${i}"]/v`}]},
      })),
    },
    sorts: [{path: '/list', options: [{key: '/v', label: 'V'}], key: '/v', direction: 'asc'}],
  });
  const valuesOf = (out: ReturnType<typeof run>) =>
    (out.list as Array<{v: CellObject}>).map(e => e.v.value);

  test('numbers numerically, strings by locale, absent last in both directions, ties stable', () => {
    const numbers = [10, 2, undefined, 2, 1];
    const out = run(list(numbers), {[A]: {values: keyed(numbers)}});
    expect(valuesOf(out)).toEqual([1, 2, 2, 10, undefined]);
    const desc = run(
      list(numbers),
      {[A]: {values: keyed(numbers)}},
      {
        choices: new Map([['/list', {key: '/v', direction: 'desc'}]]),
      },
    );
    expect(valuesOf(desc)).toEqual([10, 2, 2, 1, undefined]);
    const strings = ['b', 'a', 'C'];
    expect(valuesOf(run(list(strings), {[A]: {values: keyed(strings)}}))).toEqual(['a', 'b', 'C']);
  });

  test('an array not declared in sorts keeps the model’s order', () => {
    const payload: SynthesisPayload = {...list([3, 1, 2]), sorts: []};
    expect(valuesOf(run(payload, {[A]: {values: keyed([3, 1, 2])}}))).toEqual([3, 1, 2]);
  });

  test('choiceInForce and choicesOf agree on what the sort controls write back', () => {
    const written = [{path: '/rows', options: [], key: '/name', direction: 'desc'}, {nope: 1}];
    const choices = choicesOf(written);
    expect(choices).toEqual(new Map([['/rows', {key: '/name', direction: 'desc'}]]));
    expect(choiceInForce(PAYLOAD.sorts[0]!, choices)).toEqual({key: '/name', direction: 'desc'});
    expect(choiceInForce(PAYLOAD.sorts[0]!, undefined)).toEqual({key: '/best', direction: 'asc'});
    expect(choicesOf('junk').size).toBe(0);
  });
});

test('an unknown operator, which validation is meant to catch, degrades to an absent cell rather than throwing', () => {
  const payload: SynthesisPayload = {
    dataModel: {x: {op: 'median', args: [{surface: A, pointer: '/items[id="lumen-x100"]/price'}]}},
    sorts: [],
  };
  expect(run(payload, stores()).x).toEqual({value: undefined, contributed: 0, of: 1, absent: []});
});
