/**
 * Parts and messages in the A2A SDK's in-memory shape, built and read. Every key of that shape is
 * required, so the orchestrator builds its parts and messages here and nowhere by hand. An A2UI
 * part, and a part of the A2UIVerse extension's own, the orchestrator writes through the platform
 * sdk's builders, `a2uiPart` and `shellPart`, which mark them (task-20.4 decisions 5, 8).
 */
import {randomUUID} from 'node:crypto';
import {Role, type Message, type Part} from '@a2a-js/sdk';

/** A text part. */
export function textPart(text: string): Part {
  return {content: {$case: 'text', value: text}, metadata: undefined, filename: '', mediaType: ''};
}

/** A data part carrying no mark. */
export function dataPart(data: unknown): Part {
  return {content: {$case: 'data', value: data}, metadata: undefined, filename: '', mediaType: ''};
}

/**
 * What a data part carries, whatever JSON value it is; undefined for any other part. What the
 * platform sdk's one reading of A2UI, `a2uiMessagesIn`, is handed.
 */
export function valueOf(part: Part): unknown {
  return part.content?.$case === 'data' ? part.content.value : undefined;
}

/** The object a data part carries; undefined for any other part, and for data that is no object. */
export function dataOf(part: Part): Record<string, unknown> | undefined {
  if (part.content?.$case !== 'data') return undefined;
  const value: unknown = part.content.value;
  return typeof value === 'object' && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : undefined;
}

/** The words a text part carries; undefined for any other part. */
export function textOf(part: Part): string | undefined {
  return part.content?.$case === 'text' ? part.content.value : undefined;
}

/** The same part carrying other data. */
export function withData(part: Part, data: unknown): Part {
  return {...part, content: {$case: 'data', value: data}};
}

/** What a message carries beyond its role and parts; an id left out is the SDK's empty string. */
export interface MessageFields {
  contextId?: string;
  taskId?: string;
  metadata?: Record<string, unknown>;
}

/** A message from the orchestrator to an agent. */
export function userMessage(parts: Part[], fields: MessageFields = {}): Message {
  return message(Role.ROLE_USER, parts, fields);
}

/** A message the orchestrator writes as an agent: on its own task, to its one caller. */
export function agentMessage(parts: Part[], fields: MessageFields = {}): Message {
  return message(Role.ROLE_AGENT, parts, fields);
}

function message(role: Role, parts: Part[], fields: MessageFields): Message {
  return {
    messageId: randomUUID(),
    contextId: fields.contextId ?? '',
    taskId: fields.taskId ?? '',
    role,
    parts,
    metadata: fields.metadata,
    extensions: [],
    referenceTaskIds: [],
  };
}
