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
 * - **Timeline entries**: a landing stage paint appends its entry with a null snapshot — the
 *   live head. Serialize-on-swap then fills that entry when the surface leaves the canvas,
 *   before its removal from the live processor; intermediates of a multi-surface turn append
 *   already departed.
 * - **Forked turns**: a turn dispatched from a parked view leaves the user parked while it
 *   streams; its stage paint's landing is what returns the view to live. A fork that fails,
 *   is canceled, or resolves to a question leaves the user where they acted.
 * - **Cancel**: aborts the transport signal and discards the staged work; a canceled paint
 *   never reaches the stage and never enters the timeline.
 *
 * The live processor is the live registry — exactly what the agent may see. See the
 * live-registry invariant in `_dev/docs/spec/phase-8-demo-integration.md`.
 */
import type {A2uiMessage} from '@a2ui/web_core/v0_9';
import type {PaintMeta} from '../../a2a/messages';
import {paintMetaOf, QUESTION_PAINT_KIND} from '../../a2a/messages';
import {applyA2uiMessages} from '../../a2ui/applyMessages';
import {describeError} from '../../shared/describeError';
import type {CanvasStore} from '../canvasStore';
import type {PaintCause} from '../timeline/paint';
import {describeCause} from '../timeline/paint';
import {serializeSurface} from '../timeline/snapshotSurface';
import type {TurnProcessor} from './turnMessages';
import {QUESTION_ROOT_TYPE, questionTitleOf, rootTypeOf, targetOf} from './turnMessages';

export type {CanvasSurface, TurnProcessor} from './turnMessages';

export interface TurnHandle {
  /** Aborts the turn's transport when the turn is canceled. */
  readonly signal: AbortSignal;
  readonly canceled: boolean;
  /** Apply one streamed batch — the routing described in the module header. */
  apply(messages: A2uiMessage[]): void;
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
    const {stageId, timeline} = store.getState();
    if (stageId) {
      const head = timeline[timeline.length - 1];
      if (head && head.surfaceId === stageId && head.snapshot === null) {
        const snapshot = snapshotOf(stageId);
        if (snapshot) store.fillSnapshot(head.paintId, snapshot);
      }
      processor.model.deleteSurface(stageId);
    }
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
    // The mode is fixed at dispatch: an occupied stage holds and swaps; an empty canvas
    // streams progressively.
    const stagedMode = store.getState().stageId !== null;
    const staging = stagedMode ? createStaging() : null;
    /** Surface ids this turn created — the turn's own paint, as opposed to live surfaces. */
    const createdIds = new Set<string>();
    /** Staged-mode buffer: the messages replayed into the live processor at swap. */
    const buffered: A2uiMessage[] = [];
    let canceled = false;

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

    const applyProgressive = (messages: A2uiMessage[]) => {
      for (const message of messages) {
        const {kind, surfaceId} = targetOf(message);
        if (kind === 'create' && surfaceId) createdIds.add(surfaceId);
      }
      applyA2uiMessages(processor, messages, {onMessageError: reportMessageError});
      // Single occupancy: the most recently created surface keeps the stage.
      const ids = Array.from(processor.model.surfacesMap.keys());
      for (const id of ids.slice(0, -1)) retireIntermediate(id);
      store.setStage(ids.length ? ids[ids.length - 1] : null);
      store.bumpApplied();
    };

    const applyStaged = (messages: A2uiMessage[]) => {
      let touchedLive = false;
      for (const message of messages) {
        const {kind, surfaceId} = targetOf(message);
        // The turn's own paint: staging shadows live, so a same-id repaint streams off-stage.
        if (surfaceId !== undefined && (createdIds.has(surfaceId) || kind === 'create')) {
          createdIds.add(surfaceId);
          applyA2uiMessages(staging as TurnProcessor, [message], {
            onMessageError: reportMessageError,
          });
          buffered.push(message);
          continue;
        }
        if (surfaceId !== undefined && processor.model.getSurface(surfaceId)) {
          const state = store.getState();
          if (kind !== 'delete') {
            // An update to an already-visible surface applies live, progressively.
            applyA2uiMessages(processor, [message], {onMessageError: reportMessageError});
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
        applyA2uiMessages(staging as TurnProcessor, [message], {
          onMessageError: reportMessageError,
        });
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
      // paints — by declared kind first, structural rule for markerless paints.
      const stagePaints = survivors.filter(id => !isQuestion(staging as TurnProcessor, id));
      const questions = survivors.filter(id => isQuestion(staging as TurnProcessor, id));

      // The swap: retire the outgoing stage (serialize-on-swap), then replay the validated
      // paint into the live processor.
      if (stagePaints.length > 0) retireStage();
      applyA2uiMessages(processor, replayable, {onMessageError: reportMessageError});
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
      apply: messages => {
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
        if (stagedMode) applyStaged(rest);
        else applyProgressive(rest);
      },
      acceptPaintMeta,
      end: () => {
        if (canceled) return;
        try {
          if (stagedMode) endStaged();
          else endProgressive();
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
