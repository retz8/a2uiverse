import type {TaskStatusUpdateEvent} from '@a2a-js/sdk';
import {describe, expect, test} from 'vitest';
import {composeFragment} from '../src/composition/fragmentRelay.js';

const ctx = {appId: 'github', slot: 'slot-github'};

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
    const paintMeta = {kind: 'data' as const, data: {paintMeta: {surfaceId: 's1'}}};
    const original = statusUpdate([text, paintMeta, a2uiPart({deleteSurface: {surfaceId: 's1'}})]);
    const snapshot = structuredClone(original);
    const out = composeFragment(original, ctx) as TaskStatusUpdateEvent;
    expect(out.status.message!.parts[0]).toBe(text);
    expect(out.status.message!.parts[1]).toBe(paintMeta);
    expect(original).toEqual(snapshot);
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

  test('stamp gains slot and role while keeping source and existing keys', () => {
    const event = statusUpdate([]);
    event.metadata = {a2uiverse: {source: 'github', vendorTaskId: 'vt'}};
    const out = composeFragment(event, ctx);
    expect(out.metadata?.a2uiverse).toEqual({
      source: 'github',
      vendorTaskId: 'vt',
      slot: 'slot-github',
      role: 'fragment',
    });
  });
});

describe('generations on the stamp (4.2 decisions 3, 10)', () => {
  test('the stamp carries the per-surface generations the executor hands it', () => {
    const event = statusUpdate([], false);
    const out = composeFragment(event, {
      appId: 'shop-a',
      slot: 'slot-shop-a',
      generations: {'shop-a:list': 2},
    }) as TaskStatusUpdateEvent;
    expect(out.metadata?.a2uiverse).toEqual({
      source: 'shop-a',
      slot: 'slot-shop-a',
      role: 'fragment',
      generations: {'shop-a:list': 2},
    });
  });

  test('no generations, no field — the shell and untouched events stay as before', () => {
    const out = composeFragment(statusUpdate([], false), {appId: 'shop-a', slot: 'slot-shop-a'});
    expect(out.metadata?.a2uiverse).toEqual({
      source: 'shop-a',
      slot: 'slot-shop-a',
      role: 'fragment',
    });
    const empty = composeFragment(statusUpdate([], false), {
      appId: 'shop-a',
      slot: 's',
      generations: {},
    });
    expect(empty.metadata?.a2uiverse).not.toHaveProperty('generations');
  });
});
