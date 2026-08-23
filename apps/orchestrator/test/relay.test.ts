import {describe, expect, test} from 'vitest';
import type {Message, Task, TaskArtifactUpdateEvent, TaskStatusUpdateEvent} from '@a2a-js/sdk';
import {prepareOutgoing, relayEvent, type RelayContext} from '../src/agentsPool/relay.js';

const ctx: RelayContext = {
  taskId: 'o-task',
  contextId: 'o-ctx',
  appId: 'github',
  debugIds: false,
};

const parts: Message['parts'] = [
  {kind: 'data', data: {version: 'v0.9', createSurface: {surfaceId: 's1'}}},
];

function vendorMessage(): Message {
  return {
    kind: 'message',
    messageId: 'm1',
    role: 'agent',
    parts,
    contextId: 'v-ctx',
    taskId: 'v-task',
  };
}

describe('relayEvent', () => {
  test('task: rewrites id and contextId, rewrites nested history/status messages, keeps parts by identity', () => {
    const task: Task = {
      kind: 'task',
      id: 'v-task',
      contextId: 'v-ctx',
      status: {state: 'working', message: vendorMessage()},
      history: [vendorMessage()],
      metadata: {vendor: 'x'},
    };
    const out = relayEvent(task, ctx) as Task;
    expect(out.id).toBe('o-task');
    expect(out.contextId).toBe('o-ctx');
    expect(out.status.message?.contextId).toBe('o-ctx');
    expect(out.status.message?.taskId).toBe('o-task');
    expect(out.history?.[0].contextId).toBe('o-ctx');
    expect(out.status.message?.parts).toBe(parts);
    expect(out.history?.[0].parts).toBe(parts);
    expect(out.metadata).toEqual({vendor: 'x', a2uiverse: {source: 'github'}});
  });

  test('status-update: rewrites ids, keeps final, stamps source', () => {
    const ev: TaskStatusUpdateEvent = {
      kind: 'status-update',
      taskId: 'v-task',
      contextId: 'v-ctx',
      status: {state: 'completed', message: vendorMessage()},
      final: true,
    };
    const out = relayEvent(ev, ctx) as TaskStatusUpdateEvent;
    expect(out.taskId).toBe('o-task');
    expect(out.contextId).toBe('o-ctx');
    expect(out.final).toBe(true);
    expect(out.status.state).toBe('completed');
    expect(out.status.message?.parts).toBe(parts);
    expect(out.metadata).toEqual({a2uiverse: {source: 'github'}});
  });

  test('artifact-update: rewrites ids, artifact untouched by identity', () => {
    const artifact = {artifactId: 'a1', parts};
    const ev: TaskArtifactUpdateEvent = {
      kind: 'artifact-update',
      taskId: 'v-task',
      contextId: 'v-ctx',
      artifact,
    };
    const out = relayEvent(ev, ctx) as TaskArtifactUpdateEvent;
    expect(out.taskId).toBe('o-task');
    expect(out.contextId).toBe('o-ctx');
    expect(out.artifact).toBe(artifact);
  });

  test('message: rewrites contextId and taskId, keeps parts by identity', () => {
    const out = relayEvent(vendorMessage(), ctx) as Message;
    expect(out.contextId).toBe('o-ctx');
    expect(out.taskId).toBe('o-task');
    expect(out.parts).toBe(parts);
    expect(out.metadata).toEqual({a2uiverse: {source: 'github'}});
  });

  test('message without taskId does not gain one', () => {
    const m = vendorMessage();
    delete m.taskId;
    const out = relayEvent(m, ctx) as Message;
    expect('taskId' in out).toBe(false);
  });

  test('debug ids appear under the stamp only when enabled', () => {
    const m = vendorMessage();
    const off = relayEvent(m, ctx) as Message;
    expect(off.metadata?.a2uiverse).toEqual({source: 'github'});
    const on = relayEvent(m, {...ctx, debugIds: true}) as Message;
    expect(on.metadata?.a2uiverse).toEqual({
      source: 'github',
      vendorContextId: 'v-ctx',
      vendorTaskId: 'v-task',
    });
  });

  test('does not mutate the vendor event', () => {
    const m = vendorMessage();
    relayEvent(m, ctx);
    expect(m.contextId).toBe('v-ctx');
    expect(m.metadata).toBeUndefined();
  });
});

describe('prepareOutgoing', () => {
  const userMessage: Message = {
    kind: 'message',
    messageId: 'u1',
    role: 'user',
    parts: [{kind: 'text', text: 'hi'}],
    contextId: 'o-ctx',
    taskId: 'o-task',
    metadata: {a2uiClientDataModel: {v: 1}, a2uiForkContext: {paintId: 3}},
  };

  test('strips the orchestrator ids and sets the vendor contextId', () => {
    const {message} = prepareOutgoing(userMessage, 'v-ctx');
    expect(message.contextId).toBe('v-ctx');
    expect('taskId' in message).toBe(false);
    expect(message.parts).toBe(userMessage.parts);
    expect(message.metadata).toBe(userMessage.metadata);
  });

  test('omits contextId entirely when no vendor conversation exists yet', () => {
    const {message} = prepareOutgoing(userMessage, undefined);
    expect('contextId' in message).toBe(false);
  });
});
