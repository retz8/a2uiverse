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

/** The trusted page's three destinations (SPEC §7, §9.3). */
export type TrustedPage = 'store' | 'appLibrary' | 'publish';

/**
 * The trusted page open over the canvas — the canvas stays mounted beneath it (task-6.5 decisions
 * 2, 3) — at one of its destinations, with what it was opened on.
 */
export interface TrustedPageState {
  page: TrustedPage;
  /** The Store's search, when the action carried one — the capability the tile forwards. */
  query?: string;
  /**
   * The app whose view it opens on, in the Store or the App Library (task-14.2 decision 17); on
   * Publish's form, the app it publishes an update to.
   */
  app?: string;
  /** The Store filtered on one publisher's apps (task-14.7 decision 4). */
  publisher?: string;
  /** Publish at its publish form — for an update to `app`, else for a new app (task-14.9 decision 7). */
  form?: boolean;
}

/**
 * The slot a Store page was opened from — by More in the Store or an offered app's name (task-15.9
 * decision 3): its canvas, its component on the shell surface, and the gap's words. Held beside
 * the page, never in its address.
 */
export interface SlotOrigin {
  /** The canvas's trail id. */
  canvas: string;
  surfaceId: string;
  componentId: string;
  gap: string;
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
  /** The destination last open this session — the Store before any — where the entry point opens. */
  lastPage: TrustedPage;
  /**
   * The slot the open page was opened from, for as long as it stays open — wherever the person goes
   * in it — until an install there fills it (task-15.9 decision 3); null otherwise.
   */
  openedFrom: SlotOrigin | null;
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
   * remaining canvas becomes live; the last one leaves an empty trail. The canvases asked from
   * it take its parent, so Back still follows the branch (task-9.9 decision 22).
   */
  close(id: string): void;
  /**
   * A shell action landed: open its page over the canvas, or retarget the one already open. A page
   * opened from a slot carries it; a move inside the open page keeps the slot it was opened from.
   */
  openTrustedPage(page: TrustedPageState, from?: SlotOrigin): void;
  closeTrustedPage(): void;
  /** The install the page was opened for has filled its slot: the page is tied to it no more. */
  untie(): void;
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

/**
 * Back's target: the canvas the one on screen was asked from — Back follows the branch, not the
 * timeline (task-9.9 decision 22); none on the session's first question.
 */
export function backTarget(state: TrailState): TrailEntry | undefined {
  const viewed = state.entries.find(entry => entry.id === viewedCanvasId(state));
  if (viewed?.parent === undefined) return undefined;
  return state.entries.find(entry => entry.id === viewed.parent);
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
  let state: TrailState = {
    entries: [],
    live: null,
    viewing: null,
    trustedPage: null,
    lastPage: 'store',
    openedFrom: null,
  };
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
      const closed = state.entries.find(entry => entry.id === id);
      if (!closed) return;
      // Its children take its parent: the branch runs on through it (task-9.9 decision 22).
      const entries = state.entries
        .filter(entry => entry.id !== id)
        .map(entry => {
          if (entry.parent !== id) return entry;
          const {parent: _closed, ...rest} = entry;
          return closed.parent === undefined ? rest : {...rest, parent: closed.parent};
        });
      const live = state.live === id ? (newestFirst(entries)[0]?.id ?? null) : state.live;
      const viewing = state.viewing === id || state.viewing === live ? null : state.viewing;
      set({entries, live, viewing});
    },
    openTrustedPage: (page, from) =>
      set({
        trustedPage: page,
        lastPage: page.page,
        openedFrom: from ?? (state.trustedPage ? state.openedFrom : null),
      }),
    closeTrustedPage: () => {
      if (state.trustedPage) set({trustedPage: null, openedFrom: null});
    },
    untie: () => {
      if (state.openedFrom) set({openedFrom: null});
    },
  };
}
