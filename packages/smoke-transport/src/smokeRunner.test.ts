/**
 * The smoke request's transport against an A2A 0.3 agent, the server of `@a2a-js/sdk` 0.3.14
 * (task-20.2 decisions 1, 6, 11), and against an A2A 1.0 agent, the server of `@a2a-js/sdk` 1.x
 * (task-20.3 decisions 11, 20): one A2A message to the interface taken, what came back. The A2UI
 * an answer carries is read by content, in each spelling, from each (task-20.4 decision 15).
 */
import {randomUUID} from 'node:crypto';
import {createServer, type Server} from 'node:http';
import {afterEach, describe, expect, test, vi} from 'vitest';
import {noInterfaceFinding, readCard, spokenInterfaces} from '@a2uiverse/card';
import {A2UI_CLIENT_CAPABILITIES_KEY, clientCapabilities, readAuthRequired} from '@a2uiverse/sdk';
import {
  a2aSmokeRunner,
  SMOKE_CONNECT_TIMEOUT_MS,
  type SmokeObservation,
  type SmokeRunner,
} from './smokeRunner.js';
import {
  artifactUpdate,
  authRequiredBody,
  authRequiredScript,
  cardFor,
  completingScript,
  failedScript,
  finalUpdate,
  firstTurnTask,
  hangingScript,
  paintParts,
  startFakeAgent,
  statusUpdate,
  submittedOnlyScript,
  unmarkedScript,
  type AgentCard,
  type FakeAgent,
  type Script,
} from './testing/fakeAgent.js';
import {
  artifactUpdateV1,
  authRequiredScriptV1,
  cardForV1,
  completingScriptV1,
  dataPartV1,
  firstTurnTaskV1,
  paintPartsV1,
  startFakeAgentV1,
  statusUpdateV1,
  type FakeA2aVersion,
  type FakeAgentV1,
  type FakePath,
  type PartMarksV1,
  type ScriptV1,
} from './testing/fakeAgentV1.js';
import {TaskState} from '@a2a-js/sdk';

const CATALOG_ID = 'https://example.com/fake/catalog.json';
const ENTITLEMENT = ['https://a2ui.org/specification/v0_9/catalogs/basic/catalog.json', CATALOG_ID];
const PAINT = paintParts(CATALOG_ID);
const OPERATIONS = ['createSurface', 'updateComponents'];

let agent: FakeAgent | undefined;
let agentV1: FakeAgentV1 | undefined;
let server: Server | undefined;
afterEach(async () => {
  await agent?.close();
  agent = undefined;
  await agentV1?.close();
  agentV1 = undefined;
  await new Promise<void>(resolve => (server ? server.close(() => resolve()) : resolve()));
  server = undefined;
});

/** A fake agent on `script`, its card carrying `card` beyond the defaults. */
async function start(script: Script = completingScript(PAINT), card: Partial<AgentCard> = {}) {
  agent = await startFakeAgent({
    script,
    card: url => cardFor(url, {catalogs: [CATALOG_ID], card}),
  });
  return agent;
}

/** The card as the marketplace and Stellify hand it to the runner: served by its agent, then read. */
const served = (card: AgentCard) => readCard(card);

/**
 * The runner, each observation of a request sent to the card's first spoken interface with no
 * interface passed over, as tests before the walk read it: `taken` checked and set aside.
 */
type Observed = SmokeObservation extends infer T
  ? T extends {taken: unknown}
    ? Omit<T, 'taken' | 'notReached'>
    : T
  : never;
const firstTaken =
  (runner: SmokeRunner) =>
  async (request: Parameters<SmokeRunner>[0]): Promise<Observed> => {
    const seen: SmokeObservation = await runner(request);
    if (!('taken' in seen)) return seen;
    const {taken, notReached, ...observed} = seen;
    expect(taken).toEqual(spokenInterfaces(request.card)[0]);
    expect(notReached).toEqual([]);
    return observed;
  };
const run = firstTaken(a2aSmokeRunner());
const smoke = (
  card: AgentCard,
  extra: {timeoutMs?: number; headers?: Record<string, string>} = {},
) => run({card: served(card), entitlement: ENTITLEMENT, words: 'x', timeoutMs: 5000, ...extra});

const operationsOf = (messages: Record<string, unknown>[]) =>
  messages.map(m => Object.keys(m).find(k => k !== 'version'));

/** A request for the scheme `signIn` and its scope `read`, as read from either shape. */
const SIGN_IN_READ = {securityRequirements: [{schemes: {signIn: {list: ['read']}}}]};

/** The two A2UI messages of one paint, as `data` carries them. */
const CREATE = {version: 'v0.9', createSurface: {surfaceId: 's1', catalogId: CATALOG_ID}};
const UPDATE = {
  version: 'v0.9',
  updateComponents: {surfaceId: 's1', components: [{id: 'root', component: 'Text', text: 'hi'}]},
};

describe('a2aSmokeRunner, the request', () => {
  test('one message in the words given, the entitlement as its client capabilities, the A2UI extensions asked for', async () => {
    const {card, requests} = await start();
    const seen = await run({
      card: served(card),
      entitlement: ENTITLEMENT,
      words: 'Hello!',
      timeoutMs: 5000,
    });
    expect(seen.kind).toBe('ended');
    expect(requests).toHaveLength(1);
    const [request] = requests;
    expect(request.message.parts).toEqual([{kind: 'text', text: 'Hello!'}]);
    expect(request.message.metadata?.[A2UI_CLIENT_CAPABILITIES_KEY]).toEqual(
      clientCapabilities(ENTITLEMENT),
    );
    expect(request.extensionsHeader).toContain('https://a2ui.org/a2a-extension/a2ui/v0.9.1');
    expect(request.headers.authorization).toBeUndefined();
  });

  test('a map by version is advertised key by key, each version its own set (task-19.2 decision 6)', async () => {
    const {card, requests} = await start();
    const byVersion = {'v0.9': [ENTITLEMENT[0]], 'v0.9.1': ENTITLEMENT};
    const seen = await run({
      card: served(card),
      entitlement: byVersion,
      words: 'x',
      timeoutMs: 5000,
    });
    expect(seen.kind).toBe('ended');
    expect(requests[0].message.metadata?.[A2UI_CLIENT_CAPABILITIES_KEY]).toEqual(
      clientCapabilities(byVersion),
    );
  });

  test('the credential rides as the headers given, on the request to the agent', async () => {
    const {card, requests} = await start();
    await smoke(card, {headers: {'X-Star-Key': 'secret-key', Authorization: 'Bearer tok'}});
    const [request] = requests;
    expect(request.headers['x-star-key']).toBe('secret-key');
    expect(request.headers.authorization).toBe('Bearer tok');
  });
});

describe('a2aSmokeRunner, an answer that ended', () => {
  test('an agent that paints and completes: the end state and every A2UI message', async () => {
    const {card} = await start();
    const seen = await smoke(card);
    expect(seen.kind).toBe('ended');
    if (seen.kind !== 'ended') return;
    expect(seen.state).toBe('completed');
    expect(operationsOf(seen.messages)).toEqual(OPERATIONS);
  });

  test('a bare message ends the answer as completed, with what it carried', async () => {
    const {card} = await start(() => [
      {kind: 'message', messageId: randomUUID(), role: 'agent', parts: PAINT},
    ]);
    const seen = await smoke(card);
    expect(seen.kind).toBe('ended');
    if (seen.kind !== 'ended') return;
    expect(seen.state).toBe('completed');
    expect(operationsOf(seen.messages)).toEqual(OPERATIONS);
  });

  test('an agent that ends the task as auth-required: the state and the request it carries', async () => {
    const {card} = await start(authRequiredScript('signIn', ['read']));
    const seen = await smoke(card);
    expect(seen.kind).toBe('ended');
    if (seen.kind !== 'ended') return;
    expect(seen.state).toBe('auth-required');
    expect(readAuthRequired(seen.data)).toEqual(SIGN_IN_READ);
    expect(seen.text).toBe('Please sign in.');
  });

  test("an auth-required request in A2A 1.0's requirement shape, from an agent on A2A 0.3", async () => {
    const {card} = await start(authRequiredScript('signIn', ['read'], '1.0'));
    const seen = await smoke(card);
    expect(seen.kind).toBe('ended');
    if (seen.kind !== 'ended') return;
    expect(seen.state).toBe('auth-required');
    expect(seen.data).toEqual({securityRequirements: [{schemes: {signIn: {list: ['read']}}}]});
    expect(readAuthRequired(seen.data)).toEqual(SIGN_IN_READ);
  });

  test('a stream closing on auth-required set by an update not marked final has ended asking to sign in (task-20.2 decision 6)', async () => {
    const {card} = await start(({ctx}) => [
      firstTurnTask(ctx),
      statusUpdate(
        ctx,
        'auth-required',
        [{kind: 'data', data: authRequiredBody('0.3', 'signIn', ['read'])}],
        false,
      ),
    ]);
    const seen = await smoke(card);
    expect(seen.kind).toBe('ended');
    if (seen.kind !== 'ended') return;
    expect(seen.state).toBe('auth-required');
    expect(readAuthRequired(seen.data)).toEqual(SIGN_IN_READ);
  });

  test('an agent that ends the task as failed, in its words', async () => {
    const {card} = await start(failedScript);
    expect(await smoke(card)).toEqual({
      kind: 'ended',
      state: 'failed',
      messages: [],
      text: 'boom',
    });
  });

  test('a stream closing on input-required, not marked final: ended there, with its paint', async () => {
    const {card} = await start(unmarkedScript(['input-required'], PAINT));
    const seen = await smoke(card);
    expect(seen.kind).toBe('ended');
    if (seen.kind !== 'ended') return;
    expect(seen.state).toBe('input-required');
    expect(operationsOf(seen.messages)).toEqual(OPERATIONS);
  });
});

describe('a2aSmokeRunner, an answer that never finished', () => {
  test('a status update marked final while its task is still working does not end the answer (task-20.2 decision 6)', async () => {
    const {card} = await start(({ctx}) => [firstTurnTask(ctx), finalUpdate(ctx, 'working', PAINT)]);
    const seen = await smoke(card);
    expect(seen.kind).toBe('unfinished');
    if (seen.kind !== 'unfinished') return;
    expect(seen.state).toBe('working');
    expect(operationsOf(seen.messages)).toEqual(OPERATIONS);
  });

  test('a stream that closes on a task still submitted names that state', async () => {
    const {card} = await start(submittedOnlyScript);
    expect(await smoke(card)).toEqual({kind: 'unfinished', state: 'submitted', messages: []});
  });

  test('input-required followed by more work before the close names the last state', async () => {
    const {card} = await start(unmarkedScript(['input-required', 'working'], PAINT));
    const seen = await smoke(card);
    expect(seen.kind).toBe('unfinished');
    if (seen.kind !== 'unfinished') return;
    expect(seen.state).toBe('working');
  });

  test("a state with no name in A2A 1.0 is spelled as A2A 0.3 spells it, 'unknown'", async () => {
    const {card} = await start(({ctx}) => [
      firstTurnTask(ctx),
      statusUpdate(ctx, 'unknown', [], false),
    ]);
    expect(await smoke(card)).toEqual({kind: 'unfinished', state: 'unknown', messages: []});
  });

  test('a stream that carried nothing names no state', async () => {
    server = createServer((_req, res) => {
      res.writeHead(200, {'content-type': 'text/event-stream'});
      res.end();
    });
    await new Promise<void>(resolve => server!.listen(0, '127.0.0.1', resolve));
    const address = server.address();
    if (!address || typeof address === 'string') throw new Error('no port');
    const card = cardFor(`http://127.0.0.1:${address.port}`, {catalogs: [CATALOG_ID]});
    expect(await smoke(card)).toEqual({kind: 'unfinished', messages: []});
  });
});

describe('a2aSmokeRunner, a request that could not be made', () => {
  test('an agent that answers 401', async () => {
    agent = await startFakeAgent({
      script: completingScript(PAINT),
      card: url => cardFor(url, {catalogs: [CATALOG_ID]}),
      admit: () => false,
    });
    expect(await smoke(agent.card)).toEqual({kind: 'unauthorized'});
  });

  test('an agent that never answers: an error naming the timeout', async () => {
    const {card} = await start(hangingScript);
    expect(await smoke(card, {timeoutMs: 300})).toEqual({
      kind: 'error',
      message: 'the agent did not answer within 0.3 s',
    });
  });

  test('an agent that cannot be reached: no interface reached, each one tried', async () => {
    const card = served(cardFor('http://127.0.0.1:1', {catalogs: [CATALOG_ID]}));
    expect(await run({card, entitlement: ENTITLEMENT, words: 'x', timeoutMs: 5000})).toEqual({
      kind: 'unreached',
      notReached: [{interface: card.supportedInterfaces[0], why: 'connection'}],
    });
  });

  test('a card listing no interface the platform speaks: an error saying so, nothing sent', async () => {
    const {card, requests} = await start();
    const read = {
      ...served(card),
      supportedInterfaces: [
        {url: card.url, protocolBinding: 'ACME-RPC', protocolVersion: '1.0', tenant: ''},
      ],
    };
    const seen = await run({card: read, entitlement: ENTITLEMENT, words: 'x', timeoutMs: 5000});
    expect(seen).toEqual({kind: 'error', message: noInterfaceFinding(read)});
    expect(requests).toHaveLength(0);
  });
});

describe('a2aSmokeRunner, an agent on A2A 1.0', () => {
  /** A fake A2A 1.0 agent listing JSON-RPC at the A2A versions of `order`, painting in `CATALOG_ID`. */
  async function startV1(order: FakeA2aVersion[]) {
    agentV1 = await startFakeAgentV1({
      script: completingScriptV1(paintPartsV1(CATALOG_ID)),
      card: interfaces => cardForV1(interfaces, {catalogs: [CATALOG_ID], order}),
    });
    return agentV1;
  }
  const smokeV1 = (fake: FakeAgentV1) =>
    run({
      card: readCard(fake.served),
      entitlement: ENTITLEMENT,
      words: 'Hello!',
      timeoutMs: 5000,
    });

  test('the request reaches the A2A 1.0 interface and brings its paint back', async () => {
    const fake = await startV1(['1.0']);
    const seen = await smokeV1(fake);
    expect(seen.kind).toBe('ended');
    if (seen.kind !== 'ended') return;
    expect(seen.state).toBe('completed');
    expect(operationsOf(seen.messages)).toEqual(OPERATIONS);
    expect(fake.requests.map(r => [r.reached, r.a2aVersion, r.method])).toEqual([
      ['1.0', '1.0', 'SendStreamingMessage'],
    ]);
    expect(fake.requests[0]!.message).toMatchObject({
      role: 'ROLE_USER',
      parts: [{text: 'Hello!'}],
      metadata: {[A2UI_CLIENT_CAPABILITIES_KEY]: clientCapabilities(ENTITLEMENT)},
    });
    expect(fake.requests[0]!.headers['a2a-extensions']).toContain('a2ui');
  });

  test('A2A 1.0 listed first is the interface reached', async () => {
    const fake = await startV1(['1.0', '0.3']);
    const seen = await smokeV1(fake);
    expect(seen.kind).toBe('ended');
    expect(fake.requests.map(r => [r.reached, r.a2aVersion, r.method])).toEqual([
      ['1.0', '1.0', 'SendStreamingMessage'],
    ]);
  });

  test('A2A 0.3 listed first is the interface reached, where the A2A SDK alone takes 1.0', async () => {
    const fake = await startV1(['0.3', '1.0']);
    const seen = await smokeV1(fake);
    expect(seen.kind).toBe('ended');
    if (seen.kind !== 'ended') return;
    expect(operationsOf(seen.messages)).toEqual(OPERATIONS);
    expect(fake.requests.map(r => [r.reached, r.a2aVersion, r.method])).toEqual([
      ['0.3', '0.3', 'message/stream'],
    ]);
  });

  test('the credential rides as the headers given', async () => {
    const fake = await startV1(['1.0']);
    await run({
      card: readCard(fake.served),
      entitlement: ENTITLEMENT,
      words: 'x',
      timeoutMs: 5000,
      headers: {'X-Api-Key': 'k-1'},
    });
    expect(fake.requests[0]!.headers['x-api-key']).toBe('k-1');
  });
});

describe('a2aSmokeRunner, the A2UI an agent on A2A 0.3 carries (task-20.4 decisions 2 to 4)', () => {
  type Parts03 = Parameters<typeof completingScript>[0];
  const data03 = (data: unknown, metadata?: Record<string, unknown>) =>
    ({kind: 'data', data, ...(metadata ? {metadata} : {})}) as Parts03[number];
  const messagesOf = async (parts: Parts03) => {
    const {card} = await start(completingScript(parts));
    const seen = await smoke(card);
    expect(seen.kind).toBe('ended');
    return seen.kind === 'ended' ? seen.messages : [];
  };

  test.each([['application/a2ui+json'], ['application/json+a2ui'], ['text/plain'], [undefined]])(
    'a part marked %s in metadata.mimeType is read by what it holds',
    async mimeType => {
      const marks = mimeType ? {mimeType} : undefined;
      expect(await messagesOf([data03(CREATE, marks), data03(UPDATE, marks)])).toEqual([
        CREATE,
        UPDATE,
      ]);
    },
  );

  test('a bare list in data is read, each entry on its own', async () => {
    const unspoken = {version: 'v0.8', beginRendering: {surfaceId: 's1'}};
    expect(await messagesOf([data03([CREATE, {note: 'no version'}, unspoken, UPDATE])])).toEqual([
      CREATE,
      unspoken,
      UPDATE,
    ]);
  });

  test('a list the 0.3 layer of an A2A SDK wrapped arrives as a bare list', async () => {
    expect(await messagesOf([data03({value: [CREATE, UPDATE]}, {data_part_compat: true})])).toEqual(
      [CREATE, UPDATE],
    );
  });

  test('an object holding a messages list is not read', async () => {
    expect(await messagesOf([data03({messages: [CREATE, UPDATE]})])).toEqual([]);
  });

  test('A2UI in an artifact is not read', async () => {
    const {card} = await start(({ctx}) => [
      firstTurnTask(ctx),
      artifactUpdate(ctx, [data03(CREATE), data03(UPDATE)]),
      finalUpdate(ctx, 'completed', []),
    ]);
    const seen = await smoke(card);
    expect(seen).toEqual({kind: 'ended', state: 'completed', messages: []});
  });
});

describe('a2aSmokeRunner, the A2UI an agent on A2A 1.0 carries (task-20.4 decisions 2 to 4)', () => {
  async function startScript(script: ScriptV1, order: FakeA2aVersion[] = ['1.0']) {
    agentV1 = await startFakeAgentV1({
      script,
      card: interfaces => cardForV1(interfaces, {catalogs: [CATALOG_ID], order}),
    });
    return agentV1;
  }
  const smokeOf = (fake: FakeAgentV1) =>
    run({card: readCard(fake.served), entitlement: ENTITLEMENT, words: 'x', timeoutMs: 5000});
  const messagesOf = async (parts: ReturnType<typeof dataPartV1>[], order?: FakeA2aVersion[]) => {
    const seen = await smokeOf(await startScript(completingScriptV1(parts), order));
    expect(seen.kind).toBe('ended');
    return seen.kind === 'ended' ? seen.messages : [];
  };

  const MARKS: Array<[string, PartMarksV1]> = [
    ['application/a2ui+json in metadata.mimeType', {metadata: {mimeType: 'application/a2ui+json'}}],
    ['application/json+a2ui in metadata.mimeType', {metadata: {mimeType: 'application/json+a2ui'}}],
    ['application/a2ui+json in mediaType', {mediaType: 'application/a2ui+json'}],
    ['application/json+a2ui in mediaType', {mediaType: 'application/json+a2ui'}],
    [
      'application/a2ui+json in both',
      {metadata: {mimeType: 'application/a2ui+json'}, mediaType: 'application/a2ui+json'},
    ],
    ['text/plain in mediaType', {mediaType: 'text/plain'}],
    ['nothing', {}],
  ];

  test.each(MARKS)('a part marked %s is read by what it holds', async (_name, marks) => {
    expect(await messagesOf([dataPartV1(CREATE, marks), dataPartV1(UPDATE, marks)])).toEqual([
      CREATE,
      UPDATE,
    ]);
  });

  test.each(MARKS)(
    'through the 0.3 layer of its A2A SDK, a part marked %s is read by what it holds',
    async (_name, marks) => {
      expect(
        await messagesOf([dataPartV1(CREATE, marks), dataPartV1(UPDATE, marks)], ['0.3', '1.0']),
      ).toEqual([CREATE, UPDATE]);
    },
  );

  test('a bare list in data is read, each entry on its own', async () => {
    const unspoken = {version: 'v0.8', beginRendering: {surfaceId: 's1'}};
    const list = [CREATE, {note: 'no version'}, unspoken, UPDATE];
    expect(await messagesOf([dataPartV1(list)])).toEqual([CREATE, unspoken, UPDATE]);
  });

  test('a list its 0.3 layer wraps reaches the reading as a bare list', async () => {
    expect(await messagesOf([dataPartV1([CREATE, UPDATE])], ['0.3', '1.0'])).toEqual([
      CREATE,
      UPDATE,
    ]);
  });

  test('an object holding a messages list is not read', async () => {
    expect(await messagesOf([dataPartV1({messages: [CREATE, UPDATE]})])).toEqual([]);
  });

  test.each<[FakeA2aVersion[]]>([[['1.0']], [['0.3', '1.0']]])(
    'A2UI in an artifact is not read, listed %j',
    async order => {
      const fake = await startScript(
        ({ctx}) => [
          firstTurnTaskV1(ctx),
          artifactUpdateV1(ctx, [dataPartV1(CREATE), dataPartV1(UPDATE)]),
          statusUpdateV1(ctx, TaskState.TASK_STATE_COMPLETED, []),
        ],
        order,
      );
      expect(await smokeOf(fake)).toEqual({kind: 'ended', state: 'completed', messages: []});
    },
  );
});

describe('a2aSmokeRunner, an agent on A2A 1.0 asking to sign in (task-20.4 decisions 9, 10)', () => {
  const start = async (script: ScriptV1, order: FakeA2aVersion[]) => {
    agentV1 = await startFakeAgentV1({
      script,
      card: interfaces => cardForV1(interfaces, {catalogs: [CATALOG_ID], order}),
    });
    return agentV1;
  };

  test.each<[string, FakeA2aVersion[], '1.0' | '0.3']>([
    ["A2A 1.0's shape on A2A 1.0", ['1.0'], '1.0'],
    ["A2A 0.3's shape on A2A 1.0", ['1.0'], '0.3'],
    ["A2A 1.0's shape through its 0.3 layer", ['0.3', '1.0'], '1.0'],
    ["A2A 0.3's shape through its 0.3 layer", ['0.3', '1.0'], '0.3'],
  ])(
    'the answer ends at the state while the agent holds its stream open: %s',
    async (_name, order, shape) => {
      const fake = await start(authRequiredScriptV1('signIn', ['read'], shape), order);
      const started = Date.now();
      const seen = await run({
        card: readCard(fake.served),
        entitlement: ENTITLEMENT,
        words: 'x',
        timeoutMs: 5000,
      });
      expect(Date.now() - started).toBeLessThan(3000);
      expect(seen.kind).toBe('ended');
      if (seen.kind !== 'ended') return;
      expect(seen.state).toBe('auth-required');
      expect(readAuthRequired(seen.data)).toEqual(SIGN_IN_READ);
      expect(seen.text).toBe('Please sign in.');
    },
  );

  test('the stream the runner left is closed behind it, within the keep-alive time of fetch', async () => {
    const fake = await start(authRequiredScriptV1('signIn', ['read']), ['1.0']);
    await run({card: readCard(fake.served), entitlement: ENTITLEMENT, words: 'x', timeoutMs: 5000});
    await vi.waitFor(async () => expect(await fake.connections()).toBe(0), {
      timeout: 10_000,
      interval: 100,
    });
  });
});

describe('a2aSmokeRunner, the walk (task-20.5 decisions 2, 7)', () => {
  const runner = a2aSmokeRunner();
  const SIX: FakePath[] = (['JSONRPC', 'HTTP+JSON', 'GRPC'] as const).flatMap(binding =>
    (['1.0', '0.3'] as const).map(version => ({binding, version})),
  );

  async function startPaths(paths: FakePath[], options: {admit?: () => boolean} = {}) {
    agentV1 = await startFakeAgentV1({
      script: completingScriptV1(paintPartsV1(CATALOG_ID)),
      card: urls => cardForV1(urls, {catalogs: [CATALOG_ID], paths}),
      ...options,
    });
    return readCard(agentV1.served);
  }

  test.each(SIX)('$binding at A2A $version: the paint comes back', async path => {
    const card = await startPaths([path]);
    const seen = await runner({card, entitlement: ENTITLEMENT, words: 'x', timeoutMs: 5000});
    expect(seen.kind).toBe('ended');
    if (seen.kind !== 'ended') return;
    expect(seen.state).toBe('completed');
    expect(operationsOf(seen.messages)).toEqual(OPERATIONS);
    expect(seen.taken).toEqual(card.supportedInterfaces[0]);
  });

  test('an interface passed over is reported beside the one the request went to', async () => {
    const card = await startPaths([{binding: 'JSONRPC', version: '0.3'}]);
    const unopened = {
      url: '127.0.0.1:1',
      protocolBinding: 'GRPC',
      protocolVersion: '1.0',
      tenant: '',
    };
    const seen = await runner({
      card: {...card, supportedInterfaces: [unopened, ...card.supportedInterfaces]},
      entitlement: ENTITLEMENT,
      words: 'x',
      timeoutMs: 5000,
    });
    expect(seen).toMatchObject({
      kind: 'ended',
      taken: card.supportedInterfaces[0],
      notReached: [{interface: unopened, why: 'connection'}],
    });
  });

  test('a gRPC interface the credential’s header cannot ride is passed over', async () => {
    const card = await startPaths([
      {binding: 'GRPC', version: '1.0'},
      {binding: 'JSONRPC', version: '1.0'},
    ]);
    const seen = await runner({
      card,
      entitlement: ENTITLEMENT,
      words: 'x',
      timeoutMs: 5000,
      headers: {'X-Api~Key': 'k-1'},
    });
    expect(seen).toMatchObject({
      kind: 'ended',
      taken: card.supportedInterfaces[1],
      notReached: [
        {interface: card.supportedInterfaces[0], why: 'credential', header: 'X-Api~Key'},
      ],
    });
  });

  test('a gRPC agent that asks sign-in with UNAUTHENTICATED is refused for sign-in', async () => {
    const card = await startPaths([{binding: 'GRPC', version: '1.0'}], {admit: () => false});
    expect(await runner({card, entitlement: ENTITLEMENT, words: 'x', timeoutMs: 5000})).toEqual({
      kind: 'unauthorized',
      taken: card.supportedInterfaces[0],
      notReached: [],
    });
  });

  test('the time limit on opening a connection at publish and preview is 10 s', () => {
    expect(SMOKE_CONNECT_TIMEOUT_MS).toBe(10_000);
  });
});
