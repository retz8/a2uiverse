/**
 * The smoke request's transport (SPEC §9.3; task-20.2 decisions 1, 3, 5; task-20.5 decision 7):
 * one streaming message carrying the A2UI extension and the app's entitlement as its client
 * capabilities, with the credential when one is given, sent through the dial, which walks the
 * card's spoken interfaces as a dispatch does; and a report of what came back — the state the
 * answer ended on with every A2UI message its messages carried, a refusal for sign-in, a stream
 * that closed on an unfinished task, no interface reached, or an error — beside the interface the
 * request went to and each one passed over before it. A2UI is read from a bare message and from a
 * status message, never from an artifact, through the platform sdk's one reading (task-20.4
 * decisions 1, 4). The judgement over it stays with its two callers, the marketplace and
 * Stellify, each in its own words.
 */
import {randomUUID} from 'node:crypto';
import {
  Role,
  TaskState,
  type AgentCard,
  type AgentInterface,
  type Message,
  type Part,
  type StreamResponse,
  type TaskStatus,
} from '@a2a-js/sdk';
import {ServiceParameters, withA2AExtensions} from '@a2a-js/sdk/client';
import {noInterfaceFinding, spokenInterfaces} from '@a2uiverse/card';
import {
  A2UI_CLIENT_CAPABILITIES_KEY,
  A2UI_EXTENSION_URIS,
  a2uiMessagesIn,
  clientCapabilities,
  readAuthRequired,
  type A2uiMessage,
  type CatalogIdsByVersion,
} from '@a2uiverse/sdk';
import {UnauthorizedError} from './answers.js';
import {Dialer, NoInterfaceReachedError, type NotReached} from './dial.js';
import type {OpenConnection} from './opening.js';
import {taskStateWord} from './taskStateWord.js';

/** How long opening a connection may take at publish and at `preview` (task-20.5 decision 4). */
export const SMOKE_CONNECT_TIMEOUT_MS = 10_000;

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
  /**
   * The live card, read. The request goes to the first interface in the card's order the platform
   * speaks and reaches (task-20.5 decision 2).
   */
  card: AgentCard;
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

/** Where the request went: the interface taken, and each one passed over before it. */
export interface SmokeReached {
  /** The interface the request went to, as the card lists it. */
  taken: AgentInterface;
  /** Each interface tried before it and not reached, in the order tried. */
  notReached: NotReached[];
}

/** What the transport saw. A task state is spelled in lowercase, as A2A 0.3 names it. */
export type SmokeObservation =
  /** The agent refused the request for sign-in: HTTP 401, or `UNAUTHENTICATED` on gRPC. */
  | ({kind: 'unauthorized'} & SmokeReached)
  /**
   * The answer ended: the task reached auth-required, whether or not the agent closed its stream
   * (task-20.4 decision 10), or the stream closed after a message, or with its task's last state
   * terminal or interrupted — `state`, with every A2UI message the answer's messages carried, the
   * auth-required data part of the message it ended on when it carried one, and the agent's own
   * words.
   */
  | ({
      kind: 'ended';
      state: string;
      messages: A2uiMessage[];
      data?: unknown;
      text?: string;
    } & SmokeReached)
  /**
   * The stream closed on a task that had not ended: the last state it carried, absent when it
   * carried none.
   */
  | ({kind: 'unfinished'; state?: string; messages: A2uiMessage[]} & SmokeReached)
  /** The walk reached no interface the card lists: each one tried, in the order tried. */
  | {kind: 'unreached'; notReached: NotReached[]}
  /**
   * The request failed once sent, the timeout passed, or the card lists no interface the platform
   * speaks.
   */
  | {kind: 'error'; message: string};

export type SmokeRunner = (request: SmokeRequest) => Promise<SmokeObservation>;

export interface SmokeRunnerOptions {
  fetchImpl?: typeof fetch;
  /** How long opening a connection may take, for each interface the walk tries. */
  connectTimeoutMs?: number;
  /** How a connection is opened; a test replaying a captured wire opens none. */
  openConnection?: OpenConnection;
}

/** The transport over the dial, which hands the A2A SDK one interface at a time. */
export function a2aSmokeRunner(options: SmokeRunnerOptions = {}): SmokeRunner {
  const base = options.fetchImpl ?? fetch;
  return async ({card, entitlement, words, timeoutMs, headers}) => {
    if (spokenInterfaces(card).length === 0) {
      return {kind: 'error', message: noInterfaceFinding(card)};
    }
    const timeout = AbortSignal.timeout(timeoutMs);
    // The runner leaves a stream its agent holds open once the answer has ended.
    const left = new AbortController();
    const signal = AbortSignal.any([timeout, left.signal]);
    const dialer = new Dialer({
      connectTimeoutMs: options.connectTimeoutMs ?? SMOKE_CONNECT_TIMEOUT_MS,
      fetchImpl: (input, init) => base(input, {...init, signal}),
      ...(options.openConnection ? {openConnection: options.openConnection} : {}),
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
    let reached: SmokeReached | undefined;
    try {
      const dialed = await dialer.dial({
        card,
        params: {tenant: '', message, configuration: undefined, metadata: undefined},
        ...(headers ? {credential: headers} : {}),
        serviceParameters: ServiceParameters.create(
          withA2AExtensions(...Object.values(A2UI_EXTENSION_URIS)),
        ),
        signal,
      });
      reached = {taken: dialed.taken, notReached: dialed.notReached};
      for await (const event of dialed.events) {
        const parts = partsOf(event);
        for (const part of parts) messages.push(...a2uiMessagesIn(dataOf(part)));
        const status = statusOf(event);
        if (status) last = status;
        if (event.payload?.$case === 'message') answered = parts;
        // An answer that reaches auth-required has ended there: A2A 1.0 asks an agent to keep
        // its stream open after it asks for sign-in.
        if (status?.state === TaskState.TASK_STATE_AUTH_REQUIRED) break;
      }
    } catch (err) {
      if (err instanceof NoInterfaceReachedError) {
        return {kind: 'unreached', notReached: err.notReached};
      }
      if (err instanceof UnauthorizedError && reached) return {kind: 'unauthorized', ...reached};
      if (timeout.aborted) {
        return {kind: 'error', message: `the agent did not answer within ${timeoutMs / 1000} s`};
      }
      return {kind: 'error', message: (err as Error).message};
    } finally {
      left.abort();
    }
    if (last && ENDED_STATES.has(last.state)) {
      return {
        kind: 'ended',
        messages,
        state: taskStateWord(last.state),
        ...wordsOf(last.message?.parts),
        ...reached!,
      };
    }
    if (answered) {
      return {
        kind: 'ended',
        messages,
        state: taskStateWord(TaskState.TASK_STATE_COMPLETED),
        ...wordsOf(answered),
        ...reached!,
      };
    }
    return {
      kind: 'unfinished',
      messages,
      ...(last ? {state: taskStateWord(last.state)} : {}),
      ...reached!,
    };
  };
}

/** The parts of the message an event carries: a bare message's, or a status message's. */
function partsOf(event: StreamResponse): Part[] {
  const payload = event.payload;
  switch (payload?.$case) {
    case 'message':
      return payload.value.parts;
    case 'task':
    case 'statusUpdate':
      return payload.value.status?.message?.parts ?? [];
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
