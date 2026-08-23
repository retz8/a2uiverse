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
import {CATALOG} from 'github-catalog';
import {BEAT_FIXTURES, messagesOf} from '../src/beats/beatFixtures';
import type {BeatFixture} from '../src/beats/beatFixtures';
import {createCanvasStore} from '../src/canvas/canvasStore';
import {createTurnRunner} from '../src/canvas/turn/canvasTurn';
import {replayBeatOnCanvas} from '../src/canvas/replayBeat';
import {CanvasStage} from '../src/canvas/components/CanvasStage';
import {renderWithShell} from './helpers';

/** The last surface the painting turn creates — the one that takes the stage. */
function lastCreatedSurfaceId(fixture: BeatFixture): string {
  const turn = fixture.turns[fixture.turns.length - 1];
  const creates = messagesOf(turn).filter(m => 'createSurface' in m) as Array<{
    createSurface: {surfaceId: string};
  }>;
  return creates[creates.length - 1].createSurface.surfaceId;
}

function setup() {
  const processor = new MessageProcessor([CATALOG]);
  const store = createCanvasStore();
  const runner = createTurnRunner({
    processor,
    store,
    createStaging: () => new MessageProcessor([CATALOG]),
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
      // Last createSurface wins the stage; the live registry is exactly canvas occupancy.
      expect(state.stageId).toBe(lastCreatedSurfaceId(fixture));
      expect(Array.from(processor.model.surfacesMap.keys())).toEqual([state.stageId]);
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
    expect(state.stageId).toBe(lastCreatedSurfaceId(second));
    // Serialize-on-swap: the first beat's entry filled with its deep-frozen snapshot and
    // left the live registry (the data-model growth fix — reporting sees only the stage).
    expect(state.timeline).toHaveLength(2);
    expect(state.timeline[0]).toMatchObject({paintId: firstPaintId, surfaceId: firstStage});
    expect(Object.keys(state.timeline[0].snapshot!.tree).length).toBeGreaterThan(0);
    expect(Object.isFrozen(state.timeline[0].snapshot!.tree)).toBe(true);
    expect(state.timeline[1].snapshot).toBeNull();
    expect(state.timeline[1].paintId).not.toBe(firstPaintId);
    expect(Array.from(processor.model.surfacesMap.keys())).toEqual([state.stageId]);
  });
});
