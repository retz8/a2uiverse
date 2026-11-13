/**
 * The smoke request's transport (SPEC §9.3; task-20.2 decisions 1, 3, 5): one A2A client, the
 * A2A SDK's, sends the agent one streaming message carrying the A2UI extension and the app's
 * entitlement as its client capabilities, with the credential's header when one is given, and
 * reports what came back — the state the answer ended on with every A2UI message the stream
 * carried, an HTTP 401, a stream that closed on an unfinished task, or an error. The judgement
 * over it stays with its two callers, the marketplace and Stellify, each in its own words.
 */
import {randomUUID} from 'node:crypto';
import {
  Role,
  TaskState,
  type Message,
  type Part,
  type StreamResponse,
  type TaskStatus,
} from '@a2a-js/sdk';
import {
  ClientFactory,
  DefaultAgentCardResolver,
  JsonRpcTransportFactory,
  ServiceParameters,
  withA2AExtensions,
} from '@a2a-js/sdk/client';
import {
  A2UI_CLIENT_CAPABILITIES_KEY,
  A2UI_EXTENSION_URIS,
  a2uiMessagesIn,
  clientCapabilities,
  readAuthRequired,
  type A2uiMessage,
  type CatalogIdsByVersion,
  type PublishedCard,
} from '@a2uiverse/sdk';
import {taskStateWord} from './taskStateWord.js';

/** The states that end a task as a failure the agent declared itself, as a finding spells them. */
export const FAILED_STATES: ReadonlySet<string> = new Set(['failed', 'canceled', 'rejected']);

/**
 * The states an answer ends on (task-20.1 decision 2): the terminal ones, and the interrupted
 * ones, where the task waits on the person.
 */
const ENDED_STATES: ReadonlySet<TaskState> = new Set([
  TaskState.TASK_STATE_COMPLETED,
  TaskState.TASK_STATE_FAILED,
  TaskState.TASK_STATE_CANCELED,
  TaskState.TASK_STATE_REJECTED,
  TaskState.TASK_STATE_INPUT_REQUIRED,
  TaskState.TASK_STATE_AUTH_REQUIRED,
]);

export interface SmokeRequest {
  /** The live card, as its agent served it: the A2A SDK's 0.3 layer reads one written for A2A 0.3. */
  card: PublishedCard;
  /**
   * What the request advertises: the app's catalog ids plus the basic catalog — per A2UI version,
   * each version's set under its own key, as the hub advertises (task-19.2 decision 6).
   */
  entitlement: readonly string[] | CatalogIdsByVersion;
  words: string;
  timeoutMs: number;
  /** The credential, as the header the card's scheme names; none for a request sent without one. */
  headers?: Readonly<Record<string, string>>;
}

/** What the transport saw. A task state is spelled in lowercase, as A2A 0.3 names it. */
export type SmokeObservation =
  /** The agent answered HTTP 401. */
  | {kind: 'unauthorized'}
  /**
   * The answer ended: the stream closed after a message, or with its task's last state terminal
   * or interrupted — `state`, with every A2UI message the stream carried, the auth-required data
   * part of the message it ended on when it carried one, and the agent's own words.
   */
  | {kind: 'ended'; state: string; messages: A2uiMessage[]; data?: unknown; text?: string}
  /**
   * The stream closed on a task that had not ended: the last state it carried, absent when it
   * carried none.
   */
  | {kind: 'unfinished'; state?: string; messages: A2uiMessage[]}
  /** The request could not be made: unreachable, past the timeout, or a card the A2A SDK refuses. */
  | {kind: 'error'; message: string};

export type SmokeRunner = (request: SmokeRequest) => Promise<SmokeObservation>;

class UnauthorizedError extends Error {
  constructor() {
    super('the agent refused the request: 401');
  }
}

/**
 * The transport over the A2A SDK's client, a client built per request from the fetched card.
 * JSON-RPC is the one binding spoken.
 */
export function a2aSmokeRunner(options: {fetchImpl?: typeof fetch} = {}): SmokeRunner {
  const base = options.fetchImpl ?? fetch;
  return async ({card, entitlement, words, timeoutMs, headers}) => {
    const signal = AbortSignal.timeout(timeoutMs);
    // A 401 becomes an error of its own, thrown out through the A2A client, which the A2A SDK's
    // own error would only name in its message.
    const fetchImpl: typeof fetch = async (input, init) => {
      const response = await base(input, {...init, signal});
      if (response.status === 401) {
        await response.body?.cancel().catch(() => {});
        throw new UnauthorizedError();
      }
      return response;
    };
    const legacyCompat = {enabled: true};
    const cardResolver = new DefaultAgentCardResolver({fetchImpl, legacyCompat});
    const factory = new ClientFactory({
      transports: [new JsonRpcTransportFactory({fetchImpl, legacyCompat})],
      cardResolver,
    });
    const message: Message = {
      messageId: randomUUID(),
      contextId: '',
      taskId: '',
      role: Role.ROLE_USER,
      parts: [
        {content: {$case: 'text', value: words}, metadata: undefined, filename: '', mediaType: ''},
      ],
      metadata: {[A2UI_CLIENT_CAPABILITIES_KEY]: clientCapabilities(entitlement)},
      extensions: [],
      referenceTaskIds: [],
    };
    const messages: A2uiMessage[] = [];
    // How the answer ended is read from its states alone (task-20.1 decision 2): the status the
    // stream last named — a task's or a status update's — and the last bare message. `final` is
    // not read.
    let last: TaskStatus | undefined;
    let answered: Part[] | undefined;
    try {
      const client = await factory.createFromAgentCard(cardResolver.normalizeAgentCard(card));
      const stream = client.sendMessageStream(
        {tenant: '', message, configuration: undefined, metadata: undefined},
        {
          signal,
          serviceParameters: {
            ...ServiceParameters.create(withA2AExtensions(...Object.values(A2UI_EXTENSION_URIS))),
            ...headers,
          },
        },
      );
      for await (const event of stream) {
        const parts = partsOf(event);
        for (const part of parts) messages.push(...a2uiMessagesIn(dataOf(part)));
        const status = statusOf(event);
        if (status) last = status;
        if (event.payload?.$case === 'message') answered = parts;
      }
    } catch (err) {
      if (err instanceof UnauthorizedError) return {kind: 'unauthorized'};
      if (signal.aborted) {
        return {kind: 'error', message: `the agent did not answer within ${timeoutMs / 1000} s`};
      }
      return {kind: 'error', message: (err as Error).message};
    }
    if (last && ENDED_STATES.has(last.state)) {
      return {
        kind: 'ended',
        messages,
        state: taskStateWord(last.state),
        ...wordsOf(last.message?.parts),
      };
    }
    if (answered) {
      return {
        kind: 'ended',
        messages,
        state: taskStateWord(TaskState.TASK_STATE_COMPLETED),
        ...wordsOf(answered),
      };
    }
    return {kind: 'unfinished', messages, ...(last ? {state: taskStateWord(last.state)} : {})};
  };
}

/** The parts an event carries: a message's own, a status message's, or an artifact's. */
function partsOf(event: StreamResponse): Part[] {
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

/** The status an event carries: a task's or a status update's. */
function statusOf(event: StreamResponse): TaskStatus | undefined {
  const payload = event.payload;
  return payload?.$case === 'task' || payload?.$case === 'statusUpdate'
    ? payload.value.status
    : undefined;
}

/** What a data part carries; undefined for any other part. */
function dataOf(part: Part): unknown {
  return part.content?.$case === 'data' ? part.content.value : undefined;
}

/** The auth-required data part and the text parts of the message an answer ended on. */
function wordsOf(parts: Part[] | undefined): {data?: unknown; text?: string} {
  const data = (parts ?? []).map(dataOf).find(value => readAuthRequired(value) !== undefined);
  const text = (parts ?? [])
    .flatMap(part => (part.content?.$case === 'text' ? [part.content.value.trim()] : []))
    .filter(Boolean)
    .join('\n');
  return {
    ...(data === undefined ? {} : {data}),
    ...(text === '' ? {} : {text}),
  };
}
