/**
 * A dispatch to an account that holds a card of its own (task-20.8 decisions 1, 4, 5, 16): it
 * walks that card alone, in its order, the interface that last answered remembered for the
 * account; one listing no interface the platform speaks fails the slot as an app that connects in
 * a way A2UIVerse can't use; and what the account's card says of sign-in and catalogs changes
 * nothing.
 */
import {rm} from 'node:fs/promises';
import {createServer} from 'node:net';
import {afterEach, describe, expect, test, vi} from 'vitest';
import {AgentCard} from '@a2a-js/sdk';
import {readCard, type ServedCard} from '@a2uiverse/card';
import {A2UI_CLIENT_CAPABILITIES_KEY} from '@a2uiverse/sdk';
import {
  cardForV1,
  completingScriptV1,
  paintPartsV1,
  startFakeAgentV1,
  type FakeAgentV1,
  type FakePath,
} from '@a2uiverse/smoke-transport/testing/v1';
import {textPart, userMessage} from '../src/a2a/parts.js';
import {AgentsPool, type Credentials} from '../src/agentsPool/agentsPool.js';
import type {DispatchTurn} from '../src/agentsPool/types.js';
import {fixtureArtifact, testRegistry} from './registryFixture.js';

const CAT = 'cat';
const JSONRPC_1: FakePath = {binding: 'JSONRPC', version: '1.0'};
const REST_1: FakePath = {binding: 'HTTP+JSON', version: '1.0'};

const agents: FakeAgentV1[] = [];
const dirs: string[] = [];
afterEach(async () => {
  await Promise.all(agents.splice(0).map(agent => agent.close()));
  await Promise.all(dirs.splice(0).map(dir => rm(dir, {recursive: true, force: true})));
});

async function closedPort(): Promise<number> {
  const server = createServer();
  await new Promise<void>(resolve => server.listen(0, '127.0.0.1', resolve));
  const {port} = server.address() as {port: number};
  await new Promise<void>(resolve => server.close(() => resolve()));
  return port;
}

/**
 * `shop`, installed from a fake A2A 1.0 agent that answers JSON-RPC and HTTP+JSON and whose public
 * card lists JSON-RPC alone; accounts 1 and 2, account 1 holding the card `own` makes of the
 * agent's addresses.
 */
async function poolFor(own: (agent: FakeAgentV1) => AgentCard | object, credentials?: Credentials) {
  const agent = await startFakeAgentV1({
    script: completingScriptV1(paintPartsV1(CAT)),
    card: urls => cardForV1(urls, {name: 'Shop', catalogs: [CAT], paths: [JSONRPC_1, REST_1]}),
    serve: card => {
      const json = AgentCard.toJSON(card) as {supportedInterfaces: object[]};
      return {...json, supportedInterfaces: json.supportedInterfaces.slice(0, 1)};
    },
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
  const built = own(agent);
  const ownCard = 'supportedInterfaces' in built ? (built as AgentCard) : readCard(built);
  const held = new Map<string, AgentCard>([['shop.1', ownCard]]);
  const pool = new AgentsPool(made.registry, {
    hardCapMs: 30_000,
    debugIds: false,
    accountCards: {card: source => held.get(source)},
    ...(credentials ? {credentials} : {}),
  });
  return {agent, pool, held};
}

function turn(contextId = 'o-ctx'): DispatchTurn {
  const message = userMessage([textPart('hello')], {contextId, taskId: 'o-task'});
  return {clientContextId: contextId, clientTaskId: 'o-task', message};
}

async function drain(handle: ReturnType<AgentsPool['dispatch']>) {
  const events = [];
  for await (const event of handle.events) events.push(event);
  return {events, record: await handle.done};
}

describe("a dispatch walks the account's own card alone", () => {
  test('the interface it names is dialed, and the journal names its address', async () => {
    const {agent, pool} = await poolFor(agent =>
      cardForV1(agent.urls, {name: 'Shop', catalogs: [CAT], paths: [REST_1]}),
    );
    const {record} = await drain(pool.dispatch('shop.1', turn()));
    expect(record).toMatchObject({
      outcome: 'completed',
      binding: 'HTTP+JSON',
      a2aVersion: '1.0',
      accountCard: true,
      url: agent.urls['HTTP+JSON'],
    });
    expect(agent.requests.at(-1)?.binding).toBe('HTTP+JSON');
    // Another account of the app, holding no card of its own, walks the app's.
    const other = await drain(pool.dispatch('shop.2', turn('o-ctx-2')));
    expect(other.record).toMatchObject({outcome: 'completed', binding: 'JSONRPC'});
    expect(other.record.accountCard).toBeUndefined();
    expect(other.record.url).toBeUndefined();
  });

  test("the public card's interfaces are never tried for it", async () => {
    const port = await closedPort();
    const {agent, pool} = await poolFor(agent => ({
      ...(AgentCard.toJSON(cardForV1(agent.urls, {name: 'Shop', catalogs: [CAT]})) as object),
      supportedInterfaces: [
        {url: `http://127.0.0.1:${port}/`, protocolBinding: 'JSONRPC', protocolVersion: '1.0'},
      ],
    }));
    const {record} = await drain(pool.dispatch('shop.1', turn()));
    expect(record.outcome).toBe('failed');
    expect(record.notReached).toEqual([{binding: 'JSONRPC', a2aVersion: '1.0', why: 'connection'}]);
    expect(agent.requests).toEqual([]);
  });

  test('the interface that last answered is remembered for the account', async () => {
    const port = await closedPort();
    const {pool} = await poolFor(agent => ({
      ...(AgentCard.toJSON(cardForV1(agent.urls, {name: 'Shop', catalogs: [CAT]})) as object),
      supportedInterfaces: [
        {url: `127.0.0.1:${port}`, protocolBinding: 'GRPC', protocolVersion: '1.0'},
        {url: agent.urls['HTTP+JSON'], protocolBinding: 'HTTP+JSON', protocolVersion: '1.0'},
      ],
    }));
    const first = await drain(pool.dispatch('shop.1', turn('c-1')));
    expect(first.record).toMatchObject({binding: 'HTTP+JSON'});
    expect(first.record.notReached).toHaveLength(1);
    const second = await drain(pool.dispatch('shop.1', turn('c-2')));
    expect(second.record).toMatchObject({binding: 'HTTP+JSON'});
    expect(second.record.notReached).toBeUndefined();
  });

  test('a card listing no interface the platform speaks fails the slot, the agent not called', async () => {
    const {agent, pool} = await poolFor(agent => ({
      ...(AgentCard.toJSON(cardForV1(agent.urls, {name: 'Shop', catalogs: [CAT]})) as object),
      supportedInterfaces: [
        {url: 'https://shop.example/acme', protocolBinding: 'ACME-RPC', protocolVersion: '1.0'},
      ],
    }));
    const {record} = await drain(pool.dispatch('shop.1', turn()));
    expect(record).toMatchObject({outcome: 'failed', cause: 'interface'});
    expect(record.error).toMatch(/lists no interface A2UIVerse speaks/);
    expect(agent.requests).toEqual([]);
  });
});

describe("what the account's card says of sign-in and catalogs changes nothing (decision 5)", () => {
  test('the entitlement advertised is the installed one; sign-in is judged as for the app', async () => {
    const credentials: Credentials = {
      prepare: vi.fn(async () => ({headers: {'X-Shop-Key': 'alice'}})),
      unauthorized: vi.fn(),
      markAgain: vi.fn(),
      requested: vi.fn(),
    };
    const {agent, pool} = await poolFor(
      agent =>
        AgentCard.fromJSON({
          ...(AgentCard.toJSON(
            cardForV1(agent.urls, {name: 'Shop', catalogs: ['other-cat'], paths: [REST_1]}),
          ) as object),
          securitySchemes: {staff: {httpAuthSecurityScheme: {scheme: 'bearer'}}},
          securityRequirements: [{schemes: {staff: {list: ['admin']}}}],
        }),
      credentials,
    );
    const {record} = await drain(pool.dispatch('shop.1', turn()));
    expect(record).toMatchObject({outcome: 'completed', binding: 'HTTP+JSON'});
    expect(credentials.prepare).toHaveBeenCalledWith('shop.1');
    const sent = agent.requests.at(-1)!;
    expect(sent.headers['x-shop-key']).toBe('alice');
    const capabilities = (sent.message?.metadata as Record<string, unknown>)[
      A2UI_CLIENT_CAPABILITIES_KEY
    ];
    expect(JSON.stringify(capabilities)).toContain(CAT);
    expect(JSON.stringify(capabilities)).not.toContain('other-cat');
  });
});
