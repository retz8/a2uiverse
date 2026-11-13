import {describe, expect, test} from 'vitest';
import type {Part} from '@a2a-js/sdk';
import {dataPart, textPart} from '../src/a2a/parts.js';
import {workingUpdate, type WireEvent} from '../src/a2a/wire.js';
import {emptyTouches, mergeTouches, touchesOf} from '../src/journal/surfaces.js';

const a2ui = (op: Record<string, unknown>): Part => dataPart({version: 'v0.9', ...op});

function statusUpdate(parts: Part[]): WireEvent {
  return workingUpdate({taskId: 't', contextId: 'c'}, {parts});
}

describe('touchesOf', () => {
  test('collects created, updated and deleted surface ids from a status update', () => {
    const ev = statusUpdate([
      a2ui({createSurface: {surfaceId: 's1', catalogId: 'c'}}),
      a2ui({updateComponents: {surfaceId: 's1', components: []}}),
      a2ui({updateDataModel: {surfaceId: 's2'}}),
      a2ui({deleteSurface: {surfaceId: 's3'}}),
    ]);
    expect(touchesOf(ev)).toEqual({created: ['s1'], updated: ['s1', 's2'], deleted: ['s3']});
  });

  test('reads an artifact update’s parts', () => {
    const artifact: WireEvent = {
      kind: 'artifactUpdate',
      data: {
        taskId: 't',
        contextId: 'c',
        artifact: {
          artifactId: 'x',
          name: '',
          description: '',
          parts: [a2ui({updateDataModel: {surfaceId: 'd'}})],
          metadata: undefined,
          extensions: [],
        },
        append: false,
        lastChunk: false,
        metadata: undefined,
      },
    };
    expect(touchesOf(artifact).updated).toEqual(['d']);
  });

  test('ignores non-A2UI data parts and text parts', () => {
    const ev = statusUpdate([textPart('hello'), dataPart({paintMeta: {surfaceId: 'nope'}})]);
    expect(touchesOf(ev)).toEqual(emptyTouches());
  });

  test('accepts the spec array form under data.messages', () => {
    const ev = statusUpdate([
      dataPart({messages: [{version: 'v0.9.1', createSurface: {surfaceId: 'arr'}}]}),
    ]);
    expect(touchesOf(ev).created).toEqual(['arr']);
  });

  test('does not mutate the event', () => {
    const ev = statusUpdate([a2ui({createSurface: {surfaceId: 's1'}})]);
    const snapshot = JSON.stringify(ev);
    touchesOf(ev);
    expect(JSON.stringify(ev)).toBe(snapshot);
  });
});

describe('mergeTouches', () => {
  test('concatenates without duplicates', () => {
    const merged = mergeTouches(
      {created: ['s1'], updated: ['s1'], deleted: []},
      {created: ['s1', 's2'], updated: [], deleted: ['s3']},
    );
    expect(merged).toEqual({created: ['s1', 's2'], updated: ['s1'], deleted: ['s3']});
  });
});
