/**
 * The canvas store (tasks 8.2–8.4): stage/overlay occupancy, in-flight status, and the single
 * append-only ring of paint entries with head/viewing time travel (task-8.4 spec decisions
 * 1, 3, 12, 13).
 */
import {describe, it, expect, vi} from 'vitest';
import type {PaintCause, PaintEntry, PaintSnapshot} from './timeline/paint';
import {createCanvasStore, currentPaintId, TIMELINE_CAP} from './canvasStore';

const CAUSE: PaintCause = {
  kind: 'utterance',
  parent: null,
  forked: false,
  payload: {text: 'show my PRs'},
};

const entry = (paintId: number, overrides: Partial<PaintEntry> = {}): PaintEntry => ({
  paintId,
  surfaceId: `surface-${paintId}`,
  catalogId: 'primer',
  cause: CAUSE,
  paintedAt: 1000 + paintId,
  snapshot: null,
  ...overrides,
});

const snapshot = (): PaintSnapshot => ({
  tree: {root: {id: 'root', type: 'Text'}},
  dataModel: {},
  capturedAt: 2000,
});

describe('createCanvasStore', () => {
  it('starts empty, idle, and live', () => {
    const store = createCanvasStore();
    expect(store.getState()).toEqual({
      stageId: null,
      overlay: null,
      timeline: [],
      viewing: null,
      headAdvancedWhileParked: false,
      inFlight: null,
      error: null,
      notice: null,
      appliedSeq: 0,
    });
  });

  it('appendEntry grows the timeline immutably, in order', () => {
    const store = createCanvasStore();
    const before = store.getState().timeline;
    store.appendEntry(entry(1));
    store.appendEntry(entry(2));
    expect(before).toEqual([]);
    expect(store.getState().timeline.map(e => e.paintId)).toEqual([1, 2]);
  });

  it('fillSnapshot completes the addressed entry and no other', () => {
    const store = createCanvasStore();
    store.appendEntry(entry(1));
    store.appendEntry(entry(2));
    store.fillSnapshot(1, snapshot());
    const [first, second] = store.getState().timeline;
    expect(first.snapshot).not.toBeNull();
    expect(second.snapshot).toBeNull();
  });

  it('replaceSnapshotDataModel swaps the data model wholesale, touching nothing else', () => {
    const store = createCanvasStore();
    store.appendEntry(entry(1, {snapshot: snapshot()}));
    store.replaceSnapshotDataModel(1, {selected: [117]});
    const stored = store.getState().timeline[0].snapshot!;
    expect(stored.dataModel).toEqual({selected: [117]});
    expect(stored.tree).toEqual({root: {id: 'root', type: 'Text'}});
    expect(stored.capturedAt).toBe(2000);
  });

  it('park sets viewing; returnToLive clears it', () => {
    const store = createCanvasStore();
    store.appendEntry(entry(1, {snapshot: snapshot()}));
    store.appendEntry(entry(2));
    store.park(1);
    expect(store.getState().viewing).toBe(1);
    store.returnToLive();
    expect(store.getState().viewing).toBeNull();
  });

  it('park ignores an unknown paint id', () => {
    const store = createCanvasStore();
    store.appendEntry(entry(1));
    store.park(99);
    expect(store.getState().viewing).toBeNull();
  });

  it('a paint landing while parked leaves the user parked and raises the marker', () => {
    const store = createCanvasStore();
    store.appendEntry(entry(1, {snapshot: snapshot()}));
    store.appendEntry(entry(2));
    store.park(1);
    store.appendEntry(entry(3));
    const state = store.getState();
    expect(state.viewing).toBe(1);
    expect(state.headAdvancedWhileParked).toBe(true);
  });

  it('returnToLive clears the newer-view marker', () => {
    const store = createCanvasStore();
    store.appendEntry(entry(1, {snapshot: snapshot()}));
    store.park(1);
    store.appendEntry(entry(2));
    store.returnToLive();
    expect(store.getState().headAdvancedWhileParked).toBe(false);
  });

  it('a paint landing while live raises no marker', () => {
    const store = createCanvasStore();
    store.appendEntry(entry(1));
    store.appendEntry(entry(2));
    expect(store.getState().headAdvancedWhileParked).toBe(false);
  });

  it(`the ring evicts beyond ${TIMELINE_CAP} entries, oldest first`, () => {
    const store = createCanvasStore();
    for (let i = 1; i <= TIMELINE_CAP + 3; i++) store.appendEntry(entry(i));
    const timeline = store.getState().timeline;
    expect(timeline).toHaveLength(TIMELINE_CAP);
    expect(timeline[0].paintId).toBe(4);
    expect(timeline[timeline.length - 1].paintId).toBe(TIMELINE_CAP + 3);
  });

  it('eviction of the parked entry forces return-to-live', () => {
    const store = createCanvasStore();
    for (let i = 1; i <= TIMELINE_CAP; i++) store.appendEntry(entry(i));
    store.park(1);
    store.appendEntry(entry(TIMELINE_CAP + 1));
    const state = store.getState();
    expect(state.viewing).toBeNull();
    expect(state.headAdvancedWhileParked).toBe(false);
  });

  it('beginPaint marks in-flight with its label; endPaint settles back to idle', () => {
    const store = createCanvasStore();
    store.beginPaint('Generating…');
    expect(store.getState().inFlight).toEqual({label: 'Generating…'});
    store.endPaint();
    expect(store.getState().inFlight).toBeNull();
  });

  it('errors are sticky until the next dispatch clears them', () => {
    const store = createCanvasStore();
    store.reportError('the agent request failed');
    store.endPaint();
    expect(store.getState().error).toBe('the agent request failed');
    store.beginPaint('Generating…');
    expect(store.getState().error).toBeNull();
  });

  it('setStage moves the stage pointer', () => {
    const store = createCanvasStore();
    store.setStage('pull-request-list');
    expect(store.getState().stageId).toBe('pull-request-list');
    store.setStage(null);
    expect(store.getState().stageId).toBeNull();
  });

  it('setOverlay moves the overlay pointer', () => {
    const store = createCanvasStore();
    store.setOverlay({surfaceId: 'question', question: 'Which repository?'});
    expect(store.getState().overlay).toEqual({
      surfaceId: 'question',
      question: 'Which repository?',
    });
    store.setOverlay(null);
    expect(store.getState().overlay).toBeNull();
  });

  it('nextPaintId is monotonic and never reused', () => {
    const store = createCanvasStore();
    expect(store.nextPaintId()).toBe(1);
    expect(store.nextPaintId()).toBe(2);
    expect(store.nextPaintId()).toBe(3);
  });

  it('each notice gets a fresh key so repeats restart the fade', () => {
    const store = createCanvasStore();
    store.showNotice('done');
    const first = store.getState().notice;
    store.showNotice('done');
    const second = store.getState().notice;
    expect(second?.key).not.toBe(first?.key);
  });

  it('dismissNotice clears only the notice it was issued for', () => {
    const store = createCanvasStore();
    store.showNotice('first');
    const stale = store.getState().notice!.key;
    store.showNotice('second');
    store.dismissNotice(stale);
    expect(store.getState().notice?.text).toBe('second');
    store.dismissNotice(store.getState().notice!.key);
    expect(store.getState().notice).toBeNull();
  });

  it('bumpApplied increments appliedSeq', () => {
    const store = createCanvasStore();
    store.bumpApplied();
    store.bumpApplied();
    expect(store.getState().appliedSeq).toBe(2);
  });

  it('notifies subscribers on every mutation and stops after unsubscribe', () => {
    const store = createCanvasStore();
    const listener = vi.fn();
    const unsubscribe = store.subscribe(listener);
    store.beginPaint('Generating…');
    expect(listener).toHaveBeenCalledTimes(1);
    unsubscribe();
    store.endPaint();
    expect(listener).toHaveBeenCalledTimes(1);
  });

  it('getState returns a new immutable snapshot per mutation (useSyncExternalStore contract)', () => {
    const store = createCanvasStore();
    const before = store.getState();
    store.beginPaint('Generating…');
    expect(store.getState()).not.toBe(before);
    expect(before.inFlight).toBeNull();
  });
});

describe('currentPaintId', () => {
  it('is the parked paint while parked', () => {
    const store = createCanvasStore();
    store.appendEntry(entry(1, {snapshot: snapshot()}));
    store.appendEntry(entry(2));
    store.setStage('surface-2');
    store.park(1);
    expect(currentPaintId(store.getState())).toBe(1);
  });

  it('is the head paint while live with an occupied stage', () => {
    const store = createCanvasStore();
    store.appendEntry(entry(1));
    store.setStage('surface-1');
    expect(currentPaintId(store.getState())).toBe(1);
  });

  it('is null while live on an empty canvas — even when departed history exists', () => {
    const store = createCanvasStore();
    store.appendEntry(entry(1, {snapshot: snapshot()}));
    expect(currentPaintId(store.getState())).toBeNull();
  });
});

describe('updateInFlightLabel (task 8.5)', () => {
  it('upgrades the label while a paint is in flight', () => {
    const store = createCanvasStore();
    store.beginPaint('“show my PRs” — generating…');
    store.updateInFlightLabel('Open PRs — a2ui — generating…');
    expect(store.getState().inFlight).toEqual({label: 'Open PRs — a2ui — generating…'});
  });

  it('is a no-op while idle — a late title never resurrects a settled turn', () => {
    const store = createCanvasStore();
    store.updateInFlightLabel('too late');
    expect(store.getState().inFlight).toBeNull();
  });
});
