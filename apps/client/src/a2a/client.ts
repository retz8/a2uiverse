import {A2AClient} from '@a2a-js/sdk/client';
import type {MessageSendParams} from '@a2a-js/sdk';
import type {A2uiMessage} from '@a2ui/web_core/v0_9';
import type {A2AStreamEventData, PaintMeta} from './messages';
import {
  extractA2uiMessagesFromEvent,
  extractAgentTextFromEvent,
  extractContextId,
  extractPaintMetasFromEvent,
} from './messages';
import type {A2ASession} from './session';

const AGENT_CARD_PATH = '/.well-known/agent-card.json';

/** Build the agent-card URL, tolerating trailing slash(es) on the base URL. */
export function agentCardUrl(serverUrl: string): string {
  return `${serverUrl.replace(/\/+$/, '')}${AGENT_CARD_PATH}`;
}

/** The slice of A2AClient the send paths need; lets tests inject a fake. */
export interface A2AMessageSender {
  sendMessageStream(
    params: MessageSendParams,
    options?: {signal?: AbortSignal},
  ): AsyncGenerator<A2AStreamEventData, void, undefined>;
}

export interface A2ASenderOptions {
  /** Base server URL, e.g. http://localhost:10002. Resolves the agent card. */
  serverUrl?: string;
  /** Pre-resolved / fake sender. Takes precedence over serverUrl (tests). */
  client?: A2AMessageSender;
}

export type GetSender = () => Promise<A2AMessageSender>;

/**
 * Lazily resolve the agent card once and cache the client; clear the cache on failure so a later
 * send retries (e.g. after the dev server is started).
 */
export function createSenderResolver(opts: A2ASenderOptions): GetSender {
  const {serverUrl, client} = opts;
  let senderPromise: Promise<A2AMessageSender> | undefined;

  return () => {
    if (client) return Promise.resolve(client);
    if (!serverUrl) {
      return Promise.reject(new Error('createSenderResolver: serverUrl or client required'));
    }
    if (!senderPromise) {
      senderPromise = A2AClient.fromCardUrl(agentCardUrl(serverUrl)).catch((err: unknown) => {
        senderPromise = undefined;
        throw err;
      });
    }
    return senderPromise;
  };
}

/**
 * Send one message over the event stream, applying the A2UI carried by each event as it arrives
 * and capturing the conversation contextId into the session. Throws on wire failure — callers own
 * their error policy. An aborted `signal` tears the stream down mid-flight (true cancel); the
 * throw it produces is the caller's to recognise via `signal.aborted`.
 */
export async function sendAndApply(
  sender: A2AMessageSender,
  params: MessageSendParams,
  apply: (messages: A2uiMessage[]) => void,
  session?: A2ASession,
  onAgentText?: (text: string) => void,
  signal?: AbortSignal,
  onPaintMeta?: (meta: PaintMeta) => void,
): Promise<void> {
  for await (const event of sender.sendMessageStream(params, {signal})) {
    const contextId = extractContextId(event);
    if (contextId) session?.set(contextId);
    // Metas before messages: the title leads the paint, and the shell part is emitted
    // ahead of the createSurface it names within the same event.
    if (onPaintMeta) for (const meta of extractPaintMetasFromEvent(event)) onPaintMeta(meta);
    const messages = extractA2uiMessagesFromEvent(event);
    if (messages.length) apply(messages);
    if (onAgentText) for (const text of extractAgentTextFromEvent(event)) onAgentText(text);
  }
}
