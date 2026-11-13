import {describe, expect, test} from 'vitest';
import {TaskState, type Artifact, type Message, type Part} from '@a2a-js/sdk';
import {agentMessage, dataPart, textPart, userMessage} from '../src/a2a/parts.js';
import {
  prepareOutgoing,
  relayEvent,
  type RelayContext,
  type VendorEvent,
} from '../src/agentsPool/relay.js';

const ctx: RelayContext = {
  taskId: 'o-task',
  contextId: 'o-ctx',
  source: 'github',
  debugIds: false,
};

const parts: Part[] = [dataPart({version: 'v0.9', createSurface: {surfaceId: 's1'}})];

function vendorMessage(): Message {
  return {...agentMessage(parts, {contextId: 'v-ctx', taskId: 'v-task'}), messageId: 'm1'};
}

const messageEvent = (message: Message): VendorEvent => ({
  payload: {$case: 'message', value: message},
});

/** The value an event carries, whichever its case. */
function valueOf<C extends NonNullable<VendorEvent['payload']>['$case']>(
  event: VendorEvent,
  $case: C,
): Extract<NonNullable<VendorEvent['payload']>, {$case: C}>['value'] {
  if (event.payload?.$case !== $case) throw new Error(`not a ${$case} event`);
  return event.payload.value as Extract<NonNullable<VendorEvent['payload']>, {$case: C}>['value'];
}

describe('relayEvent', () => {
  test('task: rewrites id and contextId, rewrites nested history/status messages, keeps parts by identity', () => {
    const task: VendorEvent = {
      payload: {
        $case: 'task',
        value: {
          id: 'v-task',
          contextId: 'v-ctx',
          status: {
            state: TaskState.TASK_STATE_WORKING,
            message: vendorMessage(),
            timestamp: undefined,
          },
          artifacts: [],
          history: [vendorMessage()],
          metadata: {vendor: 'x'},
        },
      },
    };
    const out = valueOf(relayEvent(task, ctx), 'task');
    expect(out.id).toBe('o-task');
    expect(out.contextId).toBe('o-ctx');
    expect(out.status?.message?.contextId).toBe('o-ctx');
    expect(out.status?.message?.taskId).toBe('o-task');
    expect(out.history[0].contextId).toBe('o-ctx');
    expect(out.status?.message?.parts).toBe(parts);
    expect(out.history[0].parts).toBe(parts);
    expect(out.metadata).toEqual({vendor: 'x', a2uiverse: {source: 'github'}});
  });

  test('status update: rewrites ids, keeps the state, stamps source', () => {
    const ev: VendorEvent = {
      payload: {
        $case: 'statusUpdate',
        value: {
          taskId: 'v-task',
          contextId: 'v-ctx',
          status: {
            state: TaskState.TASK_STATE_COMPLETED,
            message: vendorMessage(),
            timestamp: undefined,
          },
          metadata: undefined,
        },
      },
    };
    const out = valueOf(relayEvent(ev, ctx), 'statusUpdate');
    expect(out.taskId).toBe('o-task');
    expect(out.contextId).toBe('o-ctx');
    expect(out.status?.state).toBe(TaskState.TASK_STATE_COMPLETED);
    expect(out.status?.message?.parts).toBe(parts);
    expect(out.metadata).toEqual({a2uiverse: {source: 'github'}});
  });

  test('artifact update: rewrites ids, artifact untouched by identity', () => {
    const artifact: Artifact = {
      artifactId: 'a1',
      name: '',
      description: '',
      parts,
      metadata: undefined,
      extensions: [],
    };
    const ev: VendorEvent = {
      payload: {
        $case: 'artifactUpdate',
        value: {
          taskId: 'v-task',
          contextId: 'v-ctx',
          artifact,
          append: false,
          lastChunk: false,
          metadata: undefined,
        },
      },
    };
    const out = valueOf(relayEvent(ev, ctx), 'artifactUpdate');
    expect(out.taskId).toBe('o-task');
    expect(out.contextId).toBe('o-ctx');
    expect(out.artifact).toBe(artifact);
  });

  test('message: rewrites contextId and taskId, keeps parts by identity', () => {
    const out = valueOf(relayEvent(messageEvent(vendorMessage()), ctx), 'message');
    expect(out.contextId).toBe('o-ctx');
    expect(out.taskId).toBe('o-task');
    expect(out.parts).toBe(parts);
    expect(out.metadata).toEqual({a2uiverse: {source: 'github'}});
  });

  test('message without taskId does not gain one', () => {
    const m = {...vendorMessage(), taskId: ''};
    const out = valueOf(relayEvent(messageEvent(m), ctx), 'message');
    expect(out.taskId).toBe('');
  });

  test('debug ids appear under the stamp only when enabled', () => {
    const m = messageEvent(vendorMessage());
    const off = valueOf(relayEvent(m, ctx), 'message');
    expect(off.metadata?.a2uiverse).toEqual({source: 'github'});
    const on = valueOf(relayEvent(m, {...ctx, debugIds: true}), 'message');
    expect(on.metadata?.a2uiverse).toEqual({
      source: 'github',
      vendorContextId: 'v-ctx',
      vendorTaskId: 'v-task',
    });
  });

  test('does not mutate the vendor event', () => {
    const m = vendorMessage();
    relayEvent(messageEvent(m), ctx);
    expect(m.contextId).toBe('v-ctx');
    expect(m.metadata).toBeUndefined();
  });
});

describe('prepareOutgoing', () => {
  const sent: Message = {
    ...userMessage([textPart('hi')], {
      contextId: 'o-ctx',
      taskId: 'o-task',
      metadata: {a2uiClientDataModel: {v: 1}, unrelatedKey: {paintId: 3}},
    }),
    messageId: 'u1',
  };

  test('strips the orchestrator ids and sets the vendor contextId', () => {
    const {message} = prepareOutgoing(sent, 'v-ctx');
    expect(message?.contextId).toBe('v-ctx');
    expect(message?.taskId).toBe('');
    expect(message?.parts).toBe(sent.parts);
    expect(message?.metadata).toBe(sent.metadata);
  });

  test('names no conversation when no vendor conversation exists yet', () => {
    const {message} = prepareOutgoing(sent, undefined);
    expect(message?.contextId).toBe('');
  });
});
