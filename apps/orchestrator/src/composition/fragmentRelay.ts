import type {Message, Part, Task, TaskState, TaskStatusUpdateEvent} from '@a2a-js/sdk';
import {namespaceSurfaceId, STAMP_KEY} from '@a2uiverse/sdk';
import type {VendorEvent} from '../agentsPool/relay.js';

const TERMINAL: ReadonlySet<TaskState> = new Set(['completed', 'failed', 'canceled', 'rejected']);
const FAILED: ReadonlySet<TaskState> = new Set(['failed', 'canceled', 'rejected']);
const A2UI_OPS = ['createSurface', 'updateComponents', 'updateDataModel', 'deleteSurface'] as const;

/**
 * The composition half of the relay, applied after {@link relayEvent}'s id
 * rewrites: the stamp gains `role: 'fragment'` beside its `source`, surfaceIds
 * are namespaced on the four A2UI ops and on the vendor's `paintMeta` — the
 * surface it titles, as the client will see it (SPEC §14) — and vendor finals
 * are demoted — under fan-out several vendors end on one orchestrator task, so
 * the executor owns the single turn-final. The original event is never mutated.
 */
export interface ComposeContext {
  source: string;
}

export function composeFragment(event: VendorEvent, ctx: ComposeContext): VendorEvent {
  switch (event.kind) {
    case 'task':
      return withStamp(
        {
          ...event,
          status: demoteStatus(rewriteStatus(event.status, ctx.source)),
          ...(event.history
            ? {history: event.history.map(m => rewriteMessage(m, ctx.source))}
            : {}),
        },
        ctx,
      );
    case 'status-update':
      return withStamp(demoteStatusUpdate(rewriteStatusUpdate(event, ctx.source)), ctx);
    case 'artifact-update':
      return withStamp(
        {
          ...event,
          artifact: {...event.artifact, parts: namespaceParts(event.artifact.parts, ctx.source)},
        },
        ctx,
      );
    case 'message':
      return withStamp(rewriteMessage(event, ctx.source), ctx);
  }
}

function withStamp<E extends VendorEvent>(event: E, ctx: ComposeContext): E {
  const existing = event.metadata?.[STAMP_KEY];
  return {
    ...event,
    metadata: {
      ...event.metadata,
      [STAMP_KEY]: {
        ...(typeof existing === 'object' && existing !== null ? existing : {}),
        source: ctx.source,
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

function rewriteStatusUpdate(event: TaskStatusUpdateEvent, source: string): TaskStatusUpdateEvent {
  return {...event, status: rewriteStatus(event.status, source)};
}

function rewriteStatus(status: Task['status'], source: string): Task['status'] {
  return status.message ? {...status, message: rewriteMessage(status.message, source)} : status;
}

function rewriteMessage(message: Message, source: string): Message {
  return {...message, parts: namespaceParts(message.parts, source)};
}

function namespaceParts(parts: Part[], source: string): Part[] {
  return parts.map(part => {
    if (part.kind !== 'data') return part;
    const data = namespaceData(part.data, source);
    return data === part.data ? part : {...part, data};
  });
}

type Data = Record<string, unknown>;

/**
 * Handles both wire forms: one message object per part, and the spec's `messages[]` list; and the
 * vendor's `paintMeta` part, whose title and question kind the client files under the surface id
 * it sees (task 10.9).
 */
function namespaceData(data: Data, source: string): Data {
  if (typeof data.version === 'string') return namespaceMessage(data, source);
  const meta = data.paintMeta;
  if (typeof meta === 'object' && meta !== null) {
    const surfaceId = (meta as {surfaceId?: unknown}).surfaceId;
    if (typeof surfaceId !== 'string') return data;
    return {...data, paintMeta: {...meta, surfaceId: namespaceSurfaceId(source, surfaceId)}};
  }
  if (Array.isArray(data.messages)) {
    return {
      ...data,
      messages: data.messages.map(m =>
        typeof m === 'object' && m !== null && typeof (m as Data).version === 'string'
          ? namespaceMessage(m as Data, source)
          : m,
      ),
    };
  }
  return data;
}

function namespaceMessage(message: Data, source: string): Data {
  for (const op of A2UI_OPS) {
    const body = message[op];
    if (typeof body !== 'object' || body === null) continue;
    const surfaceId = (body as {surfaceId?: unknown}).surfaceId;
    if (typeof surfaceId !== 'string') continue;
    return {...message, [op]: {...body, surfaceId: namespaceSurfaceId(source, surfaceId)}};
  }
  return message;
}

/**
 * A vendor's failed final without its words (task-8.3 decision 6): they ride on the `Slot`'s
 * failure, painted by the shell, and reach the client nowhere else. Data parts stay.
 */
export function withoutFailureWords(event: VendorEvent): VendorEvent {
  if (event.kind !== 'status-update' && event.kind !== 'task') return event;
  const failed = FAILED.has(event.status.state) && (event.kind === 'task' || event.final);
  const message = event.status.message;
  if (!failed || !message || !message.parts.some(part => part.kind === 'text')) return event;
  const parts = message.parts.filter(part => part.kind !== 'text');
  return {...event, status: {...event.status, message: {...message, parts}}};
}

/**
 * A relayed event moved onto another orchestrator task: an answer held under the plan's task and
 * drawn by a Retry rides the Retry's stream (task-8.4 decision 15). Parts and stamp stay.
 */
export function retask(event: VendorEvent, taskId: string): VendorEvent {
  const message = (m: Message): Message => (m.taskId !== undefined ? {...m, taskId} : m);
  const status = (s: Task['status']): Task['status'] =>
    s.message ? {...s, message: message(s.message)} : s;
  switch (event.kind) {
    case 'task':
      return {
        ...event,
        id: taskId,
        status: status(event.status),
        ...(event.history ? {history: event.history.map(message)} : {}),
      };
    case 'status-update':
      return {...event, taskId, status: status(event.status)};
    case 'artifact-update':
      return {...event, taskId};
    case 'message':
      return message(event);
  }
}
