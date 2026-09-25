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
import {BEAT_FIXTURES, isBesideTurn} from '../src/beats/beatFixtures';
import type {BeatBatch, BeatFixture} from '../src/beats/beatFixtures';
import {createCanvasWiring} from '../src/canvas/createCanvasWiring';
import {replayBeatOnCanvas} from '../src/canvas/replayBeat';
import {CanvasStage} from '../src/canvas/components/CanvasStage';
import {CATALOGS, renderWithShell} from './helpers';

/**
 * The painting turn's batches and those of the streams beside it (task 8.6), on the turn's clock:
 * a press's batches from when it was sent.
 */
function lastGroupBatches(fixture: BeatFixture): BeatBatch[] {
  const start = fixture.turns.findLastIndex(turn => !isBesideTurn(turn));
  return fixture.turns
    .slice(start)
    .flatMap(turn =>
      turn.batches.map(batch => ({...batch, offsetMs: (turn.atMs ?? 0) + batch.offsetMs})),
    )
    .sort((a, b) => a.offsetMs - b.offsetMs);
}

/** Every surface the painting turn creates, in the order it created them. */
function createdSurfaceIds(fixture: BeatFixture): string[] {
  return (
    lastGroupBatches(fixture)
      .flatMap(batch => batch.messages)
      .filter(m => 'createSurface' in m) as Array<{
      createSurface: {surfaceId: string};
    }>
  ).map(m => m.createSurface.surfaceId);
}

/**
 * The sources the last shell paint left failed: a failed source's fragment is taken off the
 * canvas (task-8.5 decision 2), so it is no longer among what stands.
 */
function failedAtEnd(fixture: BeatFixture): Set<string> {
  const failed = new Set<string>();
  for (const batch of lastGroupBatches(fixture)) {
    if (batch.stamp?.role !== 'shell') continue;
    for (const message of batch.messages) {
      const update = (message as {updateComponents?: {components: Array<Record<string, unknown>>}})
        .updateComponents;
      for (const c of update?.components ?? []) {
        if (c.component !== 'Slot' || typeof c.source !== 'string') continue;
        if (c.state === 'failed') failed.add(c.source);
        else failed.delete(c.source);
      }
    }
  }
  return failed;
}

/** What still stands once the beat is over: every surface created, less the failed sources'. */
function standingSurfaceIds(fixture: BeatFixture): string[] {
  const failed = failedAtEnd(fixture);
  return [...new Set(createdSurfaceIds(fixture))].filter(id => !failed.has(id.split(':')[0]));
}

/**
 * A composed beat is one the hub stamped as a composition. The discriminator is the stamp
 * rather than the fixture's name or slot count: a fan-out where only one agent answered is
 * still composed, and reading it off the recording is how the canvas itself decides.
 */
function shellSurfaceIdOf(fixture: BeatFixture): string | undefined {
  for (const batch of lastGroupBatches(fixture)) {
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

/**
 * The canvas's own wiring, so a beat's presses fire through the handler the buttons call and its
 * failure reports are answered from the recording (task-8.6 decision 2). Nothing reaches a network.
 */
function setup() {
  const wiring = createCanvasWiring({
    client: {
      sendMessageStream: () => {
        throw new Error('a replay sent to the orchestrator');
      },
    },
    catalogs,
  });
  const replay = (fixture: BeatFixture) =>
    replayBeatOnCanvas(fixture, {canvases: wiring, paced: false, sides: wiring});
  /** The canvas the replay left on screen. */
  const viewed = () => wiring.viewed()!;
  return {wiring, viewed, replay};
}

/**
 * A beat of one question: its turn and the presses and reports beside it. A session of several
 * canvases, or one acting inside its canvas, is Phase 9's and has a suite of its own
 * (`canvas-durable.test.tsx`).
 */
const oneQuestion = (fixture: BeatFixture) =>
  fixture.turns.every((turn, i) =>
    i === 0 ? turn.kind === 'utterance' : turn.kind === 'press' || turn.kind === 'failure-report',
  );

describe('canvas shell over the recorded beats', () => {
  describe.each(BEAT_FIXTURES.filter(oneQuestion).map(f => [f.name, f] as const))(
    '%s',
    (_name, fixture) => {
      it('replays through the canvas turn runner and lands the paint on the stage', async () => {
        const {viewed, replay} = setup();

        await replay(fixture);

        const {processor, store} = viewed();
        const state = store.getState();
        // The whole stream applied: any per-message failure lands in the sticky error — except a
        // paint the canvas reported, whose failure is its tile's to say (task-8.7 decision 26).
        expect(state.error).toBeNull();
        // The stage holds the shell for a composition, the paint itself otherwise.
        expect(state.stageId).toBe(stageSurfaceIdOf(fixture));
        // The live registry is exactly canvas occupancy: a lone paint, or the shell plus the
        // fragments filling its slots — a failed source's taken off.
        expect([...processor.model.surfacesMap.keys()].sort()).toEqual(
          standingSurfaceIds(fixture).sort(),
        );
        // Every press the beat made was answered and caught up with.
        expect(state.presses).toEqual([]);
        // The turn settled back to idle.
        expect(state.inFlight).toBeNull();

        // And the stage actually renders it.
        renderWithShell(<CanvasStage processor={processor} state={state} />);
        expect(screen.getByTestId('canvas-stage')).not.toBeEmptyDOMElement();
      });
    },
  );

  it('a second beat opens a canvas of its own; the first stands as it was (task-9.6 decision 1)', async () => {
    const [first, second] = BEAT_FIXTURES.filter(oneQuestion);
    const {wiring, viewed, replay} = setup();

    await replay(first);
    const one = viewed();
    const firstStage = one.store.getState().stageId;
    await replay(second);
    const two = viewed();

    expect(two).not.toBe(one);
    expect(two.store.getState().error).toBeNull();
    expect(two.store.getState().stageId).toBe(stageSurfaceIdOf(second));
    expect([...two.processor.model.surfacesMap.keys()].sort()).toEqual(
      standingSurfaceIds(second).sort(),
    );
    // The first canvas runs on untouched: its own registry, its own stage.
    expect(one.store.getState().stageId).toBe(firstStage);
    expect([...one.processor.model.surfacesMap.keys()].sort()).toEqual(
      standingSurfaceIds(first).sort(),
    );
    // Both in the trail, the second live, the first its parent.
    const {entries, live} = wiring.trail.getState();
    expect(entries.map(e => e.question)).toEqual([first.prompt, second.prompt]);
    expect(live).toBe(two.id);
    expect(entries[1].parent).toBe(one.id);
  });
});
