/**
 * The App Library's sign-in, with no canvas (phase-14 decision 15, task-14.3 decision 6): Add
 * account — the app's next account, by the bare app id — and Sign in again on a lapsed account
 * open the orchestrator's start route in a window of their own and poll the attempt the way the
 * canvas does (SPEC §8), naming no canvas; nothing resumes, the account appears on the page.
 *
 * Each wait is keyed by what was pressed. Open the sign-in again opens a new window on a new
 * attempt, and whichever finishes is the outcome. Cancel shows the cancelled line while the
 * attempt is still watched, so a sign-in finished afterwards still shows the account added
 * (task-14.8 decision 10); leaving the app's view stops every watch — an account finished later
 * shows the next time the accounts are read.
 */
import {useEffect, useState} from 'react';
import {readAttempt, signInStartUrl} from '../../../orchestratorApi';
import {ATTEMPT_WATCH_MS, mintAttemptId, openable, POLL_INTERVAL_MS} from '../../signIn';

/** How a wait ended. */
export type SignInEnd =
  /** Add account: the account added, by its source and label. */
  | {kind: 'added'; source: string; label: string}
  /** Sign in again: signed in, as another identity when rebound. */
  | {kind: 'again'; label: string; rebound: boolean}
  /** The identity is already one of the app's accounts (task-14.3 decision 7). */
  | {kind: 'existing'; label: string}
  | {kind: 'cancelled'}
  | {kind: 'expired'}
  | {kind: 'failed'};

interface Attempt {
  id: string;
  until: number;
  /** The orchestrator has answered for it: the window reached the start route. */
  seen: boolean;
  timer?: ReturnType<typeof setTimeout>;
}

interface Wait {
  key: string;
  kind: 'add' | 'again';
  /** The waiting form is up: until the sign-in ends, Cancel or the attempt expires. */
  showing: boolean;
  cancelled: boolean;
  attempts: Map<string, Attempt>;
}

export interface PageSignInOptions {
  orchestrator: string;
  /** An account signed in: the page reads the accounts again. Fixed for the view's life. */
  onSignedIn: () => void;
  /** How often an attempt is asked after. */
  pollMs?: number;
  /** Opens the sign-in window; the default is the browser's, with `noopener,noreferrer`. */
  openWindow?: (url: string) => void;
}

const openInWindow = (url: string) => void window.open(url, '_blank', 'noopener,noreferrer');

/** What the page draws: the waits whose form is up, and how each ended. */
interface View {
  waiting: ReadonlySet<string>;
  ends: ReadonlyMap<string, SignInEnd>;
}

const EMPTY: View = {waiting: new Set(), ends: new Map()};

/** The windows and their attempts, outside React: what the page draws is handed to `onView`. */
function createWatcher({
  orchestrator,
  pollMs,
  openWindow,
  onView,
  onSignedIn,
}: {
  orchestrator: string;
  pollMs: number;
  openWindow: (url: string) => void;
  onView: (view: View) => void;
  onSignedIn: () => void;
}) {
  const waits = new Map<string, Wait>();
  const ends = new Map<string, SignInEnd>();

  const show = () =>
    onView({
      waiting: new Set([...waits.values()].filter(w => w.showing).map(w => w.key)),
      ends: new Map(ends),
    });

  const settle = (wait: Wait, end: SignInEnd) => {
    for (const attempt of wait.attempts.values()) clearTimeout(attempt.timer);
    waits.delete(wait.key);
    // After Cancel, only an account signed in changes what the page said.
    const signed = end.kind === 'added' || end.kind === 'again' || end.kind === 'existing';
    if (signed || !wait.cancelled) ends.set(wait.key, end);
    show();
    if (signed) onSignedIn();
  };

  const ask = async (wait: Wait, attempt: Attempt): Promise<void> => {
    let outcome;
    try {
      outcome = await readAttempt(orchestrator, attempt.id);
    } catch {
      // Lost on the way — the tunnel drops requests: the next poll asks again.
    }
    if (waits.get(wait.key) !== wait || !wait.attempts.has(attempt.id)) return;
    if (outcome?.state === 'signedIn') {
      const label = outcome.label ?? '';
      return settle(
        wait,
        outcome.existing
          ? {kind: 'existing', label}
          : wait.kind === 'add'
            ? {kind: 'added', source: outcome.source ?? '', label}
            : {kind: 'again', label, rebound: outcome.rebound === true},
      );
    }
    // Unknown before it was ever seen: the window has not reached the start route yet.
    const early = outcome?.state === 'unknown' && !attempt.seen;
    if (outcome && outcome.state !== 'unknown') attempt.seen = true;
    const ended = outcome && outcome.state !== 'pending' && !early;
    if (ended || Date.now() >= attempt.until) {
      // This window's attempt is over; another one opened since may still finish.
      wait.attempts.delete(attempt.id);
      if (wait.attempts.size > 0) return;
      return settle(wait, outcome?.state === 'failed' ? {kind: 'failed'} : {kind: 'expired'});
    }
    attempt.timer = setTimeout(() => void ask(wait, attempt), pollMs);
  };

  return {
    /**
     * Opens a sign-in window, synchronously inside the click, and watches its attempt: `key`
     * names the wait, `source` what signs in — the bare app id for Add account, the account's
     * source for Sign in again.
     */
    start(key: string, source: string, kind: 'add' | 'again') {
      const id = mintAttemptId();
      const url = signInStartUrl(orchestrator, {attempt: id, source});
      if (!openable(url)) {
        console.warn('[A2UI:sign-in] not opened: sign-in opens only over https', url);
        return;
      }
      openWindow(url);
      let wait = waits.get(key);
      if (!wait) {
        wait = {key, kind, showing: true, cancelled: false, attempts: new Map()};
        waits.set(key, wait);
      }
      wait.showing = true;
      wait.cancelled = false;
      ends.delete(key);
      const attempt: Attempt = {id, until: Date.now() + ATTEMPT_WATCH_MS, seen: false};
      wait.attempts.set(id, attempt);
      const watched = wait;
      attempt.timer = setTimeout(() => void ask(watched, attempt), pollMs);
      show();
    },
    /** Cancel: the waiting form goes, the cancelled line shows, the attempt is still watched. */
    cancel(key: string) {
      const wait = waits.get(key);
      if (!wait) return;
      wait.showing = false;
      wait.cancelled = true;
      ends.set(key, {kind: 'cancelled'});
      show();
    },
    /** Stops every watch: the view has gone. */
    stop() {
      for (const wait of waits.values()) {
        for (const attempt of wait.attempts.values()) clearTimeout(attempt.timer);
      }
      waits.clear();
    },
  };
}

export function usePageSignIn({
  orchestrator,
  onSignedIn,
  pollMs = POLL_INTERVAL_MS,
  openWindow = openInWindow,
}: PageSignInOptions) {
  const [view, setView] = useState<View>(EMPTY);
  // One watcher for the view's life: its options are the view's, fixed while it stands.
  const [watcher] = useState(() =>
    createWatcher({orchestrator, pollMs, openWindow, onView: setView, onSignedIn}),
  );
  // Leaving the app's view stops every watch (task-14.8 decision 10).
  useEffect(() => () => watcher.stop(), [watcher]);

  return {
    waiting: (key: string) => view.waiting.has(key),
    end: (key: string) => view.ends.get(key),
    start: watcher.start,
    cancel: watcher.cancel,
  };
}
