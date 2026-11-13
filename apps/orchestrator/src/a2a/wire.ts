/**
 * The events of the private wire, between the orchestrator and the canvas shell (task-20.1
 * decision 6): after the orchestrator's task, `working` status updates of that one task, an agent's
 * artifact updates as they are, and the orchestrator's one terminal update.
 */
import {TaskState, type Part} from '@a2a-js/sdk';
import type {AgentExecutionEvent} from '@a2a-js/sdk/server';
import {agentMessage} from './parts.js';

/** A status update of the orchestrator's task. */
export type WireStatusUpdate = Extract<AgentExecutionEvent, {kind: 'statusUpdate'}>;

/** An event on the private wire after the orchestrator's task. */
export type WireEvent = WireStatusUpdate | Extract<AgentExecutionEvent, {kind: 'artifactUpdate'}>;

/** The orchestrator's task and the canvas it runs in. */
export interface WireContext {
  taskId: string;
  contextId: string;
}

/**
 * A status update of the orchestrator's task: its state, the parts its status message carries —
 * none leaves the message out — and the event's metadata.
 */
export function statusUpdate(
  ctx: WireContext,
  state: TaskState,
  fields: {parts?: Part[]; metadata?: Record<string, unknown>} = {},
): WireStatusUpdate {
  const {parts, metadata} = fields;
  return {
    kind: 'statusUpdate',
    data: {
      taskId: ctx.taskId,
      contextId: ctx.contextId,
      status: {
        state,
        message:
          parts && parts.length > 0
            ? agentMessage(parts, {taskId: ctx.taskId, contextId: ctx.contextId})
            : undefined,
        timestamp: new Date().toISOString(),
      },
      metadata,
    },
  };
}

/** A `working` status update: what everything short of the turn's end rides. */
export function workingUpdate(
  ctx: WireContext,
  fields: {parts?: Part[]; metadata?: Record<string, unknown>} = {},
): WireStatusUpdate {
  return statusUpdate(ctx, TaskState.TASK_STATE_WORKING, fields);
}

/**
 * The parts of the status message an event carries. An artifact's parts are relayed and never
 * read (task-20.4 decision 4).
 */
export function partsOf(event: WireEvent): Part[] {
  return event.kind === 'statusUpdate' ? (event.data.status?.message?.parts ?? []) : [];
}
