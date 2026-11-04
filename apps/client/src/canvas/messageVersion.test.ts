/**
 * The message's version through the canvas (task-19.3 decisions 2, 5, 6): a fragment whose messages
 * are in v0.9.1 replayed through the path a real stream takes — each batch the hub's event again,
 * read by the event extractor, run by the turn runner, applied by the real processor, the surface
 * placed in its slot — and a press inside it written in v0.9; a fragment in a version the platform
 * does not speak passed over, nothing reported, its slot left as the answer leaves it.
 */
import {describe, expect, it} from 'vitest';
import type {MessageSendParams, TaskStatusUpdateEvent} from '@a2a-js/sdk';
import type {A2AMessageSender} from '../a2a/client';
import type {A2AStreamEventData} from '../a2a/messages';
import type {BeatFixture} from '../beats/beatFixtures';
import {GITHUB_CATALOG_ID} from '../beats/catalogIds';
import {V091_PAINT_BEAT} from '../beats/syntheticBeats';
import {CATALOGS} from '../../tests/helpers';
import {createCanvasWiring} from './createCanvasWiring';
import {eventOfBatch} from './replayTransport';

const TASK = 'task-v091';
const CONTEXT = 'ctx-v091';

/** The hub's last event: the turn's single final. */
const final: TaskStatusUpdateEvent = {
  kind: 'status-update',
  taskId: TASK,
  contextId: CONTEXT,
  final: true,
  status: {state: 'completed'},
  metadata: {a2uiverse: {source: 'shell', role: 'shell'}},
};

/** The beat with every message of its fragment re-written in `version`. */
function fragmentIn(version: string): BeatFixture {
  const [turn] = V091_PAINT_BEAT.turns;
  return {
    ...V091_PAINT_BEAT,
    turns: [
      {
        ...turn!,
        batches: turn!.batches.map(batch =>
          batch.stamp?.role === 'fragment'
            ? {...batch, messages: batch.messages.map(m => ({...m, version}) as typeof m)}
            : batch,
        ),
      },
    ],
  };
}

/**
 * A canvas whose orchestrator answers the question with the beat's turn, each batch the event the
 * hub relayed it as, and every later send with a stream that says nothing.
 */
function canvasAnswering(beat: BeatFixture) {
  const sent: MessageSendParams[] = [];
  const client: A2AMessageSender = {
    sendMessageStream(params) {
      sent.push(params);
      if (sent.length > 1) return (async function* () {})();
      return (async function* (): AsyncGenerator<A2AStreamEventData> {
        for (const batch of beat.turns[0]!.batches) yield eventOfBatch(batch, TASK, CONTEXT);
        yield final;
      })();
    },
  };
  const wiring = createCanvasWiring({client, catalogs: CATALOGS.map(c => c.catalog)});
  return {wiring, sent};
}

describe('a fragment whose messages are in v0.9.1', () => {
  it('is placed in its slot, drawn in its catalog, through the path a real stream takes', async () => {
    expect(V091_PAINT_BEAT.turns[0]!.batches[1]!.messages.map(m => m.version)).toEqual([
      'v0.9.1',
      'v0.9.1',
    ]);
    const {wiring, sent} = canvasAnswering(V091_PAINT_BEAT);
    await wiring.sendUtterance(V091_PAINT_BEAT.prompt);
    const runtime = wiring.viewed()!;
    await expect
      .poll(() => runtime.store.getState().placement.get('github')?.surfaceId)
      .toBe('github:pr-list');
    const surface = runtime.processor.model.getSurface('github:pr-list');
    expect(surface?.defaultCatalog?.id).toBe(GITHUB_CATALOG_ID);
    expect(surface?.componentsModel.get('h')?.properties).toMatchObject({text: 'Pull requests'});
    // Drawn, nothing reported: the question was the one message sent.
    expect(sent).toHaveLength(1);
  });

  it('a press inside it goes out in v0.9, the client’s version, not the fragment’s', async () => {
    const {wiring, sent} = canvasAnswering(V091_PAINT_BEAT);
    await wiring.sendUtterance(V091_PAINT_BEAT.prompt);
    const runtime = wiring.viewed()!;
    await expect.poll(() => runtime.store.getState().placement.has('github')).toBe(true);
    const surface = runtime.processor.model.getSurface('github:pr-list')!;
    await surface.dispatchAction(
      {event: {name: 'open-pull-request', context: {number: 42}}},
      'open',
    );
    await expect.poll(() => sent.length).toBe(2);
    const [part] = sent[1]!.message.parts as Array<{kind: string; data: Record<string, unknown>}>;
    expect(part!.data.version).toBe('v0.9');
    expect(part!.data.action).toMatchObject({
      name: 'open-pull-request',
      surfaceId: 'github:pr-list',
      context: {number: 42},
    });
    // The fragment's data model rides beside it, in v0.9 too.
    expect(sent[1]!.message.metadata?.a2uiClientDataModel).toMatchObject({
      version: 'v0.9',
      surfaces: {'github:pr-list': {}},
    });
  });
});

describe('a fragment in a version the platform does not speak', () => {
  it('is passed over: never drawn, never placed, nothing reported', async () => {
    const {wiring, sent} = canvasAnswering(fragmentIn('v1.0'));
    await wiring.sendUtterance(V091_PAINT_BEAT.prompt);
    const runtime = wiring.viewed()!;
    // The layout landed, in v0.9: GitHub's slot is there, waiting as the answer left it.
    expect(runtime.processor.model.getSurface('shell:main')).toBeDefined();
    expect(runtime.processor.model.getSurface('github:pr-list')).toBeUndefined();
    expect(runtime.store.getState().placement.has('github')).toBe(false);
    expect(sent).toHaveLength(1);
  });
});
