import {randomUUID} from 'node:crypto';
import type {Message, Task, TaskState, TaskStatusUpdateEvent} from '@a2a-js/sdk';
import type {AgentExecutor, ExecutionEventBus, RequestContext} from '@a2a-js/sdk/server';
import {parseSurfaceId, type SynthesisPayload} from '@a2uiverse/sdk';
import {SHELL_ACTIONS} from '@a2uiverse/shell-catalog/schema';
import type {AgentsPool} from './agentsPool/agentsPool.js';
import {STAMP_KEY} from './agentsPool/relay.js';
import type {DispatchHandle, DispatchOutcome} from './agentsPool/types.js';
import {classifyTurn, unnamespaceAction, type Turn} from './composition/classify.js';
import {composeFragment, withGenerations} from './composition/fragmentRelay.js';
import {changeAccount, checkSynthesisPayload} from './composition/integrity.js';
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
  outcomeToSlotState,
  synthesisSlot,
  type CompositionState,
} from './composition/state.js';
import type {IntentJournal, JournalTurn} from './journal/intentJournal.js';
import {elapsedMs, logLine} from './log.js';
import {emptyTouches, mergeTouches, touchesOf, type SurfaceTouches} from './journal/surfaces.js';
import type {Planner} from './planner/planner.js';
import type {Registry} from './registry/registry.js';
import {SHELL_SOURCE_ID} from './registry/types.js';
import type {Router} from './router/router.js';
import type {Synthesis} from './synthesizer/document.js';
import type {ChangeAccount} from './synthesizer/prompt.js';
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
}

/**
 * The turn (SPEC §5) at M3s. Utterance: Router → Planner (the one model call, the readers as
 * steps inside it) → shell paint of the model-authored layout → fan-out → slot-lifecycle repaints
 * → synthesis into the reserved slot → one turn-final. A turn that dispatches nothing — a
 * platform answer, a gap — closes right after first paint. Action: owner-only dispatch, no
 * Router/Planner; then, if the partition change invalidated the live synthesis, re-synthesis
 * inline before the final, handed the previous document and what broke (task-5.4 decision 6).
 * A shell action — one of the shell catalog's closed set, raised on a shell surface and handled
 * by the client itself (SPEC §7) — is journaled and nothing else: no dispatch, no paint.
 * Client error: slot flip by shell repaint.
 * Composition state is canonical here; the shell surface is its projection.
 */
export class OrchestratorExecutor implements AgentExecutor {
  readonly #deps: OrchestratorDeps;
  readonly #compositions: Map<string, CompositionState>;

  constructor(deps: OrchestratorDeps) {
    this.#deps = deps;
    this.#compositions = deps.compositions;
  }

  async execute(ctx: RequestContext, bus: ExecutionEventBus): Promise<void> {
    // Always first: the task store needs a Task before any update, and a
    // cancel arriving before the first paint must find the task.
    bus.publish(syntheticTask(ctx));
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
        case 'clientError': {
          turn = this.#deps.journal.open({
            turnId: ctx.taskId,
            clientContextId: ctx.contextId,
            message: ctx.userMessage,
          });
          this.#clientErrorTurn(ctx, bus, turnKind);
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
    this.#deps.pool.cancel(taskId);
  }

  async #utteranceTurn(
    ctx: RequestContext,
    bus: ExecutionEventBus,
    turn: JournalTurn,
    text: string,
  ): Promise<void> {
    // The first-paint clock (task-6.6 decision 3): from here to the tree accepted, the shortlist
    // included, since nothing paints before either.
    const receivedAt = Date.now();
    const shortlist = await this.#deps.router.shortlist(text);
    const outcome = await this.#deps.planner.plan({
      utterance: text,
      shortlist,
      conversationId: ctx.contextId,
    });
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
      // Both attempts refused: a broken turn, the findings on the final (task-6.4 decision 6).
      const last = outcome.attempts.at(-1);
      throw new Error(
        `the Planner's answer was refused ${outcome.attempts.length} times: ${last?.errors.join('; ')}`,
      );
    }

    const state = compositionFrom(outcome.document, this.#deps.registry, text);
    this.#compositions.set(ctx.contextId, state);

    // First paint precedes every dispatch, structurally (SPEC §4.5).
    const shellPaint = shellEnvelope(ctx, shellCreateParts(state));
    bus.publish(shellPaint);
    turn.surfaces(touchesOf(shellPaint));

    // The synthesis slot is the shell's own (task-4.4 decision 6): never dispatched.
    const sources = [...state.slots.values()].filter(({plan}) => plan.source !== SHELL_SOURCE_ID);
    const pumps = sources.map(({plan: slot}) => {
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
      });
      return this.#pump(ctx, bus, turn, state, handle, slot.source, {collapse: true});
    });
    const outcomes = await Promise.all(pumps);
    await this.#synthesize(ctx, bus, turn, state);

    // One agent failing never fails the turn; only an all-cancelled turn is cancelled. A turn
    // that dispatched nothing — a platform answer, a gap — completed at first paint.
    const allCancelled = outcomes.length > 0 && outcomes.every(outcome => outcome === 'cancelled');
    bus.publish(finalStatus(ctx, allCancelled ? 'canceled' : 'completed'));
    await turn.close(allCancelled ? 'cancelled' : 'completed');
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
    const outcome = await this.#pump(ctx, bus, turn, undefined, handle, owner.id, {
      collapse: false,
    });
    // Tier 2: the partition change may have re-pointed refs the live synthesis depends on.
    if (composition?.synthesis) {
      const {payload, document} = composition.synthesis;
      if (!checkSynthesisPayload(payload, composition.partitions).valid) {
        const changes = changeAccount(payload, composition.partitions);
        await this.#synthesize(ctx, bus, turn, composition, {previous: document, changes});
      }
    }
    const state: TaskState =
      outcome === 'cancelled' ? 'canceled' : outcome === 'completed' ? 'completed' : 'failed';
    bus.publish(finalStatus(ctx, state, handleError(outcome)));
    await turn.close(outcome);
  }

  /**
   * SPEC §5 t6–t7: when every dispatched source has resolved, the second model call — or not.
   * Fewer than two sources arrived ⇒ no call, the slot collapses (§5.1). A decline, a malformed
   * output or a model failure collapse it too, told apart in the journal. Otherwise the accepted
   * document's derived model and sorts are sent to the client, the partitions are snapshotted,
   * and the model's tree is painted into the synthesis slot (nothing else moves). A re-synthesis is the same call handed the live document and the
   * account of what broke; the journal records the whole conversation (task-5.4 decision 7).
   */
  async #synthesize(
    ctx: RequestContext,
    bus: ExecutionEventBus,
    turn: JournalTurn,
    state: CompositionState,
    again?: {previous: Synthesis; changes: ChangeAccount},
  ): Promise<void> {
    const slot = synthesisSlot(state);
    if (!slot) return;
    const startedAt = state.lastSettledAt ?? Date.now();
    const deadAir = () => Date.now() - startedAt;
    const sent = again ? {changes: again.changes} : {};
    const collapse = (
      outcome: 'declined' | 'malformed' | 'skipped' | 'failed',
      reason: string | undefined,
      attempts: {text: string; errors: string[]}[],
    ) => {
      state.synthesis = undefined;
      state.mergedView = {outcome, ...(reason ? {reason} : {})};
      // A decline is the Synthesizer's own judgment in its own words; the collapsed slot rests
      // on them rather than folding away unexplained. The other outcomes are the runtime's.
      if (outcome === 'declined' && reason) bus.publish(synthesisProseEnvelope(ctx, reason));
      if (slot.state !== 'collapsed') {
        slot.state = 'collapsed';
        bus.publish(shellEnvelope(ctx, shellRepaintParts(state)));
      }
      turn.synthesis({
        outcome,
        ...(reason ? {reason} : {}),
        attempts,
        ...sent,
        deadAirMs: deadAir(),
      });
    };

    if (state.arrived.size < 2)
      return collapse('skipped', `${state.arrived.size} source(s) arrived`, []);

    const sources = state.partitions.entries().flatMap(([surface, data]) => {
      const appId = parseSurfaceId(surface)?.appId;
      if (!appId || !state.arrived.has(appId)) return [];
      return [{surface, appId, displayName: this.#deps.registry.get(appId).displayName, data}];
    });
    const utterance = ctx.userMessage.parts.find(p => p.kind === 'text')?.text ?? '';

    let outcome;
    try {
      outcome = await this.#deps.synthesizer.synthesize(
        {utterance, request: slot.plan.request, sources, ...again},
        state.partitions,
      );
    } catch (err) {
      return collapse('failed', err instanceof Error ? err.message : String(err), []);
    }
    if (outcome.kind === 'declined') return collapse('declined', outcome.reason, outcome.attempts);
    if (outcome.kind === 'malformed') {
      const last = outcome.attempts.at(-1);
      return collapse('malformed', last?.errors.join('; '), outcome.attempts);
    }

    const {document} = outcome;
    const payload: SynthesisPayload = {dataModel: document.dataModel, sorts: document.sorts};
    state.partitions.snapshot();
    state.synthesis = {document, payload};
    state.mergedView = {outcome: 'synthesized'};
    const paint = synthesisEnvelope(ctx, synthesisParts(document.tree), payload);
    bus.publish(paint);
    turn.surfaces(touchesOf(paint));
    turn.synthesis({
      outcome: 'synthesized',
      synthesizeDataModel: document,
      note: document.note,
      attempts: outcome.attempts,
      ...sent,
      deadAirMs: deadAir(),
    });
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

  #clientErrorTurn(
    ctx: RequestContext,
    bus: ExecutionEventBus,
    error: Turn & {kind: 'clientError'},
  ): void {
    const parsed = parseSurfaceId(error.surfaceId);
    const state = this.#compositions.get(ctx.contextId);
    const slot = parsed && state?.slots.get(parsed.appId);
    if (slot && slot.state !== 'failed') {
      slot.state = 'failed';
      bus.publish(shellEnvelope(ctx, shellRepaintParts(state!)));
    }
  }

  /**
   * Streams one dispatch's composed events onto the bus, then flips its slot
   * per outcome — repainting the shell surface when the state changed.
   */
  async #pump(
    ctx: RequestContext,
    bus: ExecutionEventBus,
    turn: JournalTurn,
    state: CompositionState | undefined,
    handle: DispatchHandle,
    appId: string,
    options: {collapse: boolean},
  ): Promise<DispatchOutcome> {
    const composition = state ?? this.#compositions.get(ctx.contextId);
    let touches: SurfaceTouches = emptyTouches();
    for await (const event of handle.events) {
      const composed = composeFragment(event, {appId});
      touches = mergeTouches(touches, touchesOf(composed));
      // Materialize first, so the stamp carries the generation this very event produced.
      const changed = composition?.partitions.apply(composed) ?? [];
      const stamped = composition
        ? withGenerations(composed, composition.partitions.generationsOf(changed))
        : composed;
      bus.publish(stamped);
    }
    const record = await handle.done;
    turn.dispatched(record);
    turn.surfaces(touches);
    if (composition) composition.lastSettledAt = Date.now();

    const slot = composition?.slots.get(appId);
    const next = outcomeToSlotState(record.outcome, touches);
    // Left to the client means it painted: this source has arrived.
    if (next === undefined && record.outcome === 'completed') composition?.arrived.add(appId);
    const flip = next === 'failed' || (next === 'collapsed' && options.collapse);
    if (slot && flip && slot.state !== next) {
      slot.state = next!;
      bus.publish(shellEnvelope(ctx, shellRepaintParts(composition!)));
    }
    return record.outcome;
  }
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
