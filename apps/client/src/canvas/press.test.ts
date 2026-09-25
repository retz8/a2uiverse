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
    // Not a turn: nothing in flight, nothing on the progress line.
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

/* ── The fragment's way back (task 9.7) ─────────────────────────────────────── */

import type {A2uiMessage} from '@a2ui/web_core/v0_9';
import {CATALOG_ID as GITHUB_CATALOG_ID} from 'github-catalog';
import {CATALOG_ID as SHELL_CATALOG_ID} from '@a2uiverse/shell-catalog/id';
import type {CompositionStamp, SynthesisPayload} from '@a2uiverse/sdk';
import {STAMP_KEY, SYNTHESIS_KEY} from '@a2uiverse/sdk';
import {replayBeatOnCanvas} from './replayBeat';
import {SYNTHESIS_BEAT} from '../beats/syntheticBeats';
import {
  DOCUMENT,
  PAYLOAD,
  SHOP_A,
  SHOP_A_REVERSED,
  shopAMessages,
  synthesisMessages,
} from '../beats/synthesisFixture';

const msg = (m: Record<string, unknown>): A2uiMessage =>
  ({version: 'v0.9', ...m}) as unknown as A2uiMessage;
const SHELL: CompositionStamp = {source: 'shell', role: 'shell'};
const fragment = (source: string): CompositionStamp => ({source, role: 'fragment'});

const layout = (appId: string) => [
  msg({createSurface: {surfaceId: 'shell:main', catalogId: SHELL_CATALOG_ID}}),
  msg({
    updateComponents: {
      surfaceId: 'shell:main',
      components: [
        {id: 'root', component: 'Column', children: [`attribution-${appId}`]},
        {
          id: `attribution-${appId}`,
          component: 'Attribution',
          appId,
          displayName: 'GitHub',
          child: appId,
        },
        {id: appId, component: 'Slot', source: appId, state: 'pending', label: 'GitHub'},
      ],
    },
  }),
];
const githubPaint = (surfaceId: string, title: string, text: string) => [
  msg({paintMeta: {surfaceId, title}}),
  msg({createSurface: {surfaceId, catalogId: GITHUB_CATALOG_ID, sendDataModel: true}}),
  msg({updateComponents: {surfaceId, components: [{id: 'root', component: 'Text', text}]}}),
  msg({updateDataModel: {surfaceId, value: {text}}}),
];

const completed: TaskStatusUpdateEvent = {
  kind: 'status-update',
  taskId: 'press-1',
  contextId: 'ctx-1',
  final: true,
  status: {state: 'completed'},
};

/** A composition over GitHub, its list painted, then an action repainting it as a detail. */
function withTwoPaints(
  stream: (params: MessageSendParams) => AsyncGenerator<TaskStatusUpdateEvent>,
) {
  const built = wiringWith(stream);
  const {canvas} = built;
  const turn = canvas.runner.begin({kind: 'utterance', payload: {text: 'what needs my attention'}});
  turn.apply(layout('github'), SHELL);
  turn.apply(githubPaint('github:pr-list', 'Pull requests', 'four PRs'), fragment('github'));
  turn.end();
  const action = canvas.runner.begin({
    kind: 'surface-action',
    payload: {
      action: {
        name: 'open',
        context: {},
        surfaceId: 'github:pr-list',
        sourceComponentId: 'row',
        timestamp: '2026-09-25T00:00:00Z',
      },
    },
  });
  action.apply(githubPaint('github:pr-list', 'PR #42', 'the detail'), fragment('github'));
  action.end();
  return built;
}

const rootText = (canvas: ReturnType<typeof wiringWith>['canvas'], id: string) =>
  canvas.processor.model.getSurface(id)?.componentsModel.get('root')?.properties.text;

const stepBack = {kind: 'step' as const, sources: ['github'], step: 0};

describe('a step (task 9.7)', () => {
  it('restores the paint at once and sends the step with the whole canvas’s data model, the press gone at the end (decisions 1, 5)', async () => {
    const {wiring, canvas, sent} = withTwoPaints(async function* () {
      yield completed;
    });
    expect(rootText(canvas, 'github:pr-list')).toBe('the detail');
    const pressing = wiring.press(stepBack);
    // Before anything is awaited: the list is back on screen, the press drawn.
    expect(rootText(canvas, 'github:pr-list')).toBe('four PRs');
    expect(canvas.history.neighbours('github')).toEqual({forward: {step: 1, title: 'PR #42'}});
    expect(canvas.store.getState().presses).toEqual([
      expect.objectContaining({operation: stepBack, status: 'sent'}),
    ]);
    await pressing;
    expect(sent[0]!.message.parts).toEqual([
      {kind: 'data', data: {version: 'v0.9', operation: stepBack}},
    ]);
    const dataModel = sent[0]!.message.metadata?.a2uiClientDataModel as {
      surfaces: Record<string, unknown>;
    };
    expect(dataModel.surfaces['github:pr-list']).toEqual({text: 'four PRs'});
    expect(canvas.store.getState().presses).toEqual([]);
    expect(canvas.store.getState().inFlight).toBeNull();
  });

  it('a step to the paint on screen, or to a placeholder, restores nothing and sends nothing', async () => {
    const {wiring, canvas, sent} = withTwoPaints(async function* () {
      yield completed;
    });
    await wiring.press({kind: 'step', sources: ['github'], step: 1});
    await wiring.press({kind: 'step', sources: ['github'], step: 7});
    await wiring.press({kind: 'step', sources: ['gmail'], step: 0});
    expect(sent).toEqual([]);
    expect(canvas.store.getState().presses).toEqual([]);
    expect(rootText(canvas, 'github:pr-list')).toBe('the detail');
  });

  it('a failed step is quiet: the restored screen stands, the press removed, the reason in the console (decision 5)', async () => {
    const error = vi.spyOn(console, 'error').mockImplementation(() => {});
    const {wiring, canvas} = withTwoPaints(() => failing(new Error('Failed to fetch')));
    await wiring.press(stepBack);
    expect(rootText(canvas, 'github:pr-list')).toBe('four PRs');
    expect(canvas.store.getState().presses).toEqual([]);
    expect(canvas.store.getState().error).toBeNull();
    expect(canvas.store.getState().notices).toEqual([]);
    expect(error).toHaveBeenCalled();
    error.mockRestore();
  });
});

/** The merged view over two storefronts, from the synthesis beat's first turn, on one canvas. */
async function withMergedView(
  stream: (params: MessageSendParams) => AsyncGenerator<TaskStatusUpdateEvent>,
) {
  const built = wiringWith(stream);
  const {canvas} = built;
  await replayBeatOnCanvas(
    {...SYNTHESIS_BEAT, turns: SYNTHESIS_BEAT.turns.slice(0, 1)},
    {runner: canvas.runner, store: canvas.store, paced: false},
  );
  expect(canvas.synthesis.payload).toEqual(PAYLOAD);
  /** An action inside Shop A repainting its list, with or without a re-synthesis beside it. */
  const repaintShopA = (resynthesis?: SynthesisPayload) => {
    const action = canvas.runner.begin({
      kind: 'surface-action',
      payload: {
        action: {
          name: 'reorder',
          context: {},
          surfaceId: SHOP_A,
          sourceComponentId: 'list',
          timestamp: '2026-09-25T00:00:00Z',
        },
      },
    });
    action.apply(shopAMessages(SHELL_CATALOG_ID, SHOP_A_REVERSED), fragment('shop-a'));
    if (resynthesis)
      action.apply(synthesisMessages(DOCUMENT, SHELL_CATALOG_ID), fragment('shell'), resynthesis);
    action.end();
  };
  return {...built, repaintShopA};
}

const REWIRED: SynthesisPayload = {...PAYLOAD, sorts: []};
const stepShopA = (step: number) => ({kind: 'step' as const, sources: ['shop-a'], step});

/** The orchestrator's walk called the Synthesizer: the merged view repainted on the step's stream. */
const synthesisEvent = (payload: SynthesisPayload): TaskStatusUpdateEvent => ({
  kind: 'status-update',
  taskId: 'press-1',
  contextId: 'ctx-1',
  final: false,
  status: {
    state: 'working',
    message: {
      kind: 'message',
      role: 'agent',
      messageId: 'm3',
      parts: synthesisMessages(DOCUMENT, SHELL_CATALOG_ID).map(message => ({
        kind: 'data' as const,
        data: message as unknown as Record<string, unknown>,
      })),
    },
  },
  metadata: {[STAMP_KEY]: fragment('shell'), [SYNTHESIS_KEY]: payload},
});

describe('the merged view on a step back (task 9.7 decisions 3, 4)', () => {
  it('seen: the wiring remembered over that combination is re-accepted at once, with no call', async () => {
    const {wiring, canvas, repaintShopA} = await withMergedView(async function* () {
      yield completed;
    });
    repaintShopA(REWIRED);
    expect(canvas.synthesis.payload).toEqual(REWIRED);
    const pressing = wiring.press(stepShopA(0));
    expect(canvas.synthesis.payload).toEqual(PAYLOAD);
    expect(canvas.store.getState().mergeFollowingStep).toBe(false);
    await pressing;
    expect(canvas.synthesis.payload).toEqual(PAYLOAD);
    // And forward again: the re-synthesis over the repaint.
    await wiring.press(stepShopA(1));
    expect(canvas.synthesis.payload).toEqual(REWIRED);
  });

  it('unseen: the merge line works until the stream ends; a silent end keeps the current wiring and files it', async () => {
    const {wiring, canvas, repaintShopA} = await withMergedView(async function* () {
      yield completed;
    });
    // Two repaints, the wiring re-accepted only over the second: the first is a combination
    // nothing was filed under.
    repaintShopA();
    repaintShopA(REWIRED);
    expect(canvas.history.stackOf('shop-a')).toEqual({length: 3, at: 2});
    const pressing = wiring.press(stepShopA(1));
    expect(canvas.synthesis.payload).toEqual(REWIRED);
    expect(canvas.store.getState().mergeFollowingStep).toBe(true);
    await pressing;
    expect(canvas.store.getState().mergeFollowingStep).toBe(false);
    expect(canvas.synthesis.payload).toEqual(REWIRED);
    expect(canvas.history.recall()).toEqual({
      target: {surfaceId: 'shell:synthesis', source: 'shell'},
      payload: REWIRED,
    });
  });

  it('the merge line follows the latest step: a step to a seen combination ends the working an earlier unseen step left, whose stream ends later (task-9.9 decision 17)', async () => {
    let release: () => void = () => {};
    const held = new Promise<void>(resolve => (release = resolve));
    let streams = 0;
    const {wiring, canvas, repaintShopA} = await withMergedView(async function* () {
      // The first step's walk is abandoned by the orchestrator when the second comes: its
      // stream ends only then.
      if (++streams === 1) await held;
      yield completed;
    });
    repaintShopA();
    repaintShopA(REWIRED);
    const unseen = wiring.press(stepShopA(1));
    expect(canvas.store.getState().mergeFollowingStep).toBe(true);
    const seen = wiring.press(stepShopA(2));
    expect(canvas.store.getState().mergeFollowingStep).toBe(false);
    expect(canvas.synthesis.payload).toEqual(REWIRED);
    await seen;
    release();
    await unseen;
    expect(canvas.store.getState().mergeFollowingStep).toBe(false);
    expect(canvas.synthesis.payload).toEqual(REWIRED);
  });

  it('unseen, the walk called: the wiring painted on the step’s stream lands and is filed', async () => {
    const CALLED: SynthesisPayload = {
      ...PAYLOAD,
      sorts: PAYLOAD.sorts.map(sort => ({...sort, key: '/name', direction: 'desc' as const})),
    };
    const {wiring, canvas, repaintShopA} = await withMergedView(async function* () {
      yield synthesisEvent(CALLED);
      yield completed;
    });
    repaintShopA();
    repaintShopA(REWIRED);
    await wiring.press(stepShopA(1));
    expect(canvas.store.getState().mergeFollowingStep).toBe(false);
    expect(canvas.synthesis.payload).toEqual(CALLED);
    expect(canvas.history.recall()).toEqual({
      target: {surfaceId: 'shell:synthesis', source: 'shell'},
      payload: CALLED,
    });
  });
});
