import type {
  Message,
  Part,
  SendMessageRequest,
  StreamResponse,
  TaskState,
  TaskStatus,
} from '@a2a-js/sdk';
import {a2uiMessagesIn, type A2uiMessage} from '@a2uiverse/sdk';
import {valueOf} from '../a2a/parts.js';

/** One event of an agent's answer, as the A2A SDK's client yields it for an agent on either A2A version. */
export type VendorEvent = StreamResponse;

export interface RelayContext {
  /** The orchestrator's task id for this turn. */
  taskId: string;
  /** The client ↔ orchestrator conversation id. */
  contextId: string;
  /** Provenance: the source the event came from — the app and the account. */
  source: string;
  /** Expose vendor ids under the stamp (debugging only). */
  debugIds: boolean;
}

/** Metadata key the orchestrator owns on relayed events. */
export const STAMP_KEY = 'a2uiverse';

type Metadata = Record<string, unknown> | undefined;

/**
 * The parts of the message an event carries: a bare message's, or a status message's. An
 * artifact's parts are relayed and never read (task-20.4 decision 4).
 */
export function partsOf(event: VendorEvent): Part[] {
  const payload = event.payload;
  switch (payload?.$case) {
    case 'message':
      return payload.value.parts;
    case 'task':
    case 'statusUpdate':
      return payload.value.status?.message?.parts ?? [];
    default:
      return [];
  }
}

/**
 * Every A2UI message an event's message carries, in order, through the platform sdk's one
 * reading (task-20.4 decision 1): one message per data part, or a bare list.
 */
export function a2uiMessagesOf(event: VendorEvent): A2uiMessage[] {
  return partsOf(event).flatMap(part => a2uiMessagesIn(valueOf(part)));
}

/** The task state an event names: a task's or a status update's; none for any other event. */
export function stateOf(event: VendorEvent): TaskState | undefined {
  return statusOf(event)?.state;
}

/** The status an event carries: a task's or a status update's. */
export function statusOf(event: VendorEvent): TaskStatus | undefined {
  const payload = event.payload;
  return payload?.$case === 'task' || payload?.$case === 'statusUpdate'
    ? payload.value.status
    : undefined;
}

/** The agent's own task and conversation an event belongs to; an id it does not name left out. */
export function idsOf(event: VendorEvent): {taskId?: string; contextId?: string} {
  const payload = event.payload;
  if (!payload) return {};
  const taskId = payload.$case === 'task' ? payload.value.id : payload.value.taskId;
  const {contextId} = payload.value;
  return {...(taskId ? {taskId} : {}), ...(contextId ? {contextId} : {})};
}

/** The same event, its message carrying other parts; an event with no message back as it is. */
export function withParts(event: VendorEvent, parts: Part[]): VendorEvent {
  const payload = event.payload;
  switch (payload?.$case) {
    case 'message':
      return {payload: {$case: 'message', value: {...payload.value, parts}}};
    case 'task':
    case 'statusUpdate': {
      const status = payload.value.status;
      if (!status?.message) return event;
      const carried = {...status, message: {...status.message, parts}};
      return payload.$case === 'task'
        ? {payload: {$case: 'task', value: {...payload.value, status: carried}}}
        : {payload: {$case: 'statusUpdate', value: {...payload.value, status: carried}}};
    }
    default:
      return event;
  }
}

/**
 * Rewrites a vendor event's envelope ids to the orchestrator's and stamps its
 * source. Parts are never touched — they are carried by reference.
 */
export function relayEvent(event: VendorEvent, ctx: RelayContext): VendorEvent {
  const payload = event.payload;
  switch (payload?.$case) {
    case 'task': {
      const task = payload.value;
      return {
        payload: {
          $case: 'task',
          value: {
            ...task,
            id: ctx.taskId,
            contextId: ctx.contextId,
            status: rewriteStatus(task.status, ctx),
            history: task.history.map(m => rewriteMessage(m, ctx)),
            metadata: stamp(task.metadata, ctx, task.contextId, task.id),
          },
        },
      };
    }
    case 'statusUpdate': {
      const update = payload.value;
      return {
        payload: {
          $case: 'statusUpdate',
          value: {
            ...update,
            taskId: ctx.taskId,
            contextId: ctx.contextId,
            status: rewriteStatus(update.status, ctx),
            metadata: stamp(update.metadata, ctx, update.contextId, update.taskId),
          },
        },
      };
    }
    case 'artifactUpdate': {
      const update = payload.value;
      return {
        payload: {
          $case: 'artifactUpdate',
          value: {
            ...update,
            taskId: ctx.taskId,
            contextId: ctx.contextId,
            metadata: stamp(update.metadata, ctx, update.contextId, update.taskId),
          },
        },
      };
    }
    case 'message': {
      const message = payload.value;
      return {
        payload: {
          $case: 'message',
          value: {
            ...rewriteMessage(message, ctx),
            metadata: stamp(message.metadata, ctx, message.contextId, message.taskId),
          },
        },
      };
    }
    default:
      return event;
  }
}

/** The client's message, ready for the vendor: orchestrator ids stripped, vendor conversation set. */
export function prepareOutgoing(
  userMessage: Message,
  vendorContextId: string | undefined,
): SendMessageRequest {
  return {
    tenant: '',
    message: {...userMessage, contextId: vendorContextId ?? '', taskId: ''},
    configuration: undefined,
    metadata: undefined,
  };
}

function rewriteMessage(message: Message, ctx: RelayContext): Message {
  return {
    ...message,
    contextId: ctx.contextId,
    ...(message.taskId ? {taskId: ctx.taskId} : {}),
  };
}

function rewriteStatus(status: TaskStatus | undefined, ctx: RelayContext): TaskStatus | undefined {
  return status?.message ? {...status, message: rewriteMessage(status.message, ctx)} : status;
}

function stamp(
  metadata: Metadata,
  ctx: RelayContext,
  vendorContextId: string,
  vendorTaskId: string,
): NonNullable<Metadata> {
  const existing = metadata?.[STAMP_KEY];
  return {
    ...metadata,
    [STAMP_KEY]: {
      ...(typeof existing === 'object' && existing !== null ? existing : {}),
      source: ctx.source,
      ...(ctx.debugIds
        ? {vendorContextId: vendorContextId || undefined, vendorTaskId: vendorTaskId || undefined}
        : {}),
    },
  };
}
