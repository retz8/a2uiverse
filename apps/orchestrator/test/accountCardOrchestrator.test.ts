/**
 * An account's own card through the whole orchestrator (task-20.8 decisions 4, 6, 8, 12, 13, 16):
 * a key account connected from the App Library has its card fetched before the sign-in's outcome
 * is told; a question to it is dispatched over the interface its own card names; an own card that
 * lists no interface the platform speaks takes its slot's tile, whose Retry fetches the public card
 * and then the account's again; and no word of the account's card is written to the registry's
 * file, the vault's file or the journal, nor sent to the client or the marketplace.
 */
import {randomBytes} from 'node:crypto';
import {createServer, type Server} from 'node:http';
import {mkdtemp, readFile, readdir, rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {afterEach, beforeEach, describe, expect, test, vi} from 'vitest';
import {AgentCard, type Message} from '@a2a-js/sdk';
import {ClientFactory} from '@a2a-js/sdk/client';
import {FakeEmbedder} from '@a2uiverse/embedder';
import {clientSessionMetadata, operationData} from '@a2uiverse/sdk';
import type {AdmitRequest} from '@a2uiverse/smoke-transport/testing';
import {
  cardForV1,
  completingScriptV1,
  paintPartsV1,
  startFakeAgentV1,
  type FakeAgentV1,
  type FakePath,
} from '@a2uiverse/smoke-transport/testing/v1';
import type {Express} from 'express';
import {buildOrchestrator, JOURNAL_FILE, type Orchestrator} from '../src/app.js';
import {VAULT_FILE} from '../src/vault/store.js';
import {startFakeMarketplace, type FakeMarketplace} from './fakeMarketplace.js';
import {FakePlanner, layoutFor} from './fakePlanner.js';
import {FAKE_CATALOG_ID} from './fakeVendor.js';
import {
  clientMessage,
  collect,
  contextOf,
  dataPart,
  datasOf,
  endsTurn,
  isStatusUpdate,
  stampOf,
  textPart,
  type WireEvent,
} from './privateWire.js';
import {fixtureArtifact} from './registryFixture.js';

const KEY = 'X-Shop-Key';
/** A word only the account's own card carries. */
const MARKER = 'Lantern repairs';
const JSONRPC_1: FakePath = {binding: 'JSONRPC', version: '1.0'};
const REST_1: FakePath = {binding: 'HTTP+JSON', version: '1.0'};

let dir: string;
let server: Server | undefined;
let agent: FakeAgentV1 | undefined;
let marketplace: FakeMarketplace | undefined;

beforeEach(async () => {
  dir = await mkdtemp(join(tmpdir(), 'a2uiverse-account-card-'));
});
afterEach(async () => {
  await agent?.close();
  agent = undefined;
  await marketplace?.close();
  marketplace = undefined;
  await new Promise<void>(resolve => (server ? server.close(() => resolve()) : resolve()));
  server = undefined;
  await rm(dir, {recursive: true, force: true});
});

/** Alice's own card: a skill the public card lacks, and the interfaces `paths` lists. */
function ownCard(paths: FakePath[] | 'acme'): AgentCard {
  const card = cardForV1(agent!.urls, {
    name: 'Shop',
    catalogs: [FAKE_CATALOG_ID],
    paths: paths === 'acme' ? [JSONRPC_1] : paths,
    extendedCard: true,
    skills: [
      {id: 'fake', name: 'fake', description: 'fake', tags: []},
      {id: 'lantern', name: MARKER, description: `${MARKER} for members`, tags: []},
    ],
    card: {
      securitySchemes: {key: {apiKeySecurityScheme: {location: 'header', name: KEY}}},
      securityRequirements: [{schemes: {key: {list: []}}}],
    },
  });
  if (paths !== 'acme') return card;
  return AgentCard.fromJSON({
    ...(AgentCard.toJSON(card) as object),
    supportedInterfaces: [
      {url: 'https://shop.example/acme', protocolBinding: 'ACME-RPC', protocolVersion: '1.0'},
    ],
  });
}

async function boot(own: () => AgentCard) {
  agent = await startFakeAgentV1({
    script: completingScriptV1(paintPartsV1(FAKE_CATALOG_ID)),
    card: urls =>
      cardForV1(urls, {
        name: 'Shop',
        catalogs: [FAKE_CATALOG_ID],
        paths: [JSONRPC_1, REST_1],
        extendedCard: true,
        card: {
          securitySchemes: {key: {apiKeySecurityScheme: {location: 'header', name: KEY}}},
          securityRequirements: [{schemes: {key: {list: []}}}],
        },
      }),
    // The public card names JSON-RPC alone; the agent answers HTTP+JSON too.
    serve: card => {
      const json = AgentCard.toJSON(card) as {supportedInterfaces: object[]};
      return {...json, supportedInterfaces: json.supportedInterfaces.slice(0, 1)};
    },
    admit: (request: AdmitRequest) => request.header(KEY) === 'alice',
    extendedCard: request => (request.header(KEY) === 'alice' ? own() : undefined),
  });
  marketplace = await startFakeMarketplace();
  const ready: {app?: Express} = {};
  server = createServer((req, res) => ready.app!(req, res));
  await new Promise<void>(resolve => server!.listen(0, '127.0.0.1', resolve));
  const address = server.address();
  if (!address || typeof address === 'string') throw new Error('no port');
  const base = `http://127.0.0.1:${address.port}`;
  const orchestrator: Orchestrator = buildOrchestrator({
    config: {
      port: address.port,
      baseUrl: base,
      stateDir: dir,
      debugIds: false,
      googleApiKey: undefined,
      anthropicApiKey: undefined,
      plannerModelId: 'test-model',
      plannerEffort: 'low',
      shortlistCap: 5,
      synthesizerModelId: 'test-model',
      synthesizerEffort: 'low',
      softDeadlineMs: 10_000,
      hardCapMs: 300_000,
      heartbeatMs: 30_000,
      faults: new Map(),
      marketplaceUrl: marketplace.url,
      marketplaceTimeoutMs: 2_000,
    },
    overrides: {
      embedder: new FakeEmbedder(),
      planner: new FakePlanner(() => layoutFor(['shop.1'])),
      stepQuietMs: 0,
    },
  });
  await orchestrator.init();
  ready.app = orchestrator.app;
  const installed = await orchestrator.registry.install({
    appId: 'shop',
    cardUrl: agent.cardUrl,
    catalogs: [await fixtureArtifact(FAKE_CATALOG_ID)],
  });
  if (!installed.ok) throw new Error(installed.findings.join('; '));
  const client = await new ClientFactory().createFromUrl(base);
  return {base, client, orchestrator};
}

/** Alice's key connected from the App Library, the outcome read once the post has answered. */
async function connect(base: string, key = 'alice') {
  const attempt = randomBytes(16).toString('base64url');
  const start = await fetch(`${base}/auth/start?attempt=${attempt}&source=shop`, {
    redirect: 'manual',
  });
  const cookie = (start.headers.get('set-cookie') ?? '').split(';')[0]!;
  await fetch(`${base}/auth/key`, {
    method: 'POST',
    headers: {
      cookie,
      origin: new URL(base).origin,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({attempt, key}).toString(),
  });
  const outcome = await fetch(`${base}/auth/attempts/${attempt}`, {headers: {cookie}});
  return (await outcome.json()) as {state: string};
}

function utterance(text: string): Message {
  return clientMessage([textPart(text)], {
    metadata: {
      a2uiClientDataModel: {version: 'v0.9', surfaces: {}},
      ...clientSessionMetadata('page-1'),
    },
  });
}

function retry(source: string, contextId: string): Message {
  return clientMessage([dataPart(operationData({kind: 'retry', sources: [source]}, 'v0.9'))], {
    contextId,
    metadata: clientSessionMetadata('page-1'),
  });
}

/** Whether a paint of `source` reached the client: an event stamped with it carrying a surface. */
function painted(events: WireEvent[], source: string): boolean {
  return events.some(
    e => stampOf(e)?.source === source && datasOf(e).some(data => 'createSurface' in data),
  );
}

/** The slot of `source` in the last shell paint. */
function slotOf(events: WireEvent[], source: string): Record<string, unknown> | undefined {
  const paints = events.flatMap(e => {
    if (!isStatusUpdate(e) || endsTurn(e) || stampOf(e)?.role !== 'shell') return [];
    return datasOf(e).flatMap(data => {
      const update = data.updateComponents as {components?: unknown[]} | undefined;
      return update?.components ? [update.components as Array<Record<string, unknown>>] : [];
    });
  });
  return (paints.at(-1) ?? []).find(c => c.component === 'Slot' && c.source === source);
}

async function journalLines(): Promise<Array<Record<string, unknown>>> {
  const text = await readFile(join(dir, JOURNAL_FILE), 'utf8');
  return text
    .split('\n')
    .filter(Boolean)
    .map(line => JSON.parse(line) as Record<string, unknown>);
}

/** Every file under the state directory, its text. */
async function stateFiles(at = dir): Promise<Map<string, string>> {
  const files = new Map<string, string>();
  for (const entry of await readdir(at, {withFileTypes: true})) {
    const path = join(at, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === 'models') continue;
      for (const [p, text] of await stateFiles(path)) files.set(p, text);
    } else files.set(path, await readFile(path, 'utf8').catch(() => ''));
  }
  return files;
}

describe("an account's own card through the orchestrator", () => {
  test('fetched before the sign-in is told; the dispatch goes where it names; never written or sent', async () => {
    const {base, client} = await boot(() => ownCard([REST_1]));
    // The outcome is told once the account's card was fetched.
    expect(await connect(base)).toMatchObject({state: 'signedIn'});
    const fetched = (await journalLines()).filter(line => line.kind === 'accountCard');
    expect(fetched).toEqual([
      expect.objectContaining({
        appId: 'shop',
        source: 'shop.1',
        fetch: 'signIn',
        outcome: 'taken',
        binding: 'JSONRPC',
      }),
    ]);

    const events = await collect(client, utterance('lantern repairs for me'));
    expect(painted(events, 'shop.1')).toBe(true);
    expect(agent!.requests.filter(({method}) => method.includes('message'))).toEqual([
      expect.objectContaining({binding: 'HTTP+JSON', reached: '1.0'}),
    ]);
    const turn = await vi.waitUntil(async () =>
      (await journalLines()).find(line => line.kind === 'utterance'),
    );
    expect(turn?.dispatch).toEqual([
      expect.objectContaining({
        source: 'shop.1',
        outcome: 'completed',
        binding: 'HTTP+JSON',
        accountCard: true,
        url: agent!.urls['HTTP+JSON'],
      }),
    ]);

    // Nothing of the account's card at rest, on the wire to the client, or to the marketplace.
    for (const [path, text] of await stateFiles()) {
      expect(text, path).not.toContain(MARKER);
    }
    expect(JSON.stringify(events)).not.toContain(MARKER);
    const installed = await (await fetch(`${base}/registry/apps.json`)).text();
    expect(installed).not.toContain(MARKER);
    expect(JSON.stringify(marketplace!.reports)).not.toContain(MARKER);
    expect(JSON.stringify(await readFile(join(dir, VAULT_FILE), 'utf8'))).not.toContain(MARKER);
  });

  test('an own card listing no interface the platform speaks takes the tile; Retry fetches the cards again', async () => {
    let paths: FakePath[] | 'acme' = 'acme';
    const {base, client} = await boot(() => ownCard(paths));
    await connect(base);
    const events = await collect(client, utterance('lantern repairs for me'));
    expect(slotOf(events, 'shop.1')).toMatchObject({
      state: 'failed',
      failure: expect.objectContaining({cause: 'interface'}),
    });
    expect(agent!.requests.filter(({method}) => method.includes('message'))).toEqual([]);
    paths = [REST_1];
    const again = await collect(client, retry('shop.1', contextOf(events)));
    expect(painted(again, 'shop.1')).toBe(true);
    const fetches = (await journalLines())
      .filter(line => line.kind === 'accountCard')
      .map(line => line.fetch);
    expect(fetches).toEqual(['signIn', 'refetch']);
    expect(agent!.requests.filter(({method}) => method.includes('message'))).toEqual([
      expect.objectContaining({binding: 'HTTP+JSON'}),
    ]);
  });
});
