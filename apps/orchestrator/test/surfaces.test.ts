import {describe, expect, test} from 'vitest';
import type {Message, Task, TaskArtifactUpdateEvent, TaskStatusUpdateEvent} from '@a2a-js/sdk';
import {emptyTouches, mergeTouches, touchesOf} from '../src/journal/surfaces.js';

const a2ui = (op: Record<string, unknown>): Message['parts'][number] => ({
  kind: 'data',
  data: {version: 'v0.9', ...op},
});

function statusUpdate(parts: Message['parts']): TaskStatusUpdateEvent {
  return {
    kind: 'status-update',
    taskId: 't',
    contextId: 'c',
    final: false,
    status: {state: 'working', message: {kind: 'message', messageId: 'm', role: 'agent', parts}},
  };
}

describe('touchesOf', () => {
  test('collects created, updated and deleted surface ids from a status-update', () => {
    const ev = statusUpdate([
      a2ui({createSurface: {surfaceId: 's1', catalogId: 'c'}}),
      a2ui({updateComponents: {surfaceId: 's1', components: []}}),
      a2ui({updateDataModel: {surfaceId: 's2'}}),
      a2ui({deleteSurface: {surfaceId: 's3'}}),
    ]);
    expect(touchesOf(ev)).toEqual({created: ['s1'], updated: ['s1', 's2'], deleted: ['s3']});
  });

  test('reads a task status message, a plain message and artifact parts', () => {
    const task: Task = {
      kind: 'task',
      id: 't',
      contextId: 'c',
      status: {
        state: 'working',
        message: {
          kind: 'message',
          messageId: 'm',
          role: 'agent',
          parts: [a2ui({createSurface: {surfaceId: 'a'}})],
        },
      },
    };
    const message: Message = {
      kind: 'message',
      messageId: 'm',
      role: 'agent',
      parts: [a2ui({deleteSurface: {surfaceId: 'b'}})],
    };
    const artifact: TaskArtifactUpdateEvent = {
      kind: 'artifact-update',
      taskId: 't',
      contextId: 'c',
      artifact: {artifactId: 'x', parts: [a2ui({updateDataModel: {surfaceId: 'd'}})]},
    };
    expect(touchesOf(task).created).toEqual(['a']);
    expect(touchesOf(message).deleted).toEqual(['b']);
    expect(touchesOf(artifact).updated).toEqual(['d']);
  });

  test('ignores non-A2UI data parts and text parts', () => {
    const ev = statusUpdate([
      {kind: 'text', text: 'hello'},
      {kind: 'data', data: {paintMeta: {surfaceId: 'nope'}}},
    ]);
    expect(touchesOf(ev)).toEqual(emptyTouches());
  });

  test('accepts the spec array form under data.messages', () => {
    const ev = statusUpdate([
      {
        kind: 'data',
        data: {messages: [{version: 'v0.9.1', createSurface: {surfaceId: 'arr'}}]},
      },
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
