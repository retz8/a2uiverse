/**
 * The client's half of sign-in (task 12.8): the window opened on the start route, the waiting tile
 * and the ways back from it, the outcome polled, the resume to the pressed slot's canvas, the
 * sources remembered for the page load, Allow, and add-account's line.
 */
import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest';
import type {CompositionOperation} from '@a2uiverse/sdk';
import type {AttemptOutcome} from '../orchestratorApi';
import type {CanvasRuntime} from './canvasRuntime';
import {createCanvasStore} from './canvasStore';
import {
  accountNoticeOf,
  ATTEMPT_WATCH_MS,
  createSignIn,
  mintAttemptId,
  openable,
  POLL_INTERVAL_MS,
} from './signIn';

/** A canvas as the sign-in sees it: its id, its context, its store and its presses. */
function canvas(id: string, contextId: string | undefined = `ctx-${id}`) {
  const pressed: CompositionOperation[] = [];
  const runtime = {
    id,
    contextId: () => contextId,
    store: createCanvasStore(),
    press: (operation: CompositionOperation) => {
      pressed.push(operation);
      return Promise.resolve();
    },
  } as unknown as CanvasRuntime;
  return {runtime, pressed};
}

function setup(base = 'https://vnw20xbg-10001.asse.devtunnels.ms') {
  const runtimes = new Map<string, CanvasRuntime>();
  const opened: string[] = [];
  const outcomes = new Map<string, AttemptOutcome | Error>();
  const page = new EventTarget();
  let n = 0;
  const signIn = createSignIn({
    serverUrl: base,
    runtimeOf: id => runtimes.get(id),
    openWindow: url => opened.push(url),
    poll: attempt => {
      const outcome = outcomes.get(attempt) ?? {state: 'pending'};
      return outcome instanceof Error ? Promise.reject(outcome) : Promise.resolve(outcome);
    },
    mintAttempt: () => `attempt-${++n}-0123456789abcdef`,
    page: page as unknown as Window,
  });
  const add = (id: string, contextId?: string) => {
    const made = canvas(id, contextId);
    runtimes.set(id, made.runtime);
    return made;
  };
  /** The attempt the nth window opened on. */
  const attemptOf = (i: number) => new URL(opened[i]!).searchParams.get('attempt')!;
  const answer = (i: number, outcome: AttemptOutcome | Error) =>
    outcomes.set(attemptOf(i), outcome);
  return {signIn, opened, page, add, runtimes, attemptOf, answer};
}

const tick = () => vi.advanceTimersByTimeAsync(POLL_INTERVAL_MS);

beforeEach(() => {
  vi.useFakeTimers();
  vi.spyOn(console, 'info').mockImplementation(() => {});
  vi.spyOn(console, 'warn').mockImplementation(() => {});
});
afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe('the window', () => {
  it('opens on the start route naming the attempt, the canvas’s context and the source', () => {
    const {signIn, opened, add} = setup();
    const {runtime} = add('a');
    signIn.request(runtime, {kind: 'start', source: 'gmail.1'});
    expect(opened).toHaveLength(1);
    const url = new URL(opened[0]!);
    expect(url.origin + url.pathname).toBe('https://vnw20xbg-10001.asse.devtunnels.ms/auth/start');
    expect(Object.fromEntries(url.searchParams)).toEqual({
      attempt: 'attempt-1-0123456789abcdef',
      canvas: 'ctx-a',
      source: 'gmail.1',
    });
    expect(runtime.store.getState().signingIn).toEqual(new Set(['gmail.1']));
  });

  it('opens only over https, localhost exempt; a canvas with no context yet opens none', () => {
    expect(openable('https://example.com/auth/start')).toBe(true);
    expect(openable('http://localhost:10001/auth/start')).toBe(true);
    expect(openable('http://127.0.0.1:10001/auth/start')).toBe(true);
    expect(openable('http://example.com/auth/start')).toBe(false);
    expect(openable('javascript:alert(1)')).toBe(false);

    const plain = setup('http://example.com:10001');
    const {runtime} = plain.add('a');
    plain.signIn.request(runtime, {kind: 'start', source: 'gmail.1'});
    expect(plain.opened).toEqual([]);
    expect(runtime.store.getState().signingIn.size).toBe(0);

    const early = setup();
    const fresh = early.add('b', undefined);
    (fresh.runtime as {contextId: () => string | undefined}).contextId = () => undefined;
    early.signIn.request(fresh.runtime, {kind: 'start', source: 'gmail.1'});
    expect(early.opened).toEqual([]);
  });

  it('is opened with noopener and noreferrer by default', () => {
    const open = vi.spyOn(window, 'open').mockReturnValue(null);
    const {runtime} = canvas('a');
    const signIn = createSignIn({serverUrl: 'http://localhost:10001', runtimeOf: () => runtime});
    signIn.request(runtime, {kind: 'start', source: 'gmail.1'});
    expect(open).toHaveBeenCalledWith(expect.any(String), '_blank', 'noopener,noreferrer');
    signIn.dispose();
  });

  it('attempt ids are unguessable and fit the orchestrator’s form', () => {
    const ids = new Set(Array.from({length: 20}, mintAttemptId));
    expect(ids.size).toBe(20);
    for (const id of ids) expect(id).toMatch(/^[A-Za-z0-9_-]{32}$/);
  });
});

describe('waiting', () => {
  it('the canvas getting the focus back after losing it puts the tile back; the attempt is still watched and resumes', async () => {
    const {signIn, page, add, answer} = setup();
    const {runtime, pressed} = add('a');
    signIn.request(runtime, {kind: 'start', source: 'gmail.1'});
    // A focus with no blur before it is not a window closed.
    page.dispatchEvent(new Event('focus'));
    expect(runtime.store.getState().signingIn.has('gmail.1')).toBe(true);
    page.dispatchEvent(new Event('blur'));
    page.dispatchEvent(new Event('focus'));
    expect(runtime.store.getState().signingIn.size).toBe(0);
    await tick();
    expect(pressed).toEqual([]);
    answer(0, {state: 'signedIn', source: 'gmail.1', label: 'me@example.com', existing: false});
    await tick();
    expect(pressed).toEqual([{kind: 'retry', sources: ['gmail.1']}]);
  });

  it('Cancel puts the tile back at once; a sign-in finished after it still resumes', async () => {
    const {signIn, add, answer} = setup();
    const {runtime, pressed} = add('a');
    signIn.request(runtime, {kind: 'start', source: 'gmail.1'});
    signIn.request(runtime, {kind: 'cancel', source: 'gmail.1'});
    expect(runtime.store.getState().signingIn.size).toBe(0);
    answer(0, {state: 'signedIn', source: 'gmail.1'});
    await tick();
    expect(pressed).toEqual([{kind: 'retry', sources: ['gmail.1']}]);
  });

  it('a blocked window takes no focus: the slot waits until Cancel', async () => {
    const {signIn, add} = setup();
    const {runtime} = add('a');
    signIn.request(runtime, {kind: 'start', source: 'gmail.1'});
    await vi.advanceTimersByTimeAsync(5 * POLL_INTERVAL_MS);
    expect(runtime.store.getState().signingIn.has('gmail.1')).toBe(true);
    signIn.request(runtime, {kind: 'cancel', source: 'gmail.1'});
    expect(runtime.store.getState().signingIn.size).toBe(0);
  });

  it('failed or expired, the tile goes back with no words, the reason to the console', async () => {
    const {signIn, add, answer} = setup();
    const {runtime, pressed} = add('a');
    signIn.request(runtime, {kind: 'start', source: 'gmail.1'});
    signIn.request(runtime, {kind: 'start', source: 'github.1'});
    answer(0, {state: 'failed', source: undefined, reason: 'access_denied'});
    answer(1, {state: 'expired'});
    await tick();
    expect(runtime.store.getState().signingIn.size).toBe(0);
    expect(runtime.store.getState().notices).toEqual([]);
    expect(runtime.store.getState().error).toBeNull();
    expect(pressed).toEqual([]);
    expect(console.info).toHaveBeenCalledWith('[A2UI:sign-in] gmail.1: failed (access_denied)');
  });

  it('a lost poll asks again; with no answer at all the attempt is let go', async () => {
    const {signIn, add, answer} = setup();
    const {runtime, pressed} = add('a');
    signIn.request(runtime, {kind: 'start', source: 'gmail.1'});
    answer(0, new Error('Failed to fetch'));
    await tick();
    expect(runtime.store.getState().signingIn.has('gmail.1')).toBe(true);
    answer(0, {state: 'signedIn', source: 'gmail.1'});
    await tick();
    expect(pressed).toEqual([{kind: 'retry', sources: ['gmail.1']}]);

    signIn.request(runtime, {kind: 'start', source: 'github.1'});
    answer(1, new Error('Failed to fetch'));
    await vi.advanceTimersByTimeAsync(ATTEMPT_WATCH_MS + POLL_INTERVAL_MS);
    expect(runtime.store.getState().signingIn.size).toBe(0);
  });
});

describe('an attempt not reached yet', () => {
  it('is asked again until the window reaches the start route; once seen, unknown lets it go', async () => {
    // Through the tunnel the window can reach the start route after the first poll (task 12.12).
    const {signIn, add, answer} = setup();
    const {runtime, pressed} = add('a');
    signIn.request(runtime, {kind: 'start', source: 'gmail.1'});
    answer(0, {state: 'unknown'});
    await vi.advanceTimersByTimeAsync(3 * POLL_INTERVAL_MS);
    expect(runtime.store.getState().signingIn.has('gmail.1')).toBe(true);
    answer(0, {state: 'signedIn', source: 'gmail.1'});
    await tick();
    expect(pressed).toEqual([{kind: 'retry', sources: ['gmail.1']}]);

    signIn.request(runtime, {kind: 'start', source: 'github.1'});
    answer(1, {state: 'pending'});
    await tick();
    answer(1, {state: 'unknown'});
    await tick();
    expect(runtime.store.getState().signingIn.size).toBe(0);
    expect(console.info).toHaveBeenCalledWith('[A2UI:sign-in] github.1: unknown');
  });
});

describe('the resume', () => {
  it('goes to the canvas Sign in was pressed on, on screen or not; two windows on one slot resume it once', async () => {
    const {signIn, add, answer} = setup();
    const a = add('a');
    const b = add('b');
    signIn.request(a.runtime, {kind: 'start', source: 'gmail.1'});
    signIn.request(a.runtime, {kind: 'start', source: 'gmail.1'});
    answer(1, {state: 'signedIn', source: 'gmail.1'});
    await tick();
    answer(0, {state: 'signedIn', source: 'gmail.1'});
    await vi.advanceTimersByTimeAsync(3 * POLL_INTERVAL_MS);
    expect(a.pressed).toEqual([{kind: 'retry', sources: ['gmail.1']}]);
    expect(b.pressed).toEqual([]);
  });

  it('a source signed in this page load loads at once on its next Sign in, with no window', async () => {
    const {signIn, opened, add, answer} = setup();
    const a = add('a');
    const b = add('b');
    signIn.request(a.runtime, {kind: 'start', source: 'gmail.1'});
    answer(0, {state: 'signedIn', source: 'gmail.1'});
    await tick();
    signIn.request(b.runtime, {kind: 'start', source: 'gmail.1'});
    expect(opened).toHaveLength(1);
    expect(b.pressed).toEqual([{kind: 'retry', sources: ['gmail.1']}]);
  });

  it('a tile painted for the source after its sign-in forgets it: the next Sign in opens the window', async () => {
    const {signIn, opened, add, answer} = setup();
    const a = add('a');
    signIn.request(a.runtime, {kind: 'start', source: 'gmail.1'});
    answer(0, {state: 'signedIn', source: 'gmail.1'});
    await tick();
    signIn.forget(['gmail.1']);
    signIn.request(a.runtime, {kind: 'start', source: 'gmail.1'});
    expect(opened).toHaveLength(2);
  });

  it('Allow always opens the window, the source remembered or not', async () => {
    const {signIn, opened, add, answer} = setup();
    const a = add('a');
    signIn.request(a.runtime, {kind: 'start', source: 'github.1'});
    answer(0, {state: 'signedIn', source: 'github.1'});
    await tick();
    a.runtime.store.mergeEscalations(new Map([['github.1', true]]));
    signIn.request(a.runtime, {kind: 'start', source: 'github.1'});
    expect(opened).toHaveLength(2);
    expect(a.runtime.store.getState().signingIn.has('github.1')).toBe(true);
    answer(1, {state: 'signedIn', source: 'github.1', existing: true});
    await tick();
    // The orchestrator sends again the press that needed the scope.
    expect(a.pressed).toEqual([
      {kind: 'retry', sources: ['github.1']},
      {kind: 'retry', sources: ['github.1']},
    ]);
  });
});

describe('add-account', () => {
  it('opens the start route on the bare app id, nothing waits, and the account is said on the canvas it was pressed on', async () => {
    const {signIn, opened, add, answer} = setup();
    const a = add('a');
    signIn.addAccount(a.runtime, 'gmail');
    expect(new URL(opened[0]!).searchParams.get('source')).toBe('gmail');
    expect(a.runtime.store.getState().signingIn.size).toBe(0);
    answer(0, {
      state: 'signedIn',
      source: 'gmail.2',
      label: 'work@example.com',
      app: 'Gmail',
      existing: false,
    });
    await tick();
    expect(a.runtime.store.getState().accountNotice).toBe('Added work@example.com to Gmail.');
    expect(a.pressed).toEqual([]);
  });

  it('an account already held is said so; a failed one says nothing', async () => {
    expect(
      accountNoticeOf(
        {
          state: 'signedIn',
          source: 'gmail.1',
          label: 'me@example.com',
          app: 'Gmail',
          existing: true,
        },
        'gmail',
      ),
    ).toBe('me@example.com was already added to Gmail.');
    const {signIn, add, answer} = setup();
    const a = add('a');
    signIn.addAccount(a.runtime, 'gmail');
    answer(0, {state: 'failed', reason: 'access_denied'});
    await tick();
    expect(a.runtime.store.getState().accountNotice).toBeNull();
  });
});
