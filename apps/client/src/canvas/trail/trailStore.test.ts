/**
 * The trail store (task-9.6 decisions 2, 3, 5, 8): the canvases of the session, live and viewed,
 * and what the trail reads off them.
 */
import {describe, expect, it, vi} from 'vitest';
import {
  backTarget,
  createTrailStore,
  entryLabel,
  isBranch,
  newestFirst,
  viewedCanvasId,
} from './trailStore';

const open = (
  store: ReturnType<typeof createTrailStore>,
  id: string,
  at: number,
  parent?: string,
) => store.open({id, question: `question ${id}`, askedAt: at, ...(parent ? {parent} : {})});

describe('createTrailStore', () => {
  it('starts empty, with no live canvas and no page open', () => {
    expect(createTrailStore().getState()).toEqual({
      entries: [],
      live: null,
      viewing: null,
      trustedPage: null,
    });
  });

  it('a question opens a canvas as live and on screen, not yet loading, its context unknown', () => {
    const store = createTrailStore();
    open(store, 'a', 1000);
    expect(store.getState()).toMatchObject({live: 'a', viewing: null});
    expect(store.getState().entries[0]).toEqual({
      id: 'a',
      question: 'question a',
      askedAt: 1000,
      loading: false,
    });
    expect(viewedCanvasId(store.getState())).toBe('a');
  });

  it('the context, the title and the loading mark land on their entry alone', () => {
    const store = createTrailStore();
    open(store, 'a', 1000);
    open(store, 'b', 2000, 'a');
    store.setContext('a', 'ctx-a');
    store.setTitle('a', 'Needs attention today');
    store.setLoading('b', true);
    const [a, b] = store.getState().entries;
    expect(a).toMatchObject({contextId: 'ctx-a', title: 'Needs attention today', loading: false});
    expect(b).toMatchObject({parent: 'a', loading: true});
    expect(b.title).toBeUndefined();
  });

  it('setLoading notifies only on a change', () => {
    const store = createTrailStore();
    open(store, 'a', 1000);
    const listener = vi.fn();
    store.subscribe(listener);
    store.setLoading('a', false);
    expect(listener).not.toHaveBeenCalled();
    store.setLoading('a', true);
    expect(listener).toHaveBeenCalledTimes(1);
  });

  it('viewing a past canvas sets viewing; viewing live, or returning, clears it', () => {
    const store = createTrailStore();
    open(store, 'a', 1000);
    open(store, 'b', 2000, 'a');
    store.view('a');
    expect(store.getState().viewing).toBe('a');
    expect(viewedCanvasId(store.getState())).toBe('a');
    store.view('b');
    expect(store.getState().viewing).toBeNull();
    store.view('a');
    store.returnToLive();
    expect(store.getState().viewing).toBeNull();
    store.view('nope');
    expect(store.getState().viewing).toBeNull();
  });

  it('a new question asked from a past canvas becomes live and on screen', () => {
    const store = createTrailStore();
    open(store, 'a', 1000);
    open(store, 'b', 2000, 'a');
    store.view('a');
    open(store, 'c', 3000, 'a');
    expect(store.getState()).toMatchObject({live: 'c', viewing: null});
  });

  it('the label is the title, the truncated question until it arrives', () => {
    const store = createTrailStore();
    store.open({id: 'a', question: 'w'.repeat(60), askedAt: 1});
    const [entry] = store.getState().entries;
    expect(entryLabel(entry)).toBe(`${'w'.repeat(48)}…`);
    store.setTitle('a', 'Wide question');
    expect(entryLabel(store.getState().entries[0])).toBe('Wide question');
  });

  it('Back follows the branch: the canvas the one on screen was asked from, not the one asked just before; none on the first (task-9.9 decision 22)', () => {
    const store = createTrailStore();
    open(store, 'a', 1000);
    open(store, 'b', 2000, 'a');
    open(store, 'c', 3000, 'b');
    // Asked from a, after c: Back goes up its branch to a, past b and c.
    open(store, 'd', 4000, 'a');
    expect(backTarget(store.getState())?.id).toBe('a');
    store.view('c');
    expect(backTarget(store.getState())?.id).toBe('b');
    store.view('b');
    expect(backTarget(store.getState())?.id).toBe('a');
    store.view('a');
    expect(backTarget(store.getState())).toBeUndefined();
    expect(backTarget(createTrailStore().getState())).toBeUndefined();
  });

  it('closing a canvas hands its parent to the canvases asked from it, so Back runs on through it (task-9.9 decision 22)', () => {
    const store = createTrailStore();
    open(store, 'a', 1000);
    open(store, 'b', 2000, 'a');
    open(store, 'c', 3000, 'b');
    store.close('b');
    expect(store.getState().entries.find(e => e.id === 'c')?.parent).toBe('a');
    expect(backTarget(store.getState())?.id).toBe('a');
    // The first canvas closed: what was asked from it has no parent left.
    store.close('a');
    expect(store.getState().entries.find(e => e.id === 'c')).not.toHaveProperty('parent');
    expect(backTarget(store.getState())).toBeUndefined();
  });

  it('a branch is a canvas asked from one that is not its predecessor (decision 5)', () => {
    const store = createTrailStore();
    open(store, 'a', 1000);
    open(store, 'b', 2000, 'a');
    open(store, 'c', 3000, 'a');
    const state = store.getState();
    const [a, b, c] = state.entries;
    expect(isBranch(state, a)).toBe(false);
    expect(isBranch(state, b)).toBe(false);
    expect(isBranch(state, c)).toBe(true);
    expect(newestFirst(state.entries).map(e => e.id)).toEqual(['c', 'b', 'a']);
  });

  it('closing the viewed canvas returns to live; closing live makes the newest remaining live (decision 8)', () => {
    const store = createTrailStore();
    open(store, 'a', 1000);
    open(store, 'b', 2000, 'a');
    open(store, 'c', 3000, 'b');
    store.view('a');
    store.close('a');
    expect(store.getState()).toMatchObject({live: 'c', viewing: null});
    expect(store.getState().entries.map(e => e.id)).toEqual(['b', 'c']);

    store.view('b');
    store.close('c');
    // Live moved onto the canvas being viewed: the view is live again.
    expect(store.getState()).toMatchObject({live: 'b', viewing: null});

    store.close('b');
    expect(store.getState()).toMatchObject({entries: [], live: null, viewing: null});
    store.close('b');
    expect(store.getState().entries).toEqual([]);
  });

  it('a shell action opens its trusted page over the canvas; a second raise retargets it; close is a no-op when none is open', () => {
    const store = createTrailStore();
    const listener = vi.fn();
    store.subscribe(listener);
    store.closeTrustedPage();
    expect(listener).not.toHaveBeenCalled();
    store.openTrustedPage({page: 'store', query: 'flight booking'});
    expect(store.getState().trustedPage).toEqual({page: 'store', query: 'flight booking'});
    store.openTrustedPage({page: 'appLibrary'});
    expect(store.getState().trustedPage).toEqual({page: 'appLibrary'});
    store.closeTrustedPage();
    expect(store.getState().trustedPage).toBeNull();
  });
});
