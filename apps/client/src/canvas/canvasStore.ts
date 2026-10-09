/**
 * The canvas store: one hand-rolled external store (subscribe + snapshot, read by React via
 * useSyncExternalStore) owning one canvas's state — stage occupancy, in-flight
 * status, the question, and the composition's own facts. One per canvas (task-9.6 decision 2):
 * the trail store above it holds which canvases exist, which is live and which is viewed.
 * Written from non-React code (the turn runner, the replay driver, the A2A callbacks), which is
 * why it is a closure module and not component state.
 */
import type {CompositionOperation} from '@a2uiverse/sdk';
import type {AuthorityCause, MergeFacts} from '@a2uiverse/shell-catalog';
import type {PaintCause} from './turn/cause';

/** A fragment mounted into a slot: which surface, and which source painted it. */
export interface PlacedFragment {
  surfaceId: string;
  /**
   * The stamp's `source` — the app and the account it painted under — carried so nothing has to
   * parse it back out of ids.
   */
  source: string;
}

/**
 * One line of the notice stack: a source's prose for the turn, accumulated as its chunks
 * arrive, or the shell's own cue. Keyed so a replacing cue restarts its fade.
 */
export interface Notice {
  key: number;
  /** The source that spoke; null when the shell speaks as itself — its cues, and unstamped prose. */
  source: string | null;
  text: string;
}

/**
 * A source the turn's shell paint reserved a slot for, in slot order. Derived from the shell's
 * own `Attribution` components — the client's second projection of the shell paint, beside
 * `placement`, and the only place the names the orchestrator painted are readable.
 */
export interface RosterEntry {
  /** The source the shell reserved a slot for — the key the slot is placed by. */
  source: string;
  /**
   * The source's one name in words (task-12.4 decision 5): the app's display name, with the
   * account's label when the app has more than one account.
   */
  name: string;
  /**
   * The app and the account's label apart, when the name carries a label — so a sentence can put
   * the label after the app's own words (task-12.13 decision 56).
   */
  account?: {app: string; label: string};
  /** The merged view's entry only, when its merge is over an entity: the join's nouns. */
  join?: JoinNouns;
}

/** The entity as each source calls it, painted on the merged view's slot at plan time (task-7.15). */
export interface JoinNouns {
  /** Anchored: the source whose instances are the merged view's rows. Union: null (task-8.7 decision 30). */
  home: string | null;
  /** Union only: the thing the rows are, as the user says it — `cameras`. */
  entity?: string;
  /** A plural noun per source id — `issues`, `PRs`, `runs`. */
  nouns: Readonly<Record<string, string>>;
}

/** The utterance that opened the canvas — its header, verbatim. */
export interface Question {
  /** The user's words, verbatim. */
  text: string;
  /** Epoch ms of the Enter. */
  askedAt: number;
}

/** A slot state the orchestrator painted on the shell surface; filled is never on the wire. */
export type PaintedSlotState = 'pending' | 'failed' | 'collapsed' | 'authority';

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

export interface CanvasState {
  /** The surface occupying the stage; null is the empty canvas. */
  stageId: string | null;
  /**
   * Set while a paint is streaming: the kind of cause that opened it — an utterance plans, an
   * action or an answer works inside what is already there — and, for an action inside a
   * fragment, the source whose repaint is in flight (task-9.7 decision 6), `settled` once that
   * source's stream has ended while the turn runs on (task-9.9 decision 25).
   */
  inFlight: {cause?: PaintCause['kind']; source?: string; settled?: true} | null;
  /** Sticky failure text; cleared by the next dispatch (beginPaint). */
  error: string | null;
  /**
   * The canvas's question: set when its utterance opens the turn, kept through the actions that
   * follow inside its fragments. Null before it is asked.
   */
  question: Question | null;
  /**
   * Each slot's state as the shell paint last said it, by source: what the progress line reads
   * for a source that failed. Absent when the paint names none — pending until placed, then filled.
   * The composition's, like the roster: kept across the actions inside it, cleared when it retires.
   */
  slotStates: ReadonlyMap<string, PaintedSlotState>;
  /**
   * Each slot needing sign-in, by source: the authority tile's cause as the shell paint last said
   * it (task-12.8 decision 7). The progress line words its step from it.
   */
  authority: ReadonlyMap<string, AuthorityCause>;
  /** The sources whose attribution row carries a request for more access. */
  escalations: ReadonlySet<string>;
  /**
   * The sources a sign-in window is open for, pressed on this canvas (task-12.8 decisions 1, 2):
   * the waiting tile, and "signing in" on the progress line.
   */
  signingIn: ReadonlySet<string>;
  /** An account added from this canvas, in words: "Added … to …" (task-12.8 decision 6). */
  accountNotice: string | null;
  /**
   * An add-account window open from this canvas, in words — "Gmail signing in" — said at once on
   * the progress line until the account is said (task-12.13 decision 21).
   */
  addingAccount: string | null;
  /** The merged view's painted facts, as the last shell paint carrying its slot said them. */
  merge: PaintedMerge | null;
  /** The presses made on the composition on stage, until the paint catches up or they end. */
  presses: readonly Press[];
  /**
   * The merged view is following a step back to a combination the client has not seen (task-9.7
   * decision 4): its line works until the step's stream ends, with the walk's paint or without.
   */
  mergeFollowingStep: boolean;
  /**
   * The merged view holds its last values while a fragment it reads repainted and the
   * re-synthesis is on the way (task-9.9 decision 23): its line works until the turn ends.
   */
  mergeHeld: boolean;
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
   * What each source said this turn, by source — kept for the whole turn, where `notices` is
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
   * Slots whose fragment asks a question, not yet answered: said on the progress line, the
   * fragment left as it painted itself (task-12.13 decision 37).
   */
  asking: ReadonlySet<string>;
}

export interface CanvasStore {
  getState(): CanvasState;
  subscribe(listener: () => void): () => void;
  beginPaint(cause?: PaintCause['kind'], source?: string): void;
  /** The in-flight action's source has settled; no-op for any other source or when idle. */
  settleInFlight(source: string): void;
  endPaint(): void;
  setQuestion(question: Question): void;
  /** Merge the slot states a shell paint carried; `null` clears a source's. */
  mergeSlotStates(states: ReadonlyMap<string, PaintedSlotState | null>): void;
  /** Merge the sign-in causes a shell paint carried; `null` clears a source's. */
  mergeAuthority(causes: ReadonlyMap<string, AuthorityCause | null>): void;
  /** Merge which attribution rows a shell paint carried ask for more access. */
  mergeEscalations(asks: ReadonlyMap<string, boolean>): void;
  /** A sign-in window opened for a source on this canvas, or the tile put back. */
  setSigningIn(source: string, open: boolean): void;
  /** An account added from this canvas, said on the progress line. */
  showAccountNotice(text: string): void;
  /** An add-account window open from this canvas, in words, or `null` once it is not. */
  setAddingAccount(text: string | null): void;
  /** The merged view's facts, from a shell paint carrying its slot. */
  setMerge(merge: PaintedMerge | null): void;
  /**
   * A press made: recorded `sent`, replacing what an earlier press of the same kind — for Retry,
   * of the same source — left standing. Returns its key.
   */
  addPress(operation: CompositionOperation): number;
  updatePress(key: number, status: Press['status']): void;
  removePress(key: number): void;
  setMergeFollowingStep(following: boolean): void;
  setMergeHeld(held: boolean): void;
  /** The composition retired: its roster, slot states, merge facts and presses go with it. */
  resetComposition(): void;
  reportError(text: string): void;
  setStage(stageId: string | null): void;
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
  /** A fragment asks a question. */
  askSlot(source: string): void;
  /** Answered, failed, or gone: the slot asks nothing. */
  answerSlot(source: string): void;
  clearAsking(): void;
}

/**
 * The stack as rendered: one line per source in the order the plan gave the slots, so the stack
 * echoes the layout below it and never reorders under a reader, with the shell's own line last.
 * A source the roster does not know keeps its id — the degenerate, uncomposed case.
 */
export function orderedNotices(state: CanvasState): readonly RenderedNotice[] {
  const rank = new Map(state.roster.map((entry, i) => [entry.source, i]));
  const label = new Map(state.roster.map(entry => [entry.source, entry.name]));
  const indexOf = (notice: Notice) =>
    notice.source === null ? Number.MAX_SAFE_INTEGER : (rank.get(notice.source) ?? rank.size);
  return [...state.notices]
    .sort((a, b) => indexOf(a) - indexOf(b))
    .map(notice => ({
      ...notice,
      label: notice.source === null ? null : (label.get(notice.source) ?? notice.source),
    }));
}

export function createCanvasStore(): CanvasStore {
  let state: CanvasState = {
    stageId: null,
    inFlight: null,
    error: null,
    question: null,
    slotStates: new Map(),
    authority: new Map(),
    escalations: new Set(),
    signingIn: new Set(),
    accountNotice: null,
    addingAccount: null,
    merge: null,
    presses: [],
    mergeFollowingStep: false,
    mergeHeld: false,
    notices: [],
    roster: [],
    prose: new Map(),
    appliedSeq: 0,
    placement: new Map(),
    asking: new Set(),
  };
  let noticeKey = 0;
  let pressKey = 0;
  const listeners = new Set<() => void>();

  const set = (patch: Partial<CanvasState>) => {
    state = {...state, ...patch};
    for (const listener of listeners) listener();
  };

  return {
    getState: () => state,
    subscribe: listener => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    beginPaint: (cause, source) =>
      set({inFlight: {cause, ...(source !== undefined ? {source} : {})}, error: null}),
    settleInFlight: source => {
      if (state.inFlight?.source === source && !state.inFlight.settled)
        set({inFlight: {...state.inFlight, settled: true}});
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
    mergeAuthority: causes => {
      if (causes.size === 0) return;
      const next = new Map(state.authority);
      for (const [source, cause] of causes) {
        if (cause === null) next.delete(source);
        else next.set(source, cause);
      }
      set({authority: next});
    },
    mergeEscalations: asks => {
      if (asks.size === 0) return;
      const next = new Set(state.escalations);
      for (const [source, asking] of asks) {
        if (asking) next.add(source);
        else next.delete(source);
      }
      set({escalations: next});
    },
    setSigningIn: (source, open) => {
      if (state.signingIn.has(source) === open) return;
      const next = new Set(state.signingIn);
      if (open) next.add(source);
      else next.delete(source);
      set({signingIn: next});
    },
    showAccountNotice: text => set({accountNotice: text}),
    setAddingAccount: text => set({addingAccount: text}),
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
    setMergeFollowingStep: following => {
      if (state.mergeFollowingStep !== following) set({mergeFollowingStep: following});
    },
    setMergeHeld: held => {
      if (state.mergeHeld !== held) set({mergeHeld: held});
    },
    resetComposition: () =>
      set({
        roster: [],
        slotStates: new Map(),
        authority: new Map(),
        escalations: new Set(),
        signingIn: new Set(),
        accountNotice: null,
        addingAccount: null,
        merge: null,
        presses: [],
        mergeFollowingStep: false,
        mergeHeld: false,
      }),
    reportError: text => set({error: text}),
    setStage: stageId => set({stageId}),
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
    askSlot: source => {
      if (!state.asking.has(source)) set({asking: new Set(state.asking).add(source)});
    },
    answerSlot: source => {
      if (!state.asking.has(source)) return;
      const next = new Set(state.asking);
      next.delete(source);
      set({asking: next});
    },
    clearAsking: () => {
      if (state.asking.size) set({asking: new Set()});
    },
  };
}
