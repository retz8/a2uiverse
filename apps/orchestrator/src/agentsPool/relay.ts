import type {
  Message,
  MessageSendParams,
  Task,
  TaskArtifactUpdateEvent,
  TaskStatus,
  TaskStatusUpdateEvent,
} from '@a2a-js/sdk';

export type VendorEvent = Message | Task | TaskStatusUpdateEvent | TaskArtifactUpdateEvent;

export interface RelayContext {
  /** The orchestrator's task id for this turn. */
  taskId: string;
  /** The client ↔ orchestrator conversation id. */
  contextId: string;
  /** Provenance: the app the event came from. */
  appId: string;
  /** Expose vendor ids under the stamp (debugging only). */
  debugIds: boolean;
}

/** Metadata key the orchestrator owns on relayed events. */
export const STAMP_KEY = 'a2uiverse';

/**
 * Rewrites a vendor event's envelope ids to the orchestrator's and stamps its
 * source. Parts are never touched — they are carried by reference.
 */
export function relayEvent(event: VendorEvent, ctx: RelayContext): VendorEvent {
  switch (event.kind) {
    case 'task':
      return {
        ...event,
        id: ctx.taskId,
        contextId: ctx.contextId,
        status: rewriteStatus(event.status, ctx),
        ...(event.history ? {history: event.history.map(m => rewriteMessage(m, ctx))} : {}),
        metadata: stamp(event.metadata, ctx, event.contextId, event.id),
      };
    case 'status-update':
      return {
        ...event,
        taskId: ctx.taskId,
        contextId: ctx.contextId,
        status: rewriteStatus(event.status, ctx),
        metadata: stamp(event.metadata, ctx, event.contextId, event.taskId),
      };
    case 'artifact-update':
      return {
        ...event,
        taskId: ctx.taskId,
        contextId: ctx.contextId,
        metadata: stamp(event.metadata, ctx, event.contextId, event.taskId),
      };
    case 'message':
      return {
        ...rewriteMessage(event, ctx),
        metadata: stamp(event.metadata, ctx, event.contextId, event.taskId),
      };
  }
}

/** The client's message, ready for the vendor: orchestrator ids stripped, vendor conversation set. */
export function prepareOutgoing(
  userMessage: Message,
  vendorContextId: string | undefined,
): MessageSendParams {
  const {contextId: _contextId, taskId: _taskId, ...rest} = userMessage;
  return {message: vendorContextId ? {...rest, contextId: vendorContextId} : rest};
}

function rewriteMessage(message: Message, ctx: RelayContext): Message {
  return {
    ...message,
    contextId: ctx.contextId,
    ...(message.taskId !== undefined ? {taskId: ctx.taskId} : {}),
  };
}

function rewriteStatus(status: TaskStatus, ctx: RelayContext): TaskStatus {
  return status.message ? {...status, message: rewriteMessage(status.message, ctx)} : status;
}

function stamp(
  metadata: Message['metadata'],
  ctx: RelayContext,
  vendorContextId: string | undefined,
  vendorTaskId: string | undefined,
): NonNullable<Message['metadata']> {
  const existing = metadata?.[STAMP_KEY];
  return {
    ...metadata,
    [STAMP_KEY]: {
      ...(typeof existing === 'object' && existing !== null ? existing : {}),
      source: ctx.appId,
      ...(ctx.debugIds ? {vendorContextId, vendorTaskId} : {}),
    },
  };
}
