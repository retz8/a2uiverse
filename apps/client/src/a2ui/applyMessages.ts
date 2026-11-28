import type {AgentToRendererMessage} from '@a2ui/web_core/v1_0';
import {A2UI_VERSION} from '@a2uiverse/sdk';

/** The slice of MessageProcessor the applier needs; MessageProcessor satisfies it structurally. */
export interface A2uiMessageTarget {
  processMessages(messages: AgentToRendererMessage[]): void;
  readonly model: {getSurface(id: string): unknown};
}

export interface ApplyA2uiMessagesOptions {
  /** Called once per message that failed to process. Not called on success. */
  onMessageError?: (error: unknown, message: AgentToRendererMessage) => void;
}

/**
 * Applies streamed A2UI messages to a processor, one message at a time, and never throws.
 *
 * Two jobs, both load-bearing for the live agent:
 *
 * 1. **Repaint on a repeat `createSurface`.** The agent reuses semantic surface ids across
 *    turns (`user-profile`, `pull-request-detail`) and re-emits `createSurface` every turn,
 *    but the processor throws when the id is already live. A repeat is expanded to
 *    `deleteSurface` + the original `createSurface`, which disposes the old surface and
 *    rebuilds it empty. Dropping the `createSurface` and letting `updateComponents` patch in
 *    place would be cheaper but wrong: every component and data path the previous occupant
 *    declared and the new turn omits would survive, ready to render the previous turn's
 *    content inside the new view.
 *
 * 2. **Isolate failures per message.** The caller applies inside its stream loop, so a throw
 *    escaping here abandons the rest of the turn — every later event silently discarded.
 *    Each message is processed in its own try, so one bad message costs only itself, and the
 *    failure is reported instead of vanishing into the console.
 */
export function applyA2uiMessages(
  target: A2uiMessageTarget,
  messages: AgentToRendererMessage[],
  options: ApplyA2uiMessagesOptions = {},
): void {
  for (const message of messages) {
    try {
      target.processMessages(expand(target, message));
    } catch (error) {
      console.error('[A2UI:apply]', error, message);
      options.onMessageError?.(error, message);
    }
  }
}

/**
 * A repeat `createSurface` becomes delete-then-create; anything else passes through.
 *
 * The liveness check runs per message rather than once per batch, so a surface created
 * earlier in this same batch is also repainted rather than throwing.
 */
function expand(
  target: A2uiMessageTarget,
  message: AgentToRendererMessage,
): AgentToRendererMessage[] {
  const surfaceId = createSurfaceId(message);
  if (surfaceId === undefined || !target.model.getSurface(surfaceId)) return [message];
  const remove: AgentToRendererMessage = {version: A2UI_VERSION, deleteSurface: {surfaceId}};
  // One repaint intent, one try unit: the pair is handed over together so a failure
  // reports once rather than twice.
  return [remove, message];
}

function createSurfaceId(message: AgentToRendererMessage): string | undefined {
  const payload = (message as {createSurface?: {surfaceId?: unknown}}).createSurface;
  if (!payload || typeof payload.surfaceId !== 'string') return undefined;
  return payload.surfaceId;
}
