/**
 * The dial (task-20.5 decisions 2 to 5, 8 to 10, 15): the six paths, against the server of
 * `@a2a-js/sdk` 1.3.0 answering both A2A versions and the server of `@a2a-js/sdk` 0.3.14; the
 * walk over the card's spoken interfaces, what never reached means, and what never moves it on.
 */
import {randomUUID} from 'node:crypto';
import {createServer as createTcpServer, type Server as TcpServer, type Socket} from 'node:net';
import {createServer as createHttpServer, type Server as HttpServer} from 'node:http';
import {afterEach, describe, expect, test} from 'vitest';
import {AgentCard, Role, TaskState, type AgentInterface, type StreamResponse} from '@a2a-js/sdk';
import {readCard} from '@a2uiverse/card';
import {UnauthorizedError} from './answers.js';
import {Dialer, NoInterfaceReachedError, type DialOptions} from './dial.js';
import {
  cardFor,
  completingScript,
  failedScript,
  startFakeAgent,
  type FakeAgent,
  type FakeBinding,
} from './testing/fakeAgent.js';
import {
  cardForV1,
  completingScriptV1,
  echoScriptV1,
  startFakeAgentV1,
  textPartV1,
  type FakeA2aVersion,
  type FakePath,
  type ScriptV1,
} from './testing/fakeAgentV1.js';

const BINDINGS: FakeBinding[] = ['JSONRPC', 'HTTP+JSON', 'GRPC'];
const VERSIONS: FakeA2aVersion[] = ['1.0', '0.3'];
const SIX: FakePath[] = BINDINGS.flatMap(binding => VERSIONS.map(version => ({binding, version})));
const name = ({binding, version}: FakePath) => `${binding} at A2A ${version}`;

const open: {close(): Promise<void>}[] = [];
afterEach(async () => {
  await Promise.all(open.splice(0).map(server => server.close()));
});

async function v1(paths: FakePath[], script: ScriptV1 = completingScriptV1([textPartV1('hi')])) {
  const agent = await startFakeAgentV1({script, card: urls => cardForV1(urls, {paths})});
  open.push(agent);
  return agent;
}

async function v03(transports: FakeBinding[], options: {admit?: () => boolean} = {}) {
  const agent: FakeAgent = await startFakeAgent({
    script: completingScript([{kind: 'text', text: 'hi'}]),
    card: (_url, urls) =>
      cardFor(urls.JSONRPC, {
        transports: transports.map(transport => ({transport, url: urls[transport]})),
      }),
    ...options,
  });
  open.push(agent);
  return agent;
}

/** A port nothing listens on. */
async function closedPort(): Promise<number> {
  const server = createTcpServer();
  await new Promise<void>(resolve => server.listen(0, '127.0.0.1', resolve));
  const {port} = server.address() as {port: number};
  await new Promise<void>(resolve => server.close(() => resolve()));
  return port;
}

/** A TCP server that takes connections and never answers: a TLS handshake there never ends. */
async function silentServer(): Promise<number> {
  const sockets = new Set<Socket>();
  const server: TcpServer = createTcpServer(socket => {
    sockets.add(socket);
    socket.on('error', () => {});
  });
  await new Promise<void>(resolve => server.listen(0, '127.0.0.1', resolve));
  open.push({
    close: () =>
      new Promise<void>(resolve => {
        for (const socket of sockets) socket.destroy();
        server.close(() => resolve());
      }),
  });
  return (server.address() as {port: number}).port;
}

/** An HTTP server answering every request with `status` and `body`. */
async function answering(status: number, body: string): Promise<string> {
  const server: HttpServer = createHttpServer((_req, res) => {
    res.writeHead(status, {'content-type': 'text/html'});
    res.end(body);
  });
  await new Promise<void>(resolve => server.listen(0, '127.0.0.1', resolve));
  open.push({
    close: () =>
      new Promise<void>(resolve => {
        server.closeAllConnections();
        server.close(() => resolve());
      }),
  });
  return `http://127.0.0.1:${(server.address() as {port: number}).port}/`;
}

const listing = (card: AgentCard, ...supportedInterfaces: AgentInterface[]): AgentCard => ({
  ...card,
  supportedInterfaces,
});
const at = (binding: string, version: string, url: string): AgentInterface => ({
  url,
  protocolBinding: binding,
  protocolVersion: version,
  tenant: '',
});

const request = (): DialOptions['params'] => ({
  tenant: '',
  message: {
    messageId: randomUUID(),
    contextId: '',
    taskId: '',
    role: Role.ROLE_USER,
    parts: [
      {
        content: {$case: 'text', value: 'hello'},
        metadata: {mimeType: 'text/plain'},
        filename: '',
        mediaType: '',
      },
    ],
    metadata: undefined,
    extensions: [],
    referenceTaskIds: [],
  },
  configuration: undefined,
  metadata: undefined,
});

const dialer = (connectTimeoutMs = 2000) => new Dialer({connectTimeoutMs});

async function drain(events: AsyncGenerator<StreamResponse>): Promise<StreamResponse[]> {
  const out: StreamResponse[] = [];
  for await (const event of events) out.push(event);
  return out;
}

const lastState = (events: StreamResponse[]) => {
  const last = events.at(-1)?.payload;
  return last?.$case === 'statusUpdate' || last?.$case === 'task'
    ? last.value.status?.state
    : undefined;
};

describe('the six paths', () => {
  test.each(SIX)(
    '$binding at A2A $version reaches the agent and brings its answer back',
    async path => {
      const agent = await v1([path]);
      const card = readCard(agent.served);
      const dialed = await dialer().dial({card, params: request()});
      expect(dialed.taken).toEqual(card.supportedInterfaces[0]);
      expect(dialed.notReached).toEqual([]);
      expect(lastState(await drain(dialed.events))).toBe(TaskState.TASK_STATE_COMPLETED);
      expect(agent.requests.map(r => [r.binding, r.reached])).toEqual([
        [path.binding, path.version],
      ]);
    },
  );

  test.each(SIX)('$binding at A2A $version carries the credential', async path => {
    const agent = await v1([path]);
    const dialed = await dialer().dial({
      card: readCard(agent.served),
      params: request(),
      credential: {Authorization: 'Bearer tok', 'X-Api-Key': 'k-1'},
    });
    await drain(dialed.events);
    const [received] = agent.requests;
    expect(received!.headers.authorization).toBe('Bearer tok');
    expect(received!.headers['x-api-key']).toBe('k-1');
  });

  test.each(BINDINGS)('%s reaches an agent on the A2A 0.3 SDK', async binding => {
    const agent = await v03([binding]);
    const dialed = await dialer().dial({card: readCard(agent.card), params: request()});
    expect(dialed.taken.protocolBinding).toBe(binding);
    await drain(dialed.events);
    expect(agent.requests.map(r => r.binding)).toEqual([binding]);
    expect(agent.requests[0]!.message.parts).toMatchObject([{kind: 'text', text: 'hello'}]);
  });

  test('a part’s metadata reaches an agent on A2A 1.0 on every binding, and on A2A 0.3 over JSON-RPC alone (task-20.5 decision 13)', async () => {
    const reached: Record<string, unknown> = {};
    for (const path of SIX) {
      const agent = await v1([path], echoScriptV1);
      const dialed = await dialer().dial({card: readCard(agent.served), params: request()});
      const events = await drain(dialed.events);
      const last = events.at(-1)?.payload;
      const echoed =
        last?.$case === 'statusUpdate' ? last.value.status?.message?.parts[0]?.metadata : undefined;
      reached[name(path)] = echoed ?? null;
    }
    expect(reached).toEqual({
      'JSONRPC at A2A 1.0': {mimeType: 'text/plain'},
      'JSONRPC at A2A 0.3': {mimeType: 'text/plain'},
      'HTTP+JSON at A2A 1.0': {mimeType: 'text/plain'},
      'HTTP+JSON at A2A 0.3': null,
      'GRPC at A2A 1.0': {mimeType: 'text/plain'},
      'GRPC at A2A 0.3': null,
    });
  });
});

describe('the walk', () => {
  test('takes the first spoken interface in the card’s order', async () => {
    const agent = await v1([
      {binding: 'GRPC', version: '0.3'},
      {binding: 'JSONRPC', version: '1.0'},
    ]);
    const dialed = await dialer().dial({card: readCard(agent.served), params: request()});
    expect(dialed.taken.protocolBinding).toBe('GRPC');
    await drain(dialed.events);
    expect(agent.requests.map(r => [r.binding, r.reached])).toEqual([['GRPC', '0.3']]);
  });

  test('moves on from an interface no connection could be opened to, and says so', async () => {
    const agent = await v1([{binding: 'JSONRPC', version: '0.3'}]);
    const card = readCard(agent.served);
    const unopened = at('GRPC', '1.0', `127.0.0.1:${await closedPort()}`);
    const dialed = await dialer().dial({
      card: listing(card, unopened, ...card.supportedInterfaces),
      params: request(),
    });
    expect(dialed.taken).toEqual(card.supportedInterfaces[0]);
    expect(dialed.notReached).toEqual([{interface: unopened, why: 'connection'}]);
    await drain(dialed.events);
    expect(agent.requests).toHaveLength(1);
  });

  test.each([
    ['a name that does not resolve', 'http://agent.invalid/'],
    ['a refused connection', 'REFUSED'],
  ])('%s is no connection opened', async (_name, url) => {
    const agent = await v1([{binding: 'JSONRPC', version: '1.0'}]);
    const card = readCard(agent.served);
    const unopened = at(
      'HTTP+JSON',
      '1.0',
      url === 'REFUSED' ? `http://127.0.0.1:${await closedPort()}/` : url,
    );
    const dialed = await dialer().dial({
      card: listing(card, unopened, ...card.supportedInterfaces),
      params: request(),
    });
    expect(dialed.notReached).toEqual([{interface: unopened, why: 'connection'}]);
    await drain(dialed.events);
  });

  test('a TLS handshake that fails is no connection opened', async () => {
    const agent = await v1([{binding: 'JSONRPC', version: '1.0'}]);
    const card = readCard(agent.served);
    // https:// to a server speaking plain HTTP: the handshake fails.
    const plain = new URL(agent.url);
    const unopened = at('JSONRPC', '0.3', `https://127.0.0.1:${plain.port}/a2a/v0_3`);
    const dialed = await dialer().dial({
      card: listing(card, unopened, ...card.supportedInterfaces),
      params: request(),
    });
    expect(dialed.notReached).toEqual([{interface: unopened, why: 'connection'}]);
    await drain(dialed.events);
  });

  test('a connection not opened within the time limit is no connection opened', async () => {
    const agent = await v1([{binding: 'JSONRPC', version: '1.0'}]);
    const card = readCard(agent.served);
    // A bare host:port off the local machine dials with TLS: the silent server never answers it.
    const stalled = at('GRPC', '1.0', `https://127.0.0.1:${await silentServer()}`);
    const started = Date.now();
    const dialed = await dialer(300).dial({
      card: listing(card, stalled, ...card.supportedInterfaces),
      params: request(),
    });
    expect(Date.now() - started).toBeGreaterThanOrEqual(290);
    expect(Date.now() - started).toBeLessThan(2000);
    expect(dialed.notReached).toEqual([{interface: stalled, why: 'connection'}]);
    await drain(dialed.events);
  });

  test.each([
    ['an HTTP 404 carrying no A2A error, on JSON-RPC', 'JSONRPC', 404],
    ['an HTTP 405 carrying no A2A error, on HTTP+JSON', 'HTTP+JSON', 405],
  ])('moves on from %s: what answered there does not serve it', async (_name, binding, status) => {
    const agent = await v1([{binding: 'JSONRPC', version: '1.0'}]);
    const card = readCard(agent.served);
    const absent = at(binding, '1.0', await answering(status, '<html>Not here</html>'));
    const dialed = await dialer().dial({
      card: listing(card, absent, ...card.supportedInterfaces),
      params: request(),
    });
    expect(dialed.notReached).toEqual([{interface: absent, why: 'unserved'}]);
    expect(lastState(await drain(dialed.events))).toBe(TaskState.TASK_STATE_COMPLETED);
  });

  test.each(BINDINGS)(
    'moves on from an A2A version the agent does not serve on %s: VersionNotSupportedError',
    async binding => {
      // The agent runs on a card listing the binding at A2A 1.0 alone, and its card URL lists
      // the binding at 0.3 first: its server answers that version is not supported.
      const agent = await startFakeAgentV1({
        script: completingScriptV1([textPartV1('hi')]),
        card: urls =>
          cardForV1(urls, {
            paths: [
              {binding, version: '1.0'},
              {binding: 'JSONRPC', version: '1.0'},
            ],
          }),
        serve: card => {
          const json = AgentCard.toJSON(card) as {supportedInterfaces: object[]};
          const [listed] = card.supportedInterfaces;
          return {
            ...json,
            supportedInterfaces: [
              {...AgentInterfaceJson(listed!), protocolVersion: '0.3'},
              ...json.supportedInterfaces.slice(1),
            ],
          };
        },
      });
      open.push(agent);
      const card = readCard(agent.served);
      const dialed = await dialer().dial({card, params: request()});
      expect(dialed.notReached.map(entry => [entry.interface.protocolBinding, entry.why])).toEqual([
        [binding, 'unserved'],
      ]);
      expect(dialed.taken.protocolBinding).toBe('JSONRPC');
      await drain(dialed.events);
    },
  );

  test('walks a card written for A2A 0.3 from its own URL to a further interface, each at the version the card spells', async () => {
    const legacy = await v03(['JSONRPC']);
    const card = readCard({
      ...legacy.card,
      url: `127.0.0.1:${await closedPort()}`,
      preferredTransport: 'GRPC',
      additionalInterfaces: [{url: legacy.urls.JSONRPC, transport: 'JSONRPC'}],
    });
    const dialed = await dialer().dial({card, params: request()});
    expect(
      dialed.notReached.map(({interface: passed, why}) => [
        passed.protocolBinding,
        passed.protocolVersion,
        why,
      ]),
    ).toEqual([['GRPC', '0.3.0', 'connection']]);
    expect([dialed.taken.protocolBinding, dialed.taken.protocolVersion]).toEqual([
      'JSONRPC',
      '0.3.0',
    ]);
    await drain(dialed.events);
    expect(legacy.requests.map(r => r.binding)).toEqual(['JSONRPC']);
  });

  test('moves on from a gRPC service that is not there: UNIMPLEMENTED', async () => {
    // The A2A 0.3 SDK's server serves A2A 0.3's gRPC service alone.
    const legacy = await v03(['GRPC', 'JSONRPC']);
    const card = readCard(legacy.card);
    const grpcAt10 = at('GRPC', '1.0', legacy.urls.GRPC);
    const dialed = await dialer().dial({
      card: listing(card, grpcAt10, ...card.supportedInterfaces),
      params: request(),
    });
    expect(dialed.notReached).toEqual([{interface: grpcAt10, why: 'unserved'}]);
    expect(dialed.taken.protocolBinding).toBe('GRPC');
    await drain(dialed.events);
    expect(legacy.requests.map(r => r.binding)).toEqual(['GRPC']);
  });

  test('moves on from a JSON-RPC server that has no handler for the version: -32601, "Method not found"', async () => {
    // The A2A 0.3 SDK's server knows A2A 0.3's method names alone.
    const legacy = await v03(['JSONRPC']);
    const card = readCard(legacy.card);
    const jsonrpcAt10 = at('JSONRPC', '1.0', legacy.urls.JSONRPC);
    const dialed = await dialer().dial({
      card: listing(card, jsonrpcAt10, ...card.supportedInterfaces),
      params: request(),
    });
    expect(dialed.notReached).toEqual([{interface: jsonrpcAt10, why: 'unserved'}]);
    expect(dialed.taken).toEqual(card.supportedInterfaces[0]);
    await drain(dialed.events);
    expect(legacy.requests).toHaveLength(1);
  });

  test('passes over a gRPC interface that cannot carry the credential’s header', async () => {
    const agent = await v1([
      {binding: 'GRPC', version: '1.0'},
      {binding: 'HTTP+JSON', version: '1.0'},
    ]);
    const card = readCard(agent.served);
    const dialed = await dialer().dial({card, params: request(), credential: {'X-Api~Key': 'k-1'}});
    expect(dialed.notReached).toEqual([
      {interface: card.supportedInterfaces[0], why: 'credential', header: 'X-Api~Key'},
    ]);
    await drain(dialed.events);
    expect(agent.requests.map(r => [r.binding, r.headers['x-api~key']])).toEqual([
      ['HTTP+JSON', 'k-1'],
    ]);
  });

  test.each([['grpc-key'], ['key-bin'], ['X-Api+Key']])(
    'a header named %s cannot ride on gRPC',
    async header => {
      const agent = await v1([
        {binding: 'GRPC', version: '0.3'},
        {binding: 'JSONRPC', version: '0.3'},
      ]);
      const dialed = await dialer().dial({
        card: readCard(agent.served),
        params: request(),
        credential: {[header]: 'k-1'},
      });
      expect(dialed.notReached.map(entry => entry.why)).toEqual(['credential']);
      await drain(dialed.events);
    },
  );

  test('starts at the interface remembered, the rest in the card’s order after it', async () => {
    const agent = await v1([
      {binding: 'JSONRPC', version: '1.0'},
      {binding: 'GRPC', version: '1.0'},
    ]);
    const card = readCard(agent.served);
    const dialed = await dialer().dial({
      card,
      first: card.supportedInterfaces[1],
      params: request(),
    });
    expect(dialed.taken).toEqual(card.supportedInterfaces[1]);
    await drain(dialed.events);
    expect(agent.requests.map(r => r.binding)).toEqual(['GRPC']);
  });

  test('starts over from the card’s first when the interface remembered is not reached', async () => {
    const agent = await v1([{binding: 'HTTP+JSON', version: '0.3'}]);
    const card = readCard(agent.served);
    const gone = at('GRPC', '1.0', `127.0.0.1:${await closedPort()}`);
    const dialed = await dialer().dial({
      card: listing(card, ...card.supportedInterfaces, gone),
      first: gone,
      params: request(),
    });
    expect(dialed.notReached).toEqual([{interface: gone, why: 'connection'}]);
    expect(dialed.taken).toEqual(card.supportedInterfaces[0]);
    await drain(dialed.events);
  });

  test('an interface remembered that the card no longer lists is not tried', async () => {
    const agent = await v1([{binding: 'JSONRPC', version: '1.0'}]);
    const card = readCard(agent.served);
    const dialed = await dialer().dial({
      card,
      first: at('GRPC', '1.0', `127.0.0.1:${await closedPort()}`),
      params: request(),
    });
    expect(dialed.notReached).toEqual([]);
    await drain(dialed.events);
  });

  test('reaching none rejects with each interface tried, in the order tried', async () => {
    const agent = await v1([{binding: 'JSONRPC', version: '1.0'}]);
    const card = readCard(agent.served);
    const unopened = at('GRPC', '1.0', `127.0.0.1:${await closedPort()}`);
    const absent = at('JSONRPC', '0.3', await answering(404, ''));
    const failure = await dialer()
      .dial({card: listing(card, unopened, absent), params: request()})
      .catch((err: unknown) => err);
    expect(failure).toBeInstanceOf(NoInterfaceReachedError);
    expect((failure as NoInterfaceReachedError).notReached).toEqual([
      {interface: unopened, why: 'connection'},
      {interface: absent, why: 'unserved'},
    ]);
    expect(agent.requests).toHaveLength(0);
  });
});

describe('what never moves the walk on: a request is never delivered twice', () => {
  /** A card listing `first` ahead of an agent that would answer, which must hear nothing. */
  async function behind(first: AgentInterface) {
    const second = await v1([{binding: 'JSONRPC', version: '1.0'}]);
    const card = readCard(second.served);
    return {card: listing(card, first, ...card.supportedInterfaces), second};
  }

  test.each(BINDINGS)('a refusal for sign-in on %s', async binding => {
    const refusing = await startFakeAgentV1({
      script: completingScriptV1([textPartV1('hi')]),
      card: urls => cardForV1(urls, {paths: [{binding, version: '1.0'}]}),
      admit: () => false,
    });
    open.push(refusing);
    const {card, second} = await behind(readCard(refusing.served).supportedInterfaces[0]!);
    const dialed = await dialer().dial({card, params: request()});
    expect(dialed.taken.protocolBinding).toBe(binding);
    await expect(drain(dialed.events)).rejects.toBeInstanceOf(UnauthorizedError);
    expect(second.requests).toHaveLength(0);
  });

  test.each(BINDINGS)(
    'a refusal for sign-in from the A2A 0.3 SDK’s server on %s',
    async binding => {
      const refusing = await v03([binding], {admit: () => false});
      const {card, second} = await behind(readCard(refusing.card).supportedInterfaces[0]!);
      const dialed = await dialer().dial({card, params: request()});
      await expect(drain(dialed.events)).rejects.toBeInstanceOf(UnauthorizedError);
      expect(second.requests).toHaveLength(0);
    },
  );

  test('a failed task', async () => {
    const failing = await startFakeAgent({
      script: failedScript,
      card: (_url, urls) =>
        cardFor(urls.JSONRPC, {transports: [{transport: 'GRPC', url: urls.GRPC}]}),
    });
    open.push(failing);
    const {card, second} = await behind(readCard(failing.card).supportedInterfaces[0]!);
    const dialed = await dialer().dial({card, params: request()});
    expect(lastState(await drain(dialed.events))).toBe(TaskState.TASK_STATE_FAILED);
    expect(second.requests).toHaveLength(0);
  });

  test('an HTTP 503', async () => {
    const {card, second} = await behind(at('JSONRPC', '1.0', await answering(503, 'busy')));
    const dialed = await dialer().dial({card, params: request()});
    await expect(drain(dialed.events)).rejects.toThrow(/503/);
    expect(second.requests).toHaveLength(0);
  });

  test('an HTTP 404 carrying an A2A error', async () => {
    const body = JSON.stringify({
      jsonrpc: '2.0',
      id: 1,
      error: {code: -32001, message: 'Task not found'},
    });
    const {card, second} = await behind(at('JSONRPC', '1.0', await answering(404, body)));
    const dialed = await dialer().dial({card, params: request()});
    await expect(drain(dialed.events)).rejects.toThrow(/Task not found/);
    expect(second.requests).toHaveLength(0);
  });

  test('a timeout', async () => {
    const hanging = await v1([{binding: 'GRPC', version: '1.0'}], () => ({
      [Symbol.asyncIterator]: () => ({next: () => new Promise(() => {})}),
    }));
    const {card, second} = await behind(readCard(hanging.served).supportedInterfaces[0]!);
    const dialed = await dialer().dial({card, params: request(), signal: AbortSignal.timeout(300)});
    await expect(drain(dialed.events)).rejects.toThrow();
    expect(second.requests).toHaveLength(0);
  });
});

describe('Dialer.send', () => {
  test('sends again to the interface taken, with no walk', async () => {
    const agent = await v1([{binding: 'GRPC', version: '1.0'}]);
    const card = readCard(agent.served);
    const d = dialer();
    const dialed = await d.dial({card, params: request()});
    await drain(dialed.events);
    await drain(
      d.send(card, dialed.taken, {params: request(), credential: {Authorization: 'Bearer again'}}),
    );
    expect(agent.requests.map(r => [r.binding, r.headers.authorization])).toEqual([
      ['GRPC', undefined],
      ['GRPC', 'Bearer again'],
    ]);
  });
});

function AgentInterfaceJson(listed: AgentInterface): Record<string, string> {
  return {
    url: listed.url,
    protocolBinding: listed.protocolBinding,
    protocolVersion: listed.protocolVersion,
  };
}
