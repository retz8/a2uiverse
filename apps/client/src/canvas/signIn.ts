/**
 * The client's half of sign-in (SPEC §8; task 12.8): the page's one sign-in, built with the
 * canvases' wiring. Sign in, Sign in again, the quiet line's Sign in, Allow and the add-account
 * tile's Add account reach it from the shell catalog inside the click.
 *
 * A press opens the orchestrator's start route in a window of its own, with `noopener,noreferrer`
 * and only to https, localhost exempt (phase-12 decision 14), naming an attempt the client made,
 * the canvas's A2A context and the source — the bare app id for add-account (task-12.8
 * decision 5). The window gives back nothing, so the outcome is learned only by polling the attempt
 * over `orchestratorApi`, until it is signed in, failed or expired.
 *
 * - While the window is open the pressed slot waits, until the sign-in ends, Cancel or the attempt
 *   expires: the window may be a tab hiding the canvas, so the canvas getting the focus back says
 *   nothing of it. Open the sign-in again opens a new window on a new attempt; whichever finishes
 *   resumes the slot. After Cancel the attempt is still polled, so a sign-in finished afterwards
 *   resumes the slot (decisions 1, 2, 9; task-12.13 decision 26).
 * - Signed in, the source is remembered for the page load and the pressed slot's `retry` goes to
 *   the canvas it was pressed on, on screen or not (decision 8). Allow resumes the same way: the
 *   orchestrator sends again the press that needed the scope (decision 10).
 * - Sign in on a remembered source opens no window: it sends `retry` at once (decision 4). A tile
 *   painted for the source after that makes it forgotten. Allow always opens the window.
 * - An added account is said on the progress line of the canvas it was pressed on (decision 6),
 *   and the add-account tile's `retry` lists it there. While its window is open the tile waits as
 *   the authority tile does, keyed by the bare app id (task-12.13 decisions 26, 27).
 * - Failed or expired, the slot's tile goes back as it was, the reason to the console (decision 3).
 */
import type {SignInRequest} from '@a2uiverse/shell-catalog';
import {readAttempt, signInStartUrl, type AttemptOutcome} from '../orchestratorApi';
import type {CanvasRuntime} from './canvasRuntime';

/** How often a pending attempt is asked after. */
export const POLL_INTERVAL_MS = 1_000;
/** How long the client asks after an attempt: the orchestrator's ten minutes, and some. */
export const ATTEMPT_WATCH_MS = 11 * 60_000;

export interface SignInOptions {
  /** The orchestrator's base URL. */
  serverUrl: string;
  /** A canvas of the page by its id; undefined once closed. */
  runtimeOf(id: string): CanvasRuntime | undefined;
  /** Opens the sign-in window; the default is the browser's, with `noopener,noreferrer`. */
  openWindow?: (url: string) => void;
  /** Reads an attempt's outcome; the default polls the orchestrator. */
  poll?: (attempt: string) => Promise<AttemptOutcome>;
  /** Makes an unguessable attempt id. */
  mintAttempt?: () => string;
}

export interface SignIn {
  /** A sign-in raised on a canvas — start or cancel — synchronously inside the click. */
  request(runtime: CanvasRuntime, request: Pick<SignInRequest, 'kind' | 'source'>): void;
  /** Sources a shell paint drew the tile or the quiet line for: no longer known signed in. */
  forget(sources: readonly string[]): void;
  /** Stops every poll. */
  dispose(): void;
}

interface Attempt {
  id: string;
  /** The canvas it was pressed on. */
  canvas: string;
  /** The pressed source; the bare app id for add-account. */
  source: string;
  kind: 'resume' | 'addAccount';
  /** The pressed slot is waiting on the window. */
  waiting: boolean;
  /** The orchestrator has answered for it: the window reached the start route. */
  seen?: boolean;
  until: number;
  timer?: ReturnType<typeof setTimeout>;
}

/** Only https opens, localhost exempt (phase-12 decision 14). */
export function openable(url: string): boolean {
  try {
    const parsed = new URL(url);
    if (parsed.protocol === 'https:') return true;
    return (
      parsed.protocol === 'http:' && ['localhost', '127.0.0.1', '[::1]'].includes(parsed.hostname)
    );
  } catch {
    return false;
  }
}

/** 24 random bytes, base64url: what the orchestrator takes as an attempt id. */
export function mintAttemptId(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(24));
  return btoa(String.fromCharCode(...bytes))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

/** What the progress line says of an added account (task-12.8 decision 6). */
export function accountNoticeOf(outcome: AttemptOutcome, app: string): string {
  const label = outcome.label || `${outcome.app ?? app} account`;
  const name = outcome.app ?? app;
  return outcome.existing ? `${label} was already added to ${name}.` : `Added ${label} to ${name}.`;
}

export function createSignIn({
  serverUrl,
  runtimeOf,
  openWindow = url => void window.open(url, '_blank', 'noopener,noreferrer'),
  poll = attempt => readAttempt(serverUrl, attempt),
  mintAttempt = mintAttemptId,
}: SignInOptions): SignIn {
  /** The sources signed in during this page load (decision 4). */
  const remembered = new Set<string>();
  const attempts = new Map<string, Attempt>();

  /**
   * The slot — or, for add-account, the app's add-account button — waits while any of its
   * attempts does (task-12.13 decision 26).
   */
  const showSlotWaiting = (canvas: string, source: string) => {
    const waiting = [...attempts.values()].some(
      a => a.canvas === canvas && a.source === source && a.waiting,
    );
    runtimeOf(canvas)?.store.setSigningIn(source, waiting);
  };

  const showWaiting = (attempt: Attempt) => showSlotWaiting(attempt.canvas, attempt.source);

  const settle = (attempt: Attempt) => {
    clearTimeout(attempt.timer);
    attempts.delete(attempt.id);
    if (attempt.waiting) {
      attempt.waiting = false;
      showWaiting(attempt);
    }
  };

  const signedIn = (attempt: Attempt, outcome: AttemptOutcome) => {
    if (outcome.source) remembered.add(outcome.source);
    const runtime = runtimeOf(attempt.canvas);
    // One outcome per pressed slot or add-account step: a second window on it is let go.
    for (const other of [...attempts.values()]) {
      if (
        other.canvas === attempt.canvas &&
        other.source === attempt.source &&
        other.kind === attempt.kind
      )
        settle(other);
    }
    if (attempt.kind === 'addAccount') {
      runtime?.store.showAccountNotice(accountNoticeOf(outcome, attempt.source));
      // The add-account tile lists the account added (task-12.13 decision 27).
      void runtime?.press({kind: 'retry', sources: [attempt.source]});
      return;
    }
    // Signed in again as another identity: said, so different data never comes in unexplained
    // (task-12.13 decision 24).
    if (outcome.rebound && outcome.label) {
      runtime?.store.showAccountNotice(
        `Signed in to ${outcome.app ?? attempt.source} as ${outcome.label}.`,
      );
    }
    void runtime?.press({kind: 'retry', sources: [attempt.source]});
  };

  const ask = async (attempt: Attempt) => {
    let outcome: AttemptOutcome | undefined;
    try {
      outcome = await poll(attempt.id);
    } catch (err) {
      // Lost on the way — the tunnel drops requests (A2U-7): the next poll asks again.
      console.info('[A2UI:sign-in] poll failed', err);
    }
    if (!attempts.has(attempt.id)) return;
    if (outcome?.state === 'signedIn') return signedIn(attempt, outcome);
    // Unknown before it was ever seen: the window has not reached the start route yet — through
    // the tunnel it can land after the first poll (task 12.12). Asked again like a pending one.
    const early = outcome?.state === 'unknown' && !attempt.seen;
    if (outcome && outcome.state !== 'unknown') attempt.seen = true;
    if (outcome && outcome.state !== 'pending' && !early) {
      console.info(
        `[A2UI:sign-in] ${attempt.source}: ${outcome.state}${outcome.reason ? ` (${outcome.reason})` : ''}`,
      );
      return settle(attempt);
    }
    if (Date.now() >= attempt.until) {
      console.info(`[A2UI:sign-in] ${attempt.source}: no answer`);
      return settle(attempt);
    }
    attempt.timer = setTimeout(() => void ask(attempt), POLL_INTERVAL_MS);
  };

  /** Opens the window and watches the attempt; false when no window could be opened. */
  const begin = (runtime: CanvasRuntime, source: string, kind: Attempt['kind']): boolean => {
    const canvas = runtime.contextId();
    if (canvas === undefined) {
      console.warn('[A2UI:sign-in] the canvas has no context yet', source);
      return false;
    }
    const id = mintAttempt();
    const url = signInStartUrl(serverUrl, {attempt: id, canvas, source});
    if (!openable(url)) {
      console.warn('[A2UI:sign-in] not opened: sign-in opens only over https', url);
      return false;
    }
    openWindow(url);
    const attempt: Attempt = {
      id,
      canvas: runtime.id,
      source,
      kind,
      waiting: true,
      until: Date.now() + ATTEMPT_WATCH_MS,
    };
    attempts.set(id, attempt);
    showWaiting(attempt);
    attempt.timer = setTimeout(() => void ask(attempt), POLL_INTERVAL_MS);
    return true;
  };

  return {
    request: (runtime, {kind, source}) => {
      if (kind === 'cancel') {
        // Cancel is closing the window (decision 2): the tile back, the attempt still watched.
        for (const attempt of attempts.values()) {
          if (attempt.canvas === runtime.id && attempt.source === source) attempt.waiting = false;
        }
        showSlotWaiting(runtime.id, source);
        return;
      }
      // Add account on the add-account tile: the app's next account (task-12.13 decision 27).
      if (kind === 'addAccount') {
        begin(runtime, source, 'addAccount');
        return;
      }
      const asking = runtime.store.getState().escalations.has(source);
      if (remembered.has(source) && !asking) {
        void runtime.press({kind: 'retry', sources: [source]});
        return;
      }
      begin(runtime, source, 'resume');
    },
    forget: sources => {
      for (const source of sources) remembered.delete(source);
    },
    dispose: () => {
      for (const attempt of attempts.values()) clearTimeout(attempt.timer);
      attempts.clear();
    },
  };
}
