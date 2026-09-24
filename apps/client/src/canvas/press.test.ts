/**
 * The reader's press on the wire (task 8.5): the composition operation sent on a stream of its own
 * beside the turn, drawn at the click, held until the paint catches up or the stream ends, and
 * standing — so the slot can say so — when it never reached the orchestrator or lost its stream.
 */
import {describe, expect, it, vi} from 'vitest';
import type {MessageSendParams, TaskStatusUpdateEvent} from '@a2a-js/sdk';
import type {A2AMessageSender} from '../a2a/client';
import {CATALOGS} from '../../tests/helpers';
import {createCanvasWiring} from './createCanvasWiring';

const shellRepaint = (props: Record<string, unknown>): TaskStatusUpdateEvent => ({
  kind: 'status-update',
  taskId: 'press-1',
  contextId: 'ctx-1',
  final: false,
  status: {
    state: 'working',
    message: {
      kind: 'message',
      role: 'agent',
      messageId: 'm1',
      parts: [
        {
          kind: 'data',
          data: {
            version: 'v0.9',
            updateComponents: {
              surfaceId: 'shell:main',
              components: [
                {id: 'merge', component: 'Slot', source: 'shell', content: 'shell', ...props},
              ],
            },
          },
        },
      ],
    },
  },
  metadata: {a2uiverse: {source: 'shell', role: 'shell'}},
});

const refusal: TaskStatusUpdateEvent = {
  kind: 'status-update',
  taskId: 'press-1',
  contextId: 'ctx-1',
  final: true,
  status: {
    state: 'failed',
    message: {
      kind: 'message',
      role: 'agent',
      messageId: 'm2',
      parts: [{kind: 'text', text: 'No source is waiting to be included.'}],
    },
  },
  metadata: {a2uiverse: {source: 'shell', role: 'shell'}},
};

function wiringWith(stream: (params: MessageSendParams) => AsyncGenerator<TaskStatusUpdateEvent>) {
  const sent: MessageSendParams[] = [];
  const client: A2AMessageSender = {
    sendMessageStream(params) {
      sent.push(params);
      return stream(params);
    },
  };
  const wiring = createCanvasWiring({client, catalogs: CATALOGS.map(c => c.catalog)});
  // A press lands in the canvas on screen: one open, nothing sent for it.
  const canvas = wiring.openReplayCanvas('what needs my attention');
  return {wiring, canvas, sent};
}

const include = {kind: 'include' as const, sources: ['gmail']};

/** A stream whose first event never comes: the request did not reach the orchestrator. */
const failing = (error: Error) => {
  const stream = {
    next: () => Promise.reject(error),
    return: () => Promise.resolve({done: true as const, value: undefined}),
    throw: (thrown: unknown) => Promise.reject(thrown),
    [Symbol.asyncIterator]: () => stream,
  };
  return stream as unknown as AsyncGenerator<TaskStatusUpdateEvent>;
};

describe('a press', () => {
  it('is the composition operation as a data part of its own, drawn at the click, gone at the end', async () => {
    let release!: () => void;
    const gate = new Promise<void>(resolve => (release = resolve));
    const {wiring, canvas, sent} = wiringWith(async function* () {
      yield shellRepaint({working: {sources: ['gmail']}});
      await gate;
    });
    const pressing = wiring.press(include);
    expect(canvas.store.getState().presses).toEqual([
      expect.objectContaining({operation: include, status: 'sent'}),
    ]);
    await vi.waitFor(() => expect(canvas.store.getState().presses[0]?.status).toBe('running'));
    expect(canvas.store.getState().merge).toEqual({working: {sources: ['gmail']}});
    expect(sent[0]!.message.parts).toEqual([
      {kind: 'data', data: {version: 'v0.9', operation: include}},
    ]);
    // Not a turn: nothing in flight, nothing in the status strip.
    expect(canvas.store.getState().inFlight).toBeNull();
    release();
    await pressing;
    expect(canvas.store.getState().presses).toEqual([]);
  });

  it('refused, ends quietly: the orchestrator’s words are not the canvas’s', async () => {
    const {wiring, canvas} = wiringWith(async function* () {
      yield refusal;
    });
    const info = vi.spyOn(console, 'info').mockImplementation(() => {});
    await wiring.press(include);
    expect(canvas.store.getState().presses).toEqual([]);
    expect(canvas.store.getState().notices).toEqual([]);
    info.mockRestore();
  });

  it('that never reached the orchestrator stands unreached; one whose stream broke, lost', async () => {
    const error = vi.spyOn(console, 'error').mockImplementation(() => {});
    const unreached = wiringWith(() => failing(new Error('Failed to fetch')));
    await unreached.wiring.press(include);
    expect(unreached.canvas.store.getState().presses).toEqual([
      expect.objectContaining({status: 'unreached'}),
    ]);
    // The next press of the kind replaces what the last one left standing.
    const again = unreached.wiring.press(include);
    expect(unreached.canvas.store.getState().presses).toEqual([
      expect.objectContaining({status: 'sent'}),
    ]);
    await again;

    const lost = wiringWith(async function* () {
      yield shellRepaint({working: {sources: ['gmail']}});
      throw new Error('network changed');
    });
    await lost.wiring.press(include);
    expect(lost.canvas.store.getState().presses).toEqual([
      expect.objectContaining({status: 'lost'}),
    ]);
    error.mockRestore();
  });

  it('ends when its canvas closes; a new question elsewhere leaves it running (task-9.6 decisions 8, 13)', async () => {
    let seen!: AbortSignal;
    const sent: MessageSendParams[] = [];
    const client: A2AMessageSender = {
      sendMessageStream: (params: MessageSendParams, options?: {signal?: AbortSignal}) => {
        sent.push(params);
        // The press's own stream; the close that follows it answers at once.
        if (sent.length > 1) return (async function* () {})();
        seen = options!.signal!;
        return (async function* () {
          yield shellRepaint({working: {sources: ['gmail']}});
          await new Promise<void>((_, reject) =>
            seen.addEventListener('abort', () => reject(new Error('aborted'))),
          );
        })();
      },
    };
    const live = createCanvasWiring({client, catalogs: CATALOGS.map(c => c.catalog)});
    const canvas = live.openReplayCanvas('first');
    const pressing = live.press(include);
    await vi.waitFor(() => expect(canvas.store.getState().presses[0]?.status).toBe('running'));
    // A new question opens a canvas of its own; the press in the first runs on.
    live.openReplayCanvas('next');
    expect(seen.aborted).toBe(false);
    expect(live.trail.getState().entries.map(e => e.loading)).toEqual([true, false]);
    live.closeCanvas(canvas.id);
    await pressing;
    expect(seen.aborted).toBe(true);
    expect(canvas.store.getState().presses).toEqual([]);
    expect(live.trail.getState().entries.map(e => e.question)).toEqual(['next']);
    // The orchestrator is told, on the canvas's context (task-9.2 decision 6).
    await vi.waitFor(() => expect(sent).toHaveLength(2));
    expect(sent[1].message.contextId).toBe('ctx-1');
    expect(sent[1].message.parts).toEqual([
      {kind: 'data', data: {version: 'v0.9', operation: {kind: 'close', sources: []}}},
    ]);
  });
});
