/**
 * Partitions: the orchestrator's materialized copy of every vendor surface's data model — the
 * Synthesizer's input and what refs resolve against.
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

describe('root updates', () => {
  test("an update at path '/' — A2UI's default, meaning the root — replaces the whole model", () => {
    const p = new Partitions();
    p.apply(paint({createSurface: {surfaceId: S, catalogId: 'c'}}));
    p.apply(paint({updateDataModel: {surfaceId: S, path: '/', value: {items: [{name: 'X100'}]}}}));
    expect(p.entries()).toEqual([[S, {items: [{name: 'X100'}]}]]);
    expect(p.resolve({surface: S, pointer: '/items[name="X100"]/name'})).toEqual({
      found: true,
      value: 'X100',
    });
  });
  test('an update with no path is the root too', () => {
    const p = new Partitions();
    p.apply(paint({createSurface: {surfaceId: S, catalogId: 'c'}}));
    p.apply(paint({updateDataModel: {surfaceId: S, value: {items: []}}}));
    expect(p.resolve({surface: S, pointer: '/items'})).toEqual({found: true, value: []});
  });
});
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
    expect(p.resolve({surface: S, pointer: '/items[id="x200"]/price'})).toEqual({
      found: true,
      value: 1299,
    });
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
    expect(p.resolve({surface: S, pointer: '/items[id="x100"]/price'})).toMatchObject({
      found: false,
    });
  });

  test("a source's later surface retires its earlier one, as the client's slot does (SPEC §4.1)", () => {
    const p = fresh();
    const detail = 'shop-a:detail';
    // The vendor paints a detail as a new surface and never deletes its list.
    p.apply(
      paint(
        {createSurface: {surfaceId: detail, catalogId: 'c'}},
        {updateDataModel: {surfaceId: detail, value: {item: {id: 'x100'}}}},
      ),
    );
    expect(p.has(S)).toBe(false);
    expect(p.resolve({surface: S, pointer: '/items[id="x100"]/price'})).toMatchObject({
      found: false,
    });
    expect(p.get(detail)).toEqual({item: {id: 'x100'}});
    // Another app's surface stands, and a repeat create of the same surface retires nothing else.
    p.apply(paint({createSurface: {surfaceId: 'shop-b:list', catalogId: 'c'}}));
    p.apply(paint({createSurface: {surfaceId: detail, catalogId: 'c'}}));
    expect(p.has('shop-b:list')).toBe(true);
    expect(p.has(detail)).toBe(true);
  });

  test('pointers follow RFC 6901: escapes and the empty pointer', () => {
    const p = new Partitions();
    p.apply(paint({createSurface: {surfaceId: S, catalogId: 'cat'}}));
    p.apply(paint({updateDataModel: {surfaceId: S, value: {'a/b': {'m~n': 1}}}}));
    expect(p.resolve({surface: S, pointer: '/a~1b/m~0n'})).toEqual({found: true, value: 1});
    expect(p.resolve({surface: S, pointer: ''})).toEqual({found: true, value: {'a/b': {'m~n': 1}}});
    expect(p.resolve({surface: 'nope:x', pointer: '/a'})).toMatchObject({found: false});
  });
});

describe('changes', () => {
  test('the client data model returning changed replaces the model; an unknown surface is ignored', () => {
    const p = fresh();
    expect(p.applyClientDataModel({[S]: {items: [items[1], items[0]]}})).toEqual([S]);
    expect(p.resolve({surface: S, pointer: '/items[id="x100"]/price'})).toEqual({
      found: true,
      value: 899,
    });
    expect(p.applyClientDataModel({['other:s']: {x: 1}})).toEqual([]);
  });

  test('the partitions hold no generations', () => {
    expect('generation' in new Partitions()).toBe(false);
  });

  test('apply returns the namespaced surfaces the event changed', () => {
    const p = fresh();
    expect(p.apply(paint({updateDataModel: {surfaceId: S, path: '/note', value: 1}}))).toEqual([S]);
    expect(p.apply(paint({updateComponents: {surfaceId: S, components: []}}))).toEqual([]);
  });
});

describe('what changed since a snapshot (task-8.10 decision 2)', () => {
  const sources = new Set(['shop-a']);

  test('the same data painted again is no change; a value that moved is', () => {
    const p = fresh();
    const before = p.snapshot(sources);
    p.apply(
      paint({updateDataModel: {surfaceId: S, path: '/items', value: structuredClone(items)}}),
    );
    expect(p.changedSince(before, sources)).toEqual([]);
    p.apply(paint({updateDataModel: {surfaceId: S, path: '/items', value: [items[0]]}}));
    expect(p.changedSince(before, sources)).toEqual([S]);
  });

  test('a surface painted in place of the one it replaced is a change to both', () => {
    const p = fresh();
    const before = p.snapshot(sources);
    p.apply(paint({createSurface: {surfaceId: 'shop-a:detail', catalogId: 'c'}}));
    expect(p.changedSince(before, sources).sort()).toEqual(['shop-a:detail', S]);
  });

  test('only the sources asked about', () => {
    const p = fresh();
    const before = p.snapshot(new Set(['shop-b']));
    p.apply(paint({updateDataModel: {surfaceId: S, path: '/note', value: 1}}));
    expect(p.changedSince(before, new Set(['shop-b']))).toEqual([]);
  });
});
