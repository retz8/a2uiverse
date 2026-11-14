/**
 * The dispatch over the three bindings (task-20.5 decisions 2, 5, 6, 8, 9, 15): the six paths
 * against the server of `@a2a-js/sdk` 1.3.0, the walk over the card's spoken interfaces, what the
 * journal records of the interfaces not reached, the interface that answered remembered while the
 * run holds the live card, and the sign-in refusal on gRPC answered by a refresh and a resend.
 */
import {rm} from 'node:fs/promises';
import {createServer} from 'node:net';
import {afterEach, describe, expect, test, vi} from 'vitest';
import {AgentCard} from '@a2a-js/sdk';
import type {ServedCard} from '@a2uiverse/card';
import {
  cardForV1,
  completingScriptV1,
  paintPartsV1,
  startFakeAgentV1,
  type FakeAgentV1,
  type FakePath,
} from '@a2uiverse/smoke-transport/testing/v1';
import type {AdmitRequest} from '@a2uiverse/smoke-transport/testing';
import {textPart, userMessage} from '../src/a2a/parts.js';
import {
  AgentsPool,
  DISPATCH_CONNECT_TIMEOUT_MS,
  type Credentials,
} from '../src/agentsPool/agentsPool.js';
import type {DispatchTurn} from '../src/agentsPool/types.js';
import {datasOf} from './privateWire.js';
import {fixtureArtifact, testRegistry} from './registryFixture.js';

const CAT = 'cat';
const SIX: FakePath[] = (['JSONRPC', 'HTTP+JSON', 'GRPC'] as const).flatMap(binding =>
  (['1.0', '0.3'] as const).map(version => ({binding, version})),
);

const agents: FakeAgentV1[] = [];
const dirs: string[] = [];
afterEach(async () => {
  await Promise.all(agents.splice(0).map(agent => agent.close()));
  await Promise.all(dirs.splice(0).map(dir => rm(dir, {recursive: true, force: true})));
});

/** A port nothing listens on. */
async function closedPort(): Promise<number> {
  const server = createServer();
  await new Promise<void>(resolve => server.listen(0, '127.0.0.1', resolve));
  const {port} = server.address() as {port: number};
  await new Promise<void>(resolve => server.close(() => resolve()));
  return port;
}

interface Install {
  paths: FakePath[];
  /** Interfaces the card URL lists ahead of the agent's own, in A2A 1.0's JSON. */
  ahead?: Record<string, string>[];
  admit?: (request: AdmitRequest) => boolean;
  credentials?: Credentials;
}

/** A fake A2A 1.0 agent painting in `CAT`, installed as `shop` from the card its URL serves. */
async function poolFor({paths, ahead = [], admit, credentials}: Install) {
  const agent = await startFakeAgentV1({
    script: completingScriptV1(paintPartsV1(CAT)),
    card: urls => cardForV1(urls, {name: 'Shop', catalogs: [CAT], paths}),
    serve: card => {
      const json = AgentCard.toJSON(card) as {supportedInterfaces?: object[]};
      return {...json, supportedInterfaces: [...ahead, ...(json.supportedInterfaces ?? [])]};
    },
    ...(admit ? {admit} : {}),
  });
  agents.push(agent);
  const made = await testRegistry([]);
  dirs.push(made.stateDir);
  const result = await made.registry.install({
    appId: 'shop',
    cardUrl: made.cards.serveAt(agent.cardUrl, agent.served as ServedCard),
    catalogs: [await fixtureArtifact(CAT)],
  });
  if (!result.ok) throw new Error(result.findings.join('; '));
  const pool = new AgentsPool(made.registry, {
    hardCapMs: 30_000,
    debugIds: false,
    ...(credentials ? {credentials} : {}),
  });
  return {agent, pool, registry: made.registry, cards: made.cards};
}

/** A turn on a canvas of its own: the fake opens a task on a conversation's first turn alone. */
function turn(contextId = 'o-ctx'): DispatchTurn {
  const message = userMessage([textPart('hello')], {contextId, taskId: 'o-task'});
  return {clientContextId: contextId, clientTaskId: 'o-task', message};
}

async function drain(handle: ReturnType<AgentsPool['dispatch']>) {
  const events = [];
  for await (const event of handle.events) events.push(event);
  return {events, record: await handle.done};
}

const unopened = async (binding = 'GRPC', version = '1.0') => ({
  url:
    binding === 'GRPC'
      ? `127.0.0.1:${await closedPort()}`
      : `http://127.0.0.1:${await closedPort()}/`,
  protocolBinding: binding,
  protocolVersion: version,
});

describe('a dispatch on each of the six paths', () => {
  test.each(SIX)(
    '$binding at A2A $version: the paint comes back, the journal naming it',
    async path => {
      const {agent, pool} = await poolFor({paths: [path]});
      const {events, record} = await drain(pool.dispatch('shop', turn()));
      expect(record).toMatchObject({
        outcome: 'completed',
        endState: 'TASK_STATE_COMPLETED',
        a2aVersion: path.version,
        binding: path.binding,
      });
      expect(record.notReached).toBeUndefined();
      expect(events.flatMap(datasOf).map(data => Object.keys(data)[1])).toEqual([
        'createSurface',
        'updateComponents',
      ]);
      expect(agent.requests.map(r => [r.binding, r.reached])).toEqual([
        [path.binding, path.version],
      ]);
    },
  );
});

describe('the walk at a dispatch (task-20.5 decisions 2, 6)', () => {
  test('an interface not reached is passed over and journaled, the dispatch using the next', async () => {
    const ahead = await unopened('GRPC', '1.0');
    const {agent, pool} = await poolFor({
      paths: [{binding: 'JSONRPC', version: '0.3'}],
      ahead: [ahead],
    });
    const {record} = await drain(pool.dispatch('shop', turn()));
    expect(record).toMatchObject({
      outcome: 'completed',
      a2aVersion: '0.3',
      binding: 'JSONRPC',
      notReached: [{binding: 'GRPC', a2aVersion: '1.0', why: 'connection'}],
    });
    expect(agent.requests).toHaveLength(1);
  });

  test('no interface reached: the slot fails as an agent not reached, the journal listing what was tried', async () => {
    const {agent, pool} = await poolFor({
      paths: [],
      ahead: [await unopened('GRPC', '1.0'), await unopened('HTTP+JSON', '0.3')],
    });
    const {record} = await drain(pool.dispatch('shop', turn()));
    expect(record).toMatchObject({
      outcome: 'failed',
      cause: 'unreachable',
      notReached: [
        {binding: 'GRPC', a2aVersion: '1.0', why: 'connection'},
        {binding: 'HTTP+JSON', a2aVersion: '0.3', why: 'connection'},
      ],
    });
    expect(record.error).toMatch(/^no interface the card lists was reached: GRPC at A2A 1\.0 \(/);
    expect(record.a2aVersion).toBeUndefined();
    expect(record.binding).toBeUndefined();
    expect(agent.requests).toHaveLength(0);
  });

  test('opening a connection gets 5 s at a dispatch', () => {
    expect(DISPATCH_CONNECT_TIMEOUT_MS).toBe(5000);
  });
});

describe('the interface that answered, remembered (task-20.5 decision 5)', () => {
  test('a later dispatch starts there; a live card fetched again starts the walk over', async () => {
    const ahead = await unopened('GRPC', '1.0');
    const {pool, registry} = await poolFor({
      paths: [{binding: 'HTTP+JSON', version: '1.0'}],
      ahead: [ahead],
    });
    const first = await drain(pool.dispatch('shop', turn()));
    expect(first.record.notReached).toEqual([
      {binding: 'GRPC', a2aVersion: '1.0', why: 'connection'},
    ]);
    const second = await drain(pool.dispatch('shop', turn('o-ctx-2')));
    expect(second.record).toMatchObject({outcome: 'completed', binding: 'HTTP+JSON'});
    expect(second.record.notReached).toBeUndefined();
    await registry.refetchLiveCards();
    const third = await drain(pool.dispatch('shop', turn('o-ctx-3')));
    expect(third.record.notReached).toEqual([
      {binding: 'GRPC', a2aVersion: '1.0', why: 'connection'},
    ]);
  });
});

describe('the sign-in signal and the credential on gRPC (task-20.5 decisions 8, 9)', () => {
  test('UNAUTHENTICATED is answered once by a refresh and a resend, the token as metadata', async () => {
    const credentials: Credentials = {
      prepare: vi.fn(async () => ({headers: {Authorization: 'Bearer old'}})),
      unauthorized: vi.fn(async () => ({headers: {Authorization: 'Bearer new'}})),
      markAgain: vi.fn(),
      requested: vi.fn(),
    };
    const {agent, pool} = await poolFor({
      paths: [{binding: 'GRPC', version: '1.0'}],
      admit: request => request.header('authorization') === 'Bearer new',
      credentials,
    });
    const {record} = await drain(pool.dispatch('shop', turn()));
    expect(record).toMatchObject({outcome: 'completed', binding: 'GRPC'});
    expect(credentials.unauthorized).toHaveBeenCalledTimes(1);
    expect(agent.requests.map(r => r.headers.authorization)).toEqual(['Bearer new']);
  });

  test('a second UNAUTHENTICATED makes the account sign in again', async () => {
    const credentials: Credentials = {
      prepare: vi.fn(async () => ({headers: {Authorization: 'Bearer old'}})),
      unauthorized: vi.fn(async () => ({headers: {Authorization: 'Bearer new'}})),
      markAgain: vi.fn(async () => {}),
      requested: vi.fn(),
    };
    const {pool} = await poolFor({
      paths: [{binding: 'GRPC', version: '0.3'}],
      admit: () => false,
      credentials,
    });
    const {record} = await drain(pool.dispatch('shop', turn()));
    expect(record).toMatchObject({outcome: 'failed', authority: {cause: 'again'}});
    expect(credentials.markAgain).toHaveBeenCalledTimes(1);
  });

  test('a gRPC interface the key’s header cannot ride is passed over for the next', async () => {
    const credentials: Credentials = {
      prepare: vi.fn(async () => ({headers: {'X-Api~Key': 'k-1'}})),
      unauthorized: vi.fn(),
      markAgain: vi.fn(),
      requested: vi.fn(),
    };
    const {agent, pool} = await poolFor({
      paths: [
        {binding: 'GRPC', version: '1.0'},
        {binding: 'JSONRPC', version: '1.0'},
      ],
      credentials,
    });
    const {record} = await drain(pool.dispatch('shop', turn()));
    expect(record).toMatchObject({
      outcome: 'completed',
      binding: 'JSONRPC',
      notReached: [{binding: 'GRPC', a2aVersion: '1.0', why: 'credential'}],
    });
    expect(agent.requests.map(r => [r.binding, r.headers['x-api~key']])).toEqual([
      ['JSONRPC', 'k-1'],
    ]);
  });
});
