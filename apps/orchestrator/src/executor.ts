import {randomUUID} from 'node:crypto';
import type {Message, Task, TaskState, TaskStatusUpdateEvent} from '@a2a-js/sdk';
import type {AgentExecutor, ExecutionEventBus, RequestContext} from '@a2a-js/sdk/server';
import {parseSurfaceId, type CompositionOperation, type SynthesisPayload} from '@a2uiverse/sdk';
import {SHELL_ACTIONS, type SlotCollapse} from '@a2uiverse/shell-catalog/schema';
import type {AgentsPool} from './agentsPool/agentsPool.js';
import {STAMP_KEY, type VendorEvent} from './agentsPool/relay.js';
import type {DispatchHandle, DispatchOutcome, DispatchRecord} from './agentsPool/types.js';
import {classifyTurn, unnamespaceAction, type Turn} from './composition/classify.js';
import {composeFragment, retask, withoutFailureWords} from './composition/fragmentRelay.js';
import {changeAccount, firesResynthesis, seenOf, watchOf} from './composition/integrity.js';
import {A2UI_CLIENT_DATA_MODEL_KEY} from './composition/partition.js';
import {
  synthesisEnvelope,
  synthesisParts,
  synthesisProseEnvelope,
} from './composition/synthesisPainter.js';
import {vendorMetadata} from './composition/partition.js';
import {shellCreateParts, shellEnvelope, shellRepaintParts} from './composition/shellPainter.js';
import {
  compositionFrom,
  inSlotOrder,
  lateSources,
  outcomeToSlotState,
  synthesisSlot,
  type CompositionState,
  type HeldAnswer,
  type Operation,
  type Owed,
  type OwedPress,
  type Sink,
  type SlotFailure,
} from './composition/state.js';
import type {PressWait} from './composition/presses.js';
import {decideTrigger, mergePossible} from './composition/trigger.js';
import type {IntentJournal, JournalTurn} from './journal/intentJournal.js';
import type {SynthesisRecord, SynthesisRelease} from './journal/types.js';
import {elapsedMs, logLine} from './log.js';
import {emptyTouches, mergeTouches, touchesOf, type SurfaceTouches} from './journal/surfaces.js';
import type {Planner} from './planner/planner.js';
import type {Registry} from './registry/registry.js';
import {SHELL_SOURCE_ID} from './registry/types.js';
import type {Router} from './router/router.js';
import type {ChangeAccount, MissingSource} from './synthesizer/prompt.js';
import type {Synthesis} from './synthesizer/document.js';
import type {Synthesizer} from './synthesizer/synthesizer.js';

export interface OrchestratorDeps {
  registry: Registry;
  pool: AgentsPool;
  journal: IntentJournal;
  router: Router;
  planner: Planner;
  synthesizer: Synthesizer;
  /** Per-conversation composition state, shared with the Planner's this-canvas reader. */
  compositions: Map<string, CompositionState>;
  /**
   * The soft deadline and the hard cap (task-8.3 decisions 1–3). The executor runs the soft
   * deadline; the AgentsPool enforces the cap; the journal records both per turn.
   */
  deadlines: {softMs: number; capMs: number};
}

/** An utterance turn from its arrival until its last dispatch ends: what a new utterance ends. */
interface LiveTurn {
  taskId: string;
  controller: AbortController;
  journal: JournalTurn;
}

/**
 * Why a synthesis runs. The turn's one automatic release, over every source arrived by then; a
 * collapsed merge made afresh at a press, the same way (task-8.4 decision 8); or a re-synthesis
 * of the landed view — the sources a press folds in, and the walk — walked as it is made.
 */
type SynthesisRun =
  | {kind: 'first'; by: 'settled' | 'soft-deadline' | 'home'; at: number; signal: AbortSignal}
  | {kind: 'make'; by: SynthesisRelease; at: number; signal: AbortSignal}
  | {kind: 'again'; by: SynthesisRelease; at: number; joining: string[]; signal: AbortSignal};

/** What became of a synthesis: landed, failed with the view kept, collapsed, or nothing to make. */
type SynthesisEnd = 'landed' | 'kept' | 'collapsed' | 'none';

/** What the pump does with a dispatch beyond relaying it. */
interface PumpOptions {
  /** Flip the slot per outcome when the dispatch ends. */
  collapse: boolean;
  /** Once aborted, the dispatch settles nothing: the turn ended, or a Retry race was lost. */
  signal?: AbortSignal;
  onSettled?: () => void;
  /** Hold the answer until it ends, drawn whole or not at all — a Retry race (task-8.4 decision 5). */
  buffer?: boolean;
  /** A retried source: once the merge is decided its arrival is folded in, never late. */
  folding?: boolean;
}

/**
 * The turn (SPEC §5) at M6. Utterance: Router → Planner (the one model call, the readers as
 * steps inside it) → shell paint of the model-authored layout → fan-out → slot-lifecycle repaints
 * → synthesis into the reserved slot when the trigger releases it → one turn-final once every
 * dispatch has arrived, failed or reached the hard cap. The trigger (task-8.3 decisions 1, 4, 8):
 * a merge is possible once two sources arrived, the home source among them under a join; every
 * source settled releases it, and while some are still out the soft deadline — quiet after the
 * last settle — releases it without them; a failed home source, or too few arrivals, collapses
 * the merge with no call. A dispatch past its hard cap fails its slot and runs on, what it answers
 * held until Retry; the turn's journal line closes when the last dispatch ends. A new utterance
 * in the same conversation ends the turn before it: its dispatches aborted and their vendors told
 * to cancel, its model calls aborted, what it held dropped — and every press still running on the
 * composition it replaces. A turn that dispatches nothing — a platform answer, a gap — closes
 * right after first paint. Action: owner-only dispatch, no Router/Planner; then, if the partition
 * change invalidated the live synthesis, re-synthesis inline before the final over the merge's
 * own source set, handed the previous document and what broke (task-5.4 decision 6).
 * Quiescence (task-8.10): the press is in flight until its dispatch settles, and the merge that
 * reads its source — the first or a re-synthesis — is made and lands only once it is answered;
 * an answer that changed what the merge in the making reads throws it away and it is made again.
 * One merge is in the making at a time; everything owed meanwhile — the walk after a press
 * inside a fragment, the sources a press folds in — is made as one call once it lands (task-8.4
 * decision 7). Operation (task 8.4): the reader's press on the composition — Retry, Include, Try
 * again — on its own stream, running beside the turn. A shell action — one of the shell catalog's
 * closed set, raised on a shell surface and handled by the client itself (SPEC §7) — is journaled
 * and nothing else: no dispatch, no paint. Client error: the slot fails `invalid` by shell
 * repaint, its data out of the merge. Composition state is canonical here; the shell surface is
 * its projection.
 */
export class OrchestratorExecutor implements AgentExecutor {
  readonly #deps: OrchestratorDeps;
  readonly #compositions: Map<string, CompositionState>;
  /**
   * The message ids already taken in, newest last (task-7.9). The client re-sends a request that
   * got no answer through the tunnel under the same id; were the first only slow to answer, a
   * second run would repeat a vendor's write. Bounded: a retry follows its original by seconds.
   */
  readonly #received = new Set<string>();
  /** Per conversation, the utterance turn still running, if any (task-8.3 decision 4). */
  readonly #live = new Map<string, LiveTurn>();

  constructor(deps: OrchestratorDeps) {
    this.#deps = deps;
    this.#compositions = deps.compositions;
  }

  async execute(ctx: RequestContext, bus: ExecutionEventBus): Promise<void> {
    // Always first: the task store needs a Task before any update, and a
    // cancel arriving before the first paint must find the task.
    bus.publish(syntheticTask(ctx));
    const {messageId} = ctx.userMessage;
    if (this.#received.has(messageId)) {
      logLine(`← duplicate message=${messageId} task=${ctx.taskId} — refused`);
      bus.publish(finalStatus(ctx, 'failed', 'This request was already received.'));
      return;
    }
    this.#received.add(messageId);
    if (this.#received.size > RECEIVED_IDS_KEPT) {
      this.#received.delete(this.#received.values().next().value as string);
    }
    const turnKind = classifyTurn(ctx.userMessage);
    const startedAt = Date.now();
    logLine(
      `← ${turnKind.kind} task=${ctx.taskId} ctx=${ctx.contextId} ${JSON.stringify(ctx.userMessage).length} bytes`,
    );
    let turn: JournalTurn | undefined;
    let outcome = 'completed';
    try {
      switch (turnKind.kind) {
        case 'utterance': {
          turn = this.#deps.journal.open({
            turnId: ctx.taskId,
            clientContextId: ctx.contextId,
            message: ctx.userMessage,
          });
          await this.#utteranceTurn(ctx, bus, turn, turnKind.text);
          break;
        }
        case 'action': {
          const owner = parseSurfaceId(turnKind.surfaceId)?.appId;
          turn = this.#deps.journal.open({
            turnId: ctx.taskId,
            clientContextId: ctx.contextId,
            message: ctx.userMessage,
            appId: owner,
          });
          if (owner === SHELL_SOURCE_ID) {
            this.#shellActionTurn(turnKind);
            bus.publish(finalStatus(ctx, 'completed'));
            await turn.close('completed');
            break;
          }
          await this.#actionTurn(ctx, bus, turn, turnKind);
          break;
        }
        case 'operation': {
          turn = this.#deps.journal.open({
            turnId: ctx.taskId,
            clientContextId: ctx.contextId,
            message: ctx.userMessage,
          });
          await this.#operationTurn(ctx, bus, turn, turnKind.operation);
          break;
        }
        case 'clientError': {
          turn = this.#deps.journal.open({
            turnId: ctx.taskId,
            clientContextId: ctx.contextId,
            message: ctx.userMessage,
          });
          this.#clientErrorTurn({ctx, bus, turn}, turnKind);
          bus.publish(finalStatus(ctx, 'completed'));
          await turn.close('completed');
          break;
        }
        case 'unknown':
          turn = this.#deps.journal.open({
            turnId: ctx.taskId,
            clientContextId: ctx.contextId,
            message: ctx.userMessage,
          });
          throw new Error('unrecognized client message');
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      outcome = `failed (${message})`;
      bus.publish(finalStatus(ctx, 'failed', message));
      await turn?.close('failed');
    } finally {
      bus.finished();
      logLine(
        `${outcome === 'completed' ? '✓' : '✗'} ${turnKind.kind} task=${ctx.taskId} ${outcome} ${elapsedMs(startedAt)} ms`,
      );
    }
  }

  async cancelTask(taskId: string): Promise<void> {
    // Every handle of the turn aborts; the pumps observe it as 'cancelled'.
    for (const [contextId, live] of this.#live) {
      if (live.taskId !== taskId) continue;
      this.#live.delete(contextId);
      live.controller.abort();
    }
    for (const state of this.#compositions.values()) {
      for (const operation of state.operations) {
        if (operation.taskId === taskId) operation.controller.abort();
      }
    }
    this.#deps.pool.cancel(taskId);
  }

  /**
   * Ends the conversation's running utterance turn (task-8.3 decision 4): its model calls
   * aborted, its dispatches aborted and their vendors told to cancel — past the hard cap too, so
   * what it would have held is dropped — and its journal line marked superseded.
   */
  #supersede(contextId: string): void {
    const live = this.#live.get(contextId);
    if (!live) return;
    this.#live.delete(contextId);
    logLine(`⤫ task=${live.taskId} superseded`);
    live.journal.superseded();
    live.controller.abort();
    this.#deps.pool.cancel(live.taskId);
  }

  /**
   * A composition a new utterance replaces (task-8.4 decision 11): every press running on it
   * ends — its re-dispatches aborted and their vendors told to cancel, its calls aborted, its
   * journal line marked superseded — and no press reaches it again.
   */
  #retire(state: CompositionState): void {
    if (state.retired.signal.aborted) return;
    state.retired.abort();
    for (const operation of state.operations) {
      logLine(`⤫ task=${operation.taskId} superseded`);
      operation.journal.superseded();
      operation.controller.abort();
      this.#deps.pool.cancel(operation.taskId);
    }
    const owed = state.owed;
    state.owed = undefined;
    for (const press of owed?.presses ?? []) press.resolve();
  }

  async #utteranceTurn(
    ctx: RequestContext,
    bus: ExecutionEventBus,
    turn: JournalTurn,
    text: string,
  ): Promise<void> {
    this.#supersede(ctx.contextId);
    const replaced = this.#compositions.get(ctx.contextId);
    if (replaced) this.#retire(replaced);
    const live: LiveTurn = {taskId: ctx.taskId, controller: new AbortController(), journal: turn};
    this.#live.set(ctx.contextId, live);
    const {signal} = live.controller;
    const done = () => {
      if (this.#live.get(ctx.contextId) === live) this.#live.delete(ctx.contextId);
    };
    const superseded = async () => {
      done();
      bus.publish(finalStatus(ctx, 'canceled'));
      await turn.close('cancelled');
    };
    turn.deadlines(this.#deps.deadlines);

    // The first-paint clock (task-6.6 decision 3): from here to the tree accepted, the shortlist
    // included, since nothing paints before either.
    const receivedAt = Date.now();
    let outcome;
    try {
      const shortlist = await this.#deps.router.shortlist(text);
      signal.throwIfAborted();
      outcome = await this.#deps.planner.plan({
        utterance: text,
        shortlist,
        conversationId: ctx.contextId,
        signal,
      });
    } catch (err) {
      if (signal.aborted) return superseded();
      done();
      throw err;
    }
    if (signal.aborted) return superseded();
    const planMs = Date.now() - receivedAt;
    logLine(`plan task=${ctx.taskId} ${outcome.kind} ${planMs} ms`);
    turn.plan({
      outcome: outcome.kind,
      ...(outcome.kind === 'planned' ? {layoutSurface: outcome.document} : {}),
      attempts: outcome.attempts,
      toolCalls: outcome.toolCalls,
      planMs,
    });
    if (outcome.kind === 'malformed') {
      done();
      // Both attempts refused: a broken turn, the findings on the final (task-6.4 decision 6).
      const last = outcome.attempts.at(-1);
      throw new Error(
        `the Planner's answer was refused ${outcome.attempts.length} times: ${last?.errors.join('; ')}`,
      );
    }

    const state = compositionFrom(outcome.document, this.#deps.registry, text, {
      turnId: ctx.taskId,
      metadata: ctx.userMessage.metadata,
    });
    this.#compositions.set(ctx.contextId, state);
    const sink: Sink = {ctx, bus, turn};

    // First paint precedes every dispatch, structurally (SPEC §4.5).
    const shellPaint = shellEnvelope(ctx, shellCreateParts(state));
    bus.publish(shellPaint);
    turn.surfaces(touchesOf(shellPaint));

    // The synthesis slot is the shell's own (task-4.4 decision 6): never dispatched.
    const sources = [...state.slots.values()].filter(({plan}) => plan.source !== SHELL_SOURCE_ID);
    const vendorSources = sources.map(({plan}) => plan.source);
    const merge = synthesisSlot(state);
    const home = merge?.plan.join?.home;
    const settled = new Set<string>();
    // What the turn waits on past its own dispatches: a source retried before the release.
    const wakers = new Set<() => void>();
    const wake = () => {
      for (const waker of [...wakers]) waker();
    };
    let released: Promise<void> | undefined;
    let softDeadline: ReturnType<typeof setTimeout> | undefined;
    const disarm = () => {
      clearTimeout(softDeadline);
      softDeadline = undefined;
    };
    const release = (by: 'settled' | 'soft-deadline' | 'home') => {
      disarm();
      state.mergeDecided = true;
      logLine(`merge task=${ctx.taskId} released (${by})`);
      released = this.#making(state, () =>
        this.#synthesize([sink], state, {kind: 'first', by, at: Date.now(), signal}).then(() => {}),
      );
      wake();
    };
    // Weighs the trigger after every settle, and after a slot fails outside the turn's own
    // dispatches — a paint the client could not draw.
    const evaluate = (justSettled?: string) => {
      if (!merge || state.mergeDecided || signal.aborted) return disarm();
      const decision = decideTrigger({
        sources: vendorSources,
        settled,
        arrived: state.arrived,
        ...(home !== undefined ? {home} : {}),
        ...(justSettled !== undefined ? {justSettled} : {}),
      });
      switch (decision.kind) {
        case 'wait':
          return disarm();
        case 'arm':
          disarm();
          softDeadline = setTimeout(() => {
            softDeadline = undefined;
            if (state.mergeDecided || signal.aborted) return;
            if (mergePossible(state.arrived, home)) release('soft-deadline');
          }, this.#deps.deadlines.softMs);
          return;
        case 'release':
          return release(decision.by);
        case 'collapse':
          disarm();
          this.#collapseMerge(
            [sink],
            state,
            decision.cause === 'home'
              ? {collapse: homeCollapse(state, home!)}
              : {collapse: this.#fewCollapse(state, state.arrived)},
            decision.cause === 'home'
              ? {outcome: 'home', collapse: 'home', attempts: []}
              : {
                  outcome: 'skipped',
                  reason: `${state.arrived.size} source(s) arrived`,
                  collapse: 'few',
                  attempts: [],
                },
          );
          return wake();
      }
    };
    state.reevaluate = () => {
      evaluate();
      wake();
    };
    // A source retried before the merge is decided rejoins the pack (task-8.4 decision 6): out
    // again from the press — the soft deadline's quiet not restarted — and settled again when its
    // re-dispatch ends. The turn waits for it as for any dispatch of its own.
    state.trigger = {
      unsettle: appId => {
        settled.delete(appId);
        wake();
      },
      settle: appId => {
        settled.add(appId);
        evaluate(appId);
        wake();
      },
    };

    const runs = sources.map(({plan: slot}) => {
      const request: Message = {
        kind: 'message',
        messageId: randomUUID(),
        role: 'user',
        parts: [{kind: 'text', text: slot.request}],
        metadata: vendorMetadata(ctx.userMessage.metadata, slot.source),
      };
      const handle = this.#deps.pool.dispatch(slot.source, {
        clientContextId: ctx.contextId,
        clientTaskId: ctx.taskId,
        message: request,
        fromPlan: true,
      });
      return this.#pump(sink, state, handle, slot.source, {
        collapse: true,
        signal,
        onSettled: () => {
          settled.add(slot.source);
          evaluate(slot.source);
        },
      });
    });
    // The final waits for every dispatch to arrive, fail or reach the hard cap (task-8.3
    // decision 4), a source retried before the merge was decided among them, and for the
    // synthesis the last of them released.
    const outcomes = await Promise.all(runs.map(run => run.settled));
    while (
      merge &&
      !state.mergeDecided &&
      !signal.aborted &&
      vendorSources.some(source => !settled.has(source))
    ) {
      await new Promise<void>(resolve => {
        const woken = () => {
          wakers.delete(woken);
          signal.removeEventListener('abort', woken);
          resolve();
        };
        wakers.add(woken);
        signal.addEventListener('abort', woken, {once: true});
      });
    }
    disarm();
    if (released) await released;
    state.reevaluate = undefined;
    state.trigger = undefined;

    // One agent failing never fails the turn; only an all-cancelled turn — or one a new
    // utterance ended — is cancelled. A turn that dispatched nothing completed at first paint.
    const cancelled =
      signal.aborted || (outcomes.length > 0 && outcomes.every(o => o === 'cancelled'));
    bus.publish(finalStatus(ctx, cancelled ? 'canceled' : 'completed'));
    // The journal line closes when the last dispatch ends: an answer held past the cap is on it.
    void Promise.all(runs.map(run => run.drained)).then(async () => {
      done();
      await turn.close(cancelled ? 'cancelled' : 'completed');
    });
  }

  async #actionTurn(
    ctx: RequestContext,
    bus: ExecutionEventBus,
    turn: JournalTurn,
    action: Turn & {kind: 'action'},
  ): Promise<void> {
    const parsed = parseSurfaceId(action.surfaceId);
    if (!parsed) throw new Error(`action on un-namespaced surface: ${action.surfaceId}`);
    const owner = this.#deps.registry.get(parsed.appId);
    const composition = this.#compositions.get(ctx.contextId);
    // Two-way edits reach the partitions through the returning client data model.
    composition?.partitions.applyClientDataModel(clientSurfaces(ctx.userMessage.metadata));
    const sink: Sink = {ctx, bus, turn};

    const message: Message = {
      ...ctx.userMessage,
      parts: ctx.userMessage.parts.map(part =>
        part.kind === 'data' && part.data === action.part
          ? {...part, data: unnamespaceAction(part.data, parsed.surfaceId)}
          : part,
      ),
      metadata: vendorMetadata(ctx.userMessage.metadata, owner.id),
    };
    const handle = this.#deps.pool.dispatch(owner.id, {
      clientContextId: ctx.contextId,
      clientTaskId: ctx.taskId,
      message,
    });
    // An action that repaints nothing must not collapse a filled slot.
    const run = this.#pump(sink, undefined, handle, owner.id, {collapse: false});
    // The press is in flight until its dispatch settles: the merge that would read this source
    // waits for it (task-8.10 decision 1).
    composition?.presses.begin(owner.id);
    const outcome = await run.settled.finally(() => composition?.presses.end(owner.id));
    // The re-synthesis its answer calls for, on this turn — unless a merge is in the making,
    // which covers the press (task-8.10 decision 3): the walk runs once it is done.
    if (composition) await this.#owe(composition, {}, 'walk', sink);
    const state: TaskState =
      outcome === 'cancelled' ? 'canceled' : outcome === 'completed' ? 'completed' : 'failed';
    bus.publish(finalStatus(ctx, state, handleError(outcome)));
    void run.drained.then(() => turn.close(outcome));
  }

  /**
   * The reader's press on the composition (task 8.4), a task of its own beside the turn: Retry
   * re-dispatches one failed source, Include folds the late sources into the merge, Try again
   * makes a merge whose call failed. Its stream carries what the press causes and ends when that
   * is done; the final is `completed` whenever the press was handled, the outcome on the canvas.
   * A press the composition cannot take — no longer current, a source not failed, nothing late,
   * nothing to try again — is refused.
   */
  async #operationTurn(
    ctx: RequestContext,
    bus: ExecutionEventBus,
    turn: JournalTurn,
    operation: CompositionOperation,
  ): Promise<void> {
    const refuse = (reason: string): never => {
      turn.refused(reason);
      throw new Error(reason);
    };
    const state = this.#compositions.get(ctx.contextId);
    if (!state || state.retired.signal.aborted) return refuse('This canvas is no longer current.');
    turn.composition(state.turnId);
    const sink: Sink = {ctx, bus, turn, drains: []};
    const merge = synthesisSlot(state);
    let work: (signal: AbortSignal) => Promise<void>;
    switch (operation.kind) {
      case 'retry': {
        const appId = operation.sources[0]!;
        const slot = state.slots.get(appId);
        if (!slot || appId === SHELL_SOURCE_ID || slot.state !== 'failed') {
          return refuse(`${slot?.plan.displayName ?? appId} has not failed.`);
        }
        work = signal => this.#retry(sink, state, appId, signal);
        break;
      }
      case 'include': {
        const late = new Set(lateSources(state));
        const sources = operation.sources.filter(appId => late.has(appId));
        if (sources.length === 0) return refuse('No source is waiting to be included.');
        work = () => this.#owe(state, {joining: sources}, 'include', sink);
        break;
      }
      case 'tryAgain': {
        if (merge?.state === 'collapsed' && merge.collapse?.cause === 'unmade') {
          work = () => this.#owe(state, {make: true}, 'tryAgain', sink);
        } else if (state.synthesis && state.callFailed?.kind === 'update') {
          work = () => this.#owe(state, {walk: true}, 'tryAgain', sink);
        } else {
          return refuse('There is nothing to try again.');
        }
        break;
      }
    }
    const running: Operation = {
      taskId: ctx.taskId,
      controller: new AbortController(),
      journal: turn,
    };
    state.operations.add(running);
    try {
      await work(running.controller.signal);
    } finally {
      state.operations.delete(running);
    }
    const superseded = running.controller.signal.aborted;
    bus.publish(finalStatus(ctx, superseded ? 'canceled' : 'completed'));
    // The journal line closes when its dispatches end: an answer held past the cap is on it.
    void Promise.all(sink.drains ?? []).then(() =>
      turn.close(superseded ? 'cancelled' : 'completed'),
    );
  }

  /**
   * Retry (task-8.4 decisions 4–8): the failure tile gives way to the pending slot at once; an
   * answer held past the hard cap is drawn, otherwise the plan's request goes again — racing a
   * dispatch still running past its cap. Before the merge is decided the source rejoins the pack
   * and the first merge takes it; after, its arrival is folded in with no second press, or
   * brings a collapsed merge back.
   */
  async #retry(
    sink: Sink,
    state: CompositionState,
    appId: string,
    signal: AbortSignal,
  ): Promise<void> {
    const slot = state.slots.get(appId)!;
    const merge = synthesisSlot(state);
    const pack = !state.mergeDecided && state.trigger !== undefined;
    slot.state = 'pending';
    delete slot.failure;
    if (pack) state.trigger!.unsettle(appId);
    // A collapsed merge this arrival can bring back waits on it, in the client's words.
    const bringsBack =
      merge?.state === 'collapsed' &&
      (merge.collapse?.cause !== 'home' || merge.plan.join?.home === appId);
    if (bringsBack) state.retrying.add(appId);
    this.#repaint([sink], state);

    const arrived = await this.#redispatch(sink, state, appId, signal);
    const wasRetrying = state.retrying.delete(appId);
    if (pack) state.trigger?.settle(appId);
    if (signal.aborted) return;
    if (!arrived) {
      if (wasRetrying) this.#repaint([sink], state);
      return;
    }
    if (!merge || !state.mergeDecided) return;
    await this.#owe(state, {joining: [appId]}, 'retry', sink);
  }

  /**
   * The retried source's answer: the one held past the hard cap, drawn at once; else the plan's
   * request dispatched again under its own cap. While a dispatch past its cap still runs, the
   * two race (task-8.4 decision 5): the first to arrive holding a surface is drawn whole and the
   * other cancelled; the slot follows the re-dispatch, so its failure brings the tile back while
   * the original runs on, an answer from it held for the next Retry. True when the source arrived.
   */
  async #redispatch(
    sink: Sink,
    state: CompositionState,
    appId: string,
    signal: AbortSignal,
  ): Promise<boolean> {
    const slot = state.slots.get(appId)!;
    if (slot.held) return this.#draw(sink, state, appId, slot.held);
    const original = slot.running;
    const message: Message = {
      kind: 'message',
      messageId: randomUUID(),
      role: 'user',
      parts: [{kind: 'text', text: slot.plan.request}],
      metadata: vendorMetadata(state.requestMetadata, appId),
    };
    const handle = this.#deps.pool.dispatch(appId, {
      clientContextId: sink.ctx.contextId,
      clientTaskId: sink.ctx.taskId,
      message,
    });
    const lost = new AbortController();
    const abort = () => lost.abort();
    signal.addEventListener('abort', abort, {once: true});
    const run = this.#pump(sink, state, handle, appId, {
      collapse: true,
      signal: lost.signal,
      buffer: original !== undefined,
      folding: true,
    });
    sink.drains?.push(run.drained);
    type Winner = {retry: DispatchOutcome} | {original: HeldAnswer};
    const contenders: Promise<Winner>[] = [run.settled.then(outcome => ({retry: outcome}))];
    let race: ((held: HeldAnswer) => void) | undefined;
    if (original) {
      contenders.push(
        new Promise<HeldAnswer>(resolve => {
          race = resolve;
          slot.race = resolve;
        }).then(held => ({original: held})),
      );
    }
    const winner = await Promise.race(contenders);
    if (race && slot.race === race) delete slot.race;
    signal.removeEventListener('abort', abort);
    if ('original' in winner) {
      handle.record.race = 'lost';
      lost.abort();
      handle.cancel();
      return this.#draw(sink, state, appId, winner.original, 'won');
    }
    const arrived = winner.retry === 'completed' && state.arrived.has(appId);
    if (arrived && original && slot.running === original) {
      handle.record.race = 'won';
      original.record.race = 'lost';
      original.cancel();
    }
    return arrived;
  }

  /** An answer held past the hard cap drawn on the Retry's stream (task-8.4 decision 4). */
  #draw(
    sink: Sink,
    state: CompositionState,
    appId: string,
    held: HeldAnswer,
    race?: 'won',
  ): boolean {
    const slot = state.slots.get(appId);
    if (slot?.held === held) delete slot.held;
    let touches = emptyTouches();
    for (const event of held.events) {
      const moved = retask(event, sink.ctx.taskId);
      touches = mergeTouches(touches, touchesOf(moved));
      state.partitions.apply(moved);
      sink.bus.publish(moved);
    }
    sink.turn.surfaces(touches);
    held.record.drawnAt = new Date().toISOString();
    if (race) held.record.race = race;
    sink.turn.dispatched({...held.record});
    logLine(`▶ ${appId} task=${sink.ctx.taskId} held answer drawn`);
    if (!state.partitions.holdsSurfaceOf(appId)) return false;
    if (state.mergeDecided && synthesisSlot(state)) state.folding.add(appId);
    state.arrived.add(appId);
    return true;
  }

  /**
   * Owes the merge a call (task-8.4 decision 7): the sources a press folds in, a merge made
   * afresh, or a walk. Made at once when no merge is in the making; otherwise everything owed
   * when it lands is made as one call. A press's work paints the working sentence from here.
   * Settles when the call it was made in is done.
   */
  #owe(
    state: CompositionState,
    what: {joining?: readonly string[]; make?: boolean; walk?: boolean},
    kind: OwedPress['kind'],
    sink: Sink,
  ): Promise<void> {
    if (state.retired.signal.aborted) return Promise.resolve();
    const owed = (state.owed ??= {joining: new Set(), make: false, walk: false, presses: []});
    for (const appId of what.joining ?? []) {
      owed.joining.add(appId);
      state.folding.add(appId);
    }
    owed.make ||= what.make === true;
    owed.walk ||= what.walk === true;
    const pressed = kind !== 'walk';
    if (pressed) state.pressWork++;
    const done = new Promise<void>(resolve => owed.presses.push({kind, sink, resolve}));
    if (pressed) this.#repaint([sink], state);
    this.#kick(state);
    return done;
  }

  /** Starts the call for what is owed, unless a merge is in the making. */
  #kick(state: CompositionState): void {
    if (state.making || !state.owed) return;
    const owed = state.owed;
    state.owed = undefined;
    const settle = () => {
      for (const press of owed.presses) press.resolve();
    };
    if (state.retired.signal.aborted) return settle();
    void this.#making(state, () => this.#runOwed(state, owed)).then(settle, settle);
  }

  /** Runs `make` as the composition's one merge in the making; then what is owed. */
  #making(state: CompositionState, make: () => Promise<void>): Promise<void> {
    const making: Promise<void> = make().finally(() => {
      if (state.making === making) state.making = undefined;
      this.#kick(state);
    });
    state.making = making;
    return making;
  }

  /**
   * One call for everything owed (task-8.4 decisions 7–9, 12): over a landed view, the sources
   * joining it and the walk — a re-synthesis; over a collapsed merge, the merge made afresh over
   * every arrived source, once it can be. Its outcome goes to every stream that owed it.
   */
  async #runOwed(state: CompositionState, owed: Owed): Promise<void> {
    const sinks = [...new Map(owed.presses.map(({sink}) => [sink.ctx.taskId, sink])).values()];
    const pressed = owed.presses.filter(({kind}) => kind !== 'walk');
    const by: SynthesisRelease = pressed[0]?.kind ?? 'walk';
    const {signal} = state.retired;
    let end: SynthesisEnd = 'none';
    try {
      const slot = synthesisSlot(state);
      if (!slot || signal.aborted) return;
      const joining = inSlotOrder(state, owed.joining).filter(
        appId => state.arrived.has(appId) && !state.merged.has(appId),
      );
      if (state.synthesis) {
        const at = pressed.length > 0 ? Date.now() : (state.lastSettledAt ?? Date.now());
        end = await this.#synthesize(sinks, state, {kind: 'again', by, at, joining, signal});
        if (end === 'none' && owed.walk) delete state.callFailed;
      } else if (slot.state === 'collapsed' && (owed.make || joining.length > 0)) {
        if (!mergePossible(state.arrived, slot.plan.join?.home)) return;
        end = await this.#synthesize(sinks, state, {kind: 'make', by, at: Date.now(), signal});
      }
    } finally {
      for (const appId of owed.joining) state.folding.delete(appId);
      state.pressWork -= pressed.length;
      if (!signal.aborted && (pressed.length > 0 || end === 'kept' || owed.walk)) {
        this.#repaint(sinks, state);
      }
    }
  }

  /**
   * SPEC §5 t6–t7: the second model call, over the sources the run names — what arrived by the
   * time it is made, or the merge's own set and the sources joining it on a re-synthesis — each
   * other dispatched source named as missing with its state, its columns kept. Fewer than two ⇒
   * no call, the slot collapses (§5.1). A decline collapses it too; a malformed output or a
   * model failure collapses a merge made afresh, each with its line (task-8.3 decision 9), and
   * leaves a landed view as it was, the failure said beside it (task-8.4 decision 3). Otherwise
   * the accepted document's derived model and sorts are sent to the client, the partitions it
   * ran over snapshotted, the merge's set made those sources, and the model's tree painted into
   * the synthesis slot (nothing else moves). A re-synthesis is the same call handed the live
   * document, the sources joining it and the account of what broke, walked afresh each time it
   * is made; the journal records the whole conversation (task-5.4 decision 7). Quiescence
   * (task-8.10 decisions 1–2): it is made only once no source it would read has a press in
   * flight, and lands only once none it read has; a press whose answer changed what a source it
   * read holds throws it away — the call aborted — and it is made again. A composition ended by
   * a new utterance, or a merge collapsed under it, paints nothing.
   */
  async #synthesize(
    sinks: readonly Sink[],
    state: CompositionState,
    run: SynthesisRun,
  ): Promise<SynthesisEnd> {
    const slot = synthesisSlot(state);
    if (!slot) return 'none';
    const fresh = run.kind !== 'again';
    const {signal} = run;
    const collapses = state.collapses;
    const gone = () => signal.aborted || state.collapses !== collapses;
    const deadAir = () => Date.now() - run.at;
    const waited: PressWait[] = [];
    const thrownAway: {changed: string[]; at: string}[] = [];
    const joiningNow = () =>
      run.kind === 'again'
        ? run.joining.filter(appId => state.arrived.has(appId) && !state.merged.has(appId))
        : [];
    const within = (): ReadonlySet<string> =>
      fresh ? state.arrived : new Set([...state.merged, ...joiningNow()]);
    const journal = (record: SynthesisRecord) => {
      for (const sink of sinks) sink.turn.synthesis(record);
    };

    for (;;) {
      waited.push(...(await state.presses.quiet(within, signal)));
      if (gone()) return 'none';
      const joined = joiningNow();
      const again = fresh ? undefined : this.#walk(state);
      if (!fresh && !again && joined.length === 0) {
        if (thrownAway.length > 0) journal({outcome: 'thrown-away', attempts: [], ...quiescence()});
        return 'none';
      }
      const over = new Set(within());
      const missing = this.#missing(state, over);
      const context: Partial<SynthesisRecord> = {
        release: {by: run.by, at: new Date(run.at).toISOString()},
        sources: [...over],
        ...(joined.length > 0 ? {joined} : {}),
        ...(missing.length > 0
          ? {missing: missing.map(({appId, state: at}) => ({appId, state: at}))}
          : {}),
        ...(again ? {changes: again.changes} : {}),
      };
      const collapse = (
        outcome: 'declined' | 'malformed' | 'skipped' | 'failed',
        reason: string | undefined,
        attempts: {text: string; errors: string[]}[],
      ): SynthesisEnd => {
        // A decline is the Synthesizer's own judgment in its own words; the prose copy stays
        // until the client reads the painted reason (task 8.5).
        if (outcome === 'declined' && reason) {
          for (const sink of sinks) sink.bus.publish(synthesisProseEnvelope(sink.ctx, reason));
        }
        this.#collapseMerge(
          sinks,
          state,
          outcome === 'declined'
            ? {declined: reason ?? ''}
            : {
                collapse:
                  outcome === 'skipped' ? this.#fewCollapse(state, over) : {cause: 'unmade'},
              },
          {
            outcome,
            ...(reason ? {reason} : {}),
            collapse:
              outcome === 'declined' ? 'declined' : outcome === 'skipped' ? 'few' : 'unmade',
            attempts,
            ...context,
            ...quiescence(),
            deadAirMs: deadAir(),
          },
          over,
        );
        return 'collapsed';
      };
      // A re-synthesis that failed leaves the landed view as it was, the failure said beside it
      // (task-8.4 decision 3): the sources it folded in stay out, late again.
      const keep = (
        outcome: 'malformed' | 'failed',
        reason: string | undefined,
        attempts: {text: string; errors: string[]}[],
      ): SynthesisEnd => {
        state.callFailed = {kind: joined.length > 0 ? 'include' : 'update', sources: joined};
        logLine(`merge task=${sinks[0]?.ctx.taskId} kept (${outcome})`);
        journal({
          outcome,
          ...(reason ? {reason} : {}),
          kept: true,
          attempts,
          ...context,
          ...quiescence(),
          deadAirMs: deadAir(),
        });
        return 'kept';
      };

      if (over.size < 2) return collapse('skipped', `${over.size} source(s) arrived`, []);

      const view = state.partitions.view(over);
      const sources = view.entries().flatMap(([surface, data]) => {
        const appId = parseSurfaceId(surface)?.appId;
        if (!appId) return [];
        return [{surface, appId, displayName: this.#deps.registry.get(appId).displayName, data}];
      });

      // What the sources it reads hold as the call starts: a press answered with other data
      // throws this one away, the call aborted at once (task-8.10 decision 2).
      const snapshot = state.partitions.snapshot(over);
      const call = new AbortController();
      const endCall = () => call.abort();
      signal.addEventListener('abort', endCall, {once: true});
      let changed: string[] = [];
      const stopWatching = state.presses.onEnd(appId => {
        if (!over.has(appId) || changed.length > 0) return;
        changed = state.partitions.changedSince(snapshot, over);
        if (changed.length > 0) call.abort();
      });
      let outcome;
      let error: unknown;
      try {
        outcome = await this.#deps.synthesizer.synthesize(
          {
            utterance: state.utterance,
            request: slot.plan.request,
            ...(slot.plan.columns ? {columns: slot.plan.columns} : {}),
            ...(slot.plan.columnSources ? {columnSources: slot.plan.columnSources} : {}),
            sources,
            ...(missing.length > 0 ? {missing} : {}),
            ...(!fresh && state.synthesis ? {previous: state.synthesis.document} : {}),
            ...(again ? {changes: again.changes} : {}),
            ...(joined.length > 0
              ? {
                  joined: joined.map(appId => ({
                    appId,
                    displayName: this.#deps.registry.get(appId).displayName,
                  })),
                }
              : {}),
          },
          view,
          call.signal,
        );
      } catch (err) {
        error = err;
      }
      // Never lands before a press on a source it read is answered (task-8.10 decision 2).
      waited.push(...(await state.presses.quiet(() => over, signal)));
      stopWatching();
      signal.removeEventListener('abort', endCall);
      if (gone()) return 'none';
      if (changed.length === 0) changed = state.partitions.changedSince(snapshot, over);
      if (changed.length > 0) {
        thrownAway.push({changed, at: new Date().toISOString()});
        logLine(`merge task=${sinks[0]?.ctx.taskId} thrown away (${changed.join(', ')} changed)`);
        continue;
      }
      if (!outcome) {
        const reason = error instanceof Error ? error.message : String(error);
        return fresh ? collapse('failed', reason, []) : keep('failed', reason, []);
      }
      if (outcome.kind === 'declined') {
        return collapse('declined', outcome.reason, outcome.attempts);
      }
      if (outcome.kind === 'malformed') {
        const last = outcome.attempts.at(-1);
        const reason = last?.errors.join('; ');
        return fresh
          ? collapse('malformed', reason, outcome.attempts)
          : keep('malformed', reason, outcome.attempts);
      }

      const {document} = outcome;
      const payload: SynthesisPayload = {dataModel: document.dataModel, sorts: document.sorts};
      // The key sets at accept: every array this document or an earlier one of the composition
      // selects into by key (task-7.6 decision 14).
      const watch = watchOf(payload, view, state.synthesis?.watch);
      // What every surface of the set holds now: a source this document reads nothing from
      // fires the next re-synthesis by holding something else (task-7.9).
      state.synthesis = {document, payload, watch, seen: seenOf(view)};
      // A source that failed while it was made leaves the merge as it would once landed
      // (task-8.10 decision 5).
      state.merged = new Set([...over].filter(appId => state.slots.get(appId)?.state !== 'failed'));
      state.mergedView = {outcome: 'synthesized'};
      delete state.callFailed;
      // A collapsed merge brought back takes its place only now (task-8.4 decision 8).
      if (slot.state === 'collapsed') {
        slot.state = 'pending';
        delete slot.declined;
        delete slot.collapse;
      }
      state.retrying.clear();
      for (const sink of sinks) {
        const paint = synthesisEnvelope(sink.ctx, synthesisParts(document.tree), payload);
        sink.bus.publish(paint);
        sink.turn.surfaces(touchesOf(paint));
      }
      // The merge's own set and the late sources, painted for the client's lines; a press's
      // call repaints once its work is done.
      if (run.kind === 'first') this.#repaint(sinks, state);
      journal({
        outcome: 'synthesized',
        synthesizeDataModel: document,
        note: document.note,
        attempts: outcome.attempts,
        ...context,
        ...quiescence(),
        deadAirMs: deadAir(),
      });
      return 'landed';
    }

    function quiescence(): Partial<SynthesisRecord> {
      return {
        ...(waited.length > 0 ? {waited} : {}),
        ...(thrownAway.length > 0 ? {thrownAway} : {}),
      };
    }
  }

  /**
   * Tier 2, the IntegrityChecker's walk over the merge's own source set (task-8.3 decision 11):
   * a ref that stopped resolving, a key that appeared in a watched array or a source of the set
   * painting again reopens the merged view — what broke, or nothing when nothing did; a fact that
   * stopped holding rides along. A source that arrived after the merge is not in the set: only
   * Include or Retry brings it in.
   */
  #walk(state: CompositionState): {previous: Synthesis; changes: ChangeAccount} | undefined {
    if (!state.synthesis) return undefined;
    const {payload, document, watch, seen} = state.synthesis;
    const changes = changeAccount(payload, state.partitions.view(state.merged), watch, seen);
    return firesResynthesis(changes) ? {previous: document, changes} : undefined;
  }

  /** The dispatched sources a synthesis over `over` runs without, each with where it stands. */
  #missing(state: CompositionState, over: ReadonlySet<string>): MissingSource[] {
    return [...state.slots.values()]
      .filter(({plan}) => plan.source !== SHELL_SOURCE_ID && !over.has(plan.source))
      .map(({plan, state: slotState}) => ({
        appId: plan.source,
        displayName: plan.displayName,
        state:
          slotState === 'failed'
            ? 'failed'
            : state.arrived.has(plan.source)
              ? 'arrived'
              : 'loading',
      }));
  }

  /** Too few arrived: the ones that did, by display name, in slot order. */
  #fewCollapse(state: CompositionState, arrived: ReadonlySet<string>): SlotCollapse {
    return {
      cause: 'few',
      answered: [...state.slots.values()]
        .filter(({plan}) => plan.source !== SHELL_SOURCE_ID && arrived.has(plan.source))
        .map(({plan}) => plan.displayName),
    };
  }

  /**
   * The merge slot collapses (task-8.3 decisions 8, 9): its one line — the decline's reason, or
   * the cause the shell words — painted on it, the journal told why. A declined merge, or one
   * that couldn't be made, keeps the sources it was made over: a source arriving after it waits
   * for Include (task-8.4 decision 9). Any other collapse empties the merge's set.
   */
  #collapseMerge(
    sinks: readonly Sink[],
    state: CompositionState,
    why: {declined: string} | {collapse: SlotCollapse},
    record: SynthesisRecord,
    over?: ReadonlySet<string>,
  ): void {
    const slot = synthesisSlot(state);
    if (!slot) return;
    state.mergeDecided = true;
    state.collapses++;
    state.synthesis = undefined;
    const kept = 'declined' in why || why.collapse.cause === 'unmade';
    state.merged = new Set(kept ? (over ?? []) : []);
    delete state.callFailed;
    state.mergedView = {outcome: record.outcome, ...(record.reason ? {reason: record.reason} : {})};
    if ('declined' in why) {
      slot.declined = why.declined;
      delete slot.collapse;
    } else {
      slot.collapse = why.collapse;
      delete slot.declined;
    }
    slot.state = 'collapsed';
    logLine(`merge task=${sinks[0]?.ctx.taskId} collapsed (${record.collapse ?? record.outcome})`);
    this.#repaint(sinks, state);
    for (const sink of sinks) sink.turn.synthesis(record);
  }

  /** The shell surface repainted from the composition's state, on each stream. */
  #repaint(sinks: readonly Sink[], state: CompositionState): void {
    for (const sink of sinks) sink.bus.publish(shellEnvelope(sink.ctx, shellRepaintParts(state)));
  }

  /**
   * A shell action reported by the client (task-6.5 decisions 5–6): the client already opened
   * the page; the hub's part is the journal entry, which `open` wrote from the message. Only the
   * closed set is an intent worth recording — any other name on a shell surface is a client
   * bug, and the turn fails saying so.
   */
  #shellActionTurn(action: Turn & {kind: 'action'}): void {
    const name = (action.part.action as {name?: unknown}).name;
    if (!SHELL_ACTIONS.includes(name as (typeof SHELL_ACTIONS)[number])) {
      throw new Error(`unknown shell action: ${String(name)}`);
    }
  }

  /**
   * A paint the client could not draw (task-8.3 decision 7): the source's slot fails `invalid`
   * and its data leaves the merge, with no model call — a home source takes the merge down with
   * it. The merged view's own payload failing leaves the shell slot's quiet line.
   */
  #clientErrorTurn(sink: Sink, error: Turn & {kind: 'clientError'}): void {
    const parsed = parseSurfaceId(error.surfaceId);
    const state = this.#compositions.get(sink.ctx.contextId);
    const slot = parsed && state?.slots.get(parsed.appId);
    if (!state || !slot || slot.state === 'failed') return;
    if (parsed.appId === SHELL_SOURCE_ID) {
      slot.state = 'failed';
      this.#repaint([sink], state);
      return;
    }
    this.#failSlot(sink, state, parsed.appId, {cause: 'invalid'});
    state.reevaluate?.();
  }

  /**
   * A vendor slot fails (task-8.3 decisions 5, 7, 8): its cause and the vendor's words painted
   * on it, its data out of the merge — not arrived, out of the merge's set — and, under a join,
   * the merge collapsed at once when it was the home source.
   */
  #failSlot(sink: Sink, state: CompositionState, appId: string, failure: SlotFailure): void {
    state.arrived.delete(appId);
    state.merged.delete(appId);
    const slot = state.slots.get(appId);
    if (!slot) return;
    slot.state = 'failed';
    slot.failure = failure;
    this.#repaint([sink], state);
    const merge = synthesisSlot(state);
    if (merge && merge.state !== 'collapsed' && merge.plan.join?.home === appId) {
      this.#collapseMerge(
        [sink],
        state,
        {collapse: homeCollapse(state, appId)},
        {outcome: 'home', collapse: 'home', attempts: []},
      );
    }
  }

  /** A dispatch that ended: the slot state it ends in, and whether its source arrived. */
  #settleSlot(
    sink: Sink,
    state: CompositionState,
    appId: string,
    record: DispatchRecord,
    options: PumpOptions,
  ): void {
    const next = outcomeToSlotState(record.outcome, state.partitions.holdsSurfaceOf(appId));
    if (next === 'failed') {
      return this.#failSlot(sink, state, appId, {
        cause: record.cause ?? 'unreachable',
        ...(record.cause === 'vendor' && record.vendorMessage
          ? {message: record.vendorMessage}
          : {}),
      });
    }
    // Left to the client means it holds a surface: this source has arrived.
    if (next === undefined) {
      if (record.outcome !== 'completed' || state.arrived.has(appId)) return;
      if (options.folding && state.mergeDecided && synthesisSlot(state)) {
        state.folding.add(appId);
      }
      state.arrived.add(appId);
      // A source arriving after the merge waits for Include, said on the merge slot
      // (task-8.4 decision 1).
      if (lateSources(state).includes(appId)) this.#repaint([sink], state);
      return;
    }
    state.arrived.delete(appId);
    const slot = state.slots.get(appId);
    if (slot && options.collapse && slot.state !== next) {
      slot.state = next;
      this.#repaint([sink], state);
    }
  }

  /**
   * Streams one dispatch's composed events onto the bus. It settles when the dispatch ends — the
   * slot flipped per outcome — or when it reaches the hard cap: the slot fails `timeout` and the
   * stream runs on, whatever arrives after held on the slot, undrawn, until Retry (task-8.3
   * decision 2) — or handed to the Retry racing it (task-8.4 decision 5). A buffered dispatch is
   * drawn whole when it ends, or not at all. `drained` resolves when the dispatch has ended either
   * way. A turn ended by a new utterance flips nothing.
   */
  #pump(
    sink: Sink,
    state: CompositionState | undefined,
    handle: DispatchHandle,
    appId: string,
    options: PumpOptions,
  ): {settled: Promise<DispatchOutcome>; drained: Promise<void>} {
    const composition = state ?? this.#compositions.get(sink.ctx.contextId);
    const record = handle.record;
    let capped = false;
    let isSettled = false;
    let resolveSettled!: (outcome: DispatchOutcome) => void;
    const settled = new Promise<DispatchOutcome>(resolve => (resolveSettled = resolve));
    const settle = (outcome: DispatchOutcome) => {
      isSettled = true;
      record.settledAt = new Date().toISOString();
      sink.turn.dispatched(record);
      if (composition) composition.lastSettledAt = Date.now();
      options.onSettled?.();
      resolveSettled(outcome);
    };
    void handle.capped.then(() => {
      if (isSettled || options.signal?.aborted) return;
      capped = true;
      const slot = composition?.slots.get(appId);
      if (slot) slot.running = handle;
      if (composition) this.#failSlot(sink, composition, appId, {cause: 'timeout'});
      settle('timeout');
    });
    const drained = (async () => {
      let touches: SurfaceTouches = emptyTouches();
      const held: VendorEvent[] = [];
      const buffered: VendorEvent[] = [];
      const relay = (composed: VendorEvent) => {
        const touched = touchesOf(composed);
        if (!record.firstPaintAt && touchedAny(touched)) {
          record.firstPaintAt = new Date().toISOString();
        }
        touches = mergeTouches(touches, touched);
        composition?.partitions.apply(composed);
        sink.bus.publish(composed);
      };
      for await (const event of handle.events) {
        const composed = composeFragment(withoutFailureWords(event), {appId});
        if (capped) held.push(composed);
        else if (options.buffer) buffered.push(composed);
        else relay(composed);
      }
      const ended = await handle.done;
      const slot = composition?.slots.get(appId);
      if (slot?.running === handle) delete slot.running;
      if (capped) {
        if (
          ended.outcome === 'completed' &&
          held.some(e => touchedAny(touchesOf(e))) &&
          slot &&
          !composition?.retired.signal.aborted
        ) {
          record.heldAt = new Date().toISOString();
          const answer: HeldAnswer = {events: held, record};
          logLine(`⏸ ${appId} task=${sink.ctx.taskId} answered past the hard cap — held`);
          if (slot.race) slot.race(answer);
          else slot.held = answer;
        }
        return;
      }
      if (options.buffer && ended.outcome === 'completed' && !options.signal?.aborted) {
        for (const composed of buffered) relay(composed);
      }
      sink.turn.surfaces(touches);
      if (composition && !options.signal?.aborted) {
        this.#settleSlot(sink, composition, appId, ended, options);
      }
      settle(ended.outcome);
    })();
    return {settled, drained};
  }
}

/** The home source failed: the line names its entries as the join calls them. */
function homeCollapse(state: CompositionState, home: string): SlotCollapse {
  const plan = state.slots.get(home)?.plan;
  return {cause: 'home', home: plan?.noun ?? plan?.displayName ?? home};
}

function touchedAny(touches: SurfaceTouches): boolean {
  return touches.created.length + touches.updated.length + touches.deleted.length > 0;
}

/** The client's returned data model, keyed by namespaced surface id; empty when absent. */
function clientSurfaces(metadata: Message['metadata']): Record<string, unknown> {
  const model = metadata?.[A2UI_CLIENT_DATA_MODEL_KEY];
  const surfaces = (model as {surfaces?: unknown} | undefined)?.surfaces;
  return typeof surfaces === 'object' && surfaces !== null
    ? (surfaces as Record<string, unknown>)
    : {};
}

function handleError(outcome: DispatchOutcome): string | undefined {
  return outcome === 'failed' || outcome === 'timeout' ? `dispatch ${outcome}` : undefined;
}

function syntheticTask(ctx: RequestContext): Task {
  return {
    kind: 'task',
    id: ctx.taskId,
    contextId: ctx.contextId,
    status: {state: 'working', timestamp: new Date().toISOString()},
    metadata: {[STAMP_KEY]: {source: SHELL_SOURCE_ID, role: 'shell'}},
  };
}

/** How many received message ids are remembered for refusing a repeat. */
const RECEIVED_IDS_KEPT = 256;

function finalStatus(ctx: RequestContext, state: TaskState, error?: string): TaskStatusUpdateEvent {
  return {
    kind: 'status-update',
    taskId: ctx.taskId,
    contextId: ctx.contextId,
    final: true,
    status: {
      state,
      timestamp: new Date().toISOString(),
      ...(error
        ? {
            message: {
              kind: 'message',
              messageId: randomUUID(),
              role: 'agent',
              parts: [{kind: 'text', text: error}],
              contextId: ctx.contextId,
              taskId: ctx.taskId,
            },
          }
        : {}),
    },
    metadata: {[STAMP_KEY]: {source: SHELL_SOURCE_ID, role: 'shell'}},
  };
}
