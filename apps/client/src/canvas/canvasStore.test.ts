/**
 * The canvas store: one canvas's stage/overlay occupancy, in-flight status, question and
 * composition facts (task-9.6 decision 2).
 */
import {describe, it, expect, vi} from 'vitest';
import {createCanvasStore, orderedNotices} from './canvasStore';

describe('createCanvasStore', () => {
  it('starts empty and idle', () => {
    const store = createCanvasStore();
    expect(store.getState()).toEqual({
      stageId: null,
      overlay: null,
      inFlight: null,
      error: null,
      question: null,
      slotStates: new Map(),
      merge: null,
      presses: [],
      mergeFollowingStep: false,
      mergeHeld: false,
      paintTitles: new Map(),
      notices: [],
      roster: [],
      prose: new Map(),
      appliedSeq: 0,
      placement: new Map(),
      promoted: new Set(),
    });
  });

  it('places fragments in slots, one surface per slot', () => {
    const store = createCanvasStore();
    store.placeFragment('github', {surfaceId: 'github:prs', source: 'github'});
    store.placeFragment('gmail', {surfaceId: 'gmail:inbox', source: 'gmail'});
    expect([...store.getState().placement.keys()]).toEqual(['github', 'gmail']);
    expect(store.getState().placement.get('gmail')?.source).toBe('gmail');

    // A later claim displaces the earlier tenant rather than joining it.
    store.placeFragment('github', {surfaceId: 'github:prs-2', source: 'github'});
    expect(store.getState().placement.get('github')?.surfaceId).toBe('github:prs-2');
    expect(store.getState().placement.size).toBe(2);
  });

  it('clears placement when the composition leaves, and no-ops when empty', () => {
    const store = createCanvasStore();
    const before = store.getState();
    store.clearPlacement();
    expect(store.getState()).toBe(before);

    store.placeFragment('github', {surfaceId: 'github:prs', source: 'github'});
    store.clearPlacement();
    expect(store.getState().placement.size).toBe(0);
  });

  it('promotes and demotes slots, and no-ops on a repeat', () => {
    const store = createCanvasStore();
    store.promoteSlot('github');
    const promoted = store.getState();
    store.promoteSlot('github');
    expect(store.getState()).toBe(promoted);

    store.promoteSlot('gmail');
    expect([...store.getState().promoted].sort()).toEqual(['github', 'gmail']);

    store.demoteSlot('github');
    expect([...store.getState().promoted]).toEqual(['gmail']);
    store.clearPromotions();
    expect(store.getState().promoted.size).toBe(0);
  });

  it('beginPaint marks in-flight with its cause; endPaint settles back to idle', () => {
    const store = createCanvasStore();
    store.beginPaint('utterance');
    expect(store.getState().inFlight).toEqual({cause: 'utterance'});
    store.endPaint();
    expect(store.getState().inFlight).toBeNull();
  });

  it('errors are sticky until the next dispatch clears them', () => {
    const store = createCanvasStore();
    store.reportError('the agent request failed');
    store.endPaint();
    expect(store.getState().error).toBe('the agent request failed');
    store.beginPaint('utterance');
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

  it('a paint title is kept per source, dropped when the next paint names nothing, gone with the composition', () => {
    const store = createCanvasStore();
    const listener = vi.fn();
    store.subscribe(listener);
    store.setPaintTitle('github', undefined);
    expect(listener).not.toHaveBeenCalled();

    store.setPaintTitle('github', 'Pull requests waiting on you');
    store.setPaintTitle('gmail', 'Unread — needs reply');
    expect(store.getState().paintTitles.get('github')).toBe('Pull requests waiting on you');
    store.setPaintTitle('github', undefined);
    expect(store.getState().paintTitles.has('github')).toBe(false);
    store.resetComposition();
    expect(store.getState().paintTitles.size).toBe(0);
  });

  it("each of the shell's cues gets a fresh key so repeats restart the fade", () => {
    const store = createCanvasStore();
    store.showNotice('done');
    const first = store.getState().notices[0];
    store.showNotice('done');
    const second = store.getState().notices[0];
    expect(second.key).not.toBe(first.key);
  });

  it('dismissNotice clears only the line it was issued for', () => {
    const store = createCanvasStore();
    store.showNotice('first');
    const stale = store.getState().notices[0].key;
    store.showNotice('second');
    store.dismissNotice(stale);
    expect(store.getState().notices[0].text).toBe('second');
    store.dismissNotice(store.getState().notices[0].key);
    expect(store.getState().notices).toEqual([]);
  });

  it('buffers prose per source, so interleaved chunks never merge', () => {
    const store = createCanvasStore();
    store.appendProse('github', 'Here are the 4 P');
    store.appendProse('gmail', 'Three unread ');
    store.appendProse('github', 'Rs awaiting review.');
    store.appendProse('gmail', 'messages.');
    expect(store.getState().notices.map(n => [n.source, n.text])).toEqual([
      ['github', 'Here are the 4 PRs awaiting review.'],
      ['gmail', 'Three unread messages.'],
    ]);
  });

  it('opens no line for prose that has not said anything yet', () => {
    const store = createCanvasStore();
    store.appendProse('github', '  ');
    expect(store.getState().notices).toEqual([]);
    // Once it does speak, the leading whitespace it arrived with is kept.
    store.appendProse('github', 'ok');
    expect(store.getState().notices[0].text).toBe('ok');
  });

  it("prose with no fragment stamp joins the shell's line", () => {
    const store = createCanvasStore();
    store.appendProse(null, 'painting…');
    expect(store.getState().notices).toEqual([{key: 0, source: null, text: 'painting…'}]);
  });

  it("a cue replaces the shell's line and leaves the sources' alone", () => {
    const store = createCanvasStore();
    store.appendProse('github', 'four PRs');
    store.appendProse(null, 'painting…');
    store.showNotice('hold on');
    expect(store.getState().notices.map(n => [n.source, n.text])).toEqual([
      ['github', 'four PRs'],
      [null, 'hold on'],
    ]);
  });

  it('clearNotices drops the whole stack', () => {
    const store = createCanvasStore();
    store.appendProse('github', 'four PRs');
    store.showNotice('hold on');
    store.clearNotices();
    expect(store.getState().notices).toEqual([]);
  });

  it('what a source said outlives the stack it was shown in', () => {
    // The stack fades six seconds after the turn settles, but a slot whose source spoke and
    // never painted rests on those words — so the fact that it was consulted must not fade
    // with the toast. Only a new turn forgets it.
    const store = createCanvasStore();
    store.appendProse('github', 'I could not compose that view.');
    store.clearNotices();
    expect(store.getState().notices).toEqual([]);
    expect(store.getState().prose.get('github')).toBe('I could not compose that view.');
    store.clearProse();
    expect(store.getState().prose.size).toBe(0);
  });

  it("the shell's own cue is not a source's prose", () => {
    const store = createCanvasStore();
    store.showNotice('hold on');
    store.appendProse(null, 'painting…');
    expect(store.getState().prose.size).toBe(0);
  });

  it('orders the stack by slot, with the shell last and unknown sources by their id', () => {
    const store = createCanvasStore();
    store.setRoster([
      {appId: 'github', displayName: 'GitHub'},
      {appId: 'gmail', displayName: 'Gmail'},
    ]);
    // Deliberately out of slot order: gmail answered first.
    store.appendProse(null, 'painting…');
    store.appendProse('gmail', 'three unread');
    store.appendProse('stranger', 'who?');
    store.appendProse('github', 'four PRs');
    expect(orderedNotices(store.getState()).map(n => [n.source, n.label])).toEqual([
      ['github', 'GitHub'],
      ['gmail', 'Gmail'],
      ['stranger', 'stranger'],
      [null, null],
    ]);
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
    store.beginPaint('utterance');
    expect(listener).toHaveBeenCalledTimes(1);
    unsubscribe();
    store.endPaint();
    expect(listener).toHaveBeenCalledTimes(1);
  });

  it('getState returns a new immutable snapshot per mutation (useSyncExternalStore contract)', () => {
    const store = createCanvasStore();
    const before = store.getState();
    store.beginPaint('utterance');
    expect(store.getState()).not.toBe(before);
    expect(before.inFlight).toBeNull();
  });
});

describe('settleInFlight', () => {
  it('marks the in-flight action’s source settled, the turn still in flight', () => {
    const store = createCanvasStore();
    store.beginPaint('surface-action', 'circleci');
    store.settleInFlight('circleci');
    expect(store.getState().inFlight).toEqual({
      cause: 'surface-action',
      source: 'circleci',
      settled: true,
    });
  });

  it('ignores another source, and is a no-op while idle', () => {
    const store = createCanvasStore();
    store.beginPaint('surface-action', 'circleci');
    store.settleInFlight('linear');
    expect(store.getState().inFlight?.settled).toBeUndefined();
    store.endPaint();
    store.settleInFlight('circleci');
    expect(store.getState().inFlight).toBeNull();
  });
});
