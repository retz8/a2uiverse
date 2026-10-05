import type {TaskStatusUpdateEvent} from '@a2a-js/sdk';
import {describe, expect, test} from 'vitest';
import {composeFragment, retask} from '../src/composition/fragmentRelay.js';

const ctx = {source: 'github'};

function statusUpdate(parts: unknown[], final = true): TaskStatusUpdateEvent {
  return {
    kind: 'status-update',
    taskId: 't1',
    contextId: 'c1',
    final,
    status: {
      state: 'completed',
      message: {
        kind: 'message',
        messageId: 'm1',
        role: 'agent',
        parts: parts as TaskStatusUpdateEvent['status']['message'] extends infer M
          ? M extends {parts: infer P}
            ? P
            : never
          : never,
        contextId: 'c1',
        taskId: 't1',
      },
    },
    metadata: {a2uiverse: {source: 'github'}},
  };
}

const a2uiPart = (op: Record<string, unknown>) => ({
  kind: 'data' as const,
  data: {version: 'v0.9', ...op},
});

describe('composeFragment', () => {
  test('namespaces surfaceId on all four ops', () => {
    const event = statusUpdate([
      a2uiPart({createSurface: {surfaceId: 's1', catalogId: 'cat'}}),
      a2uiPart({updateComponents: {surfaceId: 's1', components: []}}),
      a2uiPart({updateDataModel: {surfaceId: 's1', path: '/', value: {}}}),
      a2uiPart({deleteSurface: {surfaceId: 's1'}}),
    ]);
    const out = composeFragment(event, ctx) as TaskStatusUpdateEvent;
    const datas = out.status.message!.parts.map(p => (p.kind === 'data' ? p.data : {}));
    expect((datas[0].createSurface as {surfaceId: string}).surfaceId).toBe('github:s1');
    expect((datas[1].updateComponents as {surfaceId: string}).surfaceId).toBe('github:s1');
    expect((datas[2].updateDataModel as {surfaceId: string}).surfaceId).toBe('github:s1');
    expect((datas[3].deleteSurface as {surfaceId: string}).surfaceId).toBe('github:s1');
  });

  test('handles the messages[] wire form', () => {
    const event = statusUpdate([
      {
        kind: 'data',
        data: {
          messages: [
            {version: 'v0.9', createSurface: {surfaceId: 's1', catalogId: 'cat'}},
            {version: 'v0.9', deleteSurface: {surfaceId: 's2'}},
          ],
        },
      },
    ]);
    const out = composeFragment(event, ctx) as TaskStatusUpdateEvent;
    const part = out.status.message!.parts[0];
    const messages = (part.kind === 'data' ? part.data : {}).messages as Array<
      Record<string, {surfaceId: string}>
    >;
    expect(messages[0].createSurface.surfaceId).toBe('github:s1');
    expect(messages[1].deleteSurface.surfaceId).toBe('github:s2');
  });

  test('leaves non-A2UI parts untouched by reference and never mutates the original', () => {
    const text = {kind: 'text' as const, text: 'hello'};
    const other = {kind: 'data' as const, data: {note: {surfaceId: 's1'}}};
    const original = statusUpdate([text, other, a2uiPart({deleteSurface: {surfaceId: 's1'}})]);
    const snapshot = structuredClone(original);
    const out = composeFragment(original, ctx) as TaskStatusUpdateEvent;
    expect(out.status.message!.parts[0]).toBe(text);
    expect(out.status.message!.parts[1]).toBe(other);
    expect(original).toEqual(snapshot);
  });

  test('namespaces the surface a paintMeta titles, as the client sees it; its title and kind kept (task 10.9)', () => {
    const paintMeta = {
      kind: 'data' as const,
      data: {paintMeta: {surfaceId: 'run-detail', title: 'Run 812', kind: 'question'}},
      metadata: {mimeType: 'application/json+a2ui-shell'},
    };
    const original = statusUpdate([paintMeta]);
    const out = composeFragment(original, ctx) as TaskStatusUpdateEvent;
    expect(out.status.message!.parts[0]).toEqual({
      ...paintMeta,
      data: {paintMeta: {surfaceId: 'github:run-detail', title: 'Run 812', kind: 'question'}},
    });
    expect(paintMeta.data.paintMeta.surfaceId).toBe('run-detail');
  });

  test('demotes a vendor final to a non-final working update, parts intact', () => {
    const event = statusUpdate([a2uiPart({createSurface: {surfaceId: 's1', catalogId: 'cat'}})]);
    const out = composeFragment(event, ctx) as TaskStatusUpdateEvent;
    expect(out.final).toBe(false);
    expect(out.status.state).toBe('working');
    expect(out.status.message!.parts).toHaveLength(1);
  });

  test('demotes a terminal task event state', () => {
    const out = composeFragment(
      {
        kind: 'task',
        id: 't1',
        contextId: 'c1',
        status: {state: 'completed'},
      },
      ctx,
    );
    expect(out.kind).toBe('task');
    expect((out as {status: {state: string}}).status.state).toBe('working');
  });

  test('stamp gains role while keeping source and existing keys', () => {
    const event = statusUpdate([]);
    event.metadata = {a2uiverse: {source: 'github', vendorTaskId: 'vt'}};
    const out = composeFragment(event, ctx);
    expect(out.metadata?.a2uiverse).toEqual({
      source: 'github',
      vendorTaskId: 'vt',
      role: 'fragment',
    });
  });
});

test('the stamp carries source and role, and no generations', () => {
  const out = composeFragment(statusUpdate([], false), {source: 'shop-a'});
  expect(out.metadata?.a2uiverse).toEqual({source: 'shop-a', role: 'fragment'});
});

describe('retask', () => {
  test('moves an event onto another task, its parts and stamp untouched (task-8.4 decision 15)', () => {
    const event: TaskStatusUpdateEvent = {
      kind: 'status-update',
      taskId: 'plan',
      contextId: 'ctx',
      final: false,
      status: {
        state: 'working',
        message: {
          kind: 'message',
          messageId: 'm',
          role: 'agent',
          taskId: 'plan',
          contextId: 'ctx',
          parts: [{kind: 'data', data: {version: 'v0.9', createSurface: {surfaceId: 'gmail:s1'}}}],
        },
      },
      metadata: {a2uiverse: {source: 'gmail', role: 'fragment'}},
    };
    const moved = retask(event, 'retry') as TaskStatusUpdateEvent;
    expect(moved.taskId).toBe('retry');
    expect(moved.status.message!.taskId).toBe('retry');
    expect(moved.status.message!.parts).toBe(event.status.message!.parts);
    expect(moved.metadata).toEqual(event.metadata);
    expect(event.taskId).toBe('plan');
  });
});
