/**
 * The canvas store: one hand-rolled external store (subscribe + snapshot, read by React via
 * useSyncExternalStore) owning the canvas state — stage and overlay occupancy, in-flight
 * status, and the single append-only ring of paint entries with head/viewing time travel.
 * Written from non-React code (the turn runner,
 * the replay driver, the A2A callbacks), which is why it is a closure module and not
 * component state.
 */
import type {CompositionOperation} from '@a2uiverse/sdk';
import type {MergeFacts} from '@a2uiverse/shell-catalog';
import type {
  PaintCause,
  PaintEntry,
  PaintFragment,
  PaintSnapshot,
  PaintSynthesis,
} from './timeline/paint';

/** The ring cap — a stated policy bound, not a memory guard. */
export const TIMELINE_CAP = 50;

/** A fragment mounted into a slot: which surface, and which app painted it. */
export interface PlacedFragment {
  surfaceId: string;
  /** The stamp's `source` — the app id, carried so nothing has to parse it back out of ids. */
  source: string;
}

/**
 * One line of the notice stack: a source's prose for the turn, accumulated as its chunks
 * arrive, or the shell's own cue. Keyed so a replacing cue restarts its fade.
 */
export interface Notice {
  key: number;
  /** The app that spoke; null when the shell speaks as itself — its cues, and unstamped prose. */
  source: string | null;
  text: string;
}

/**
 * A source the turn's shell paint reserved a slot for, in slot order. Derived from the shell's
 * own `Attribution` components — the client's second projection of the shell paint, beside
 * `placement`, and the only place the display names the orchestrator painted are readable.
 */
export interface RosterEntry {
  /** The source the shell reserved a slot for — the key the slot is placed by. */
  appId: string;
  displayName: string;
  /** The merged view's entry only, when its merge is over an entity: the join's nouns. */
  join?: JoinNouns;
}

/** The entity as each source calls it, painted on the merged view's slot at plan time (task-7.15). */
export interface JoinNouns {
  /** The source whose instances are the merged view's rows. */
  home: string;
  /** A plural noun per source id — `issues`, `PRs`, `runs`. */
  nouns: Readonly<Record<string, string>>;
}

/** The utterance that opened the turn on stage — the canvas's header until the next one. */
export interface Question {
  /** The user's words, verbatim. */
  text: string;
  /** Epoch ms of the Enter. */
  askedAt: number;
}

/** A slot state the orchestrator painted on the shell surface; filled is never on the wire. */
export type PaintedSlotState = 'pending' | 'failed' | 'collapsed';

/**
 * What the orchestrator painted on the merged view's slot (task-8.4 decision 13): the merge's own
 * source set once a view has landed, and the facts the press lines are drawn from.
 */
export interface PaintedMerge extends MergeFacts {
  merged?: string[];
}

/**
 * A press the reader made (task-8.5 decision 8): `sent` from the click until the paint catches up,
 * `running` while its stream stays open after that, `unreached` when it never reached the
 * orchestrator, `lost` when its stream broke after it had answered. The last two stand until the
 * next press of the same kind or the composition's retirement.
 */
export interface Press {
  key: number;
  operation: CompositionOperation;
  status: 'sent' | 'running' | 'unreached' | 'lost';
}

/** A notice as the stack renders it: ordered, and resolved against the roster. */
export interface RenderedNotice extends Notice {
  /** The source's display name; null for the shell, which speaks unlabeled. */
  label: string | null;
}

/** The pending question paint occupying the overlay slot. */
export interface OverlayState {
  surfaceId: string;
  /** The dialog's title when statically known — the question, for cause records and labels. */
  question?: string;
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

export interface CanvasState {
  /** The surface occupying the stage; null is the empty canvas. */
  stageId: string | null;
  /** The one transient question paint above the stage; null when no question is pending. */
  overlay: OverlayState | null;
  /** The trusted page open over the canvas; null when none is. */
  trustedPage: TrustedPageState | null;
  /**
   * The ring of paint entries, appended on land, chronological, never reordered. The newest
   * entry is the live paint — the only one whose snapshot may still be null.
   */
  timeline: readonly PaintEntry[];
  /** The parked paint's id; null is live. */
  viewing: number | null;
  /** A paint landed while parked — the "newer view exists" marker; cleared on return-to-live. */
  headAdvancedWhileParked: boolean;
  /**
   * Set while a paint is streaming: its activity label, and the kind of cause that opened it —
   * an utterance plans, an action or an answer works inside what is already there.
   */
  inFlight: {label: string; cause?: PaintCause['kind']} | null;
  /** Sticky failure text; cleared by the next dispatch (beginPaint). */
  error: string | null;
  /**
   * The live turn's question: set when an utterance opens a turn, kept through the actions that
   * follow inside its fragments, replaced by the next utterance. Null before the first.
   */
  question: Question | null;
  /**
   * Each slot's state as the shell paint last said it, by source: what the progress line reads
   * for a source that failed. Absent when the paint names none — pending until placed, then filled.
   * The composition's, like the roster: kept across the actions inside it, cleared when it retires.
   */
  slotStates: ReadonlyMap<string, PaintedSlotState>;
  /** The merged view's painted facts, as the last shell paint carrying its slot said them. */
  merge: PaintedMerge | null;
  /** The presses made on the composition on stage, until the paint catches up or they end. */
  presses: readonly Press[];
  /**
   * A newer question was sent and the composition on stage is being replaced: no press can be
   * made on it, and the progress line belongs to the question on its way.
   */
  superseded: boolean;
  /**
   * The notice stack: one entry per source that has spoken this turn, plus at most one for the
   * shell. Plural because a fan-out has several voices, and buffered per source because their
   * chunks interleave on the wire.
   */
  notices: readonly Notice[];
  /**
   * The composition's sources in slot order, from the shell paint; empty outside a composed turn.
   * Kept across the actions inside the composition, cleared when it retires (task-8.5 decision 13).
   */
  roster: readonly RosterEntry[];
  /**
   * What each source said this turn, by app id — kept for the whole turn, where `notices` is
   * only what is currently *shown*. A slot whose source spoke but never painted rests on this,
   * so the fact that a source was consulted survives the stack's fade.
   */
  prose: ReadonlyMap<string, string>;
  /** Bumped per applied batch — re-renders the stage and resets its error boundary. */
  appliedSeq: number;
  /**
   * The composition's placement: a slot's source → the fragment filling it. The only composition
   * state the client holds — the orchestrator is canonical for the rest, and the shell surface
   * is its rendered projection. Empty when the stage holds an uncomposed paint.
   */
  placement: ReadonlyMap<string, PlacedFragment>;
  /**
   * Slots whose fragment has asked for attention. A vendor cannot seize the canvas: it declares
   * a question, and the shell decides how to express it — here, by dimming the complement and
   * raising these. Plural by construction, since a fan-out can produce several at once, which is
   * why this is emphasis and not a modal.
   */
  promoted: ReadonlySet<string>;
}

export interface CanvasStore {
  getState(): CanvasState;
  subscribe(listener: () => void): () => void;
  beginPaint(label: string, cause?: PaintCause['kind']): void;
  /** Upgrade the in-flight label (the agent-authored title); no-op when idle. */
  updateInFlightLabel(label: string): void;
  endPaint(): void;
  setQuestion(question: Question): void;
  /** Merge the slot states a shell paint carried; `null` clears a source's. */
  mergeSlotStates(states: ReadonlyMap<string, PaintedSlotState | null>): void;
  /** The merged view's facts, from a shell paint carrying its slot. */
  setMerge(merge: PaintedMerge | null): void;
  /**
   * A press made: recorded `sent`, replacing what an earlier press of the same kind — for Retry,
   * of the same source — left standing. Returns its key.
   */
  addPress(operation: CompositionOperation): number;
  updatePress(key: number, status: Press['status']): void;
  removePress(key: number): void;
  /** A newer question was sent: the composition on stage is being replaced. */
  supersede(): void;
  /** The composition retired: its roster, slot states, merge facts and presses go with it. */
  resetComposition(): void;
  reportError(text: string): void;
  setStage(stageId: string | null): void;
  setOverlay(overlay: OverlayState | null): void;
  /** A shell action landed: open its page over the canvas, or retarget the one already open. */
  openTrustedPage(page: TrustedPageState): void;
  closeTrustedPage(): void;
  /** Append a landed paint; evicts past the ring cap and raises the parked marker. */
  appendEntry(entry: PaintEntry): void;
  /**
   * Serialize-on-swap: complete the addressed entry with its captured content — the shell's
   * snapshot, and for a composition the fragments that were filling its slots.
   */
  fillSnapshot(
    paintId: number,
    snapshot: PaintSnapshot,
    fragments?: readonly PaintFragment[],
    synthesis?: PaintSynthesis,
  ): void;
  /** Parked write-back: replace the snapshot's data model wholesale. */
  replaceSnapshotDataModel(paintId: number, dataModel: unknown): void;
  /** View a past entry. Unknown ids are ignored. */
  park(paintId: number): void;
  returnToLive(): void;
  /** Monotonic paint ids — never reused; causes reference ids, not slots. */
  nextPaintId(): number;
  /**
   * Agent prose: append a streamed chunk to its source's buffer, creating the line on first
   * chunk. `null` is the shell's bucket — prose that arrived with no fragment stamp.
   */
  appendProse(source: string | null, text: string): void;
  /** The shell speaking as itself: replaces its own line and restarts its fade. */
  showNotice(text: string): void;
  dismissNotice(key: number): void;
  /** Drop the whole stack — a new turn beginning, or the group's fade expiring. */
  clearNotices(): void;
  /** Forget what the turn's sources said; the turn is over, not merely faded. */
  clearProse(): void;
  /** Record the turn's sources in slot order, from the shell paint. */
  setRoster(roster: readonly RosterEntry[]): void;
  bumpApplied(): void;
  /**
   * A fragment claims its slot. One surface per slot: a later claim displaces the earlier, which
   * the caller is responsible for retiring from the processor.
   */
  placeFragment(source: string, fragment: PlacedFragment): void;
  /** The composition left the canvas: forget where its fragments were. */
  clearPlacement(): void;
  /** A source's fragment left its slot — its slot failed (task-8.5 decision 3). */
  unplace(source: string): void;
  /** A fragment asks for attention; the shell grants it. */
  promoteSlot(source: string): void;
  /** Answered, failed, or gone: the slot drops back to the rest of the canvas. */
  demoteSlot(source: string): void;
  clearPromotions(): void;
}

/**
 * The paint the user is looking at: the parked paint, else the head while the stage is
 * occupied, else null — an empty live canvas has no current paint, however much departed
 * history exists.
 */
/**
 * The stack as rendered: one line per source in the order the plan gave the slots, so the stack
 * echoes the layout below it and never reorders under a reader, with the shell's own line last.
 * A source the roster does not know keeps its appId — the degenerate, uncomposed case.
 */
export function orderedNotices(state: CanvasState): readonly RenderedNotice[] {
  const rank = new Map(state.roster.map((entry, i) => [entry.appId, i]));
  const label = new Map(state.roster.map(entry => [entry.appId, entry.displayName]));
  const indexOf = (notice: Notice) =>
    notice.source === null ? Number.MAX_SAFE_INTEGER : (rank.get(notice.source) ?? rank.size);
  return [...state.notices]
    .sort((a, b) => indexOf(a) - indexOf(b))
    .map(notice => ({
      ...notice,
      label: notice.source === null ? null : (label.get(notice.source) ?? notice.source),
    }));
}

/**
 * The question heading what the user is looking at. Live, the turn's own; parked, the utterance
 * that opened the parked paint — found by walking its causes back through the actions taken
 * inside it, as far as the ring still holds them.
 */
export function questionOnView(state: CanvasState): Question | null {
  if (state.viewing === null) return state.question;
  const byId = new Map(state.timeline.map(e => [e.paintId, e]));
  let entry = byId.get(state.viewing);
  const seen = new Set<number>();
  while (entry && !seen.has(entry.paintId)) {
    seen.add(entry.paintId);
    if (entry.cause.kind === 'utterance') {
      return {text: entry.cause.payload.text, askedAt: entry.paintedAt};
    }
    entry = entry.cause.parent === null ? undefined : byId.get(entry.cause.parent);
  }
  return null;
}

export function currentPaintId(state: CanvasState): number | null {
  if (state.viewing !== null) return state.viewing;
  if (state.stageId === null) return null;
  const head = state.timeline[state.timeline.length - 1];
  return head?.paintId ?? null;
}

export function createCanvasStore(): CanvasStore {
  let state: CanvasState = {
    stageId: null,
    overlay: null,
    trustedPage: null,
    timeline: [],
    viewing: null,
    headAdvancedWhileParked: false,
    inFlight: null,
    error: null,
    question: null,
    slotStates: new Map(),
    merge: null,
    presses: [],
    superseded: false,
    notices: [],
    roster: [],
    prose: new Map(),
    appliedSeq: 0,
    placement: new Map(),
    promoted: new Set(),
  };
  let noticeKey = 0;
  let paintId = 0;
  let pressKey = 0;
  const listeners = new Set<() => void>();

  const set = (patch: Partial<CanvasState>) => {
    state = {...state, ...patch};
    for (const listener of listeners) listener();
  };

  const patchEntry = (id: number, patch: (entry: PaintEntry) => PaintEntry) =>
    set({timeline: state.timeline.map(e => (e.paintId === id ? patch(e) : e))});

  return {
    getState: () => state,
    subscribe: listener => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    beginPaint: (label, cause) => set({inFlight: {label, cause}, error: null}),
    updateInFlightLabel: label => {
      if (state.inFlight) set({inFlight: {...state.inFlight, label}});
    },
    endPaint: () => set({inFlight: null}),
    setQuestion: question => set({question}),
    mergeSlotStates: states => {
      if (states.size === 0) return;
      const next = new Map(state.slotStates);
      for (const [source, slotState] of states) {
        if (slotState === null) next.delete(source);
        else next.set(source, slotState);
      }
      set({slotStates: next});
    },
    setMerge: merge => set({merge}),
    addPress: operation => {
      const key = ++pressKey;
      const same = (press: Press) =>
        press.operation.kind === operation.kind &&
        (operation.kind !== 'retry' || press.operation.sources[0] === operation.sources[0]);
      set({
        presses: [
          ...state.presses.filter(
            press => !(same(press) && (press.status === 'unreached' || press.status === 'lost')),
          ),
          {key, operation, status: 'sent'},
        ],
      });
      return key;
    },
    updatePress: (key, status) => {
      if (state.presses.some(press => press.key === key && press.status !== status))
        set({
          presses: state.presses.map(press => (press.key === key ? {...press, status} : press)),
        });
    },
    removePress: key => {
      if (state.presses.some(press => press.key === key))
        set({presses: state.presses.filter(press => press.key !== key)});
    },
    supersede: () => {
      if (!state.superseded) set({superseded: true});
    },
    resetComposition: () =>
      set({roster: [], slotStates: new Map(), merge: null, presses: [], superseded: false}),
    reportError: text => set({error: text}),
    setStage: stageId => set({stageId}),
    setOverlay: overlay => set({overlay}),
    openTrustedPage: page => set({trustedPage: page}),
    closeTrustedPage: () => {
      if (state.trustedPage) set({trustedPage: null});
    },
    appendEntry: entry => {
      const grown = [...state.timeline, entry];
      const evicted = grown.slice(0, Math.max(0, grown.length - TIMELINE_CAP));
      const parkedEvicted = evicted.some(e => e.paintId === state.viewing);
      set({
        timeline: grown.slice(evicted.length),
        // Eviction of the parked entry forces return-to-live; otherwise a landing while
        // parked leaves the user parked and raises the newer-view marker.
        viewing: parkedEvicted ? null : state.viewing,
        headAdvancedWhileParked: parkedEvicted
          ? false
          : state.viewing !== null || state.headAdvancedWhileParked,
      });
    },
    fillSnapshot: (id, snapshot, fragments, synthesis) =>
      patchEntry(id, e => ({
        ...e,
        snapshot,
        ...(fragments?.length ? {fragments} : {}),
        ...(synthesis ? {synthesis} : {}),
      })),
    replaceSnapshotDataModel: (id, dataModel) =>
      patchEntry(id, e => (e.snapshot ? {...e, snapshot: {...e.snapshot, dataModel}} : e)),
    park: id => {
      if (state.timeline.some(e => e.paintId === id)) set({viewing: id});
    },
    returnToLive: () => set({viewing: null, headAdvancedWhileParked: false}),
    nextPaintId: () => ++paintId,
    appendProse: (source, text) => {
      const existing = state.notices.find(n => n.source === source);
      // A line is minted by the first chunk that says something: prose often opens with
      // whitespace, and a blank notice is a box with nothing in it.
      if (!existing && !text.trim()) return;
      if (source !== null) {
        const prose = new Map(state.prose);
        prose.set(source, (prose.get(source) ?? '') + text);
        state = {...state, prose};
      }
      set({
        notices: existing
          ? state.notices.map(n => (n === existing ? {...n, text: n.text + text} : n))
          : [...state.notices, {key: noticeKey++, source, text}],
      });
    },
    showNotice: text =>
      set({
        notices: [
          ...state.notices.filter(n => n.source !== null),
          {key: noticeKey++, source: null, text},
        ],
      }),
    dismissNotice: key => {
      if (state.notices.some(n => n.key === key))
        set({notices: state.notices.filter(n => n.key !== key)});
    },
    clearNotices: () => {
      if (state.notices.length) set({notices: []});
    },
    clearProse: () => {
      if (state.prose.size) set({prose: new Map()});
    },
    setRoster: roster => set({roster}),
    bumpApplied: () => set({appliedSeq: state.appliedSeq + 1}),
    placeFragment: (source, fragment) =>
      set({placement: new Map(state.placement).set(source, fragment)}),
    clearPlacement: () => {
      if (state.placement.size) set({placement: new Map()});
    },
    unplace: source => {
      if (!state.placement.has(source)) return;
      const placement = new Map(state.placement);
      placement.delete(source);
      set({placement});
    },
    promoteSlot: source => {
      if (!state.promoted.has(source)) set({promoted: new Set(state.promoted).add(source)});
    },
    demoteSlot: source => {
      if (!state.promoted.has(source)) return;
      const next = new Set(state.promoted);
      next.delete(source);
      set({promoted: next});
    },
    clearPromotions: () => {
      if (state.promoted.size) set({promoted: new Set()});
    },
  };
}
