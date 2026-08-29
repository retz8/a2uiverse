import type {Message, Part, Task, TaskState, TaskStatusUpdateEvent} from '@a2a-js/sdk';
import {namespaceSurfaceId, STAMP_KEY} from '@a2uiverse/sdk';
import type {VendorEvent} from '../agentsPool/relay.js';

const TERMINAL: ReadonlySet<TaskState> = new Set(['completed', 'failed', 'canceled', 'rejected']);
const A2UI_OPS = ['createSurface', 'updateComponents', 'updateDataModel', 'deleteSurface'] as const;

/**
 * The composition half of the relay, applied after {@link relayEvent}'s id
 * rewrites: the stamp gains placement (`slot`, `role: 'fragment'`), surfaceIds
 * are namespaced on the four A2UI ops, and vendor finals are demoted — under
 * fan-out several vendors end on one orchestrator task, so the executor owns
 * the single turn-final. The original event is never mutated.
 */
export function composeFragment(
  event: VendorEvent,
  ctx: {appId: string; slot: string},
): VendorEvent {
  switch (event.kind) {
    case 'task':
      return withStamp(
        {
          ...event,
          status: demoteStatus(rewriteStatus(event.status, ctx.appId)),
          ...(event.history ? {history: event.history.map(m => rewriteMessage(m, ctx.appId))} : {}),
        },
        ctx,
      );
    case 'status-update':
      return withStamp(demoteStatusUpdate(rewriteStatusUpdate(event, ctx.appId)), ctx);
    case 'artifact-update':
      return withStamp(
        {
          ...event,
          artifact: {...event.artifact, parts: namespaceParts(event.artifact.parts, ctx.appId)},
        },
        ctx,
      );
    case 'message':
      return withStamp(rewriteMessage(event, ctx.appId), ctx);
  }
}

function withStamp<E extends VendorEvent>(event: E, ctx: {appId: string; slot: string}): E {
  const existing = event.metadata?.[STAMP_KEY];
  return {
    ...event,
    metadata: {
      ...event.metadata,
      [STAMP_KEY]: {
        ...(typeof existing === 'object' && existing !== null ? existing : {}),
        source: ctx.appId,
        slot: ctx.slot,
        role: 'fragment',
      },
    },
  };
}

function demoteStatusUpdate(event: TaskStatusUpdateEvent): TaskStatusUpdateEvent {
  return {...event, final: false, status: demoteStatus(event.status)};
}

function demoteStatus<S extends Task['status']>(status: S): S {
  return TERMINAL.has(status.state) ? {...status, state: 'working'} : status;
}

function rewriteStatusUpdate(event: TaskStatusUpdateEvent, appId: string): TaskStatusUpdateEvent {
  return {...event, status: rewriteStatus(event.status, appId)};
}

function rewriteStatus(status: Task['status'], appId: string): Task['status'] {
  return status.message ? {...status, message: rewriteMessage(status.message, appId)} : status;
}

function rewriteMessage(message: Message, appId: string): Message {
  return {...message, parts: namespaceParts(message.parts, appId)};
}

function namespaceParts(parts: Part[], appId: string): Part[] {
  return parts.map(part => {
    if (part.kind !== 'data') return part;
    const data = namespaceData(part.data, appId);
    return data === part.data ? part : {...part, data};
  });
}

type Data = Record<string, unknown>;

/** Handles both wire forms: one message object per part, and the spec's `messages[]` list. */
function namespaceData(data: Data, appId: string): Data {
  if (typeof data.version === 'string') return namespaceMessage(data, appId);
  if (Array.isArray(data.messages)) {
    return {
      ...data,
      messages: data.messages.map(m =>
        typeof m === 'object' && m !== null && typeof (m as Data).version === 'string'
          ? namespaceMessage(m as Data, appId)
          : m,
      ),
    };
  }
  return data;
}

function namespaceMessage(message: Data, appId: string): Data {
  for (const op of A2UI_OPS) {
    const body = message[op];
    if (typeof body !== 'object' || body === null) continue;
    const surfaceId = (body as {surfaceId?: unknown}).surfaceId;
    if (typeof surfaceId !== 'string') continue;
    return {...message, [op]: {...body, surfaceId: namespaceSurfaceId(appId, surfaceId)}};
  }
  return message;
}
