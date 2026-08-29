import type {Message} from '@a2a-js/sdk';

export type Turn =
  | {kind: 'utterance'; text: string}
  | {kind: 'action'; part: Record<string, unknown>; surfaceId: string}
  | {kind: 'clientError'; code: string; surfaceId: string}
  | {kind: 'unknown'};

/**
 * What kind of turn a client message opens. Actions and client errors carry a
 * (namespaced) surfaceId inside their A2UI payload; anything with plain text
 * is an utterance.
 */
export function classifyTurn(message: Message): Turn {
  let text: string | undefined;
  for (const part of message.parts) {
    if (part.kind === 'text') {
      text ??= part.text;
      continue;
    }
    if (part.kind !== 'data' || typeof part.data.version !== 'string') continue;
    const action = part.data.action;
    if (typeof action === 'object' && action !== null) {
      const surfaceId = (action as {surfaceId?: unknown}).surfaceId;
      if (typeof surfaceId === 'string') {
        return {kind: 'action', part: part.data, surfaceId};
      }
    }
    const error = part.data.error;
    if (typeof error === 'object' && error !== null) {
      const {code, surfaceId} = error as {code?: unknown; surfaceId?: unknown};
      if (typeof code === 'string' && typeof surfaceId === 'string') {
        return {kind: 'clientError', code, surfaceId};
      }
    }
  }
  if (text !== undefined && text.trim() !== '') return {kind: 'utterance', text};
  return {kind: 'unknown'};
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
