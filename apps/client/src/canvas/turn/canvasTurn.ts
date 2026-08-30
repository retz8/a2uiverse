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
 * - **Composed turns**: the hub stamps every event it relays. A `fragment` stamp names the slot
 *   its surface fills — those surfaces are registered in the placement map and never contend for
 *   the stage or the timeline. A `shell` stamp is an ordinary stage paint. An unstamped stream is
 *   a shell paint by default, which is what keeps every pre-composition fixture valid. Because a
 *   composition's whole point is that the layout lands before its agents answer, a shell paint
 *   that opens a composition abandons hold-and-swap for the turn and streams progressively; the
 *   slots then fill in place, and a fragment that fails flips its slot rather than the paint.
 * - **Timeline entries**: a landing stage paint appends its entry with a null snapshot — the
 *   live head. Serialize-on-swap then fills that entry when the surface leaves the canvas,
 *   before its removal from the live processor; intermediates of a multi-surface turn append
 *   already departed.
 * - **Forked turns**: a turn dispatched from a parked view leaves the user parked while it
 *   streams; its stage paint's landing is what returns the view to live. A fork that fails,
 *   is canceled, or resolves to a question leaves the user where they acted.
 * - **Cancel**: aborts the transport signal and discards the staged work; a canceled paint
 *   never reaches the stage and never enters the timeline.
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
import type {CompositionStamp} from '@a2uiverse/sdk';
import type {PaintMeta} from '../../a2a/messages';
import {paintMetaOf, QUESTION_PAINT_KIND} from '../../a2a/messages';
import {applyA2uiMessages} from '../../a2ui/applyMessages';
import {describeError} from '../../shared/describeError';
import type {CanvasStore} from '../canvasStore';
import type {PaintCause} from '../timeline/paint';
import {describeCause} from '../timeline/paint';
import {serializeSurface} from '../timeline/snapshotSurface';
import type {TurnProcessor} from './turnMessages';
import {
  QUESTION_ROOT_TYPE,
  ROOT_COMPONENT_ID,
  invalidComponentsOf,
  questionTitleOf,
  rootTypeOf,
  targetOf,
} from './turnMessages';

export type {CanvasSurface, TurnProcessor} from './turnMessages';

export interface TurnHandle {
  /** Aborts the turn's transport when the turn is canceled. */
  readonly signal: AbortSignal;
  readonly canceled: boolean;
  /**
   * Apply one streamed batch — the routing described in the module header. The composition stamp
   * of the event that carried it decides the batch's role: absent or `shell` is a stage paint,
   * `fragment` fills the slot the stamp names.
   */
  apply(messages: A2uiMessage[], stamp?: CompositionStamp): void;
  /**
   * Accept one paintMeta shell object: the agent-authored title upgrades the in-flight label
   * immediately and lands on the paint's timeline entry; the kind marker is the routing
   * contract — a present `kind` routes by it, an absent one falls back to the structural
   * ConfirmationDialog rule (for markerless streams: recorded fixtures and older agents).
   */
  acceptPaintMeta(meta: PaintMeta): void;
  /** The stream is exhausted: run the gate — swap in, or discard. No-op if canceled. */
  end(): void;
  /** Last-intent-wins: abort transport, discard the staged work, free the in-flight slot. */
  cancel(): void;
}

export interface TurnRunnerOptions {
  /** The single persistent live processor — the live registry, exactly what the agent may see. */
  processor: TurnProcessor;
  store: CanvasStore;
  /** Fresh per-turn staging processor over the same catalog (no action handler needed). */
  createStaging: () => TurnProcessor;
}

export interface TurnRunner {
  readonly current: TurnHandle | null;
  /** Begin a turn; an in-flight one is canceled first (last-intent-wins). */
  begin(cause: PaintCause): TurnHandle;
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

export function createTurnRunner({processor, store, createStaging}: TurnRunnerOptions): TurnRunner {
  let current: TurnHandle | null = null;

  const reportMessageError = (err: unknown) =>
    store.reportError(`Part of this response could not be displayed. ${describeError(err)}`);

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

  /** Serialize-on-swap: the stage is leaving the canvas — fill its entry, then remove. */
  const retireStage = () => {
    const {stageId, timeline, placement} = store.getState();
    if (stageId) {
      const head = timeline[timeline.length - 1];
      if (head && head.surfaceId === stageId && head.snapshot === null) {
        const snapshot = snapshotOf(stageId);
        if (snapshot) store.fillSnapshot(head.paintId, snapshot);
      }
      processor.model.deleteSurface(stageId);
    }
    // A composition leaves with its shell: the fragments belong to that paint, not to the canvas.
    // Without the cascade they would linger in the live registry and ride back out to their
    // vendors through the hub's per-dispatch partition filter as stale state.
    for (const surfaceId of placement.values()) processor.model.deleteSurface(surfaceId);
    store.clearPlacement();
    store.setStage(null);
  };

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
    /** Of those, the ones that are fragments: they fill slots and never contend for the stage. */
    const fragmentIds = new Set<string>();
    /** Staged-mode slot claims, applied once their surfaces reach the live processor. */
    const claims: Array<{slot: string; surfaceId: string}> = [];
    /** Staged-mode buffer: the messages replayed into the live processor at swap. */
    const buffered: A2uiMessage[] = [];
    let canceled = false;

    /** Validation failures held until the settled state can be judged (module header). */
    const deferredValidation: unknown[] = [];
    const onMessageError = (err: unknown) => {
      if (err instanceof A2uiValidationError) deferredValidation.push(err);
      else reportMessageError(err);
    };
    /** Turn end: the deferred failures stand only if a surface of this turn is still invalid. */
    const settleDeferred = () => {
      if (deferredValidation.length === 0) return;
      const unsettled = Array.from(createdIds).some(id => {
        const surface = processor.model.getSurface(id);
        if (surface === undefined) return false;
        // A surface whose root never landed is the partial that was thrown away.
        const rootless = surface.componentsModel.get(ROOT_COMPONENT_ID) === undefined;
        return rootless || invalidComponentsOf(surface).length > 0;
      });
      if (unsettled) reportMessageError(deferredValidation[deferredValidation.length - 1]);
    };

    /** The paintMetas accepted this turn, by surface id. */
    const metas = new Map<string, PaintMeta>();
    const titleOf = (surfaceId: string) => metas.get(surfaceId)?.title;

    /**
     * Question routing — the marker is the contract: a declared `kind` routes the paint; only
     * a markerless paint falls back to the structural ConfirmationDialog rule.
     */
    const isQuestion = (proc: TurnProcessor, surfaceId: string): boolean => {
      const kind = metas.get(surfaceId)?.kind;
      if (kind !== undefined) return kind === QUESTION_PAINT_KIND;
      return rootTypeOf(proc, surfaceId) === QUESTION_ROOT_TYPE;
    };

    const acceptPaintMeta = (meta: PaintMeta) => {
      if (canceled) return;
      metas.set(meta.surfaceId, meta);
      // The title leads the paint: it upgrades the in-flight label the moment it arrives.
      if (meta.title) store.updateInFlightLabel(`${meta.title} — generating…`);
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
      fragmentIds.has(id) || [...store.getState().placement.values()].includes(id);

    /** A fragment claims its slot. One surface per slot: a later claim retires the earlier. */
    const claimSlot = (slot: string, surfaceId: string) => {
      const previous = store.getState().placement.get(slot);
      if (previous && previous !== surfaceId) processor.model.deleteSurface(previous);
      store.placeFragment(slot, surfaceId);
    };

    /** The slot a batch's stamp claims, when it is a fragment's. */
    const slotOf = (stamp?: CompositionStamp) =>
      stamp?.role === 'fragment' ? stamp.slot : undefined;

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

    const applyProgressive = (messages: A2uiMessage[], stamp?: CompositionStamp) => {
      const slot = slotOf(stamp);
      for (const message of messages) {
        const {kind, surfaceId} = targetOf(message);
        if (kind === 'create' && surfaceId) {
          createdIds.add(surfaceId);
          if (slot) {
            fragmentIds.add(surfaceId);
            claimSlot(slot, surfaceId);
          }
        }
      }
      applyA2uiMessages(processor, messages, {onMessageError});
      // Single occupancy: the most recently created *stage* surface keeps the stage. Fragments
      // live in the processor only to be mounted through their slots; they never contend for it.
      const ids = Array.from(processor.model.surfacesMap.keys()).filter(
        id => !isFragmentSurface(id),
      );
      for (const id of ids.slice(0, -1)) retireIntermediate(id);
      store.setStage(ids.length ? ids[ids.length - 1] : null);
      store.bumpApplied();
    };

    const applyStaged = (messages: A2uiMessage[], stamp?: CompositionStamp) => {
      const slot = slotOf(stamp);
      let touchedLive = false;
      for (const message of messages) {
        const {kind, surfaceId} = targetOf(message);
        // The turn's own paint: staging shadows live, so a same-id repaint streams off-stage.
        if (surfaceId !== undefined && (createdIds.has(surfaceId) || kind === 'create')) {
          createdIds.add(surfaceId);
          if (slot && kind === 'create') {
            fragmentIds.add(surfaceId);
            // Held until the surface reaches live at swap — a slot may not point into staging.
            claims.push({slot, surfaceId});
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
      if (isQuestion(processor, stageId)) {
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
      // Classify in staging, before replay: questions to the overlay, the rest are stage
      // paints — by declared kind first, structural rule for markerless paints. Fragments are
      // neither: they are mounted through their slots.
      const contenders = survivors.filter(id => !fragmentIds.has(id));
      const stagePaints = contenders.filter(id => !isQuestion(staging as TurnProcessor, id));
      const questions = contenders.filter(id => isQuestion(staging as TurnProcessor, id));

      // The swap: retire the outgoing stage (serialize-on-swap), then replay the validated
      // paint into the live processor.
      if (stagePaints.length > 0) retireStage();
      applyA2uiMessages(processor, replayable, {onMessageError});
      // Claims land only now: retireStage cleared the outgoing composition's placement, and the
      // replay above is what put these surfaces in the live processor.
      for (const {slot, surfaceId} of claims) {
        if (survivorSet.has(surfaceId)) claimSlot(slot, surfaceId);
      }
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
      apply: (messages, stamp) => {
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
        if (rest.length === 0) return;
        if (stagedMode && opensComposition(rest, stamp)) goProgressive();
        if (stagedMode) applyStaged(rest, stamp);
        else applyProgressive(rest, stamp);
      },
      acceptPaintMeta,
      end: () => {
        if (canceled) return;
        try {
          if (stagedMode) endStaged();
          else endProgressive();
          settleDeferred();
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
          if (fragmentIds.size > 0) store.clearPlacement();
          store.bumpApplied();
        }
        if (current === handle) {
          current = null;
          store.endPaint();
        }
      },
    };

    current = handle;
    store.beginPaint(describeCause(cause));
    return handle;
  };

  return {
    get current() {
      return current;
    },
    begin,
    removeOverlay,
  };
}
