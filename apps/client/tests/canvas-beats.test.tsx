/**
 * The canvas beat gate: every recorded beat, replayed through the real canvas store + turn
 * runner — the automated definition-of-done for "a paint lands on the stage" (shell
 * verification on fixtures, zero LLM calls).
 *
 * Proves the canvas shell consumes the recordings — zero apply
 * failures, the stage pointer on the last-created surface, single occupancy, a rendered
 * surface, the live entry appended, and the in-flight state settled back to idle. The chained
 * pair at the end exercises hold-and-swap over an occupied stage: the real recordings are
 * stitched back-to-back (the shell consumes message streams, not meaning).
 */
import {describe, it, expect} from 'vitest';
import {screen} from '@testing-library/react';
import {MessageProcessor} from '@a2ui/web_core/v0_9';
import {BEAT_FIXTURES, messagesOf} from '../src/beats/beatFixtures';
import type {BeatFixture} from '../src/beats/beatFixtures';
import {createCanvasStore} from '../src/canvas/canvasStore';
import {createTurnRunner} from '../src/canvas/turn/canvasTurn';
import {replayBeatOnCanvas} from '../src/canvas/replayBeat';
import {CanvasStage} from '../src/canvas/components/CanvasStage';
import {CATALOGS, renderWithShell} from './helpers';

/** Every surface the painting turn creates, in the order it created them. */
function createdSurfaceIds(fixture: BeatFixture): string[] {
  const turn = fixture.turns[fixture.turns.length - 1];
  return (
    messagesOf(turn).filter(m => 'createSurface' in m) as Array<{
      createSurface: {surfaceId: string};
    }>
  ).map(m => m.createSurface.surfaceId);
}

/**
 * A composed beat is one the hub stamped as a composition. The discriminator is the stamp
 * rather than the fixture's name or slot count: a fan-out where only one agent answered is
 * still composed, and reading it off the recording is how the canvas itself decides.
 */
function shellSurfaceIdOf(fixture: BeatFixture): string | undefined {
  const turn = fixture.turns[fixture.turns.length - 1];
  for (const batch of turn.batches) {
    if (batch.stamp?.role !== 'shell') continue;
    for (const message of batch.messages) {
      const create = (message as {createSurface?: {surfaceId: string}}).createSurface;
      if (create) return create.surfaceId;
    }
  }
  return undefined;
}

/**
 * The surface that takes the stage: for a composition the shell's own layout surface, whose
 * slots the fragments fill; otherwise the last surface created, which is the whole paint.
 */
function stageSurfaceIdOf(fixture: BeatFixture): string {
  const created = createdSurfaceIds(fixture);
  return shellSurfaceIdOf(fixture) ?? created[created.length - 1];
}

// The gate registers every installed catalog, exactly as the client does. A composed beat
// carries surfaces in three design systems, so a single-catalog processor would fail to apply
// most of the stream — and report it as a broken paint rather than a missing catalog.
const catalogs = CATALOGS.map(c => c.catalog);

function setup() {
  const processor = new MessageProcessor(catalogs);
  const store = createCanvasStore();
  const runner = createTurnRunner({
    processor,
    store,
    createStaging: () => new MessageProcessor(catalogs),
  });
  return {processor, store, runner};
}

describe('canvas shell over the recorded beats', () => {
  describe.each(BEAT_FIXTURES.map(f => [f.name, f] as const))('%s', (_name, fixture) => {
    it('replays through the canvas turn runner and lands the paint on the stage', async () => {
      const {processor, store, runner} = setup();

      await replayBeatOnCanvas(fixture, {runner, store, paced: false});

      const state = store.getState();
      // The whole stream applied: any per-message failure lands in the sticky error.
      expect(state.error).toBeNull();
      // The stage holds the shell for a composition, the paint itself otherwise.
      expect(state.stageId).toBe(stageSurfaceIdOf(fixture));
      // The live registry is exactly canvas occupancy: a lone paint, or the shell plus the
      // fragments filling its slots.
      expect([...processor.model.surfacesMap.keys()].sort()).toEqual(
        [...new Set(createdSurfaceIds(fixture))].sort(),
      );
      // The turn appended its live entry and settled back to idle.
      const head = state.timeline[state.timeline.length - 1];
      expect(head).toMatchObject({surfaceId: state.stageId, snapshot: null});
      expect(state.inFlight).toBeNull();

      // And the stage actually renders it.
      renderWithShell(<CanvasStage processor={processor} state={state} />);
      expect(screen.getByTestId('canvas-stage')).not.toBeEmptyDOMElement();
    });
  });

  it('a second beat over the occupied stage swaps in and snapshots the outgoing paint', async () => {
    const [first, second] = BEAT_FIXTURES;
    const {processor, store, runner} = setup();

    await replayBeatOnCanvas(first, {runner, store, paced: false});
    const firstStage = store.getState().stageId;
    const firstPaintId = store.getState().timeline.at(-1)?.paintId;
    await replayBeatOnCanvas(second, {runner, store, paced: false});

    const state = store.getState();
    expect(state.error).toBeNull();
    expect(state.stageId).toBe(stageSurfaceIdOf(second));
    // Serialize-on-swap: the first beat's entry filled with its deep-frozen snapshot and
    // left the live registry (the data-model growth fix — reporting sees only the stage).
    expect(state.timeline).toHaveLength(2);
    expect(state.timeline[0]).toMatchObject({paintId: firstPaintId, surfaceId: firstStage});
    expect(Object.keys(state.timeline[0].snapshot!.tree).length).toBeGreaterThan(0);
    expect(Object.isFrozen(state.timeline[0].snapshot!.tree)).toBe(true);
    expect(state.timeline[1].snapshot).toBeNull();
    expect(state.timeline[1].paintId).not.toBe(firstPaintId);
    // The outgoing composition is gone; what stands is the incoming beat's own surfaces.
    expect([...processor.model.surfacesMap.keys()].sort()).toEqual(
      [...new Set(createdSurfaceIds(second))].sort(),
    );
  });
});
