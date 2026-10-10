/**
 * The smoke request's transport (SPEC §9.3; task-13.4 decision 4): the marketplace's own, with a
 * credential header added. Stellify's A2A client sends the agent one streaming message carrying
 * the A2UI extension and the app's entitlement as its client capabilities, and reports what came
 * back — the end state with every A2UI message the stream carried, an HTTP 401, a stream that
 * never ended, or an error. The judgement over it is `preview`'s, through the sdk's checks.
 */
import {randomUUID} from 'node:crypto';
import type {AgentCard, Message, Part, TaskState} from '@a2a-js/sdk';
import {
  ClientFactory,
  DefaultAgentCardResolver,
  JsonRpcTransportFactory,
  ServiceParameters,
  withA2AExtensions,
} from '@a2a-js/sdk/client';
import {
  A2UI_CLIENT_CAPABILITIES_KEY,
  A2UI_EXTENSION_URI,
  AUTH_REQUIRED_STATE,
  a2uiMessagesOf,
  clientCapabilities,
  readAuthRequired,
  type A2uiMessage,
} from '@a2uiverse/sdk';

/** The A2UI extension's earlier URI, advertised beside the current one as the orchestrator does. */
const A2UI_EXTENSION_URI_V09 = 'https://a2ui.org/a2a-extension/a2ui/v0.9';

/** The final states that end a task as a failure the agent declared itself. */
export const FAILED_STATES: ReadonlySet<string> = new Set(['failed', 'canceled', 'rejected']);
const TERMINAL_STATES: ReadonlySet<TaskState> = new Set([
  'failed',
  'canceled',
  'rejected',
  'completed',
]);

export interface SmokeRequest {
  card: AgentCard;
  /** What the request advertises: the app's declared catalog ids plus the basic catalog. */
  entitlement: readonly string[];
  words: string;
  timeoutMs: number;
  /** The credential, as the header the card's scheme names; none for a card that needs no sign-in. */
  headers?: Readonly<Record<string, string>>;
}

/** What the transport saw. */
export type SmokeObservation =
  /** The agent answered HTTP 401. */
  | {kind: 'unauthorized'}
  /** The task ended — a final event or a task in a terminal state — in `state`, with every A2UI message the stream carried, the final status message's auth-required data part when it carried one, and the agent's own words. */
  | {kind: 'ended'; state: string; messages: A2uiMessage[]; data?: unknown; text?: string}
  /** The stream ended with no final event. */
  | {kind: 'unfinished'; messages: A2uiMessage[]}
  /** The request could not be made: unreachable, or past the timeout. */
  | {kind: 'error'; message: string};

export type SmokeRunner = (request: SmokeRequest) => Promise<SmokeObservation>;

class UnauthorizedError extends Error {
  constructor() {
    super('the agent refused the request: 401');
  }
}

/** The transport over `@a2a-js/sdk`'s client, a client built per request from the fetched card. */
export function a2aSmokeRunner(options: {fetchImpl?: typeof fetch} = {}): SmokeRunner {
  const base = options.fetchImpl ?? fetch;
  return async ({card, entitlement, words, timeoutMs, headers}) => {
    const signal = AbortSignal.timeout(timeoutMs);
    const fetchImpl: typeof fetch = async (input, init) => {
      const merged = new Headers(init?.headers);
      for (const [name, value] of Object.entries(headers ?? {})) merged.set(name, value);
      const response = await base(input, {...init, headers: merged, signal});
      if (response.status === 401) {
        await response.body?.cancel().catch(() => {});
        throw new UnauthorizedError();
      }
      return response;
    };
    const factory = new ClientFactory({
      transports: [new JsonRpcTransportFactory({fetchImpl})],
      cardResolver: new DefaultAgentCardResolver({fetchImpl}),
    });
    const message: Message = {
      kind: 'message',
      messageId: randomUUID(),
      role: 'user',
      parts: [{kind: 'text', text: words}],
      metadata: {[A2UI_CLIENT_CAPABILITIES_KEY]: clientCapabilities(entitlement)},
    };
    const messages: A2uiMessage[] = [];
    let ended: {state: string; data?: unknown; text?: string} | undefined;
    try {
      const client = await factory.createFromAgentCard(card);
      const stream = client.sendMessageStream(
        {message},
        {
          signal,
          serviceParameters: ServiceParameters.create(
            withA2AExtensions(A2UI_EXTENSION_URI, A2UI_EXTENSION_URI_V09),
          ),
        },
      );
      for await (const event of stream) {
        const parts = partsOf(event);
        messages.push(...a2uiMessagesOf(parts));
        if (event.kind === 'message') {
          ended = {state: 'completed', ...wordsOf(parts)};
        } else if (event.kind === 'status-update' && event.final) {
          ended = {state: event.status.state, ...wordsOf(event.status.message?.parts)};
        } else if (
          event.kind === 'task' &&
          (TERMINAL_STATES.has(event.status.state) || event.status.state === AUTH_REQUIRED_STATE)
        ) {
          ended = {state: event.status.state, ...wordsOf(event.status.message?.parts)};
        }
      }
    } catch (err) {
      if (err instanceof UnauthorizedError) return {kind: 'unauthorized'};
      if (signal.aborted) {
        return {kind: 'error', message: `the agent did not answer within ${timeoutMs / 1000} s`};
      }
      return {kind: 'error', message: (err as Error).message};
    }
    if (!ended) return {kind: 'unfinished', messages};
    return {kind: 'ended', messages, ...ended};
  };
}

function partsOf(event: {
  kind: string;
  parts?: Part[];
  artifact?: {parts: Part[]};
  status?: {message?: {parts: Part[]}};
}): Part[] {
  if (event.kind === 'message') return event.parts ?? [];
  if (event.kind === 'artifact-update') return event.artifact?.parts ?? [];
  return event.status?.message?.parts ?? [];
}

/** The auth-required data part and the text parts of a final status message. */
function wordsOf(parts: Part[] | undefined): {data?: unknown; text?: string} {
  const data = (parts ?? []).find(
    part => part.kind === 'data' && readAuthRequired(part.data) !== undefined,
  );
  const text = (parts ?? [])
    .flatMap(part => (part.kind === 'text' ? [part.text.trim()] : []))
    .filter(Boolean)
    .join('\n');
  return {
    ...(data && data.kind === 'data' ? {data: data.data} : {}),
    ...(text === '' ? {} : {text}),
  };
}
