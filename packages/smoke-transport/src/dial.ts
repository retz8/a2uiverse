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
  type AgentCardResolver,
  type Client,
} from '@a2a-js/sdk/client';
import {GrpcTransportFactory} from '@a2a-js/sdk/client/grpc';
import {cardToDial, spokenInterfaces} from '@a2uiverse/card';
import {addressOf, isGrpc, type InterfaceAddress} from './address.js';
import {answeringFetch, NotServedError, readAnswerError} from './answers.js';
import {credentialOn} from './credentialOnBinding.js';
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
      const fetchImpl = answeringFetch(this.#options.fetchImpl ?? fetch);
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
