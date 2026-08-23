import type {Message} from '@a2a-js/sdk';

export type TurnKind = 'utterance' | 'action' | 'unknown';

export interface Description {
  kind: TurnKind;
  /** Free-form; the utterance verbatim for palette turns. */
  descriptor: string;
  /** The action's `context`, for action turns. */
  payload?: unknown;
}

/** Renders the client's message into the journal's free-form descriptor. No model involved. */
export function describe(message: Message, appId: string): Description {
  const action = findAction(message);
  if (action) {
    const name = typeof action.name === 'string' ? action.name : '?';
    const surfaceId = typeof action.surfaceId === 'string' ? action.surfaceId : '?';
    return {
      kind: 'action',
      descriptor: `${name} on surface ${surfaceId} in ${appId}`,
      payload: action.context,
    };
  }
  const texts = message.parts.flatMap(p => (p.kind === 'text' ? [p.text] : []));
  if (texts.length) return {kind: 'utterance', descriptor: texts.join('\n')};
  return {kind: 'unknown', descriptor: JSON.stringify(message.parts)};
}

function findAction(message: Message): Record<string, unknown> | undefined {
  for (const part of message.parts) {
    if (part.kind !== 'data') continue;
    const action = part.data.action;
    if (typeof action === 'object' && action !== null) return action as Record<string, unknown>;
  }
  return undefined;
}
