/**
 * Sign-in through the page's wiring (task 12.8): the shell catalog's sign-in raised on the canvas
 * on screen opens the window on that canvas's context, the resume goes out as that slot's `retry`,
 * a tile the orchestrator paints afterwards makes the source forgotten, and the add-account shell
 * action opens the window on the bare app id.
 */
import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest';
import type {MessageSendParams, TaskStatusUpdateEvent} from '@a2a-js/sdk';
import type {A2AMessageSender} from '../a2a/client';
import type {AttemptOutcome} from '../orchestratorApi';
import {CATALOGS} from '../../tests/helpers';
import {createCanvasWiring} from './createCanvasWiring';
import {POLL_INTERVAL_MS} from './signIn';

/** The orchestrator's repaint of Gmail's slot as the authority tile. */
const tile: TaskStatusUpdateEvent = {
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
                {id: 'a-gmail', component: 'Attribution', source: 'gmail.1', child: 's-gmail'},
                {
                  id: 's-gmail',
                  component: 'Slot',
                  source: 'gmail.1',
                  state: 'authority',
                  authority: {cause: 'signIn', scopes: ['Read your email']},
                },
              ],
            },
          },
        },
      ],
    },
  },
  metadata: {a2uiverse: {source: 'shell', role: 'shell'}},
};

function setup() {
  const sent: MessageSendParams[] = [];
  /** Whether the orchestrator's next answer paints Gmail's tile. */
  const answers = {tile: true};
  const client: A2AMessageSender = {
    sendMessageStream(params) {
      sent.push(params);
      const painted = answers.tile;
      return (async function* () {
        if (painted) yield tile;
      })();
    },
  };
  const opened: string[] = [];
  let outcome: AttemptOutcome = {state: 'pending'};
  const wiring = createCanvasWiring({
    client,
    serverUrl: 'http://localhost:10001',
    catalogs: CATALOGS.map(c => c.catalog),
    signIn: {
      openWindow: url => opened.push(url),
      poll: () => Promise.resolve(outcome),
    },
  });
  const canvas = wiring.openReplayCanvas('what needs my attention');
  const answer = (next: AttemptOutcome) => (outcome = next);
  const operations = () =>
    sent.flatMap(params =>
      params.message.parts.flatMap(part =>
        part.kind === 'data' && 'operation' in part.data ? [part.data.operation] : [],
      ),
    );
  return {wiring, canvas, opened, answer, operations, answers};
}

const press = {surfaceId: 'shell:main', componentId: 's-gmail'};

beforeEach(() => {
  vi.useFakeTimers();
  vi.spyOn(console, 'info').mockImplementation(() => {});
  // The repaint names a layout surface this bare canvas never created: said, and beside the point.
  vi.spyOn(console, 'error').mockImplementation(() => {});
});
afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe('sign-in on the page', () => {
  it('Sign in opens the window on the canvas on screen; signed in, its slot resumes; a fresh tile forgets the source', async () => {
    const {wiring, canvas, opened, answer, operations} = setup();
    // The canvas has its context, and Gmail's slot its tile, from a stream the orchestrator answered.
    await wiring.press({kind: 'include', sources: ['gmail.1']});
    expect(canvas.contextId()).toBe('ctx-1');
    expect(canvas.store.getState().slotStates.get('gmail.1')).toBe('authority');

    wiring.host.onSignIn({kind: 'start', source: 'gmail.1', ...press});
    expect(new URL(opened[0]!).searchParams.get('canvas')).toBe('ctx-1');
    expect(canvas.store.getState().signingIn.has('gmail.1')).toBe(true);

    answer({state: 'signedIn', source: 'gmail.1', label: 'me@example.com', existing: false});
    await vi.advanceTimersByTimeAsync(POLL_INTERVAL_MS);
    expect(operations().at(-1)).toEqual({kind: 'retry', sources: ['gmail.1']});
    expect(canvas.store.getState().signingIn.size).toBe(0);

    // The resume's stream painted the tile again: the source is forgotten, the window opens.
    await vi.waitFor(() => expect(canvas.store.getState().presses).toEqual([]));
    wiring.host.onSignIn({kind: 'start', source: 'gmail.1', ...press});
    expect(opened).toHaveLength(2);
  });

  it('a source signed in, its tile not painted since, loads at once on another slot’s press', async () => {
    const {wiring, canvas, opened, answer, operations, answers} = setup();
    await wiring.press({kind: 'include', sources: ['gmail.1']});
    wiring.host.onSignIn({kind: 'start', source: 'gmail.1', ...press});
    answer({state: 'signedIn', source: 'gmail.1'});
    // The resume is answered without a tile.
    answers.tile = false;
    await vi.advanceTimersByTimeAsync(POLL_INTERVAL_MS);
    await vi.waitFor(() => expect(canvas.store.getState().presses).toEqual([]));
    const before = operations().length;
    wiring.signIn.request(canvas, {kind: 'start', source: 'gmail.1'});
    expect(opened).toHaveLength(1);
    await vi.waitFor(() => expect(operations()).toHaveLength(before + 1));
    expect(operations().at(-1)).toEqual({kind: 'retry', sources: ['gmail.1']});
  });

  it('the add-account tile’s Add account opens the window on the bare app id (task-12.13 decision 27)', async () => {
    const {wiring, opened} = setup();
    await wiring.press({kind: 'include', sources: ['gmail.1']});
    wiring.host.onSignIn({kind: 'addAccount', source: 'gmail', ...press});
    expect(new URL(opened[0]!).searchParams.get('source')).toBe('gmail');
  });
});
