/**
 * Mutable holder for the A2A conversation `contextId`, shared by every send path (user text and
 * component actions) so the server keys them into one conversation.
 */
export interface A2ASession {
  get(): string | undefined;
  set(contextId: string): void;
}

export function createA2ASession(): A2ASession {
  let contextId: string | undefined;
  return {
    get: () => contextId,
    set: id => {
      contextId = id;
    },
  };
}
