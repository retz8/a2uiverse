/**
 * The canvas store: one hand-rolled external store (subscribe + snapshot, read by React via
 * useSyncExternalStore) owning the phase-8 canvas state — stage and overlay occupancy,
 * in-flight status, and the single append-only ring of paint entries with head/viewing time
 * travel (task-8.4 spec decisions 1, 12, 13). Written from non-React code (the turn runner,
 * the replay driver, the A2A callbacks), which is why it is a closure module and not
 * component state.
 */
import type {PaintEntry, PaintSnapshot} from './timeline/paint';

/** The ring cap — a stated policy bound, not a memory guard (task-8.4 spec decision 13). */
export const TIMELINE_CAP = 50;

/** The pending question paint occupying the overlay slot. */
export interface OverlayState {
  surfaceId: string;
  /** The dialog's title when statically known — the question, for cause records and labels. */
  question?: string;
}

export interface CanvasState {
  /** The surface occupying the stage; null is the empty canvas. */
  stageId: string | null;
  /** The one transient question paint above the stage; null when no question is pending. */
  overlay: OverlayState | null;
  /**
   * The ring of paint entries, appended on land, chronological, never reordered. The newest
   * entry is the live paint — the only one whose snapshot may still be null.
   */
  timeline: readonly PaintEntry[];
  /** The parked paint's id; null is live. */
  viewing: number | null;
  /** A paint landed while parked — the "newer view exists" marker; cleared on return-to-live. */
  headAdvancedWhileParked: boolean;
  /** Set while a paint is streaming; its label feeds the status strip. */
  inFlight: {label: string} | null;
  /** Sticky failure text; cleared by the next dispatch (beginPaint). */
  error: string | null;
  /** The one transient ambient notice; keyed so a repeat restarts the fade. */
  notice: {key: number; text: string} | null;
  /** Bumped per applied batch — re-renders the stage and resets its error boundary. */
  appliedSeq: number;
}

export interface CanvasStore {
  getState(): CanvasState;
  subscribe(listener: () => void): () => void;
  beginPaint(label: string): void;
  /** Upgrade the in-flight label (the agent-authored title, task 8.5); no-op when idle. */
  updateInFlightLabel(label: string): void;
  endPaint(): void;
  reportError(text: string): void;
  setStage(stageId: string | null): void;
  setOverlay(overlay: OverlayState | null): void;
  /** Append a landed paint; evicts past the ring cap and raises the parked marker. */
  appendEntry(entry: PaintEntry): void;
  /** Serialize-on-swap: complete the addressed entry with its captured content. */
  fillSnapshot(paintId: number, snapshot: PaintSnapshot): void;
  /** Parked write-back: replace the snapshot's data model wholesale (task-8.4 decision 2). */
  replaceSnapshotDataModel(paintId: number, dataModel: unknown): void;
  /** View a past entry. Unknown ids are ignored. */
  park(paintId: number): void;
  returnToLive(): void;
  /** Monotonic paint ids — never reused; causes reference ids, not slots. */
  nextPaintId(): number;
  showNotice(text: string): void;
  dismissNotice(key: number): void;
  bumpApplied(): void;
}

/**
 * The paint the user is looking at: the parked paint, else the head while the stage is
 * occupied, else null — an empty live canvas has no current paint, however much departed
 * history exists.
 */
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
    timeline: [],
    viewing: null,
    headAdvancedWhileParked: false,
    inFlight: null,
    error: null,
    notice: null,
    appliedSeq: 0,
  };
  let noticeKey = 0;
  let paintId = 0;
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
    beginPaint: label => set({inFlight: {label}, error: null}),
    updateInFlightLabel: label => {
      if (state.inFlight) set({inFlight: {label}});
    },
    endPaint: () => set({inFlight: null}),
    reportError: text => set({error: text}),
    setStage: stageId => set({stageId}),
    setOverlay: overlay => set({overlay}),
    appendEntry: entry => {
      const grown = [...state.timeline, entry];
      const evicted = grown.slice(0, Math.max(0, grown.length - TIMELINE_CAP));
      const parkedEvicted = evicted.some(e => e.paintId === state.viewing);
      set({
        timeline: grown.slice(evicted.length),
        // Eviction of the parked entry forces return-to-live; otherwise a landing while
        // parked leaves the user parked and raises the newer-view marker (decision 12).
        viewing: parkedEvicted ? null : state.viewing,
        headAdvancedWhileParked: parkedEvicted
          ? false
          : state.viewing !== null || state.headAdvancedWhileParked,
      });
    },
    fillSnapshot: (id, snapshot) => patchEntry(id, e => ({...e, snapshot})),
    replaceSnapshotDataModel: (id, dataModel) =>
      patchEntry(id, e => (e.snapshot ? {...e, snapshot: {...e.snapshot, dataModel}} : e)),
    park: id => {
      if (state.timeline.some(e => e.paintId === id)) set({viewing: id});
    },
    returnToLive: () => set({viewing: null, headAdvancedWhileParked: false}),
    nextPaintId: () => ++paintId,
    showNotice: text => set({notice: {key: noticeKey++, text}}),
    dismissNotice: key => {
      if (state.notice?.key === key) set({notice: null});
    },
    bumpApplied: () => set({appliedSeq: state.appliedSeq + 1}),
  };
}
