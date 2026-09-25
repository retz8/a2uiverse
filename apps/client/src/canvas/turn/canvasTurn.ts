/**
 * The turn runner: every agent/replay turn enters the canvas through a turn it begins, applies
 * batches into, and ends. It mechanises hold-and-swap as validate-then-replay:
 *
 * - **Staged mode** (occupied stage): messages for surfaces created this turn stream into a
 *   per-turn staging processor (the validator) and are buffered; at turn end the net-effect
 *   rule decides — a surviving surface replays into the single live processor and swaps in,
 *   a turn whose creations were cleaned up again is discarded and the stage holds. Messages
 *   targeting a live surface not created this turn apply directly, progressively.
 * - **Progressive mode** (empty canvas): the paint streams straight onto the stage.
 * - **Question paints**: a validated surface recognised as a question routes to the overlay
 *   slot, never the stage.
 * - **A source swaps in when it settles** (task-9.9 decision 23): in staged mode a fragment's
 *   paint is held per source, not per turn — the source's settled marker swaps in what survives
 *   of it (net effect judged per source, a create cleaned up again discarded), so a drill-down
 *   shows as the vendor answers rather than when the turn ends. A vendor paint swapped in inside
 *   a live composition holds the merged view at its last values, its line working, until the
 *   turn ends with the re-synthesis it waits on.
 * - **Composed turns**: the hub stamps every event it relays. A `fragment` stamp names its source,
 *   and its surface fills the `Slot` carrying that `source` — those surfaces are registered in the
 *   placement map and never contend for the stage. A `shell` stamp is an ordinary stage paint. An unstamped stream is
 *   a shell paint by default, which is what keeps every pre-composition fixture valid. Because a
 *   composition's whole point is that the layout lands before its agents answer, a shell paint
 *   that opens a composition abandons hold-and-swap for the turn and streams progressively; the
 *   slots then fill in place, and a fragment that fails flips its slot rather than the paint.
 * - **Synthesis**: the payload riding a synthesis paint is handed over once its surface is
 *   live — at apply in progressive mode, at the swap in staged mode. Retiring a composition
 *   retires its
 *   synthesis.
 * - **The fragment's history** (task 9.7): every vendor create is counted at the wire as a step of
 *   its source, before any apply or staging decision, so the index the client reports names the
 *   paint the orchestrator counted; the paint on screen is captured as last seen just before a
 *   claim or a swap destroys it; a claim marks the step landed, a failed slot drops it; the
 *   accepted wiring is filed under the combination it was accepted over; and a step back hands
 *   the runner a copy to restore into the slot as the live surface.
 * - **One canvas** (task-9.6 decision 1): a runner serves one canvas for the session. The canvas
 *   opens with its utterance turn; every later turn is an action inside it. A stage paint that
 *   replaces another leaves no record here — the per-agent history is 9.7's — and nothing ends the
 *   canvas but its close (`cancelAll`).
 * - **Cancel**: aborts the transport signal and discards the staged work; a canceled paint
 *   never reaches the stage.
 * - **Streams beside the turn** (task-8.5 decisions 1–3): a press, or a report the canvas sends on
 *   the side, is answered on a stream of its own. What it carries is routed by the stamp as a
 *   turn's batches are — a shell repaint, a fragment into its slot, a synthesis payload — straight
 *   into the live composition; it is not a turn and never touches the stage or the turn in flight.
 *   Whatever stream carries it, a shell repaint that paints a vendor slot failed takes that
 *   source's fragment off the canvas.
 * - **Streamed partials**: the agent streams a component as it is generated, and the
 *   processor validates every batch, so a batch carrying a half-built component is thrown
 *   away. Those validation failures are deferred and judged at turn end against the settled
 *   surfaces: a paint whose final state validates reports nothing; one that does not reports
 *   the last failure. Every other failure is reported as it happens.
 *
 * The live processor is the live registry — exactly what the agent may see.
 */
import type {A2uiMessage} from '@a2ui/web_core/v0_9';
import {A2uiValidationError} from '@a2ui/web_core/v0_9';
import type {CompositionStamp, PaintMeta, SynthesisPayload} from '@a2uiverse/sdk';
import {QUESTION_PAINT_KIND, readPaintMeta} from '@a2uiverse/sdk';
import {applyA2uiMessages} from '../../a2ui/applyMessages';
import {mergeFactsOf, SHELL_SOURCE, shellPaintSlots, slotStatesOf} from '../composition/roster';
import {describeError} from '../../shared/describeError';
import type {CanvasStore} from '../canvasStore';
import type {PaintCause} from './cause';
import type {SynthesisIntake} from '../synthesis/synthesisSession';
import type {FragmentHistory, RestorableStep} from '../history/fragmentHistory';
import {rebuildMessages} from '../history/paintCopy';
import type {TurnProcessor} from './turnMessages';
import {ROOT_COMPONENT_ID, invalidComponentsOf, questionTitleOf, targetOf} from './turnMessages';

export type {CanvasSurface, TurnProcessor} from './turnMessages';

export interface TurnHandle {
  /** Aborts the turn's transport when the turn is canceled. */
  readonly signal: AbortSignal;
  readonly canceled: boolean;
  /**
   * Apply one streamed batch — the routing described in the module header. The composition stamp
   * of the event that carried it decides the batch's role: absent or `shell` is a stage paint,
   * `fragment` fills the `Slot` whose `source` the stamp names. A payload beside the stamp is the synthesis
   * paint's, handed to the synthesis session once the surface it describes is live.
   */
  apply(messages: A2uiMessage[], stamp?: CompositionStamp, synthesis?: SynthesisPayload): void;
  /**
   * Accept one paintMeta shell object: the agent-authored title names the step in its source's
   * history when its fragment claims a slot; `kind: "question"` is the routing contract, and the
   * only thing that sends a paint to the overlay or promotes a slot.
   */
  acceptPaintMeta(meta: PaintMeta): void;
  /** The stream is exhausted: run the gate — swap in, or discard. No-op if canceled. */
  end(): void;
  /** Last-intent-wins: abort transport, discard the staged work, free the in-flight slot. */
  cancel(): void;
}

/** A fragment the canvas could not render — what becomes a `VALIDATION_FAILED` report. */
export interface FragmentFailure {
  /** Namespaced, as the hub sent it. */
  surfaceId: string;
  /** The stamp's source: the `Slot` the fragment fills is the one carrying it. */
  source: string;
  path: string;
  message: string;
  /**
   * The fragment was refused at arrival and never placed (task-6.5 decision 7): the shell
   * painted its slot with no attribution, and a vendor fragment never renders unattributed.
   */
  refused?: boolean;
}

export interface TurnRunnerOptions {
  /** The single persistent live processor — the live registry, exactly what the agent may see. */
  processor: TurnProcessor;
  store: CanvasStore;
  /** Fresh per-turn staging processor over the same catalog (no action handler needed). */
  createStaging: () => TurnProcessor;
  /**
   * A fragment failed to validate or mount. The canvas cannot fix it — the hub owns slot
   * lifecycle — so it reports and lets the shell repaint say so.
   */
  onFragmentFailure?: (failure: FragmentFailure) => void;
  /** The synthesis session: fed payloads and the composition's retirement. */
  synthesis?: SynthesisIntake;
  /**
   * Every paintMeta the canvas accepts, on the turn or a stream beside it, inline in a replayed
   * batch or ahead of a live one — the Planner's title for the layout reaches the trail this way.
   */
  onPaintMeta?: (meta: PaintMeta) => void;
  /** The fragment's history (task 9.7): counted, captured and filed by the runner. */
  history?: FragmentHistory;
}

/** A stream beside the turn: a press's, or a side report's answer (module header). */
export interface SideStream {
  /** Aborts the stream's transport when the composition retires or the canvas closes. */
  readonly signal: AbortSignal;
  apply(messages: A2uiMessage[], stamp?: CompositionStamp, synthesis?: SynthesisPayload): void;
  acceptPaintMeta(meta: PaintMeta): void;
  /** The stream is exhausted: its fragments are judged, once. */
  end(): void;
}

export interface TurnRunner {
  readonly current: TurnHandle | null;
  /** Begin a turn; an in-flight one is canceled first (last-intent-wins). */
  begin(cause: PaintCause): TurnHandle;
  /** Open a stream beside the turn, into the live composition. */
  beginSideStream(): SideStream;
  /** The canvas is closing: the turn in flight and every stream beside it end (task-9.6 decision 8). */
  cancelAll(): void;
  /**
   * Remove the pending question paint from the canvas and the live registry. Shared by Q&A's
   * two exits — answering (the answer is captured into the next cause by the caller) and
   * speaking past it (no trace).
   */
  removeOverlay(): void;
  /**
   * A step back or forward (task-9.7): the copy the history handed back becomes the source's live
   * surface in its slot, the one there now retired.
   */
  restore(source: string, step: RestorableStep): void;
}

const HELD_FAILURE_TEXT = 'The paint failed and was discarded — keeping the current view.';
const EMPTY_FAILURE_TEXT = 'The paint failed and was withdrawn.';
const CANVAS_CLEARED_TEXT = 'The agent cleared the canvas.';

export function createTurnRunner({
  processor,
  store,
  createStaging,
  onFragmentFailure,
  synthesis,
  onPaintMeta,
  history,
}: TurnRunnerOptions): TurnRunner {
  let current: TurnHandle | null = null;

  const reportMessageError = (err: unknown) =>
    store.reportError(`Part of this response could not be displayed. ${describeError(err)}`);

  /** The streams beside the turn still open (module header). */
  const sideStreams = new Set<{cancel(): void}>();
  const cancelSideStreams = () => {
    for (const stream of [...sideStreams]) stream.cancel();
  };

  /**
   * Surfaces taken off the canvas with their failed slot. A late message for one is dropped rather
   * than failing against a surface that is gone; a fresh create for it — a Retry's answer — lands.
   */
  const dropped = new Set<string>();
  const admits = (message: A2uiMessage) => {
    const {kind, surfaceId} = targetOf(message);
    if (surfaceId === undefined || !dropped.has(surfaceId)) return true;
    if (kind !== 'create') return false;
    dropped.delete(surfaceId);
    return true;
  };

  /** A failed source's fragment leaves the canvas: out of the registry, out of its slot. */
  const dropFragment = (source: string) => {
    const placed = store.getState().placement.get(source);
    if (!placed) return;
    if (processor.model.getSurface(placed.surfaceId))
      processor.model.deleteSurface(placed.surfaceId);
    dropped.add(placed.surfaceId);
    store.unplace(source);
    store.demoteSlot(source);
    history?.dropped(source);
  };

  /**
   * What a shell paint says about the composition, on whichever stream carries it: the roster,
   * each slot's state, the merged view's facts — and a vendor slot painted failed takes its
   * fragment off the canvas (task-8.5 decision 3). Returns the vendor slots painted with no
   * attribution around them.
   */
  const applyShellPaint = (messages: A2uiMessage[]): string[] => {
    const {roster, unattributed} = shellPaintSlots(messages);
    if (roster) store.setRoster(roster);
    const states = slotStatesOf(messages);
    store.mergeSlotStates(states);
    const merge = mergeFactsOf(messages);
    if (merge) store.setMerge(merge);
    for (const [source, state] of states) {
      if (state === 'failed' && source !== SHELL_SOURCE) dropFragment(source);
    }
    return unattributed;
  };

  /**
   * A fragment claims its source's slot. One surface per slot: a later claim retires the earlier —
   * captured first, as last seen, for the way back. The paint's title, from the meta that led it,
   * names the step in its history; a question paint lands as a step no arrow returns to.
   */
  const claimSlot = (
    source: string,
    surfaceId: string,
    title: string | undefined,
    question = false,
  ) => {
    history?.leaving(source);
    const previous = store.getState().placement.get(source);
    if (previous && previous.surfaceId !== surfaceId)
      processor.model.deleteSurface(previous.surfaceId);
    store.placeFragment(source, {surfaceId, source});
    history?.landed(source, {title, question});
  };

  /**
   * Every vendor create in a batch is a step of its source (task-9.7 decision 2): counted here,
   * at the wire, before refusal, admission or staging decide what becomes of it — the
   * orchestrator counted it when it relayed it. The shell's own surfaces never count.
   */
  const countPaints = (messages: A2uiMessage[], stamp?: CompositionStamp) => {
    const source = slotOf(stamp);
    if (!history || source === undefined || source === SHELL_SOURCE) return;
    for (const message of messages) {
      const {kind, surfaceId} = targetOf(message);
      if (kind === 'create' && surfaceId) history.paint(source);
    }
  };

  /** The synthesis payload handed over, and filed under the combination it was accepted over. */
  const acceptSynthesis = (
    target: {surfaceId: string; source: string},
    payload: SynthesisPayload,
  ) => {
    if (synthesis?.accept(target, payload)) history?.remember({target, payload});
  };

  /** The source whose slot a batch's stamp claims, when it is a fragment's. */
  const slotOf = (stamp?: CompositionStamp) =>
    stamp?.role === 'fragment' ? stamp.source : undefined;

  /**
   * The surface a payload describes: the fragment created in its batch, or the one already
   * filling the stamp's source's slot when the paint is a bare update.
   */
  const synthesisTarget = (messages: A2uiMessage[], stamp: CompositionStamp | undefined) => {
    const source = slotOf(stamp);
    if (!source) return undefined;
    const created = messages.map(targetOf).find(t => t.kind === 'create' && t.surfaceId);
    const surfaceId = created?.surfaceId ?? store.getState().placement.get(source)?.surfaceId;
    return surfaceId ? {surfaceId, source} : undefined;
  };

  /**
   * One stream's fragments: the slot each claimed and the one report each may make — at the
   * turn's end, or a side stream's — never a second.
   */
  const createFragmentLedger = () => {
    const fragmentSlots = new Map<string, string>();
    const reported = new Set<string>();
    const fail = (surfaceId: string, path: string, message: string, refused = false) => {
      if (!onFragmentFailure || reported.has(surfaceId)) return;
      const source = fragmentSlots.get(surfaceId);
      if (source === undefined) return;
      reported.add(surfaceId);
      // A slot that failed has nothing left to answer.
      store.demoteSlot(source);
      onFragmentFailure({surfaceId, source, path, message, ...(refused ? {refused} : {})});
    };
    /** A batch for a refused source: nothing of it enters the registry; its create is reported. */
    const refuse = (messages: A2uiMessage[], source: string) => {
      for (const message of messages) {
        const {kind, surfaceId} = targetOf(message);
        if (kind !== 'create' || !surfaceId) continue;
        fragmentSlots.set(surfaceId, source);
        fail(surfaceId, '/', 'the shell drew this slot with no attribution', true);
      }
    };
    /**
     * A fragment judged on its settled state and reported outward. A fragment displaced by a
     * later claim on its slot, or taken off with a failed slot, is not a failure — it was
     * superseded. A surface not yet on the live canvas is left for the end, when the turn's
     * staging has swapped in; only the end calls one that never arrived a failure.
     */
    const judge = (surfaceId: string, source: string, atEnd: boolean) => {
      if (store.getState().placement.get(source)?.surfaceId !== surfaceId) return;
      const surface = processor.model.getSurface(surfaceId);
      if (surface === undefined) {
        if (atEnd) fail(surfaceId, '/', 'the fragment never reached the canvas');
        return;
      }
      if (surface.componentsModel.get(ROOT_COMPONENT_ID) === undefined) {
        fail(surfaceId, '/', 'the fragment produced no root component');
        return;
      }
      const invalid = invalidComponentsOf(surface);
      if (invalid.length > 0) {
        fail(
          surfaceId,
          `/${invalid[0]}`,
          `components failed catalog validation: ${invalid.join(', ')}`,
        );
      }
    };
    /**
     * One source's stream has ended (its stamp says settled, task-8.7 decision 25): its fragments
     * are judged now, so a paint the canvas cannot draw is reported before any merge over it.
     */
    const settleSource = (source: string) => {
      if (!onFragmentFailure) return;
      for (const [surfaceId, owner] of fragmentSlots) {
        if (owner === source) judge(surfaceId, owner, false);
      }
    };
    /** The stream's end for fragments: every fragment not judged at its source's end. */
    const settle = () => {
      if (!onFragmentFailure) return;
      for (const [surfaceId, source] of fragmentSlots) judge(surfaceId, source, true);
    };
    return {fragmentSlots, fail, refuse, settle, settleSource};
  };

  /** The stage is leaving the canvas: the shell and everything filling its slots go. */
  const retireStage = () => {
    const {stageId, placement} = store.getState();
    if (stageId) processor.model.deleteSurface(stageId);
    // A composition leaves with its shell: the fragments belong to that paint, not to the canvas.
    // Without the cascade they would linger in the live registry and ride back out to their
    // vendors through the hub's per-dispatch partition filter as stale state.
    for (const placed of placement.values()) processor.model.deleteSurface(placed.surfaceId);
    store.clearPlacement();
    store.clearPromotions();
    store.setStage(null);
    // The synthesis belongs to the composition: its payload and sorts go with it.
    synthesis?.retire();
    // So do its roster, slot states, merge facts and presses, and the streams beside it.
    retireComposition();
  };

  /** The composition on stage is gone: what the client held of it goes, and its streams end. */
  function retireComposition() {
    cancelSideStreams();
    dropped.clear();
    store.resetComposition();
    history?.retire();
  }

  /** A newer question replaces any pending one — an unanswered question leaves no trace. */
  const replaceOverlay = (surfaceId: string) => {
    const pending = store.getState().overlay;
    if (pending && pending.surfaceId !== surfaceId)
      processor.model.deleteSurface(pending.surfaceId);
    store.setOverlay({surfaceId, question: questionTitleOf(processor, surfaceId)});
  };

  const removeOverlay = () => {
    const overlay = store.getState().overlay;
    if (!overlay) return;
    processor.model.deleteSurface(overlay.surfaceId);
    store.setOverlay(null);
    store.bumpApplied();
  };

  /** The source whose repaint an action inside a fragment sets in flight (task-9.7 decision 6). */
  const sourceOfCause = (cause: PaintCause): string | undefined => {
    if (cause.kind !== 'surface-action') return undefined;
    const surfaceId = cause.payload.action.surfaceId;
    for (const [source, placed] of store.getState().placement) {
      if (placed.surfaceId === surfaceId) return source;
    }
    return undefined;
  };

  const begin = (cause: PaintCause): TurnHandle => {
    current?.cancel();

    const controller = new AbortController();
    // The mode is fixed at dispatch — an occupied stage holds and swaps, an empty canvas streams
    // progressively — with one exception: a composed turn drops into progressive mode the moment
    // its shell paint arrives (see `goProgressive`).
    let stagedMode = store.getState().stageId !== null;
    const staging = stagedMode ? createStaging() : null;
    /** Surface ids this turn created — the turn's own paint, as opposed to live surfaces. */
    const createdIds = new Set<string>();
    /** Of those, the fragments and the source whose slot each claimed: they never contend for the stage. */
    const ledger = createFragmentLedger();
    const fragmentSlots = ledger.fragmentSlots;
    /** Staged-mode slot claims, applied once their surfaces reach the live processor. */
    const claims: Claim[] = [];
    /** Staged-mode buffer: the messages replayed into the live processor at swap. */
    const buffered: A2uiMessage[] = [];
    /** Staged-mode payload, handed over once its surface reaches the live processor at swap. */
    let pendingSynthesis:
      {surfaceId: string; source: string; payload: SynthesisPayload} | undefined;
    let canceled = false;
    /** Surfaces this staged turn swapped in as their source settled: no longer the held paint. */
    const inPlace = new Set<string>();
    /** The merged view is held for this turn's repaint of a fragment it reads. */
    let holding = false;
    const letGo = () => {
      if (!holding) return;
      holding = false;
      synthesis?.release?.();
      store.setMergeHeld(false);
    };
    /**
     * A vendor fragment repainted on a new surface inside a live composition: the merged view
     * keeps its last values until its re-synthesis lands (task-9.9 decision 23).
     */
    const holdFor = (source: string) => {
      if (holding || source === SHELL_SOURCE || !store.getState().placement.has(SHELL_SOURCE))
        return;
      holding = true;
      synthesis?.hold?.();
      store.setMergeHeld(true);
    };

    /** Validation failures held until the settled state can be judged (module header). */
    const deferredValidation: unknown[] = [];

    /**
     * Sources whose slot the shell painted with no attribution around it. The painter wraps
     * every vendor slot, so this is a painter bug — and the shell's one guarantee to a vendor
     * fragment (SPEC §4.3) is that it never renders unattributed. A fragment aimed at such a
     * slot is refused: not mounted, reported as unrenderable so the hub fails the slot.
     */
    const refusedSources = new Set<string>();

    const failFragment = ledger.fail;
    const refuseBatch = ledger.refuse;

    const onMessageError = (err: unknown, message: A2uiMessage) => {
      if (err instanceof A2uiValidationError) {
        deferredValidation.push(err);
        return;
      }
      // A structural failure cannot self-heal — an unknown catalogId means the fragment can
      // never mount — so it reports now rather than waiting for a turn end that tells us nothing.
      // A fragment's failure is its tile's to say; the strip speaks for what no slot carries.
      const {surfaceId} = targetOf(message);
      if (!surfaceId || !fragmentSlots.has(surfaceId)) reportMessageError(err);
      if (surfaceId) failFragment(surfaceId, '/', describeError(err));
    };
    /**
     * Turn end: the deferred failures stand only if a surface of this turn is still invalid —
     * and only a surface no slot carries lights the strip; a fragment's failure is the tile's
     * to say (task-8.7 decision 26).
     */
    const settleDeferred = () => {
      if (deferredValidation.length === 0) return;
      const unsettled = Array.from(createdIds).some(id => {
        if (fragmentSlots.has(id)) return false;
        const surface = processor.model.getSurface(id);
        if (surface === undefined) return false;
        // A surface whose root never landed is the partial that was thrown away.
        const rootless = surface.componentsModel.get(ROOT_COMPONENT_ID) === undefined;
        return rootless || invalidComponentsOf(surface).length > 0;
      });
      if (unsettled) reportMessageError(deferredValidation[deferredValidation.length - 1]);
    };

    const settleFragments = ledger.settle;

    /** The paintMetas accepted this turn, by surface id. */
    const metas = new Map<string, PaintMeta>();
    const titleOf = (surfaceId: string) => metas.get(surfaceId)?.title;
    /** The claims a fragment's create made, with the title its meta led with. */
    type Claim = {surfaceId: string; source: string; title: string | undefined};

    /**
     * Question routing: the declared marker is the whole contract. There used to be a structural
     * fallback recognising a `ConfirmationDialog` root, which put a vendor catalog's component
     * name inside shell logic — `ConfirmationDialog` is Primer's, not the shell catalog's, so the
     * rule silently did nothing for any other design system. It is gone: an agent declares a
     * question or it does not have one.
     */
    const isQuestion = (surfaceId: string): boolean =>
      metas.get(surfaceId)?.kind === QUESTION_PAINT_KIND;

    const acceptPaintMeta = (meta: PaintMeta) => {
      if (canceled) return;
      metas.set(meta.surfaceId, meta);
      onPaintMeta?.(meta);
    };

    /** A non-final stage surface of a turn: the last one created keeps the stage. */
    const retireIntermediate = (surfaceId: string) => {
      if (processor.model.getSurface(surfaceId)) processor.model.deleteSurface(surfaceId);
    };

    /** A surface that fills a slot rather than the stage — this turn's, or the composition's. */
    const isFragmentSurface = (id: string) =>
      fragmentSlots.has(id) ||
      [...store.getState().placement.values()].some(p => p.surfaceId === id);

    /**
     * A fragment declaring a question does not get the overlay — that would re-parent it out of
     * the slot the shell promised it, and would let one vendor block the whole canvas. The shell
     * expresses the demand instead, in place.
     */
    const settlePromotion = (source: string) => {
      const placed = store.getState().placement.get(source);
      if (placed && isQuestion(placed.surfaceId)) store.promoteSlot(source);
    };

    /**
     * A composed turn cannot hold-and-swap: its whole point is that the layout lands before the
     * agents answer, and the slots then fill in place. The shell paint's arrival retires the
     * outgoing composition and drops the turn into progressive mode. Only a stamped *create*
     * does this — a bare shell repaint (a slot flipping to failed) targets the live surface and
     * must not tear the canvas down.
     */
    const opensComposition = (messages: A2uiMessage[], stamp?: CompositionStamp) =>
      stamp?.role === 'shell' && messages.some(m => targetOf(m).kind === 'create');

    const goProgressive = () => {
      stagedMode = false;
      retireStage();
      if (buffered.length) {
        applyA2uiMessages(processor, buffered, {onMessageError});
        buffered.length = 0;
      }
    };

    const applyProgressive = (
      messages: A2uiMessage[],
      stamp?: CompositionStamp,
      payload?: SynthesisPayload,
    ) => {
      const source = slotOf(stamp);
      for (const message of messages) {
        const {kind, surfaceId} = targetOf(message);
        if (kind === 'create' && surfaceId) {
          createdIds.add(surfaceId);
          if (source) {
            fragmentSlots.set(surfaceId, source);
            claimSlot(source, surfaceId, titleOf(surfaceId), isQuestion(surfaceId));
          }
        }
      }
      applyA2uiMessages(processor, messages, {onMessageError});
      if (source) settlePromotion(source);
      if (payload) {
        // The surface is live: evaluate now, so the first render already carries values.
        const target = synthesisTarget(messages, stamp);
        if (target && processor.model.getSurface(target.surfaceId))
          acceptSynthesis(target, payload);
      }
      // Single occupancy: the most recently created *stage* surface keeps the stage. Fragments
      // live in the processor only to be mounted through their slots; they never contend for it.
      const ids = Array.from(processor.model.surfacesMap.keys()).filter(
        id => !isFragmentSurface(id),
      );
      for (const id of ids.slice(0, -1)) retireIntermediate(id);
      store.setStage(ids.length ? ids[ids.length - 1] : null);
      store.bumpApplied();
    };

    const applyStaged = (
      messages: A2uiMessage[],
      stamp?: CompositionStamp,
      payload?: SynthesisPayload,
    ) => {
      const source = slotOf(stamp);
      let touchedLive = false;
      if (payload) {
        // Held until the swap: the surface it describes is streaming off-stage.
        const target = synthesisTarget(messages, stamp);
        if (target) pendingSynthesis = {...target, payload};
      }
      for (const message of messages) {
        const {kind, surfaceId} = targetOf(message);
        // The turn's own paint: staging shadows live, so a same-id repaint streams off-stage.
        if (surfaceId !== undefined && (createdIds.has(surfaceId) || kind === 'create')) {
          createdIds.add(surfaceId);
          if (source && kind === 'create') {
            fragmentSlots.set(surfaceId, source);
            // Held until the surface reaches live at swap — a slot may not point into staging.
            claims.push({surfaceId, source, title: titleOf(surfaceId)});
          }
          applyA2uiMessages(staging as TurnProcessor, [message], {onMessageError});
          buffered.push(message);
          continue;
        }
        if (surfaceId !== undefined && processor.model.getSurface(surfaceId)) {
          const state = store.getState();
          if (kind !== 'delete') {
            // An update to an already-visible surface applies live, progressively.
            applyA2uiMessages(processor, [message], {onMessageError});
          } else if (state.overlay?.surfaceId === surfaceId) {
            // The agent withdrew its question.
            processor.model.deleteSurface(surfaceId);
            store.setOverlay(null);
          } else if (state.stageId === surfaceId) {
            // A deliberate delete of the live stage — retire it, go empty.
            retireStage();
            store.showNotice(CANVAS_CLEARED_TEXT);
          } else {
            processor.model.deleteSurface(surfaceId);
          }
          touchedLive = true;
          continue;
        }
        // Unknown target (an update racing ahead of its create, or a malformed message):
        // stage it — errors surface through the same channel, stray deletes no-op.
        applyA2uiMessages(staging as TurnProcessor, [message], {onMessageError});
        buffered.push(message);
      }
      if (touchedLive) store.bumpApplied();
    };

    /**
     * A source's stream has ended in staged mode: what survives of its paint swaps into its slot
     * now (task-9.9 decision 23). A surface it created and cleaned up again nets out; a vendor
     * paint swapped in holds the merged view until the turn ends.
     */
    const swapSource = (source: string) => {
      const mine = claims.filter(claim => claim.source === source);
      if (mine.length === 0) return;
      for (const claim of mine) claims.splice(claims.indexOf(claim), 1);
      const stagingModel = (staging as TurnProcessor).model;
      const survivors = new Set(
        mine.map(claim => claim.surfaceId).filter(id => stagingModel.getSurface(id)),
      );
      if (survivors.size === 0) return;
      const replay = buffered.filter(message => survivors.has(targetOf(message).surfaceId ?? ''));
      for (let i = buffered.length - 1; i >= 0; i--) {
        if (survivors.has(targetOf(buffered[i]!).surfaceId ?? '')) buffered.splice(i, 1);
      }
      for (const id of survivors) {
        inPlace.add(id);
        stagingModel.deleteSurface(id);
      }
      holdFor(source);
      // A repaint under the fragment's own id would destroy it before its claim: captured first.
      history?.leaving(source);
      applyA2uiMessages(processor, replay, {onMessageError});
      for (const {surfaceId, title} of mine) {
        if (!survivors.has(surfaceId)) continue;
        claimSlot(source, surfaceId, title, isQuestion(surfaceId));
      }
      settlePromotion(source);
      store.bumpApplied();
    };

    /** A source's settled marker: its paint swapped in, its fragments judged, its tick done. */
    const sourceSettled = (source: string) => {
      if (stagedMode) swapSource(source);
      ledger.settleSource(source);
      if (current === handle) store.settleInFlight(source);
    };

    const endProgressive = () => {
      const stageId = store.getState().stageId;
      if (!stageId) {
        // The net-effect rule on the empty canvas: created, then cleaned up again.
        if (createdIds.size > 0) store.reportError(EMPTY_FAILURE_TEXT);
        return;
      }
      if (isQuestion(stageId)) {
        // A question over the empty canvas: overlay slot, empty stage.
        replaceOverlay(stageId);
        store.setStage(null);
        store.bumpApplied();
      }
    };

    const endStaged = () => {
      const survivors = Array.from((staging as TurnProcessor).model.surfacesMap.keys());
      if (survivors.length === 0) {
        // The net-effect rule: the turn's paint no longer exists — discard, hold the stage.
        // A turn that painted nothing at all (updates only) is simply not a paint, and a
        // fragment that filled its slot in place was never held.
        if ([...createdIds].some(id => !inPlace.has(id))) store.reportError(HELD_FAILURE_TEXT);
        return;
      }
      const survivorSet = new Set(survivors);
      const replayable = buffered.filter(message => {
        const {surfaceId} = targetOf(message);
        return surfaceId !== undefined && survivorSet.has(surfaceId);
      });
      // Classify before replay: questions to the overlay, the rest are stage paints — by the
      // declared marker. Fragments are neither: they are mounted through their slots.
      const contenders = survivors.filter(id => !fragmentSlots.has(id));
      const stagePaints = contenders.filter(id => !isQuestion(id));
      const questions = contenders.filter(id => isQuestion(id));

      // The swap: retire the outgoing stage (serialize-on-swap), then replay the validated
      // paint into the live processor. A fragment the replay repaints under its own id is
      // captured first, as last seen — the replay would otherwise destroy it before its claim.
      if (stagePaints.length > 0) retireStage();
      for (const {surfaceId, source} of claims) {
        if (survivorSet.has(surfaceId)) history?.leaving(source);
      }
      applyA2uiMessages(processor, replayable, {onMessageError});
      // Claims land only now: retireStage cleared the outgoing composition's placement, and the
      // replay above is what put these surfaces in the live processor.
      for (const {surfaceId, source, title} of claims) {
        if (!survivorSet.has(surfaceId)) continue;
        claimSlot(source, surfaceId, title, isQuestion(surfaceId));
        settlePromotion(source);
      }
      // The synthesis surface reached live with the replay: its payload lands with it.
      if (pendingSynthesis && processor.model.getSurface(pendingSynthesis.surfaceId)) {
        const {payload, ...target} = pendingSynthesis;
        acceptSynthesis(target, payload);
      }
      pendingSynthesis = undefined;
      for (const id of stagePaints.slice(0, -1)) retireIntermediate(id);
      if (stagePaints.length > 0) store.setStage(stagePaints[stagePaints.length - 1]);
      for (const id of questions.slice(0, -1)) processor.model.deleteSurface(id);
      if (questions.length > 0) replaceOverlay(questions[questions.length - 1]);
      store.bumpApplied();
    };

    const handle: TurnHandle = {
      signal: controller.signal,
      get canceled() {
        return canceled;
      },
      apply: (messages, stamp, payload) => {
        if (canceled) return;
        // Replay tolerance: a recorded fixture carries paintMeta objects inline with the
        // A2UI messages (they ride the same recorded batches); route them to the meta
        // acceptor instead of the processor. Live streams deliver metas via acceptPaintMeta.
        const rest: A2uiMessage[] = [];
        for (const message of messages) {
          const meta = readPaintMeta(message);
          if (meta) acceptPaintMeta(meta);
          else rest.push(message);
        }
        // A source's settled marker: nothing to apply, its fragments judged now.
        const ended = stamp?.settled ? slotOf(stamp) : undefined;
        if (rest.length === 0) {
          if (ended !== undefined) sourceSettled(ended);
          return;
        }
        // A composition opening retires the one on stage — what the client held of it included —
        // before its own shell paint is read.
        if (opensComposition(rest, stamp)) {
          if (stagedMode) goProgressive();
          else retireComposition();
        }
        countPaints(rest, stamp);
        // The shell's paint is the only place the plan's slot order and the Registry's display
        // names reach the client; the roster is that read, re-derived on every shell repaint.
        if (stamp?.role === 'shell') {
          for (const source of applyShellPaint(rest)) refusedSources.add(source);
        }
        const source = slotOf(stamp);
        if (source !== undefined && refusedSources.has(source)) {
          refuseBatch(rest, source);
          return;
        }
        const admitted = rest.filter(admits);
        if (admitted.length === 0) return;
        if (stagedMode) applyStaged(admitted, stamp, payload);
        else applyProgressive(admitted, stamp, payload);
        if (ended !== undefined) sourceSettled(ended);
      },
      acceptPaintMeta,
      end: () => {
        if (canceled) return;
        try {
          if (stagedMode) endStaged();
          else endProgressive();
          settleDeferred();
          settleFragments();
        } finally {
          letGo();
          if (current === handle) {
            current = null;
            store.endPaint();
          }
        }
      },
      cancel: () => {
        if (canceled) return;
        canceled = true;
        controller.abort();
        letGo();
        if (!stagedMode && createdIds.size > 0) {
          // Progressive paints stream straight onto the stage; a canceled one must not
          // linger there — it never happened.
          for (const id of createdIds) {
            if (processor.model.getSurface(id)) processor.model.deleteSurface(id);
          }
          const stageId = store.getState().stageId;
          if (stageId && createdIds.has(stageId)) store.setStage(null);
          // A canceled composed turn already retired the composition it replaced, so the only
          // placement standing is the one just discarded.
          if (fragmentSlots.size > 0) store.clearPlacement();
          store.bumpApplied();
        }
        if (current === handle) {
          current = null;
          store.endPaint();
        }
      },
    };

    current = handle;
    // The stack belongs to the turn: the previous turn's answers go the moment a new one opens.
    // The roster the stack is ordered by, and the slot states, belong to the composition — kept
    // across the actions inside it, gone when it retires (task-8.5 decision 13).
    store.clearNotices();
    store.clearProse();
    // The user's words head the canvas from Enter; an action inside a fragment is a step within
    // the same question, so it leaves the header standing.
    if (cause.kind === 'utterance')
      store.setQuestion({text: cause.payload.text, askedAt: Date.now()});
    store.beginPaint(cause.kind, sourceOfCause(cause));
    return handle;
  };

  /**
   * A stream beside the turn (module header): what it carries lands in the live composition as a
   * progressive turn's batches would — slot claims, the shell's facts, a synthesis payload — with no
   * stage, no mode, and nothing of the turn in flight touched.
   */
  const beginSideStream = (): SideStream => {
    const controller = new AbortController();
    const ledger = createFragmentLedger();
    const refused = new Set<string>();
    const metas = new Map<string, PaintMeta>();
    let open = true;
    const close = () => {
      open = false;
      sideStreams.delete(entry);
    };
    const entry = {
      cancel: () => {
        if (!open) return;
        close();
        controller.abort();
      },
    };
    sideStreams.add(entry);

    const accept = (meta: PaintMeta) => {
      metas.set(meta.surfaceId, meta);
      onPaintMeta?.(meta);
    };

    const onMessageError = (err: unknown, message: A2uiMessage) => {
      // A partial the vendor completes in its next batch fails validation on the way; the
      // fragment is judged whole at the stream's end.
      if (err instanceof A2uiValidationError) return;
      const {surfaceId} = targetOf(message);
      if (!surfaceId || !ledger.fragmentSlots.has(surfaceId)) reportMessageError(err);
      if (surfaceId) ledger.fail(surfaceId, '/', describeError(err));
    };

    return {
      signal: controller.signal,
      apply: (messages, stamp, payload) => {
        if (!open) return;
        const rest: A2uiMessage[] = [];
        for (const message of messages) {
          const meta = readPaintMeta(message);
          if (meta) accept(meta);
          else rest.push(message);
        }
        if (stamp?.role === 'shell') {
          for (const source of applyShellPaint(rest)) refused.add(source);
        }
        countPaints(rest, stamp);
        const source = slotOf(stamp);
        if (source !== undefined && refused.has(source)) {
          ledger.refuse(rest, source);
          return;
        }
        if (stamp?.settled && source !== undefined && rest.length === 0) {
          ledger.settleSource(source);
          return;
        }
        const admitted = rest.filter(admits);
        if (admitted.length === 0) return;
        if (source) {
          for (const message of admitted) {
            const {kind, surfaceId} = targetOf(message);
            if (kind !== 'create' || !surfaceId) continue;
            ledger.fragmentSlots.set(surfaceId, source);
            const meta = metas.get(surfaceId);
            claimSlot(source, surfaceId, meta?.title, meta?.kind === QUESTION_PAINT_KIND);
          }
        }
        applyA2uiMessages(processor, admitted, {onMessageError});
        if (source) {
          const placed = store.getState().placement.get(source);
          if (placed && metas.get(placed.surfaceId)?.kind === QUESTION_PAINT_KIND)
            store.promoteSlot(source);
        }
        if (payload) {
          const target = synthesisTarget(admitted, stamp);
          if (target && processor.model.getSurface(target.surfaceId))
            acceptSynthesis(target, payload);
        }
        store.bumpApplied();
      },
      acceptPaintMeta: meta => {
        if (open) accept(meta);
      },
      end: () => {
        if (!open) return;
        close();
        ledger.settle();
      },
    };
  };

  const cancelAll = () => {
    current?.cancel();
    cancelSideStreams();
  };

  const restore: TurnRunner['restore'] = (source, {paint}) => {
    const previous = store.getState().placement.get(source);
    if (previous && previous.surfaceId !== paint.surfaceId) {
      // The surface stepped away from leaves as a failed slot's does: a late message for it is
      // dropped rather than failing against a surface that is gone; a fresh create for it lands.
      processor.model.deleteSurface(previous.surfaceId);
      dropped.add(previous.surfaceId);
    }
    // The copy takes the identical path a live paint takes.
    dropped.delete(paint.surfaceId);
    applyA2uiMessages(processor, rebuildMessages(paint), {onMessageError: reportMessageError});
    store.placeFragment(source, {surfaceId: paint.surfaceId, source});
    store.demoteSlot(source);
    store.bumpApplied();
  };

  return {
    get current() {
      return current;
    },
    begin,
    beginSideStream,
    cancelAll,
    removeOverlay,
    restore,
  };
}
