/**
 * Phase 9's beats on the canvas (task 9.8): each durable-composition case replayed through the
 * canvas's own wiring — its questions each opening a canvas of its own, its actions, presses,
 * steps, views and closes on the canvas they name, answered from the beat — and where the trail and
 * each canvas end. The synthetic cases end at their authored states; the recorded ones at what the
 * orchestrator made of them over the deterministic roster. Nothing reaches a network.
 */
import {describe, expect, it} from 'vitest';
import {getBeatFixture, type BeatFixture} from '../src/beats/beatFixtures';
import {syntheticBeat} from '../src/beats/syntheticBeats';
import type {CanvasRuntime} from '../src/canvas/canvasRuntime';
import {createCanvasWiring} from '../src/canvas/createCanvasWiring';
import {replayBeatOnCanvas} from '../src/canvas/replayBeat';
import {viewedCanvasId} from '../src/canvas/trail/trailStore';
import {CATALOGS} from './helpers';

/** What the replay saw pass: each canvas's loading while a later one stood, the merge line working. */
interface Seen {
  loadingBehind: Set<number>;
  working: Set<number>;
}

/** Replay `fixture` through the canvas's wiring, instantly, watching the states it passes. */
async function replay(fixture: BeatFixture) {
  const sent: unknown[] = [];
  const wiring = createCanvasWiring({
    client: {
      sendMessageStream: params => {
        sent.push(params);
        throw new Error('a replay sent to the orchestrator');
      },
    },
    catalogs: CATALOGS.map(c => c.catalog),
  });
  const seen: Seen = {loadingBehind: new Set(), working: new Set()};
  const watched = new Set<string>();
  const ids: string[] = [];
  wiring.trail.subscribe(() => {
    const {entries} = wiring.trail.getState();
    entries.forEach((entry, i) => {
      if (entry.loading && i < entries.length - 1) seen.loadingBehind.add(ids.indexOf(entry.id));
      if (watched.has(entry.id)) return;
      watched.add(entry.id);
      ids.push(entry.id);
      const n = ids.length - 1;
      const runtime = wiring.runtimeOf(entry.id)!;
      runtime.store.subscribe(() => {
        if (runtime.store.getState().mergeFollowingStep) seen.working.add(n);
      });
    });
  });
  await replayBeatOnCanvas(fixture, {canvases: wiring, paced: false, sides: wiring});
  // Let a step's quiet end and the last repaints settle.
  await new Promise(r => setTimeout(r, 0));
  const {entries, live} = wiring.trail.getState();
  /** The `n`th canvas the beat opened, while it stands. */
  const canvas = (n: number): CanvasRuntime | undefined =>
    ids[n] === undefined ? undefined : wiring.runtimeOf(ids[n]!);
  return {
    wiring,
    sent,
    seen,
    ids,
    entries,
    live,
    viewing: viewedCanvasId(wiring.trail.getState()),
    canvas,
  };
}

const synthetic = (name: string) => {
  const fixture = syntheticBeat(name);
  if (!fixture) throw new Error(`no synthetic beat ${name}`);
  return fixture;
};

const placed = (runtime: CanvasRuntime | undefined) => [
  ...(runtime?.store.getState().placement.keys() ?? []),
];

/** The merged view's rows as evaluated: what the reader sees in the table. */
const rowsOf = (runtime: CanvasRuntime | undefined) =>
  ((runtime?.synthesis.payload?.dataModel as {rows?: unknown[]} | undefined)?.rows ?? []).length;

describe('Phase 9’s synthetic beats', () => {
  it('background-tab: the first canvas loads behind the live one, then is viewed with its merge landed', async () => {
    const r = await replay(synthetic('background-tab'));
    expect(r.sent).toEqual([]);
    expect(r.entries).toHaveLength(2);
    expect(r.entries[1]!.parent).toBe(r.ids[0]);
    expect(r.live).toBe(r.ids[1]);
    expect(r.viewing).toBe(r.ids[0]);
    expect(r.seen.loadingBehind).toContain(0);
    expect(r.entries[0]!.loading).toBe(false);
    expect(placed(r.canvas(0))).toContain('shell');
    expect(rowsOf(r.canvas(0))).toBe(2);
  });

  it('past-action: the action and the press land in the past canvas; no new entry', async () => {
    const r = await replay(synthetic('past-action'));
    expect(r.sent).toEqual([]);
    expect(r.entries).toHaveLength(2);
    expect(r.viewing).toBe(r.ids[0]);
    const first = r.canvas(0)!;
    // The camera opened, and Fieldstone retried and folded in: the merged view over the one camera.
    expect(first.history.combination()['shop-a']).toBe(1);
    expect(first.store.getState().slotStates.get('shop-c')).not.toBe('failed');
    expect(placed(first)).toEqual(expect.arrayContaining(['shop-a', 'shop-b', 'shop-c', 'shell']));
    expect(rowsOf(first)).toBe(1);
    expect(first.store.getState().presses).toEqual([]);
    // The live canvas is untouched.
    expect(r.canvas(1)!.history.combination()['shop-a']).toBe(0);
    expect(rowsOf(r.canvas(1))).toBe(2);
  });

  it('ask-again: both children asked from the first canvas, which stands', async () => {
    const r = await replay(synthetic('ask-again'));
    expect(r.entries).toHaveLength(4);
    expect(r.entries[2]!.parent).toBe(r.ids[0]);
    expect(r.entries[2]!.question).toBe(r.entries[0]!.question);
    expect(r.entries[3]!.parent).toBe(r.ids[0]);
    expect(placed(r.canvas(3))).toEqual(['shop-c']);
    expect(placed(r.canvas(0))).toEqual(
      expect.arrayContaining(['shop-a', 'shop-b', 'shop-c', 'shell']),
    );
  });

  it('add-drop: a source added, one dropped and the two compared, each a child; the parent stands', async () => {
    const r = await replay(synthetic('add-drop'));
    expect(r.entries).toHaveLength(4);
    for (const n of [1, 2, 3]) expect(r.entries[n]!.parent).toBe(r.ids[0]);
    expect(placed(r.canvas(0)).sort()).toEqual(['shop-a', 'shop-b']);
    expect(placed(r.canvas(1)).sort()).toEqual(['shop-a', 'shop-b', 'shop-c']);
    expect(placed(r.canvas(2))).toEqual(['shop-a']);
    expect(placed(r.canvas(3))).toContain('shell');
    expect(rowsOf(r.canvas(3))).toBe(2);
  });

  it('step-seen: Back restores the list and the view remembered over it, the step’s stream silent', async () => {
    const r = await replay(synthetic('step-seen'));
    const first = r.canvas(0)!;
    expect(first.history.combination()).toMatchObject({'shop-a': 0, 'shop-b': 0, 'shop-c': 0});
    expect(first.history.neighbours('shop-a')?.forward).toBeDefined();
    // Back to both cameras with nothing on the step's stream: the remembered wiring, no call.
    expect(rowsOf(first)).toBe(2);
    expect(r.seen.working.size).toBe(0);
    expect(first.store.getState().presses).toEqual([]);
  });

  it('step-unseen: an unseen combination holds the merge line working until the walk’s view lands', async () => {
    const r = await replay(synthetic('step-unseen'));
    const first = r.canvas(0)!;
    expect(first.history.combination()).toMatchObject({'shop-a': 0, 'shop-b': 1});
    expect(r.seen.working).toContain(0);
    expect(first.store.getState().mergeFollowingStep).toBe(false);
    expect(rowsOf(first)).toBe(2);
  });

  it('close-loading: the loading canvas closed from the trail; the answered one live again', async () => {
    const r = await replay(synthetic('close-loading'));
    expect(r.sent).toEqual([]);
    expect(r.entries.map(e => e.id)).toEqual([r.ids[0]]);
    expect(r.live).toBe(r.ids[0]);
    expect(r.canvas(1)).toBeUndefined();
    expect(rowsOf(r.canvas(0))).toBe(2);
  });
});

/** A recorded beat, replayed only once it is recorded. */
const recorded = (beat: number) => (getBeatFixture(beat) ? it : it.skip);

describe('Phase 9’s recorded beats over the deterministic roster', () => {
  recorded(19)(
    'beat 19: the entity join finishes behind the live canvas, then is viewed',
    async () => {
      const r = await replay(getBeatFixture(19)!);
      expect(r.sent).toEqual([]);
      expect(r.entries).toHaveLength(2);
      expect(r.entries[1]!.parent).toBe(r.ids[0]);
      expect(r.viewing).toBe(r.ids[0]);
      expect(r.seen.loadingBehind).toContain(0);
      expect(r.entries[0]!.loading).toBe(false);
      expect(placed(r.canvas(0))).toContain('shell');
    },
  );

  recorded(20)(
    'beat 20: the event opened and Gmail retried in the past canvas; no new entry',
    async () => {
      const r = await replay(getBeatFixture(20)!);
      expect(r.entries).toHaveLength(2);
      expect(r.viewing).toBe(r.ids[0]);
      const first = r.canvas(0)!;
      expect(first.history.combination().calendar).toBe(1);
      expect(first.store.getState().slotStates.get('gmail')).not.toBe('failed');
      expect(placed(first)).toContain('gmail');
    },
  );

  recorded(21)(
    'beat 21: asked again and asked from the view, both children of the first',
    async () => {
      const r = await replay(getBeatFixture(21)!);
      expect(r.entries).toHaveLength(4);
      expect(r.entries[2]!.parent).toBe(r.ids[0]);
      expect(r.entries[3]!.parent).toBe(r.ids[0]);
      expect(placed(r.canvas(3))).toContain('calendar');
    },
  );

  recorded(22)('beat 22: added, dropped and compared from side by side, which stands', async () => {
    const r = await replay(getBeatFixture(22)!);
    expect(r.entries).toHaveLength(4);
    for (const n of [1, 2, 3]) expect(r.entries[n]!.parent).toBe(r.ids[0]);
    expect(placed(r.canvas(0))).not.toContain('shell');
    expect(placed(r.canvas(1))).toEqual(expect.arrayContaining(['github', 'gmail', 'calendar']));
    expect(placed(r.canvas(2))).not.toContain('gmail');
    expect(placed(r.canvas(3))).toContain('shell');
  });

  recorded(23)(
    'beat 23: Back on CircleCI restores the remembered view, no merge line working',
    async () => {
      const r = await replay(getBeatFixture(23)!);
      const first = r.canvas(0)!;
      expect(first.history.combination().circleci).toBe(0);
      expect(first.history.neighbours('circleci')?.forward).toBeDefined();
      expect(r.seen.working.size).toBe(0);
      expect(first.synthesis.payload).toBeDefined();
    },
  );

  recorded(24)(
    'beat 24: Back on CircleCI lands unseen, the merge line working until the walk lands',
    async () => {
      const r = await replay(getBeatFixture(24)!);
      const first = r.canvas(0)!;
      expect(first.history.combination()).toMatchObject({circleci: 0, linear: 1});
      expect(r.seen.working).toContain(0);
      expect(first.store.getState().mergeFollowingStep).toBe(false);
    },
  );

  recorded(25)('beat 25: the loading canvas closed, nothing left on the trail', async () => {
    const r = await replay(getBeatFixture(25)!);
    expect(r.entries).toEqual([]);
    expect(r.canvas(0)).toBeUndefined();
  });
});
