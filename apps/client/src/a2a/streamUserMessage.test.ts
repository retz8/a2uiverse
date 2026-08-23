import {describe, it, expect, vi} from 'vitest';
import type {MessageSendParams, Part, TaskStatusUpdateEvent} from '@a2a-js/sdk';
import type {A2uiClientDataModel, A2uiMessage} from '@a2ui/web_core/v0_9';
import type {A2AStreamEventData} from './messages';
import type {A2AMessageSender} from './client';
import {createA2ASession} from './session';
import {streamUserMessage} from './streamUserMessage';

const A2UI_DATA = {version: 'v0.9', createSurface: {surfaceId: 's', catalogId: 'cat'}};
const DATA_PART: Part = {kind: 'data', data: A2UI_DATA};

function statusUpdate(parts: Part[], contextId = 'ctx-1', final = false): TaskStatusUpdateEvent {
  return {
    kind: 'status-update',
    taskId: 't1',
    contextId,
    final,
    status: {
      state: final ? 'completed' : 'working',
      message: {kind: 'message', role: 'agent', messageId: 'm1', parts},
    },
  };
}

/** Fake sender: records params, replays the given events. */
function fakeSender(events: A2AStreamEventData[]) {
  const sent: MessageSendParams[] = [];
  const sender: A2AMessageSender = {
    async *sendMessageStream(params) {
      sent.push(params);
      yield* events;
    },
  };
  return {sender, sent, getSender: () => Promise.resolve(sender)};
}

describe('streamUserMessage', () => {
  it('sends the text and applies A2UI messages from each stream event', async () => {
    const {getSender, sent} = fakeSender([
      statusUpdate([DATA_PART]),
      statusUpdate([DATA_PART], 'ctx-1', true),
    ]);
    const applied: A2uiMessage[][] = [];

    await streamUserMessage('show me open PRs', {getSender, apply: m => applied.push(m)});

    expect(sent).toHaveLength(1);
    expect(sent[0].message.parts).toEqual([{kind: 'text', text: 'show me open PRs'}]);
    expect(applied).toEqual([[A2UI_DATA], [A2UI_DATA]]);
  });

  it('skips apply for events carrying no A2UI', async () => {
    const {getSender} = fakeSender([statusUpdate([])]);
    const apply = vi.fn();

    await streamUserMessage('hi', {getSender, apply});

    expect(apply).not.toHaveBeenCalled();
  });

  it('captures the contextId into the session and resends it on the next message', async () => {
    const session = createA2ASession();
    const {getSender, sent} = fakeSender([statusUpdate([DATA_PART], 'ctx-42', true)]);

    await streamUserMessage('first', {getSender, apply: () => {}, session});
    expect(session.get()).toBe('ctx-42');

    await streamUserMessage('second', {getSender, apply: () => {}, session});
    expect(sent[0].message.contextId).toBeUndefined();
    expect(sent[1].message.contextId).toBe('ctx-42');
  });

  it('sends the current client data model as message metadata when a supplier is given', async () => {
    const clientDataModel = {
      version: 'v0.9',
      surfaces: {s: {prs: [{selected: true}]}},
    } as unknown as A2uiClientDataModel;
    const {getSender, sent} = fakeSender([statusUpdate([DATA_PART], 'ctx-1', true)]);

    await streamUserMessage('show selected', {
      getSender,
      apply: () => {},
      getClientDataModel: () => clientDataModel,
    });

    expect(sent[0].message.metadata).toEqual({a2uiClientDataModel: clientDataModel});
  });

  it('sends no metadata when the supplier reports no data model', async () => {
    const {getSender, sent} = fakeSender([statusUpdate([DATA_PART], 'ctx-1', true)]);

    await streamUserMessage('hi', {
      getSender,
      apply: () => {},
      getClientDataModel: () => undefined,
    });

    expect(sent[0].message.metadata).toBeUndefined();
  });

  it('never throws: stream errors are logged and apply is skipped', async () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
    const apply = vi.fn();
    const failing: A2AMessageSender = {
      // eslint-disable-next-line require-yield
      async *sendMessageStream() {
        throw new Error('wire down');
      },
    };

    await expect(
      streamUserMessage('hi', {getSender: () => Promise.resolve(failing), apply}),
    ).resolves.toBeUndefined();

    expect(apply).not.toHaveBeenCalled();
    expect(consoleError).toHaveBeenCalled();
    consoleError.mockRestore();
  });

  it('reports the failure through onError', async () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
    const onError = vi.fn();
    const apply = vi.fn();
    const failing: A2AMessageSender = {
      // eslint-disable-next-line require-yield
      async *sendMessageStream() {
        throw new Error('wire down');
      },
    };

    await streamUserMessage('hi', {
      getSender: () => Promise.resolve(failing),
      apply,
      onError,
    });

    expect(onError).toHaveBeenCalledTimes(1);
    expect(onError.mock.calls[0][0]).toBeInstanceOf(Error);
    expect(apply).not.toHaveBeenCalled();
    consoleError.mockRestore();
  });
});
