/**
 * Partitions: the orchestrator's materialized copy of every vendor surface's data model, with
 * the generation rule of task-4.4 decision 3 — compare against the last-synthesis snapshot;
 * arrays present in both with different contents bump, a missing array is absent (no bump),
 * an identical array is nothing.
 */
import type {TaskStatusUpdateEvent} from '@a2a-js/sdk';
import {describe, expect, test} from 'vitest';
import {Partitions} from '../src/composition/partitions.js';

function paint(...ops: Array<Record<string, unknown>>): TaskStatusUpdateEvent {
  return {
    kind: 'status-update',
    taskId: 't',
    contextId: 'c',
    final: false,
    status: {
      state: 'working',
      message: {
        kind: 'message',
        messageId: 'm',
        role: 'agent',
        parts: ops.map(op => ({kind: 'data' as const, data: {version: 'v0.9', ...op}})),
      },
    },
  };
}

const S = 'shop-a:list';
const items = [
  {id: 'x100', price: 899},
  {id: 'x200', price: 1299},
];

function fresh(): Partitions {
  const p = new Partitions();
  p.apply(paint({createSurface: {surfaceId: S, catalogId: 'cat'}}));
  p.apply(paint({updateDataModel: {surfaceId: S, path: '/items', value: items}}));
  return p;
}

describe('materialization', () => {
  test('createSurface then updateDataModel builds the model at the path', () => {
    const p = fresh();
    expect(p.get(S)).toEqual({items});
    expect(p.resolve({surface: S, pointer: '/items/1/price'})).toEqual({found: true, value: 1299});
  });

  test('a rootless updateDataModel replaces the whole model; the messages[] form is read too', () => {
    const p = new Partitions();
    const event = paint();
    event.status.message!.parts = [
      {
        kind: 'data',
        data: {
          messages: [
            {version: 'v0.9', createSurface: {surfaceId: S, catalogId: 'cat'}},
            {version: 'v0.9', updateDataModel: {surfaceId: S, value: {items, note: 'hi'}}},
          ],
        },
      },
    ];
    p.apply(event);
    expect(p.get(S)).toEqual({items, note: 'hi'});
  });

  test('deleteSurface removes the model; refs into it stop resolving', () => {
    const p = fresh();
    p.apply(paint({deleteSurface: {surfaceId: S}}));
    expect(p.get(S)).toBeUndefined();
    expect(p.resolve({surface: S, pointer: '/items/0/price'})).toEqual({found: false});
  });

  test('pointers follow RFC 6901: escapes and the empty pointer', () => {
    const p = new Partitions();
    p.apply(paint({createSurface: {surfaceId: S, catalogId: 'cat'}}));
    p.apply(paint({updateDataModel: {surfaceId: S, value: {'a/b': {'m~n': 1}}}}));
    expect(p.resolve({surface: S, pointer: '/a~1b/m~0n'})).toEqual({found: true, value: 1});
    expect(p.resolve({surface: S, pointer: ''})).toEqual({found: true, value: {'a/b': {'m~n': 1}}});
    expect(p.resolve({surface: 'nope:x', pointer: '/a'})).toEqual({found: false});
  });
});

describe('generations (task-4.4 decision 3)', () => {
  test('before any snapshot, every change to a surface bumps it (arrival, §5 t5)', () => {
    const p = new Partitions();
    p.apply(paint({createSurface: {surfaceId: S, catalogId: 'cat'}}));
    expect(p.generation(S)).toBe(0);
    p.apply(paint({updateDataModel: {surfaceId: S, path: '/items', value: items}}));
    expect(p.generation(S)).toBe(1);
    p.apply(paint({updateDataModel: {surfaceId: S, path: '/note', value: 'x'}}));
    expect(p.generation(S)).toBe(2);
  });

  test('after a snapshot, an in-place reorder of an array bumps — the re-pointing hazard', () => {
    const p = fresh();
    p.snapshot();
    const g = p.generation(S);
    p.apply(paint({updateDataModel: {surfaceId: S, path: '/items', value: [items[1], items[0]]}}));
    expect(p.generation(S)).toBe(g + 1);
  });

  test('after a snapshot, a scalar edit outside any array does not bump', () => {
    const p = fresh();
    p.snapshot();
    const g = p.generation(S);
    p.apply(paint({updateDataModel: {surfaceId: S, path: '/note', value: 'hello'}}));
    expect(p.generation(S)).toBe(g);
  });

  test('a leaf edit inside an array element is array content and bumps (decision 3: arrays, contents)', () => {
    // Without keys, a changed element is indistinguishable from a re-pointed one; the floor is conservative.
    const p = fresh();
    p.snapshot();
    const g = p.generation(S);
    p.apply(paint({updateDataModel: {surfaceId: S, path: '/items/0/price', value: 879}}));
    expect(p.generation(S)).toBe(g + 1);
  });

  test('an element appended or removed changes the index space and bumps', () => {
    const p = fresh();
    p.snapshot();
    const g = p.generation(S);
    p.apply(paint({updateDataModel: {surfaceId: S, path: '/items', value: [items[0]]}}));
    expect(p.generation(S)).toBe(g + 1);
  });

  test('drill-down: the array disappears — absent, no bump; return with the same data — free', () => {
    const p = fresh();
    p.snapshot();
    const g = p.generation(S);
    p.apply(paint({updateDataModel: {surfaceId: S, value: {detail: {id: 'x100'}}}}));
    expect(p.generation(S)).toBe(g);
    expect(p.resolve({surface: S, pointer: '/items/0/price'})).toEqual({found: false});
    p.apply(paint({updateDataModel: {surfaceId: S, value: {items}}}));
    expect(p.generation(S)).toBe(g);
    expect(p.resolve({surface: S, pointer: '/items/0/price'})).toEqual({found: true, value: 899});
  });

  test('return from a drill-down with reordered data bumps', () => {
    const p = fresh();
    p.snapshot();
    const g = p.generation(S);
    p.apply(paint({updateDataModel: {surfaceId: S, value: {detail: {}}}}));
    p.apply(paint({updateDataModel: {surfaceId: S, value: {items: [items[1], items[0]]}}}));
    expect(p.generation(S)).toBe(g + 1);
  });

  test('the client data model returning with a reordered array bumps like a vendor update', () => {
    const p = fresh();
    p.snapshot();
    const g = p.generation(S);
    p.applyClientDataModel({[S]: {items: [items[1], items[0]]}});
    expect(p.generation(S)).toBe(g + 1);
    expect(p.applyClientDataModel({['other:s']: {x: 1}})).toEqual([]);
  });

  test('generationsOf reports the touched surfaces only; generations reports all', () => {
    const p = fresh();
    p.apply(paint({createSurface: {surfaceId: 'shop-b:list', catalogId: 'cat'}}));
    expect(p.generationsOf([S])).toEqual({[S]: 1});
    expect(p.generations()).toEqual({[S]: 1, 'shop-b:list': 0});
  });

  test('apply returns the namespaced surfaces the event changed', () => {
    const p = fresh();
    expect(p.apply(paint({updateDataModel: {surfaceId: S, path: '/note', value: 1}}))).toEqual([S]);
    expect(p.apply(paint({updateComponents: {surfaceId: S, components: []}}))).toEqual([]);
  });
});
