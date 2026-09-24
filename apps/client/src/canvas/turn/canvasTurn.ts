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
 *   slot, never the stage or the timeline.
 * - **Composed turns**: the hub stamps every event it relays. A `fragment` stamp names its source,
 *   and its surface fills the `Slot` carrying that `source` — those surfaces are registered in the
 *   placement map and never contend for
 *   the stage or the timeline. A `shell` stamp is an ordinary stage paint. An unstamped stream is
 *   a shell paint by default, which is what keeps every pre-composition fixture valid. Because a
 *   composition's whole point is that the layout lands before its agents answer, a shell paint
 *   that opens a composition abandons hold-and-swap for the turn and streams progressively; the
 *   slots then fill in place, and a fragment that fails flips its slot rather than the paint.
 * - **Synthesis**: the payload riding a synthesis paint is handed over once its surface is
 *   live — at apply in progressive mode, at the swap in staged mode. Retiring a composition
 *   retires its
 *   synthesis.
 * - **Timeline entries**: a landing stage paint appends its entry with a null snapshot — the
 *   live head. Serialize-on-swap then fills that entry when the surface leaves the canvas,
 *   before its removal from the live processor; intermediates of a multi-surface turn append
 *   already departed.
 * - **Forked turns**: a turn dispatched from a parked view leaves the user parked while it
 *   streams; its stage paint's landing is what returns the view to live. A fork that fails,
 *   is canceled, or resolves to a question leaves the user where they acted.
 * - **Cancel**: aborts the transport signal and discards the staged work; a canceled paint
 *   never reaches the stage and never enters the timeline.
 * - **Streams beside the turn** (task-8.5 decisions 1–3): a press, or a report the canvas sends on
 *   the side, is answered on a stream of its own. What it carries is routed by the stamp as a
 *   turn's batches are — a shell repaint, a fragment into its slot, a synthesis payload — straight
 *   into the live composition; it is not a turn and never touches the stage, the timeline or the
 *   turn in flight. A new utterance ends every one of them. Whatever stream carries it, a shell
 *   repaint that paints a vendor slot failed takes that source's fragment off the canvas.
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
import type {CompositionStamp, SynthesisPayload} from '@a2uiverse/sdk';
import type {PaintMeta} from '../../a2a/messages';
import {paintMetaOf, QUESTION_PAINT_KIND} from '../../a2a/messages';
import {applyA2uiMessages} from '../../a2ui/applyMessages';
import {mergeFactsOf, SHELL_SOURCE, shellPaintSlots, slotStatesOf} from '../composition/roster';
import {describeError} from '../../shared/describeError';
import type {CanvasState, CanvasStore} from '../canvasStore';
import type {PaintCause} from '../timeline/paint';
import {describeCause} from '../timeline/paint';
import {serializeSurface} from '../timeline/snapshotSurface';
import type {SynthesisIntake} from '../synthesis/synthesisSession';
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
   * Accept one paintMeta shell object: the agent-authored title upgrades the in-flight label
   * immediately and lands on the paint's timeline entry; `kind: "question"` is the routing
   * contract, and the only thing that sends a paint to the overlay or promotes a slot.
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
}

/** A stream beside the turn: a press's, or a side report's answer (module header). */
export interface SideStream {
  /** Aborts the stream's transport when a new utterance ends it. */
  readonly signal: AbortSignal;
  apply(messages: A2uiMessage[], stamp?: CompositionStamp, synthesis?: SynthesisPayload): void;
  acceptPaintMeta(meta: PaintMeta): void;
  /** The stream is exhausted: its fragments are judged, once. */
  end(): void;
}

export interface TurnRunner {
  readonly current: TurnHandle | null;
  /**
   * Begin a turn; an in-flight one is canceled first (last-intent-wins). An utterance also ends
   * every stream beside the turn and marks the composition on stage as being replaced.
   */
  begin(cause: PaintCause): TurnHandle;
  /** Open a stream beside the turn, into the live composition. */
  beginSideStream(): SideStream;
  /**
   * Remove the pending question paint from the canvas and the live registry. Shared by Q&A's
   * two exits — answering (the answer is captured into the next cause by the caller) and
   * speaking past it (no trace).
   */
  removeOverlay(): void;
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

  /** A fragment claims its source's slot. One surface per slot: a later claim retires the earlier. */
  const claimSlot = (source: string, surfaceId: string) => {
    const previous = store.getState().placement.get(source);
    if (previous && previous.surfaceId !== surfaceId)
      processor.model.deleteSurface(previous.surfaceId);
    store.placeFragment(source, {surfaceId, source});
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

  /** Materialize a live surface's content — the snapshot half of a paint entry. */
  const snapshotOf = (surfaceId: string) => {
    const surface = processor.model.getSurface(surfaceId);
    if (!surface) return null;
    return Object.freeze({...serializeSurface(surface), capturedAt: Date.now()});
  };

  /** A landed stage paint enters the timeline as the live head — snapshot pending. */
  const appendLiveEntry = (surfaceId: string, cause: PaintCause, title?: string) => {
    const surface = processor.model.getSurface(surfaceId);
    if (!surface) return;
    store.appendEntry({
      paintId: store.nextPaintId(),
      surfaceId,
      catalogId: surface.catalog.id,
      cause,
      paintedAt: Date.now(),
      ...(title !== undefined ? {title} : {}),
      snapshot: null,
    });
  };

  /**
   * Capture the composition filling the stage: every slot's fragment with its own content, so a
   * parked composition rehydrates as what was on screen and not as a layout of empty slots.
   * Captured unconditionally — `Slot`'s failed branch wins over content at render, so a fragment
   * whose slot later failed costs nothing to keep and needs no second rule to agree with.
   */
  const snapshotComposition = (placement: CanvasState['placement']) =>
    [...placement].flatMap(([, placed]) => {
      const surface = processor.model.getSurface(placed.surfaceId);
      if (!surface) return [];
      return [
        {
          surfaceId: placed.surfaceId,
          source: placed.source,
          catalogId: surface.catalog.id,
          snapshot: snapshotOf(placed.surfaceId),
        },
      ];
    });

  /** Serialize-on-swap: the stage is leaving the canvas — fill its entry, then remove. */
  const retireStage = () => {
    const {stageId, timeline, placement} = store.getState();
    if (stageId) {
      const head = timeline[timeline.length - 1];
      if (head && head.surfaceId === stageId && head.snapshot === null) {
        const snapshot = snapshotOf(stageId);
        // Snapshot before delete: the cascade below is what makes these unreachable.
        if (snapshot) {
          store.fillSnapshot(
            head.paintId,
            snapshot,
            snapshotComposition(placement),
            synthesis?.capture?.(),
          );
        }
      }
      processor.model.deleteSurface(stageId);
    }
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
    const claims: Array<{surfaceId: string; source: string}> = [];
    /** Staged-mode buffer: the messages replayed into the live processor at swap. */
    const buffered: A2uiMessage[] = [];
    /** Staged-mode payload, handed over once its surface reaches the live processor at swap. */
    let pendingSynthesis:
      {surfaceId: string; source: string; payload: SynthesisPayload} | undefined;
    let canceled = false;

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
      // The title leads the paint: it upgrades the in-flight label the moment it arrives.
      // Whose words the status line carries. On an utterance the user asked the question, and
      // their own phrasing is the only stable answer to "is this still working" — under fan-out
      // three agents' titles would otherwise overwrite each other and land on whichever painted
      // last. Inside a fragment the user acted on that agent's surface, the action routes to its
      // owner alone, so its title is both unambiguous and the more useful thing to show.
      if (meta.title && cause.kind === 'surface-action') {
        store.updateInFlightLabel(`${meta.title} — generating…`);
      }
    };

    /** Every non-final stage surface of a turn still enters the timeline. */
    const retireIntermediate = (surfaceId: string) => {
      const surface = processor.model.getSurface(surfaceId);
      if (surface) {
        const title = titleOf(surfaceId);
        // An intermediate lands and departs in one breath — its entry arrives already filled.
        store.appendEntry({
          paintId: store.nextPaintId(),
          surfaceId,
          catalogId: surface.catalog.id,
          cause,
          paintedAt: Date.now(),
          ...(title !== undefined ? {title} : {}),
          snapshot: snapshotOf(surfaceId),
        });
        processor.model.deleteSurface(surfaceId);
      }
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
            claimSlot(source, surfaceId);
          }
        }
      }
      applyA2uiMessages(processor, messages, {onMessageError});
      if (source) settlePromotion(source);
      if (payload) {
        // The surface is live: evaluate now, so the first render already carries values.
        const target = synthesisTarget(messages, stamp);
        if (target && processor.model.getSurface(target.surfaceId))
          synthesis?.accept(target, payload);
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
            claims.push({surfaceId, source});
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
            // The agent withdrew its question; questions never enter the timeline.
            processor.model.deleteSurface(surfaceId);
            store.setOverlay(null);
          } else if (state.stageId === surfaceId) {
            // A deliberate delete of the live stage — snapshot, remove, go empty.
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

    const endProgressive = () => {
      const stageId = store.getState().stageId;
      if (!stageId) {
        // The net-effect rule on the empty canvas: created, then cleaned up again.
        if (createdIds.size > 0) store.reportError(EMPTY_FAILURE_TEXT);
        return;
      }
      if (isQuestion(stageId)) {
        // A question over the empty canvas: overlay slot, empty stage, no timeline entry.
        replaceOverlay(stageId);
        store.setStage(null);
        store.bumpApplied();
        return;
      }
      appendLiveEntry(stageId, cause, titleOf(stageId));
      jumpToLiveIfForked();
    };

    /** A forked paint's landing is the moment the view leaves the parked parent. */
    const jumpToLiveIfForked = () => {
      if (cause.forked && store.getState().viewing !== null) store.returnToLive();
    };

    const endStaged = () => {
      const survivors = Array.from((staging as TurnProcessor).model.surfacesMap.keys());
      if (survivors.length === 0) {
        // The net-effect rule: the turn's paint no longer exists — discard, hold the stage.
        // A turn that painted nothing at all (updates only) is simply not a paint.
        if (createdIds.size > 0) store.reportError(HELD_FAILURE_TEXT);
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
      // paint into the live processor.
      if (stagePaints.length > 0) retireStage();
      applyA2uiMessages(processor, replayable, {onMessageError});
      // Claims land only now: retireStage cleared the outgoing composition's placement, and the
      // replay above is what put these surfaces in the live processor.
      for (const {surfaceId, source} of claims) {
        if (!survivorSet.has(surfaceId)) continue;
        claimSlot(source, surfaceId);
        settlePromotion(source);
      }
      // The synthesis surface reached live with the replay: its payload lands with it.
      if (pendingSynthesis && processor.model.getSurface(pendingSynthesis.surfaceId)) {
        const {payload, ...target} = pendingSynthesis;
        synthesis?.accept(target, payload);
      }
      pendingSynthesis = undefined;
      for (const id of stagePaints.slice(0, -1)) retireIntermediate(id);
      if (stagePaints.length > 0) {
        const stageId = stagePaints[stagePaints.length - 1];
        store.setStage(stageId);
        appendLiveEntry(stageId, cause, titleOf(stageId));
        jumpToLiveIfForked();
      }
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
          const meta = paintMetaOf(message);
          if (meta) acceptPaintMeta(meta);
          else rest.push(message);
        }
        // A source's settled marker: nothing to apply, its fragments judged now.
        const ended = stamp?.settled ? slotOf(stamp) : undefined;
        if (rest.length === 0) {
          if (ended !== undefined) ledger.settleSource(ended);
          return;
        }
        // A composition opening retires the one on stage — what the client held of it included —
        // before its own shell paint is read.
        if (opensComposition(rest, stamp)) {
          if (stagedMode) goProgressive();
          else retireComposition();
        }
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
        if (ended !== undefined) ledger.settleSource(ended);
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
        if (!stagedMode && createdIds.size > 0) {
          // Progressive paints stream straight onto the stage; a canceled one must not
          // linger there — it never happened (never enters the timeline either).
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
    // The user's words head the canvas from Enter until the next utterance; an action inside a
    // fragment is a step within the same question, so it leaves the header standing. An utterance
    // replaces the composition on stage: every stream beside it ends, and no press is made on it
    // (task-8.5 decision 2).
    if (cause.kind === 'utterance') {
      store.setQuestion({text: cause.payload.text, askedAt: Date.now()});
      cancelSideStreams();
      store.supersede();
    }
    store.beginPaint(describeCause(cause), cause.kind);
    return handle;
  };

  /**
   * A stream beside the turn (module header): what it carries lands in the live composition as a
   * progressive turn's batches would — slot claims, the shell's facts, a synthesis payload — with no
   * stage, no timeline, no mode, and nothing of the turn in flight touched.
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
          const meta = paintMetaOf(message);
          if (meta) metas.set(meta.surfaceId, meta);
          else rest.push(message);
        }
        if (stamp?.role === 'shell') {
          for (const source of applyShellPaint(rest)) refused.add(source);
        }
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
            claimSlot(source, surfaceId);
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
            synthesis?.accept(target, payload);
        }
        store.bumpApplied();
      },
      acceptPaintMeta: meta => {
        if (open) metas.set(meta.surfaceId, meta);
      },
      end: () => {
        if (!open) return;
        close();
        ledger.settle();
      },
    };
  };

  return {
    get current() {
      return current;
    },
    begin,
    beginSideStream,
    removeOverlay,
  };
}
