import {TaskState, type Message, type Part} from '@a2a-js/sdk';
import {namespaceSurfaceId, STAMP_KEY, withA2uiMessages} from '@a2uiverse/sdk';
import {textOf, valueOf, withData} from '../a2a/parts.js';
import type {WireEvent} from '../a2a/wire.js';
import {FAILED_STATES} from '../agentsPool/agentsPool.js';
import {partsOf, stateOf, withParts, type VendorEvent} from '../agentsPool/relay.js';
import {touchesOf} from '../journal/surfaces.js';

const A2UI_OPS = ['createSurface', 'updateComponents', 'updateDataModel', 'deleteSurface'] as const;

/**
 * The composition half of the relay, applied after {@link relayEvent}'s id
 * rewrites: the stamp gains `role: 'fragment'` beside its `source`, and surfaceIds
 * are namespaced on the four A2UI ops and on the vendor's `paintMeta` — the
 * surface it titles, as the client will see it (SPEC §14). A part is otherwise
 * passed as its agent wrote it, in its form and with its marks (task-20.4
 * decision 6). The event leaves in
 * the private wire's shape (task-20.1 decision 6): an agent's task becomes a
 * status update carrying its status message, a bare message a status update
 * carrying that message, and every state is demoted to `working` — under
 * fan-out several vendors end on one orchestrator task, so the executor owns
 * the turn's one terminal update; an artifact update is relayed as it is, its
 * parts never read (task-20.4 decision 4). An event that carries A2UI names on its stamp the build the registry holds of
 * each of the app's catalogs (task-15.6 decision 2). The original event is
 * never mutated.
 */
export interface ComposeContext {
  source: string;
  /** The orchestrator's task the event rides: what a bare message, which names no task, takes. */
  taskId: string;
  /** The build of each of the source's app's catalogs the registry holds now, by catalog id. */
  builds?: Readonly<Record<string, string>>;
}

export function composeFragment(event: VendorEvent, ctx: ComposeContext): WireEvent {
  const payload = event.payload;
  if (payload?.$case === 'artifactUpdate') {
    return withStamp({kind: 'artifactUpdate', data: payload.value}, ctx);
  }
  const carried: {message: Message | undefined; timestamp: string | undefined} =
    payload?.$case === 'message'
      ? {message: payload.value, timestamp: undefined}
      : {message: payload?.value.status?.message, timestamp: payload?.value.status?.timestamp};
  const taskId = payload?.$case === 'task' ? payload.value.id : payload?.value.taskId;
  return withStamp(
    {
      kind: 'statusUpdate',
      data: {
        taskId: taskId || ctx.taskId,
        contextId: payload?.value.contextId ?? '',
        status: {
          state: TaskState.TASK_STATE_WORKING,
          message: carried.message
            ? {...carried.message, parts: namespaceParts(carried.message.parts, ctx.source)}
            : undefined,
          timestamp: carried.timestamp,
        },
        metadata: payload?.value.metadata,
      },
    },
    ctx,
  );
}

function withStamp(event: WireEvent, ctx: ComposeContext): WireEvent {
  const existing = event.data.metadata?.[STAMP_KEY] as unknown;
  const builds = ctx.builds && Object.keys(ctx.builds).length > 0 ? ctx.builds : undefined;
  const metadata = {
    ...event.data.metadata,
    [STAMP_KEY]: {
      ...(typeof existing === 'object' && existing !== null ? existing : {}),
      source: ctx.source,
      role: 'fragment',
      ...(builds && carriesA2ui(event) ? {builds: {...builds}} : {}),
    },
  };
  return event.kind === 'statusUpdate'
    ? {...event, data: {...event.data, metadata}}
    : {...event, data: {...event.data, metadata}};
}

/** Whether the event creates, changes or deletes a surface. */
function carriesA2ui(event: WireEvent): boolean {
  const {created, updated, deleted} = touchesOf(event);
  return created.length + updated.length + deleted.length > 0;
}

function namespaceParts(parts: Part[], source: string): Part[] {
  return parts.map(part => {
    const data = valueOf(part);
    const namespaced = namespaceData(data, source);
    return namespaced === data ? part : withData(part, namespaced);
  });
}

type Data = Record<string, unknown>;

/**
 * A part's data with its surface ids namespaced: on each A2UI message it carries, one message or
 * a bare list, through the platform sdk's one judgement of what a message is; and on the vendor's
 * `paintMeta` part, read by its key, whose title and question kind the client files under the
 * surface id it sees (task 10.9).
 */
function namespaceData(data: unknown, source: string): unknown {
  const namespaced = withA2uiMessages(data, message => namespaceMessage(message, source));
  if (namespaced !== data) return namespaced;
  if (typeof data !== 'object' || data === null || Array.isArray(data)) return data;
  const meta = (data as Data).paintMeta;
  if (typeof meta !== 'object' || meta === null) return data;
  const surfaceId = (meta as {surfaceId?: unknown}).surfaceId;
  if (typeof surfaceId !== 'string') return data;
  return {...data, paintMeta: {...meta, surfaceId: namespaceSurfaceId(source, surfaceId)}};
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
 * A vendor's event naming a failed state without its words (task-8.3 decision 6): they ride on the
 * `Slot`'s failure, painted by the shell, and reach the client nowhere else. Data parts stay.
 */
export function withoutFailureWords(event: VendorEvent): VendorEvent {
  const state = stateOf(event);
  if (state === undefined || !FAILED_STATES.has(state)) return event;
  const parts = partsOf(event);
  if (!parts.some(part => textOf(part) !== undefined)) return event;
  return withParts(
    event,
    parts.filter(part => textOf(part) === undefined),
  );
}

/**
 * A relayed event moved onto another orchestrator task: an answer held under the plan's task and
 * drawn by a Retry rides the Retry's stream (task-8.4 decision 15). Parts and stamp stay.
 */
export function retask(event: WireEvent, taskId: string): WireEvent {
  if (event.kind === 'artifactUpdate') return {...event, data: {...event.data, taskId}};
  const {status} = event.data;
  const message = status?.message;
  return {
    ...event,
    data: {
      ...event.data,
      taskId,
      status: status && message?.taskId ? {...status, message: {...message, taskId}} : status,
    },
  };
}
