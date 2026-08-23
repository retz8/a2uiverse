import type {Task, TaskState, TaskStatusUpdateEvent} from '@a2a-js/sdk';
import type {AgentExecutor, ExecutionEventBus, RequestContext} from '@a2a-js/sdk/server';
import type {AgentsPool} from './agentsPool/agentsPool.js';
import {STAMP_KEY} from './agentsPool/relay.js';
import type {DispatchHandle} from './agentsPool/types.js';
import type {IntentJournal, JournalTurn} from './journal/intentJournal.js';
import {emptyTouches, mergeTouches, touchesOf} from './journal/surfaces.js';
import type {Registry} from './registry/registry.js';

export interface OrchestratorDeps {
  registry: Registry;
  pool: AgentsPool;
  journal: IntentJournal;
}

/**
 * The turn (SPEC §5) at M0: journal → dispatch to the one registered app →
 * relay its stream → journal the outcome. No Router, no Planner, no model.
 */
export class OrchestratorExecutor implements AgentExecutor {
  readonly #deps: OrchestratorDeps;
  readonly #inflight = new Map<string, DispatchHandle>();

  constructor(deps: OrchestratorDeps) {
    this.#deps = deps;
  }

  async execute(ctx: RequestContext, bus: ExecutionEventBus): Promise<void> {
    let turn: JournalTurn | undefined;
    try {
      // Phase 2 replaces this line with the Router/Planner's dispatch list.
      const app = this.#deps.registry.list()[0];
      if (!app) throw new Error('registry is empty');

      // Always first: the task store needs a Task before any update, and a
      // cancel arriving before the vendor's first event must find the task.
      bus.publish(syntheticTask(ctx, app.id));

      turn = this.#deps.journal.open({
        turnId: ctx.taskId,
        clientContextId: ctx.contextId,
        message: ctx.userMessage,
        appId: app.id,
      });
      const handle = this.#deps.pool.dispatch(app.id, {
        clientContextId: ctx.contextId,
        clientTaskId: ctx.taskId,
        message: ctx.userMessage,
      });
      this.#inflight.set(ctx.taskId, handle);

      let touches = emptyTouches();
      for await (const event of handle.events) {
        touches = mergeTouches(touches, touchesOf(event));
        bus.publish(event);
      }
      const record = await handle.done;
      if (!record.sawFinal) {
        // The vendor never terminated the stream; terminate it ourselves.
        const state: TaskState =
          record.outcome === 'cancelled'
            ? 'canceled'
            : record.outcome === 'completed'
              ? 'completed'
              : 'failed';
        bus.publish(finalStatus(ctx, app.id, state, record.error));
      }
      turn.dispatched(record);
      turn.surfaces(touches);
      await turn.close(record.outcome);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      bus.publish(
        finalStatus(ctx, this.#deps.registry.list()[0]?.id ?? 'orchestrator', 'failed', message),
      );
      await turn?.close('failed');
    } finally {
      this.#inflight.delete(ctx.taskId);
      bus.finished();
    }
  }

  async cancelTask(taskId: string): Promise<void> {
    // The execute loop observes the abort and publishes the final 'canceled' status.
    this.#deps.pool.cancel(taskId);
  }
}

function syntheticTask(ctx: RequestContext, appId: string): Task {
  return {
    kind: 'task',
    id: ctx.taskId,
    contextId: ctx.contextId,
    status: {state: 'working', timestamp: new Date().toISOString()},
    metadata: {[STAMP_KEY]: {source: appId}},
  };
}

function finalStatus(
  ctx: RequestContext,
  appId: string,
  state: TaskState,
  error?: string,
): TaskStatusUpdateEvent {
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
              messageId: crypto.randomUUID(),
              role: 'agent',
              parts: [{kind: 'text', text: error}],
              contextId: ctx.contextId,
              taskId: ctx.taskId,
            },
          }
        : {}),
    },
    metadata: {[STAMP_KEY]: {source: appId}},
  };
}
