/**
 * The trail store (task-9.6 decision 2): the canvases of the session, one entry per question —
 * which is live, which is viewed — and the page's own state beside them. Each canvas's content
 * lives in its runtime's own store; this one knows only the facts the trail draws: the question,
 * when it was asked, the Planner's title once it arrives, the canvas it was asked from, whether
 * anything still runs in it. In memory for the session (phase-9 decision 14).
 */
import {truncateUtterance} from '../turn/cause';

export interface TrailEntry {
  /** Client-minted at the send (task-9.6 decision 3); the trail's key. */
  id: string;
  /** The A2A context the orchestrator minted, learned from the first event; absent until then. */
  contextId?: string;
  /** The user's words, verbatim. */
  question: string;
  /** Epoch ms of the Enter. */
  askedAt: number;
  /** The Planner's title, from the `paintMeta` on the layout surface; the question stands in until it arrives. */
  title?: string;
  /** The canvas this question was asked from — its trail id; absent on the session's first question. */
  parent?: string;
  /** Something runs in the canvas: its opening turn, an action turn, a press (task-9.6 decision 6). */
  loading: boolean;
}

/** The trusted pages a shell action opens (SPEC §7, §9.3). */
export type TrustedPage = 'store' | 'appLibrary';

/**
 * The trusted page open over the canvas: the Store or the App Library, as an overlay — the
 * canvas stays mounted beneath it (task-6.5 decisions 2, 3). Until Phase 13 builds the pages
 * it is a placeholder naming the page and the query it was opened with.
 */
export interface TrustedPageState {
  page: TrustedPage;
  /** The Store's search, when the action carried one — the capability the tile forwards. */
  query?: string;
}

export interface TrailState {
  /** Every canvas of the session in the order asked, oldest first. */
  entries: readonly TrailEntry[];
  /** The newest question's canvas; null before the first question. */
  live: string | null;
  /** The past canvas on screen; null means the live one is. */
  viewing: string | null;
  /** The trusted page open over the canvas; null when none is. Page-wide, not a canvas's. */
  trustedPage: TrustedPageState | null;
}

export interface OpenCanvas {
  id: string;
  question: string;
  askedAt: number;
  parent?: string;
}

export interface TrailStore {
  getState(): TrailState;
  subscribe(listener: () => void): () => void;
  /** A question asked: its canvas enters the trail as live and on screen. */
  open(canvas: OpenCanvas): void;
  /** The orchestrator named the canvas: its context, from the first event. */
  setContext(id: string, contextId: string): void;
  /** The Planner's title arrived. */
  setTitle(id: string, title: string): void;
  setLoading(id: string, loading: boolean): void;
  /** View a canvas; viewing the live one is returning to live. Unknown ids are ignored. */
  view(id: string): void;
  returnToLive(): void;
  /**
   * The canvas closes (task-9.6 decision 8): viewed, the view goes to live; live, the newest
   * remaining canvas becomes live; the last one leaves an empty trail.
   */
  close(id: string): void;
  /** A shell action landed: open its page over the canvas, or retarget the one already open. */
  openTrustedPage(page: TrustedPageState): void;
  closeTrustedPage(): void;
}

/** The entries newest first — the trail's order; asked in the same instant, the later opened first. */
export const newestFirst = (entries: readonly TrailEntry[]): TrailEntry[] =>
  entries
    .map((entry, index) => ({entry, index}))
    .sort((a, b) => b.entry.askedAt - a.entry.askedAt || b.index - a.index)
    .map(({entry}) => entry);

/** The canvas on screen: the viewed one, else live, else none. */
export const viewedCanvasId = (state: TrailState): string | null => state.viewing ?? state.live;

export const entryOf = (state: TrailState, id: string | null): TrailEntry | undefined =>
  id === null ? undefined : state.entries.find(entry => entry.id === id);

/** The entry's label: the Planner's title, the truncated question until it arrives (decision 4). */
export const entryLabel = (entry: TrailEntry): string =>
  entry.title ?? truncateUtterance(entry.question);

/** Back's target: the canvas asked just before the one on screen; none on the oldest. */
export function backTarget(state: TrailState): TrailEntry | undefined {
  const viewed = viewedCanvasId(state);
  if (viewed === null) return undefined;
  const ordered = newestFirst(state.entries);
  const index = ordered.findIndex(entry => entry.id === viewed);
  return index < 0 ? undefined : ordered[index + 1];
}

/**
 * A real branch (task-9.6 decision 5): the canvas was asked from one that is not its
 * chronological predecessor — asked from a past canvas, not from live.
 */
export function isBranch(state: TrailState, entry: TrailEntry): boolean {
  if (entry.parent === undefined) return false;
  const ordered = newestFirst(state.entries);
  const index = ordered.findIndex(e => e.id === entry.id);
  const predecessor = ordered[index + 1];
  return predecessor?.id !== entry.parent;
}

export function createTrailStore(): TrailStore {
  let state: TrailState = {entries: [], live: null, viewing: null, trustedPage: null};
  const listeners = new Set<() => void>();
  const set = (patch: Partial<TrailState>) => {
    state = {...state, ...patch};
    for (const listener of listeners) listener();
  };
  const patch = (id: string, change: Partial<TrailEntry>) => {
    if (!state.entries.some(entry => entry.id === id)) return;
    set({entries: state.entries.map(entry => (entry.id === id ? {...entry, ...change} : entry))});
  };

  return {
    getState: () => state,
    subscribe: listener => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    open: canvas => {
      set({
        entries: [...state.entries, {...canvas, loading: false}],
        live: canvas.id,
        viewing: null,
      });
    },
    setContext: (id, contextId) => patch(id, {contextId}),
    setTitle: (id, title) => patch(id, {title}),
    setLoading: (id, loading) => {
      if (entryOf(state, id)?.loading !== loading) patch(id, {loading});
    },
    view: id => {
      if (!state.entries.some(entry => entry.id === id)) return;
      const viewing = id === state.live ? null : id;
      if (viewing !== state.viewing) set({viewing});
    },
    returnToLive: () => {
      if (state.viewing !== null) set({viewing: null});
    },
    close: id => {
      if (!state.entries.some(entry => entry.id === id)) return;
      const entries = state.entries.filter(entry => entry.id !== id);
      const live = state.live === id ? (newestFirst(entries)[0]?.id ?? null) : state.live;
      const viewing = state.viewing === id || state.viewing === live ? null : state.viewing;
      set({entries, live, viewing});
    },
    openTrustedPage: page => set({trustedPage: page}),
    closeTrustedPage: () => {
      if (state.trustedPage) set({trustedPage: null});
    },
  };
}
