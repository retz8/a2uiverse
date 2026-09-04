import {randomUUID} from 'node:crypto';
import type {Message, Task, TaskState, TaskStatusUpdateEvent} from '@a2a-js/sdk';
import type {AgentExecutor, ExecutionEventBus, RequestContext} from '@a2a-js/sdk/server';
import {parseSurfaceId} from '@a2uiverse/sdk';
import type {AgentsPool} from './agentsPool/agentsPool.js';
import {STAMP_KEY} from './agentsPool/relay.js';
import type {DispatchHandle, DispatchOutcome} from './agentsPool/types.js';
import {classifyTurn, unnamespaceAction, type Turn} from './composition/classify.js';
import {slotNameFor} from './composition/constants.js';
import {composeFragment} from './composition/fragmentRelay.js';
import {vendorMetadata} from './composition/partition.js';
import {shellCreateParts, shellEnvelope, shellRepaintParts} from './composition/shellPainter.js';
import {compositionFrom, outcomeToSlotState, type CompositionState} from './composition/state.js';
import type {IntentJournal, JournalTurn} from './journal/intentJournal.js';
import {emptyTouches, mergeTouches, touchesOf, type SurfaceTouches} from './journal/surfaces.js';
import type {Planner} from './planner/planner.js';
import type {Registry} from './registry/registry.js';
import {SHELL_SOURCE_ID} from './registry/types.js';
import type {Router} from './router/router.js';

export interface OrchestratorDeps {
  registry: Registry;
  pool: AgentsPool;
  journal: IntentJournal;
  router: Router;
  planner: Planner;
}

/**
 * The turn (SPEC §5) at M1. Utterance: Router → Planner → shell paint →
 * fan-out → slot-lifecycle repaints → one turn-final. Action: owner-only
 * dispatch, no Router/Planner. Client error: slot flip by shell repaint.
 * Composition state is canonical here; the shell surface is its projection.
 */
export class OrchestratorExecutor implements AgentExecutor {
  readonly #deps: OrchestratorDeps;
  readonly #compositions = new Map<string, CompositionState>();

  constructor(deps: OrchestratorDeps) {
    this.#deps = deps;
  }

  async execute(ctx: RequestContext, bus: ExecutionEventBus): Promise<void> {
    // Always first: the task store needs a Task before any update, and a
    // cancel arriving before the first paint must find the task.
    bus.publish(syntheticTask(ctx));
    const turnKind = classifyTurn(ctx.userMessage);
    let turn: JournalTurn | undefined;
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
      bus.publish(finalStatus(ctx, 'failed', message));
      await turn?.close('failed');
    } finally {
      bus.finished();
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
    const shortlist = await this.#deps.router.shortlist(text);
    if (shortlist.length === 0) throw new Error('no routable agents');
    const plan = await this.#deps.planner.plan({utterance: text, shortlist});

    const state = compositionFrom(plan, this.#deps.registry);
    this.#compositions.set(ctx.contextId, state);
    turn.plan(plan);

    // First paint precedes every dispatch, structurally (SPEC §4.5).
    const shellPaint = shellEnvelope(ctx, shellCreateParts(state));
    bus.publish(shellPaint);
    turn.surfaces(touchesOf(shellPaint));

    // The synthesis slot is the shell's own (task-4.4 decision 6): never dispatched.
    const sources = [...state.slots.values()].filter(({plan}) => plan.appId !== SHELL_SOURCE_ID);
    const pumps = sources.map(({plan: slot}) => {
      const request: Message = {
        kind: 'message',
        messageId: randomUUID(),
        role: 'user',
        parts: [{kind: 'text', text: slot.request}],
        metadata: vendorMetadata(ctx.userMessage.metadata, slot.appId),
      };
      const handle = this.#deps.pool.dispatch(slot.appId, {
        clientContextId: ctx.contextId,
        clientTaskId: ctx.taskId,
        message: request,
      });
      return this.#pump(ctx, bus, turn, state, handle, slot.appId, {collapse: true});
    });
    const outcomes = await Promise.all(pumps);

    // One agent failing never fails the turn; only an all-cancelled turn is cancelled.
    const allCancelled = outcomes.every(outcome => outcome === 'cancelled');
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
    const state: TaskState =
      outcome === 'cancelled' ? 'canceled' : outcome === 'completed' ? 'completed' : 'failed';
    bus.publish(finalStatus(ctx, state, handleError(outcome)));
    await turn.close(outcome);
  }

  #clientErrorTurn(
    ctx: RequestContext,
    bus: ExecutionEventBus,
    error: Turn & {kind: 'clientError'},
  ): void {
    const parsed = parseSurfaceId(error.surfaceId);
    const state = this.#compositions.get(ctx.contextId);
    const slot = parsed && state?.slots.get(slotNameFor(parsed.appId));
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
    const slotName = slotNameFor(appId);
    let touches: SurfaceTouches = emptyTouches();
    for await (const event of handle.events) {
      const composed = composeFragment(event, {appId, slot: slotName});
      touches = mergeTouches(touches, touchesOf(composed));
      bus.publish(composed);
    }
    const record = await handle.done;
    turn.dispatched(record);
    turn.surfaces(touches);

    const composition = state ?? this.#compositions.get(ctx.contextId);
    const slot = composition?.slots.get(slotName);
    const next = outcomeToSlotState(record.outcome, touches);
    const flip = next === 'failed' || (next === 'collapsed' && options.collapse);
    if (slot && flip && slot.state !== next) {
      slot.state = next!;
      bus.publish(shellEnvelope(ctx, shellRepaintParts(composition!)));
    }
    return record.outcome;
  }
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
