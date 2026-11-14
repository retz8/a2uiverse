/**
 * The dial (task-20.5 decisions 2 to 5, 9 to 11): how the platform reaches an agent, written once
 * for the orchestrator's dispatch and the smoke runner. Given a read card, a credential and a time
 * limit for opening a connection, it walks the interfaces the platform speaks in the card's order
 * and sends the request to the first one reached, reporting each one it tried before and did not
 * reach.
 *
 * An interface is never reached when no connection to it could be opened in time, when what
 * answered there said it does not serve it, or when it cannot carry the credential. The walk moves
 * on from those alone: a refusal for sign-in, a stream that broke, a failed task or a timeout end
 * it where it stands, so a request is never delivered twice. The A2A SDK is handed the read card
 * listing the one interface taken, a gRPC one at the address `addressOf` reads, its 0.3 layer on
 * for an interface on A2A 0.3.
 */
import * as grpc from '@grpc/grpc-js';
import type {AgentCard, AgentInterface, SendMessageRequest, StreamResponse} from '@a2a-js/sdk';
import {
  ClientFactory,
  JsonRpcTransportFactory,
  RestTransportFactory,
  ServiceParameters,
  withA2AVersion,
  type AgentCardResolver,
  type Client,
} from '@a2a-js/sdk/client';
import {GrpcTransportFactory} from '@a2a-js/sdk/client/grpc';
import {
  a2aVersionOf,
  atCardVersion,
  cardReadError,
  cardToDial,
  spokenInterfaces,
} from '@a2uiverse/card';
import {addressOf, isGrpc, type InterfaceAddress} from './address.js';
import {answeringFetch, NotServedError, readAnswerError, UnauthorizedError} from './answers.js';
import {credentialOn} from './credentialOnBinding.js';
import {
  keepingAnswer,
  keepingFetch,
  noneAnswered,
  servedFromMessage,
  servedIn,
  type ExtendedCardAnswer,
  type KeptAnswer,
} from './extendedCard.js';
import {openConnection, type OpenConnection} from './opening.js';

/**
 * Why an interface the walk tried was never reached: no connection could be opened, what answered
 * there does not serve it, or it cannot carry the credential.
 */
export type NotReachedCase = 'connection' | 'unserved' | 'credential';

/** An interface the walk tried and did not reach. */
export interface NotReached {
  /** The interface as the card lists it. */
  interface: AgentInterface;
  why: NotReachedCase;
  /** The credential's header the interface cannot carry, when `why` is `credential`. */
  header?: string;
}

/** The walk reached no interface the card lists. */
export class NoInterfaceReachedError extends Error {
  constructor(readonly notReached: NotReached[]) {
    super('no interface the card lists was reached');
  }
}

export interface DialerOptions {
  /** How long opening a connection may take, for each interface the walk tries. */
  connectTimeoutMs: number;
  /** The fetch JSON-RPC and HTTP+JSON send through. */
  fetchImpl?: typeof fetch;
  /** How a connection is opened; a test replaying a captured wire opens none. */
  openConnection?: OpenConnection;
}

/** One request to one interface. */
export interface SendOptions {
  params: SendMessageRequest;
  /** The credential, as the HTTP header its scheme names. */
  credential?: Readonly<Record<string, string>>;
  /** What the request carries beside the credential: the extensions it activates. */
  serviceParameters?: Readonly<Record<string, string>>;
  signal?: AbortSignal;
}

export interface DialOptions extends SendOptions {
  /** The card as read. */
  card: AgentCard;
  /**
   * The interface to try first, the one that last answered for the app; the rest follow in the
   * card's order. One the card no longer lists is not tried.
   */
  first?: AgentInterface;
}

/** A request for an account's extended card (task-20.8 decision 7): the walk's card and the credential. */
export interface ExtendedCardOptions {
  /** The public card as read: its spoken interfaces are walked. */
  card: AgentCard;
  /** The interface to try first, as for a dispatch. */
  first?: AgentInterface;
  /** The account's credential, as the HTTP header its scheme names. */
  credential?: Readonly<Record<string, string>>;
  /** The fetch's time limit: once aborted, what was asked is let go and the answer is none. */
  signal?: AbortSignal;
}

/** Where the request for an extended card went, and its answer. */
export interface FetchedExtendedCard {
  /** The interface that answered; none when the walk reached none or the time ran out first. */
  taken?: AgentInterface;
  /** Each interface tried before it and not reached, in the order tried. */
  notReached: NotReached[];
  /**
   * The answer; `unanswered` when the walk reached no interface or the time limit passed first,
   * `failed` with the reason for any other answer that brought no card.
   */
  answer: ExtendedCardAnswer | {kind: 'unanswered'};
}

/** Where the walk sent the request, and the answer. */
export interface Dialed {
  /** The interface the request went to, as the card lists it. */
  taken: AgentInterface;
  /** Each interface tried before it and not reached, in the order tried. */
  notReached: NotReached[];
  /** The answer, from its first event: a refusal for sign-in arrives as `UnauthorizedError`. */
  events: AsyncGenerator<StreamResponse>;
}

/**
 * The platform reads a card itself and hands the A2A SDK one already read, so the A2A SDK
 * resolves none and normalizes none: its own normalizing reads an in-memory card with sign-in
 * schemes over again as JSON and drops them.
 */
const NO_RESOLVER: AgentCardResolver = {
  resolve: () => Promise.reject(new Error('the dial fetches no card')),
};

/**
 * Dials agents, holding one A2A SDK client for each interface it has sent to, so a gRPC channel
 * is opened once for an interface and kept.
 */
export class Dialer {
  readonly #options: DialerOptions;
  readonly #clients = new Map<string, Promise<Client>>();

  constructor(options: DialerOptions) {
    this.#options = options;
  }

  /**
   * Walks the card's spoken interfaces and sends the request to the first one reached. Rejects
   * with `NoInterfaceReachedError` when none is, and with the signal's reason once it is aborted.
   */
  async dial({card, first, ...send}: DialOptions): Promise<Dialed> {
    const notReached: NotReached[] = [];
    for (const agentInterface of walkOrder(card, first)) {
      const passed = (why: NotReachedCase, header?: string) =>
        notReached.push({interface: agentInterface, why, ...(header ? {header} : {})});
      const credential = credentialOn(agentInterface, send.credential);
      if (credential.kind === 'cannot') {
        passed('credential', credential.header);
        continue;
      }
      const address = addressOf(agentInterface);
      if (!address || !(await this.#open(agentInterface, address, send.signal))) {
        passed('connection');
        continue;
      }
      const events = this.send(card, agentInterface, send);
      let head: IteratorResult<StreamResponse> | {error: unknown};
      try {
        head = await events.next();
      } catch (error) {
        if (error instanceof NotServedError) {
          passed('unserved');
          continue;
        }
        head = {error};
      }
      return {taken: agentInterface, notReached, events: fromHead(head, events)};
    }
    throw new NoInterfaceReachedError(notReached);
  }

  /**
   * Asks for the extended card an agent serves the account (task-20.8 decisions 7, 9, 10): the
   * public card's spoken interfaces walked as a dispatch walks them, moving on only from one
   * never reached, the credential carried as a dispatch carries it on each binding. Never
   * rejects: an answer that is no card says why.
   */
  async fetchExtendedCard({
    card,
    first,
    credential,
    signal,
  }: ExtendedCardOptions): Promise<FetchedExtendedCard> {
    const notReached: NotReached[] = [];
    try {
      for (const agentInterface of walkOrder(card, first)) {
        const passed = (why: NotReachedCase, header?: string) =>
          notReached.push({interface: agentInterface, why, ...(header ? {header} : {})});
        const carried = credentialOn(agentInterface, credential);
        if (carried.kind === 'cannot') {
          passed('credential', carried.header);
          continue;
        }
        const address = addressOf(agentInterface);
        if (!address || !(await this.#open(agentInterface, address, signal))) {
          passed('connection');
          continue;
        }
        const client = await this.#client(card, agentInterface);
        // The transport is asked directly, so the client keeps the card it was made from; the
        // A2A version it names is the one the client adds to every request of its own.
        const asked = await keepingAnswer(() =>
          client.transport.getExtendedAgentCard(
            {tenant: ''},
            {
              ...(signal ? {signal} : {}),
              serviceParameters: ServiceParameters.createFrom(
                carried.serviceParameters,
                withA2AVersion(client.protocolVersion),
              ),
            },
          ),
        );
        if ('error' in asked) {
          // An answer that the agent has none is read first: A2A 1.0 maps
          // `UnsupportedOperationError` to gRPC's `UNIMPLEMENTED`, which alone says the interface
          // is not there.
          const none = noneAnswered(asked.error, asked.kept) !== undefined;
          if (!none && readAnswerError(asked.error) instanceof NotServedError) {
            passed('unserved');
            continue;
          }
          if (signal?.aborted) return {notReached, answer: {kind: 'unanswered'}};
          return {
            taken: agentInterface,
            notReached,
            answer: answerOf(asked.error, agentInterface, asked),
          };
        }
        return {
          taken: agentInterface,
          notReached,
          answer: cardOf(asked.result, agentInterface, asked.kept),
        };
      }
      return {notReached, answer: {kind: 'unanswered'}};
    } catch (err) {
      if (signal?.aborted) return {notReached, answer: {kind: 'unanswered'}};
      return {notReached, answer: {kind: 'failed', reason: (err as Error).message}};
    }
  }

  /**
   * One request to an interface already taken, with no walk: a resend after a refresh, a repair
   * sent back in the same dispatch.
   */
  async *send(
    card: AgentCard,
    taken: AgentInterface,
    {params, credential, serviceParameters, signal}: SendOptions,
  ): AsyncGenerator<StreamResponse> {
    const carried = credentialOn(taken, credential);
    if (carried.kind === 'cannot') {
      throw new Error(`the credential's header "${carried.header}" is not a name gRPC can carry`);
    }
    try {
      const client = await this.#client(card, taken);
      yield* client.sendMessageStream(params, {
        ...(signal ? {signal} : {}),
        serviceParameters: {...serviceParameters, ...carried.serviceParameters},
      });
    } catch (err) {
      throw readAnswerError(err);
    }
  }

  /** A2A's cancel for one task, sent to the interface its request went to. */
  async cancelTask(card: AgentCard, taken: AgentInterface, id: string): Promise<void> {
    const client = await this.#client(card, taken);
    try {
      await client.cancelTask({tenant: '', id, metadata: undefined});
    } catch (err) {
      throw readAnswerError(err);
    }
  }

  async #open(
    agentInterface: AgentInterface,
    address: InterfaceAddress,
    signal: AbortSignal | undefined,
  ): Promise<boolean> {
    const open = this.#options.openConnection ?? openConnection;
    return open(address, {
      timeoutMs: this.#options.connectTimeoutMs,
      alpn: isGrpc(agentInterface) ? 'h2' : 'http/1.1',
      ...(signal ? {signal} : {}),
    });
  }

  /** The A2A SDK's client for one interface, made once and kept. */
  #client(card: AgentCard, taken: AgentInterface): Promise<Client> {
    const key = JSON.stringify([
      taken.url,
      taken.protocolBinding,
      taken.protocolVersion,
      taken.tenant,
    ]);
    let pending = this.#clients.get(key);
    if (!pending) {
      const address = addressOf(taken);
      if (!address) return Promise.reject(new Error(`no address in ${taken.url}`));
      const fetchImpl = answeringFetch(keepingFetch(this.#options.fetchImpl ?? fetch));
      const legacyCompat = {enabled: true};
      const factory = new ClientFactory({
        transports: [
          new JsonRpcTransportFactory({fetchImpl, legacyCompat}),
          new RestTransportFactory({fetchImpl, legacyCompat}),
          new GrpcTransportFactory({
            legacyCompat,
            grpcChannelCredentials: address.tls
              ? grpc.credentials.createSsl()
              : grpc.credentials.createInsecure(),
          }),
        ],
        cardResolver: NO_RESOLVER,
      });
      pending = factory
        .createFromAgentCard(cardToDial(card, {...taken, url: address.dialUrl}))
        .catch(err => {
          this.#clients.delete(key);
          throw err;
        });
      this.#clients.set(key, pending);
    }
    return pending;
  }
}

/** Whether the interface is at A2A 0.3, where the A2A SDK's 0.3 layer reads the answer. */
function atA2a0_3(agentInterface: AgentInterface): boolean {
  return a2aVersionOf(agentInterface).startsWith('0.');
}

/**
 * The card an extended card's answer brought, as served where it can be had. At A2A 0.3 the A2A
 * SDK's reading of the answer stands in where the answer as served cannot be had (gRPC) or does
 * not read (HTTP+JSON, where the A2A SDK's own server answers the JSON form of A2A 0.3's
 * protobuf, finding 21), the reading's version step applied to it.
 */
function cardOf(result: AgentCard, taken: AgentInterface, kept: KeptAnswer): ExtendedCardAnswer {
  const legacy = atA2a0_3(taken);
  if (isGrpc(taken)) {
    return legacy
      ? {kind: 'read', card: atCardVersion(result)}
      : {kind: 'served', served: servedFromMessage(result)};
  }
  const served = servedIn(kept, taken.protocolBinding === 'JSONRPC' ? 'JSONRPC' : 'HTTP+JSON');
  if (!served) return {kind: 'failed', reason: 'the answer held no card'};
  // A card that names itself and that the reading refuses, in a form the A2A SDK read.
  const named = typeof (served as {name?: unknown}).name === 'string';
  if (legacy && named && cardReadError(served) !== undefined) {
    return {kind: 'read', card: atCardVersion(result)};
  }
  return {kind: 'served', served};
}

/**
 * What an extended card's request that ended in an error says: a refusal for sign-in, that the
 * agent has none, or — where the A2A SDK could not read a successful answer — the card as served
 * in it; otherwise no card, with the reason.
 */
function answerOf(
  raw: unknown,
  taken: AgentInterface,
  asked: {kept: KeptAnswer},
): ExtendedCardAnswer {
  const none = noneAnswered(raw, asked.kept);
  if (none !== undefined) return {kind: 'none', answer: none};
  const err = readAnswerError(raw);
  if (err instanceof UnauthorizedError) return {kind: 'refused'};
  if (!isGrpc(taken)) {
    const served = servedIn(
      asked.kept,
      taken.protocolBinding === 'JSONRPC' ? 'JSONRPC' : 'HTTP+JSON',
    );
    if (served) return {kind: 'served', served};
  }
  return {kind: 'failed', reason: err instanceof Error ? err.message : String(err)};
}

/**
 * The spoken interfaces in the order the walk tries them: the one remembered first, when the card
 * still lists it, then the rest in the card's order.
 */
function walkOrder(card: AgentCard, first: AgentInterface | undefined): AgentInterface[] {
  const spoken = spokenInterfaces(card);
  const remembered = first && spoken.find(listed => sameInterface(listed, first));
  return remembered ? [remembered, ...spoken.filter(listed => listed !== remembered)] : spoken;
}

/** Two interfaces are one when their URL, binding, A2A version and tenant are. */
export function sameInterface(a: AgentInterface, b: AgentInterface): boolean {
  return (
    a.url === b.url &&
    a.protocolBinding === b.protocolBinding &&
    a.protocolVersion === b.protocolVersion &&
    a.tenant === b.tenant
  );
}

/** The answer from its first step: that event, then the rest, or the error it ended on. */
async function* fromHead(
  head: IteratorResult<StreamResponse> | {error: unknown},
  rest: AsyncGenerator<StreamResponse>,
): AsyncGenerator<StreamResponse> {
  if ('error' in head) throw head.error;
  if (head.done) return;
  yield head.value;
  yield* rest;
}
