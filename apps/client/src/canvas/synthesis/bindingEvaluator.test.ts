/**
 * The BindingEvaluator as a table (task-4.5 decision 1): wiring + partitions + generations +
 * sort in, the synthesis surface's data model out. The live-produced wiring from the 4.4 handoff
 * is the headline fixture.
 */
import {describe, expect, test} from 'vitest';
import type {SynthesisWiring} from '@a2uiverse/sdk';
import {CATALOG} from '@a2uiverse/shell-catalog';
import {evaluate, resolvePointer} from './bindingEvaluator';

const A = 'shop-a:list';
const B = 'shop-b:list';

/** The wiring Gemini produced live against two storefronts (handoff for 4.5). */
const LIVE_WIRING: SynthesisWiring = {
  fields: [
    {name: 'name', label: 'Camera Model'},
    {name: 'shopA_price', label: 'Shop A Price'},
    {name: 'shopB_price', label: 'Shop B Price'},
    {name: 'best_price', label: 'Best Price'},
  ],
  entities: [0, 1].map(i => ({
    cells: [
      {op: 'value', args: [{surface: A, pointer: `/items/${i}/name`}]},
      {op: 'value', args: [{surface: A, pointer: `/items/${i}/price`}]},
      {op: 'value', args: [{surface: B, pointer: `/items/${i}/price`}]},
      {
        op: 'min',
        args: [
          {surface: A, pointer: `/items/${i}/price`},
          {surface: B, pointer: `/items/${i}/price`},
        ],
      },
    ],
  })),
  sort: {field: 'best_price', direction: 'asc'},
  computedAgainst: {[A]: 1, [B]: 1},
};

const shopA = {
  items: [
    {name: 'X100', price: 949},
    {name: 'Z6', price: 1899},
  ],
};
const shopB = {
  items: [
    {name: 'X100', price: 899},
    {name: 'Z6', price: 1999},
  ],
};

const models = (partitions: Record<string, unknown>) => (surface: string) => partitions[surface];

const run = (
  wiring: SynthesisWiring,
  partitions: Record<string, unknown>,
  extra: {
    generations?: Record<string, number>;
    sort?: {field: string; direction: 'asc' | 'desc'};
  } = {},
) =>
  evaluate({
    wiring,
    models: models(partitions),
    generations: extra.generations ?? {},
    sort: extra.sort,
    functions: CATALOG.functions,
  });

describe('resolvePointer', () => {
  test('walks objects and arrays by RFC 6901, unescaping ~1 and ~0', () => {
    const root = {items: [{name: 'X100', 'a/b': 1, 'c~d': 2}]};
    expect(resolvePointer(root, '')).toBe(root);
    expect(resolvePointer(root, '/items/0/name')).toBe('X100');
    expect(resolvePointer(root, '/items/0/a~1b')).toBe(1);
    expect(resolvePointer(root, '/items/0/c~0d')).toBe(2);
  });

  test('is undefined for a missing key, an out-of-range or non-numeric index, or a primitive parent', () => {
    const root = {items: [{name: 'X100'}], n: 1};
    expect(resolvePointer(root, '/items/1/name')).toBeUndefined();
    expect(resolvePointer(root, '/items/x/name')).toBeUndefined();
    expect(resolvePointer(root, '/missing')).toBeUndefined();
    expect(resolvePointer(root, '/n/deeper')).toBeUndefined();
    expect(resolvePointer(undefined, '/items')).toBeUndefined();
  });
});

describe('evaluate', () => {
  test('the live wiring over both storefronts: every cell complete, entities ordered by best price', () => {
    const out = run(LIVE_WIRING, {[A]: shopA, [B]: shopB});
    expect(out.sort).toEqual({field: 'best_price', direction: 'asc', fields: LIVE_WIRING.fields});
    expect(out.entities.map(e => e.name.value)).toEqual(['X100', 'Z6']);
    expect(out.entities[0]).toEqual({
      name: {value: 'X100', contributed: 1, of: 1, absent: []},
      shopA_price: {value: 949, contributed: 1, of: 1, absent: []},
      shopB_price: {value: 899, contributed: 1, of: 1, absent: []},
      best_price: {value: 899, contributed: 2, of: 2, absent: []},
    });
    expect(out.entities[1].best_price).toEqual({value: 1899, contributed: 2, of: 2, absent: []});
  });

  test('descending sort reverses; a direction on the same field is honoured', () => {
    const out = run(
      LIVE_WIRING,
      {[A]: shopA, [B]: shopB},
      {sort: {field: 'best_price', direction: 'desc'}},
    );
    expect(out.entities.map(e => e.name.value)).toEqual(['Z6', 'X100']);
    expect(out.sort.direction).toBe('desc');
  });

  test('a user sort on a declared field wins over the wiring; on an undeclared field the wiring wins', () => {
    const byName = run(
      LIVE_WIRING,
      {[A]: shopA, [B]: shopB},
      {sort: {field: 'name', direction: 'desc'}},
    );
    expect(byName.sort.field).toBe('name');
    expect(byName.entities.map(e => e.name.value)).toEqual(['Z6', 'X100']);
    const gone = run(
      LIVE_WIRING,
      {[A]: shopA, [B]: shopB},
      {sort: {field: 'rating', direction: 'desc'}},
    );
    expect(gone.sort).toMatchObject({field: 'best_price', direction: 'asc'});
  });

  test('absent: an unresolvable ref drops out, the formula computes over the rest, the gap names its surface', () => {
    // Shop B drilled down: its list is gone.
    const out = run(LIVE_WIRING, {[A]: shopA, [B]: {detail: {name: 'X100'}}});
    expect(out.entities[0].shopB_price).toEqual({
      value: undefined,
      contributed: 0,
      of: 1,
      absent: [B],
    });
    expect(out.entities[0].best_price).toEqual({value: 949, contributed: 1, of: 2, absent: [B]});
  });

  test('absent: a cell with no refs is absent by construction, 0 of 0, naming no source (task 4.8)', () => {
    const notCarried = structuredClone(LIVE_WIRING);
    notCarried.entities[0].cells[2] = {op: 'value', args: []};
    const out = run(notCarried, {[A]: shopA, [B]: shopB});
    expect(out.entities.find(e => e.name.value === 'X100')?.shopB_price).toEqual({
      value: undefined,
      contributed: 0,
      of: 0,
      absent: [],
    });
  });

  test('absent: null is no value, and a surface the client does not hold resolves nothing', () => {
    const out = run(LIVE_WIRING, {
      [A]: {
        items: [
          {name: 'X100', price: null},
          {name: 'Z6', price: 1899},
        ],
      },
    });
    expect(out.entities.find(e => e.name.value === 'X100')?.best_price).toEqual({
      value: undefined,
      contributed: 0,
      of: 2,
      absent: [A, B],
    });
    expect(out.entities.find(e => e.name.value === 'Z6')?.best_price).toEqual({
      value: 1899,
      contributed: 1,
      of: 2,
      absent: [B],
    });
  });

  test('argmin and argmax write the winning app id', () => {
    const wiring: SynthesisWiring = {
      fields: [
        {name: 'cheapest', label: 'Cheapest at'},
        {name: 'dearest', label: 'Dearest at'},
      ],
      entities: [
        {
          cells: [
            {
              op: 'argmin',
              args: [
                {surface: A, pointer: '/items/0/price'},
                {surface: B, pointer: '/items/0/price'},
              ],
            },
            {
              op: 'argmax',
              args: [
                {surface: A, pointer: '/items/0/price'},
                {surface: B, pointer: '/items/0/price'},
              ],
            },
          ],
        },
      ],
      sort: {field: 'cheapest', direction: 'asc'},
      computedAgainst: {[A]: 1, [B]: 1},
    };
    const out = run(wiring, {[A]: shopA, [B]: shopB});
    expect(out.entities[0].cheapest.value).toBe('shop-b');
    expect(out.entities[0].dearest.value).toBe('shop-a');
    // The index maps back over the *surviving* refs: with A absent, B is index 0.
    const partial = run(wiring, {[B]: shopB});
    expect(partial.entities[0].cheapest).toEqual({
      value: 'shop-b',
      contributed: 1,
      of: 2,
      absent: [A],
    });
  });

  test('stale: a generation newer or older than computedAgainst marks every cell with a ref into that surface', () => {
    const newer = run(LIVE_WIRING, {[A]: shopA, [B]: shopB}, {generations: {[A]: 2, [B]: 1}});
    expect(newer.entities[0].shopA_price.stale).toBe(true);
    expect(newer.entities[0].best_price.stale).toBe(true);
    expect(newer.entities[0].shopB_price.stale).toBeUndefined();
    const older = run(LIVE_WIRING, {[A]: shopA, [B]: shopB}, {generations: {[A]: 0, [B]: 1}});
    expect(older.entities[0].name.stale).toBe(true);
  });

  test('stale: a surface never stamped counts as matched', () => {
    const out = run(LIVE_WIRING, {[A]: shopA, [B]: shopB}, {generations: {[B]: 1}});
    expect(out.entities.every(e => Object.values(e).every(c => c.stale === undefined))).toBe(true);
  });

  test('sort: numbers numerically, strings by locale, absent last in both directions, ties stable', () => {
    const wiring: SynthesisWiring = {
      fields: [
        {name: 'n', label: 'N'},
        {name: 'price', label: 'Price'},
      ],
      entities: [0, 1, 2, 3].map(i => ({
        cells: [
          {op: 'value', args: [{surface: A, pointer: `/items/${i}/name`}]},
          {op: 'value', args: [{surface: A, pointer: `/items/${i}/price`}]},
        ],
      })),
      sort: {field: 'price', direction: 'asc'},
      computedAgainst: {[A]: 1},
    };
    const partition = {
      items: [{name: 'b', price: 10}, {name: 'a'}, {name: 'c', price: 9}, {name: 'd', price: 10}],
    };
    const asc = run(wiring, {[A]: partition});
    expect(asc.entities.map(e => e.n.value)).toEqual(['c', 'b', 'd', 'a']);
    const desc = run(wiring, {[A]: partition}, {sort: {field: 'price', direction: 'desc'}});
    expect(desc.entities.map(e => e.n.value)).toEqual(['b', 'd', 'c', 'a']);
    const byName = run(wiring, {[A]: partition}, {sort: {field: 'n', direction: 'asc'}});
    expect(byName.entities.map(e => e.n.value)).toEqual(['a', 'b', 'c', 'd']);
  });

  test('an unknown operator, which validation is meant to catch, degrades to an absent cell rather than throwing', () => {
    const wiring: SynthesisWiring = {
      ...LIVE_WIRING,
      entities: [{cells: LIVE_WIRING.entities[0].cells.map(c => ({...c, op: 'median'}))}],
    };
    const out = run(wiring, {[A]: shopA, [B]: shopB});
    expect(out.entities[0].best_price).toMatchObject({value: undefined, contributed: 0, of: 2});
  });
});
