/**
 * The private wire as a test reads and writes it: the events the A2A SDK's client yields from the
 * orchestrator, and the canvas shell's messages to it, in the SDK's 1.x in-memory shapes.
 */
import {
  TaskState,
  type Message,
  type Part,
  type SendMessageRequest,
  type StreamResponse,
  type TaskStatus,
} from '@a2a-js/sdk';
import type {Client} from '@a2a-js/sdk/client';
import {dataOf, dataPart, textOf, textPart, userMessage} from '../src/a2a/parts.js';

export {dataPart, TaskState, textPart};

/** One event of the orchestrator's stream, as the SDK's client yields it. */
export type WireEvent = StreamResponse;

/** A message from the canvas shell: its parts, the canvas it acts on, its metadata. */
export function clientMessage(
  parts: Part[],
  fields: {contextId?: string; metadata?: Record<string, unknown>} = {},
): Message {
  return userMessage(parts, fields);
}

/** The request the SDK's client sends for one message. */
export function requestOf(message: Message): SendMessageRequest {
  return {tenant: '', message, configuration: undefined, metadata: undefined};
}

/** Sends one message and gathers its stream to the end. */
export async function collect(client: Client, message: Message): Promise<WireEvent[]> {
  const events: WireEvent[] = [];
  for await (const event of client.sendMessageStream(requestOf(message))) events.push(event);
  return events;
}

/** The canvas an event belongs to. */
export function contextIdOf(event: WireEvent): string | undefined {
  return event.payload?.value.contextId || undefined;
}

/** The first canvas named in a stream: the one its opening question minted. */
export function contextOf(events: WireEvent[]): string {
  const contextId = events.map(contextIdOf).find(id => id !== undefined);
  if (contextId === undefined) throw new Error('no event names a context');
  return contextId;
}

/** The orchestrator's task an event belongs to. */
export function taskIdOf(event: WireEvent): string | undefined {
  const payload = event.payload;
  if (!payload) return undefined;
  return (payload.$case === 'task' ? payload.value.id : payload.value.taskId) || undefined;
}

export function metadataOf(event: WireEvent): Record<string, unknown> | undefined {
  return event.payload?.value.metadata;
}

/** The composition stamp the orchestrator writes on an event. */
export function stampOf(event: WireEvent): Record<string, unknown> | undefined {
  return metadataOf(event)?.a2uiverse as Record<string, unknown> | undefined;
}

/** The status an event carries: the task's, or a status update's. */
export function statusOf(event: WireEvent): TaskStatus | undefined {
  const payload = event.payload;
  return payload?.$case === 'task' || payload?.$case === 'statusUpdate'
    ? payload.value.status
    : undefined;
}

export function stateOf(event: WireEvent): TaskState | undefined {
  return statusOf(event)?.state;
}

export function isStatusUpdate(event: WireEvent): boolean {
  return event.payload?.$case === 'statusUpdate';
}

const TERMINAL: ReadonlySet<TaskState> = new Set([
  TaskState.TASK_STATE_COMPLETED,
  TaskState.TASK_STATE_FAILED,
  TaskState.TASK_STATE_CANCELED,
  TaskState.TASK_STATE_REJECTED,
]);

/** Whether the event is the turn's one terminal update. */
export function endsTurn(event: WireEvent): boolean {
  const state = stateOf(event);
  return isStatusUpdate(event) && state !== undefined && TERMINAL.has(state);
}

/** The parts an event carries: a status message's, a message's own, or an artifact's. */
export function partsOf(event: WireEvent): Part[] {
  const payload = event.payload;
  switch (payload?.$case) {
    case 'message':
      return payload.value.parts;
    case 'task':
    case 'statusUpdate':
      return payload.value.status?.message?.parts ?? [];
    case 'artifactUpdate':
      return payload.value.artifact?.parts ?? [];
    default:
      return [];
  }
}

/** The object each data part of an event carries, in order. */
export function datasOf(event: WireEvent): Array<Record<string, unknown>> {
  return partsOf(event).flatMap(part => dataOf(part) ?? []);
}

/** The A2UI messages an event carries: its data parts with an inline `version`. */
export function a2uiDatas(event: WireEvent): Array<Record<string, unknown>> {
  return datasOf(event).filter(data => typeof data.version === 'string');
}

/** The words of an event's text parts, in order. */
export function textsOf(event: WireEvent): string[] {
  return partsOf(event).flatMap(part => textOf(part) ?? []);
}
