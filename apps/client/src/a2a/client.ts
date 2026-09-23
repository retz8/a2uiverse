import {A2AClient} from '@a2a-js/sdk/client';
import type {MessageSendParams} from '@a2a-js/sdk';
import type {A2uiMessage} from '@a2ui/web_core/v0_9';
import type {CompositionStamp, SynthesisPayload} from '@a2uiverse/sdk';
import type {A2AStreamEventData, PaintMeta} from './messages';
import {
  extractA2uiMessagesFromEvent,
  extractAgentTextFromEvent,
  extractContextId,
  extractPaintMetasFromEvent,
  extractStampFromEvent,
  extractSynthesisFromEvent,
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

/** The per-stream callbacks; an object rather than a positional tail, which had outgrown itself. */
export interface SendAndApplyOptions {
  /**
   * Applies one event's A2UI messages. The composition stamp of the event carrying them rides
   * along: it is what tells the canvas whether these messages paint the shell or fill a slot.
   * The synthesis payload rides beside the stamp on the event that paints the merged view.
   */
  apply: (messages: A2uiMessage[], stamp?: CompositionStamp, synthesis?: SynthesisPayload) => void;
  session?: A2ASession;
  /**
   * One streamed chunk of agent prose, with the stamp of the event carrying it — which is what
   * says whose voice it is, so a fan-out's interleaved chunks can be buffered per source.
   */
  onAgentText?: (text: string, stamp?: CompositionStamp) => void;
  signal?: AbortSignal;
  onPaintMeta?: (meta: PaintMeta) => void;
  /**
   * The stream's first event arrived: the request reached the orchestrator. A throw after this is
   * a stream that broke, before it a request that never arrived (task-8.5 decision 8).
   */
  onFirstEvent?: () => void;
}

/**
 * How long a request may go without its first event before it is taken for lost (task-7.9). A
 * convention, set between what was measured through the dev tunnel: every request that arrived
 * answered within 0.9–2.0 s — the hub publishes the turn's task before any model runs — and every
 * lost one died at the tunnel's 100 s. Applies to the first event only: a stream that has
 * answered may go quiet for as long as a model takes.
 */
export const FIRST_EVENT_TIMEOUT_MS = 10_000;

/**
 * Send one message over the event stream, applying the A2UI carried by each event as it arrives
 * and capturing the conversation contextId into the session. Throws on wire failure — callers own
 * their error policy. An aborted `signal` tears the stream down mid-flight (true cancel); the
 * throw it produces is the caller's to recognise via `signal.aborted`.
 *
 * A request that gets no first event in time is aborted and sent once more, the same message under
 * the same id — a request is sometimes lost in the tunnel before it reaches the orchestrator, and
 * the orchestrator refuses an id it has already taken in, so a slow first send is never run twice.
 */
export async function sendAndApply(
  sender: A2AMessageSender,
  params: MessageSendParams,
  {apply, session, onAgentText, signal, onPaintMeta, onFirstEvent}: SendAndApplyOptions,
): Promise<void> {
  const handle = (event: A2AStreamEventData) => {
    const contextId = extractContextId(event);
    if (contextId) session?.set(contextId);
    // Metas before messages: the title leads the paint, and the shell part is emitted
    // ahead of the createSurface it names within the same event.
    if (onPaintMeta) for (const meta of extractPaintMetasFromEvent(event)) onPaintMeta(meta);
    const stamp = extractStampFromEvent(event);
    const messages = extractA2uiMessagesFromEvent(event);
    if (messages.length) apply(messages, stamp, extractSynthesisFromEvent(event));
    if (onAgentText) for (const text of extractAgentTextFromEvent(event)) onAgentText(text, stamp);
  };

  for (let attempt = 1; ; attempt++) {
    // The attempt's own abort, so a silence can be cut without cancelling the caller's turn.
    const attemptAbort = new AbortController();
    const forward = () => attemptAbort.abort(signal?.reason);
    if (signal?.aborted) forward();
    signal?.addEventListener('abort', forward, {once: true});
    let timer: ReturnType<typeof setTimeout> | undefined;
    try {
      const stream = sender.sendMessageStream(params, {signal: attemptAbort.signal});
      const first = stream.next();
      const silence = new Promise<'silence'>(resolve => {
        timer = setTimeout(() => resolve('silence'), FIRST_EVENT_TIMEOUT_MS);
      });
      const answered = await Promise.race([first, silence]);
      clearTimeout(timer);
      if (answered === 'silence') {
        first.catch(() => {}); // the abort below rejects it; that rejection is this one's doing
        attemptAbort.abort();
        if (attempt === 1) {
          console.warn(`[A2UI:a2a] no answer in ${FIRST_EVENT_TIMEOUT_MS} ms — sending once more`);
          continue;
        }
        throw new Error('The orchestrator did not answer.');
      }
      onFirstEvent?.();
      for (let result = answered; !result.done; result = await stream.next()) handle(result.value);
      return;
    } finally {
      clearTimeout(timer);
      signal?.removeEventListener('abort', forward);
    }
  }
}
