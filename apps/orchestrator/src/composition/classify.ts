import type {Message} from '@a2a-js/sdk';
import {readCatalogLoadFailure, readOperation, type CompositionOperation} from '@a2uiverse/sdk';
import {dataOf, textOf} from '../a2a/parts.js';

export type Turn =
  | {kind: 'utterance'; text: string}
  | {kind: 'action'; part: Record<string, unknown>; surfaceId: string}
  | {
      kind: 'clientError';
      code: string;
      surfaceId: string;
      /** The catalog the client could not load, when the report is a catalog load failure. */
      catalogId?: string;
    }
  | {kind: 'operation'; operation: CompositionOperation}
  | {
      kind: 'functionAnswer';
      /** The message as the client sent it: a `rendererFunctionResponse`, or an `error`. */
      part: Record<string, unknown>;
      /** The call's id as the hub namespaced it: `<source>:<functionCallId>`. */
      callId: string;
    }
  | {kind: 'agentFunction'}
  | {kind: 'unknown'};

/**
 * What kind of turn a client message opens. Actions and client errors carry a
 * (namespaced) surfaceId inside their A2UI payload; a press on the composition carries the
 * A2UIVerse extension's operation (task-8.4 decision 14); a renderer function's answer, and an
 * error naming the call it answers, carry the call's namespaced id (task-21.13 decision 9); a
 * `callAgentFunction` is a kind of its own, never routed (decision 11); anything with plain text
 * is an utterance.
 */
export function classifyTurn(message: Message): Turn {
  let text: string | undefined;
  for (const part of message.parts) {
    const words = textOf(part);
    if (words !== undefined) {
      text ??= words;
      continue;
    }
    const data = dataOf(part);
    if (!data || typeof data.version !== 'string') continue;
    const action = data.action;
    if (typeof action === 'object' && action !== null) {
      const surfaceId = (action as {surfaceId?: unknown}).surfaceId;
      if (typeof surfaceId === 'string') {
        return {kind: 'action', part: data, surfaceId};
      }
    }
    const operation = readOperation(data);
    if (operation) return {kind: 'operation', operation};
    const answered = callIdOf(data.rendererFunctionResponse) ?? callIdOf(data.error);
    if (answered !== undefined) return {kind: 'functionAnswer', part: data, callId: answered};
    if (typeof data.callAgentFunction === 'object' && data.callAgentFunction !== null) {
      return {kind: 'agentFunction'};
    }
    const error = data.error;
    if (typeof error === 'object' && error !== null) {
      const {code, surfaceId} = error as {code?: unknown; surfaceId?: unknown};
      if (typeof code === 'string' && typeof surfaceId === 'string') {
        const loadFailure = readCatalogLoadFailure(error);
        return {
          kind: 'clientError',
          code,
          surfaceId,
          ...(loadFailure ? {catalogId: loadFailure.catalogId} : {}),
        };
      }
    }
  }
  if (text !== undefined && text.trim() !== '') return {kind: 'utterance', text};
  return {kind: 'unknown'};
}

/** The `functionCallId` a function's answer or an error carries, when it is a string. */
function callIdOf(body: unknown): string | undefined {
  if (typeof body !== 'object' || body === null) return undefined;
  const id = (body as {functionCallId?: unknown}).functionCallId;
  return typeof id === 'string' ? id : undefined;
}

/**
 * A function's answer with the call's id given back to its agent (task-21.13 decision 8): the
 * `functionCallId` the agent wrote, out of `<source>:<functionCallId>`.
 */
export function unnamespaceAnswer(
  data: Record<string, unknown>,
  functionCallId: string,
): Record<string, unknown> {
  const key = 'rendererFunctionResponse' in data ? 'rendererFunctionResponse' : 'error';
  const body = data[key];
  if (typeof body !== 'object' || body === null) return data;
  return {...data, [key]: {...body, functionCallId}};
}

/** The action payload with its surfaceId un-namespaced for the owning vendor. */
export function unnamespaceAction(
  data: Record<string, unknown>,
  surfaceId: string,
): Record<string, unknown> {
  const action = data.action;
  if (typeof action !== 'object' || action === null) return data;
  return {...data, action: {...action, surfaceId}};
}
