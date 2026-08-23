import {describe, it, expect, vi} from 'vitest';
import type {MessageSendParams, Part, Task} from '@a2a-js/sdk';
import type {A2uiClientAction, A2uiClientDataModel, A2uiMessage} from '@a2ui/web_core/v0_9';
import type {A2AStreamEventData} from './messages';
import type {A2AMessageSender} from './client';
import {createA2AActionHandler} from './createA2AActionHandler';
import {createA2ASession} from './session';

const A2UI_DATA = {version: 'v0.9', createSurface: {surfaceId: 's', catalogId: 'cat'}};
const DATA_PART: Part = {kind: 'data', data: A2UI_DATA};
const ACTION = {name: 'click', surfaceId: 's'} as unknown as A2uiClientAction;

function completedTask(parts: Part[], contextId = 'ctx-1'): Task {
  return {
    kind: 'task',
    id: 't1',
    contextId,
    status: {
      state: 'completed',
      message: {kind: 'message', role: 'agent', messageId: 'm1', parts},
    },
  };
}

function fakeSender(events: A2AStreamEventData[]) {
  const sent: MessageSendParams[] = [];
  const sender: A2AMessageSender = {
    async *sendMessageStream(params) {
      sent.push(params);
      yield* events;
    },
  };
  return {sender, sent};
}

describe('createA2AActionHandler', () => {
  it('ships the action over the stream and applies the returned A2UI', async () => {
    const {sender, sent} = fakeSender([completedTask([DATA_PART])]);
    const applied: A2uiMessage[][] = [];
    const handler = createA2AActionHandler({apply: m => applied.push(m), client: sender});

    await handler(ACTION);

    expect(sent).toHaveLength(1);
    expect(sent[0].message.parts).toEqual([
      {kind: 'data', data: {version: 'v0.9', action: ACTION}},
    ]);
    expect(applied).toEqual([[A2UI_DATA]]);
  });

  it('threads the session contextId: captures from the response, sends on the next action', async () => {
    const session = createA2ASession();
    const {sender, sent} = fakeSender([completedTask([DATA_PART], 'ctx-42')]);
    const handler = createA2AActionHandler({apply: () => {}, client: sender, session});

    await handler(ACTION);
    await handler(ACTION);

    expect(sent[0].message.contextId).toBeUndefined();
    expect(sent[1].message.contextId).toBe('ctx-42');
  });

  it('sends the current client data model as message metadata when a supplier is given', async () => {
    const clientDataModel = {
      version: 'v0.9',
      surfaces: {s: {prs: [{selected: true}]}},
    } as unknown as A2uiClientDataModel;
    const {sender, sent} = fakeSender([completedTask([DATA_PART])]);
    const handler = createA2AActionHandler({
      apply: () => {},
      client: sender,
      getClientDataModel: () => clientDataModel,
    });

    await handler(ACTION);

    expect(sent[0].message.metadata).toEqual({a2uiClientDataModel: clientDataModel});
  });

  it('never throws: wire failures are logged and apply is skipped', async () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
    const apply = vi.fn();
    const failing: A2AMessageSender = {
      // eslint-disable-next-line require-yield
      async *sendMessageStream() {
        throw new Error('wire down');
      },
    };
    const handler = createA2AActionHandler({apply, client: failing});

    await expect(handler(ACTION)).resolves.toBeUndefined();

    expect(apply).not.toHaveBeenCalled();
    expect(consoleError).toHaveBeenCalled();
    consoleError.mockRestore();
  });

  it('calls onActionStart before the send and onActionSettled after it', async () => {
    const order: string[] = [];
    const {sender} = fakeSender([completedTask([DATA_PART])]);
    const handler = createA2AActionHandler({
      apply: () => order.push('apply'),
      client: sender,
      onActionStart: a => order.push(`start:${a.name}`),
      onActionSettled: () => order.push('settled'),
    });

    await handler(ACTION);

    expect(order).toEqual(['start:click', 'apply', 'settled']);
  });

  it('calls onActionSettled even when the send fails', async () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
    const events: string[] = [];
    const failing: A2AMessageSender = {
      // eslint-disable-next-line require-yield
      async *sendMessageStream() {
        throw new Error('wire down');
      },
    };
    const handler = createA2AActionHandler({
      apply: () => {},
      client: failing,
      onActionStart: () => events.push('start'),
      onActionSettled: () => events.push('settled'),
    });

    await handler(ACTION);

    expect(events).toEqual(['start', 'settled']);
    consoleError.mockRestore();
  });

  it('reports the failure through onError, between start and settled', async () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
    const events: string[] = [];
    const failing: A2AMessageSender = {
      // eslint-disable-next-line require-yield
      async *sendMessageStream() {
        throw new Error('wire down');
      },
    };
    const handler = createA2AActionHandler({
      apply: () => {},
      client: failing,
      onActionStart: () => events.push('start'),
      onError: () => events.push('error'),
      onActionSettled: () => events.push('settled'),
    });

    await handler(ACTION);

    expect(events).toEqual(['start', 'error', 'settled']);
    consoleError.mockRestore();
  });

  it('rejects construction without a serverUrl or client at first use', async () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
    const handler = createA2AActionHandler({apply: () => {}});

    await handler(ACTION);

    expect(consoleError).toHaveBeenCalled();
    consoleError.mockRestore();
  });
});
