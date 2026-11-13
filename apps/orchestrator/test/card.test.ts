/**
 * The card in the orchestrator (task 20.3): a card kept as served and read one way, the interface
 * the dispatch takes, an agent on A2A 1.0 reached, a change of A2A version or bindings alone no
 * update, and an agent the platform cannot reach turned away at install and at its slot.
 */
import {readFileSync} from 'node:fs';
import {readFile, rm, writeFile} from 'node:fs/promises';
import {join} from 'node:path';
import {afterEach, describe, expect, test, vi} from 'vitest';
import {readCard, type ServedCard} from '@a2uiverse/card';
import {FakeEmbedder} from '@a2uiverse/embedder';
import {
  cardForV1,
  completingScriptV1,
  paintPartsV1,
  startFakeAgentV1,
  type FakeA2aVersion,
  type FakeAgentV1,
} from '@a2uiverse/smoke-transport/testing/v1';
import {textPart, userMessage} from '../src/a2a/parts.js';
import {AgentsPool, type Credentials, type UpdateGate} from '../src/agentsPool/agentsPool.js';
import type {DispatchTurn} from '../src/agentsPool/types.js';
import {MarketplaceClient} from '../src/registry/marketplace.js';
import {DEFAULT_CARD_TIMEOUT_MS, Registry} from '../src/registry/registry.js';
import {UpdateCheck} from '../src/registry/updates.js';
import {startFakeMarketplace, type FakeMarketplace} from './fakeMarketplace.js';
import {datasOf} from './privateWire.js';
import {cardFor, cardUrlOf, fixtureArtifact, testRegistry} from './registryFixture.js';

/** A card fixture of the card package: an A2A 1.0 card captured from a real server. */
const fixture = (name: string): ServedCard & {version: string} =>
  JSON.parse(
    readFileSync(new URL(`../../../packages/card/test/fixtures/${name}`, import.meta.url), 'utf8'),
  );

/** The catalog the card package's Python fixtures declare. */
const FIXTURE_CATALOG = 'https://example.com/catalogs/fake/v1/catalog.json';
/** One card in A2A 0.3's shape and in 1.0's, from Python's a2a-sdk; and its gRPC-and-REST telling. */
const AS_LEGACY = fixture('python-as-0.3.json');
const AS_CURRENT = fixture('python-1.0-then-0.3.json');
const GRPC_ONLY = fixture('python-1.0-grpc-and-rest.json');
const CARD_URL = 'http://127.0.0.1:18731/.well-known/agent-card.json';
const NO_INTERFACE =
  'the card lists no interface A2UIVerse speaks: it lists GRPC at A2A 1.0 and HTTP+JSON at A2A 1.0; A2UIVerse speaks JSONRPC at A2A 0.3 and 1.x';

const CAT = 'cat';
const agents: FakeAgentV1[] = [];
const dirs: string[] = [];
let marketplace: FakeMarketplace | undefined;
afterEach(async () => {
  await Promise.all(agents.splice(0).map(agent => agent.close()));
  await marketplace?.close();
  marketplace = undefined;
  await Promise.all(dirs.splice(0).map(dir => rm(dir, {recursive: true, force: true})));
});

async function fresh(options: Parameters<typeof testRegistry>[1] = {}) {
  const made = await testRegistry([], options);
  dirs.push(made.stateDir);
  return made;
}

/** A registry with the fixture agent installed from `served`, its catalog handed. */
async function installed(served: ServedCard = AS_LEGACY) {
  const made = await fresh();
  const result = await made.registry.install({
    appId: 'fake',
    cardUrl: made.cards.serveAt(CARD_URL, served),
    catalogs: [await fixtureArtifact(FIXTURE_CATALOG)],
  });
  if (!result.ok) throw new Error(result.findings.join('; '));
  return made;
}

function turn(): DispatchTurn {
  const message = userMessage([textPart('hello')], {contextId: 'o-ctx', taskId: 'o-task'});
  return {clientContextId: 'o-ctx', clientTaskId: 'o-task', message};
}

async function drain(handle: ReturnType<AgentsPool['dispatch']>) {
  const events = [];
  for await (const event of handle.events) events.push(event);
  return {events, record: await handle.done};
}

describe('a card at rest and as read (task-20.3 decisions 1, 7, 9)', () => {
  test('a card in A2A 1.0’s shape installs: stored as served, read for every reader, its first interface the dispatch address', async () => {
    const {registry, stateDir} = await installed(AS_CURRENT);
    expect(registry.installed()[0]!.card).toEqual(AS_CURRENT);
    const onDisk = JSON.parse(await readFile(join(stateDir, 'registry', 'registry.json'), 'utf8'));
    expect(onDisk.apps[0].card).toEqual(AS_CURRENT);
    expect(registry.storedCard('fake')).toEqual(readCard(AS_CURRENT));
    expect(registry.card('fake')).toEqual(readCard(AS_CURRENT));
    expect(registry.get('fake')).toMatchObject({
      displayName: 'Fake Agent',
      agentUrl: 'http://127.0.0.1:18731/',
      catalogs: [FIXTURE_CATALOG],
    });
    expect(registry.takenInterface('fake')).toMatchObject({
      protocolBinding: 'JSONRPC',
      protocolVersion: '1.0',
    });
    expect(registry.routable().map(app => app.record.id)).toEqual(['fake']);
  });

  test('a registry opened over the same state directory reads each stored card once more, whichever shape it was written in', async () => {
    const {cards, stateDir} = await installed(AS_CURRENT);
    const next = new Registry({stateDir, fetchCard: cards.fetch, embedder: new FakeEmbedder()});
    await next.load();
    expect(next.storedCard('fake')).toEqual(readCard(AS_CURRENT));
    expect(next.installed()[0]!.card).toEqual(AS_CURRENT);
  });

  test('a stored card that does not read refuses the boot, naming the app and the reason', async () => {
    const {cards, stateDir} = await installed(AS_LEGACY);
    const path = join(stateDir, 'registry', 'registry.json');
    const file = JSON.parse(await readFile(path, 'utf8'));
    delete file.apps[0].card.skills;
    await writeFile(path, JSON.stringify(file));
    const next = new Registry({stateDir, fetchCard: cards.fetch, embedder: new FakeEmbedder()});
    await expect(next.load()).rejects.toThrow(
      /registry\.json: the stored card of app "fake" could not be read: .*agentCard\.skills/,
    );
  });

  test('a stored card that is no object refuses the boot at the store', async () => {
    const {cards, stateDir} = await installed(AS_LEGACY);
    const path = join(stateDir, 'registry', 'registry.json');
    const file = JSON.parse(await readFile(path, 'utf8'));
    file.apps[0].card = ['a list'];
    await writeFile(path, JSON.stringify(file));
    const next = new Registry({stateDir, fetchCard: cards.fetch, embedder: new FakeEmbedder()});
    await expect(next.load()).rejects.toThrow(/apps\[0\]\.card: not an object/);
  });
});

describe('a live card that cannot be read (task-20.3 decision 8)', () => {
  const UNREAD = {name: 'Fake Agent', url: 'http://127.0.0.1:18731/', version: '0.1.0'};

  test('at install: refused as an app that could not be reached, the finding in the A2A SDK’s own words', async () => {
    const {registry, cards} = await fresh();
    const result = await registry.install({
      appId: 'fake',
      cardUrl: cards.serveAt(CARD_URL, UNREAD),
      catalogs: [],
    });
    expect(result).toMatchObject({ok: false, cause: 'app-unreached'});
    expect(result.ok ? [] : result.findings).toEqual([
      expect.stringMatching(
        /^the card at http:\/\/127\.0\.0\.1:18731\/\.well-known\/agent-card\.json could not be read: .*agentCard\.capabilities/,
      ),
    ]);
    expect(registry.installed()).toEqual([]);
  });

  test('a thing that is not a card says so', async () => {
    const {registry, cards} = await fresh();
    const result = await registry.install({
      appId: 'fake',
      cardUrl: cards.serveAt(CARD_URL, {url: 'http://127.0.0.1:18731/'}),
      catalogs: [],
    });
    expect(result.ok ? [] : result.findings).toEqual([
      `the card at ${CARD_URL} could not be read: not an agent card: no name`,
    ]);
  });

  test('at boot and at the update check: the app stays installed and unroutable until a check reaches a card that reads', async () => {
    const {cards, stateDir} = await installed(AS_LEGACY);
    cards.serveAt(CARD_URL, UNREAD);
    const next = new Registry({stateDir, fetchCard: cards.fetch, embedder: new FakeEmbedder()});
    await next.load();
    await next.refreshCards();
    expect(next.card('fake')).toBeNull();
    expect(next.routable()).toEqual([]);
    expect(next.list().map(app => app.displayName)).toEqual(['Fake Agent']);
    await next.refetchLiveCards();
    expect(next.card('fake')).toBeNull();
    expect(await next.refetchLiveCard('fake', 1_000)).toBeUndefined();
    cards.serveAt(CARD_URL, AS_CURRENT);
    await next.refetchLiveCards();
    expect(next.card('fake')).toEqual(readCard(AS_CURRENT));
    expect(next.routable().map(app => app.record.id)).toEqual(['fake']);
  });
});

describe('the card fetch’s time limits (task-20.3 decision 5)', () => {
  test('ten seconds at install, at boot and at the update check; the caller’s own when one app’s card is fetched again', async () => {
    expect(DEFAULT_CARD_TIMEOUT_MS).toBe(10_000);
    const {registry, cards} = await installed(AS_LEGACY);
    expect(cards.limits).toEqual([10_000]);
    await registry.refreshCards();
    await registry.refetchLiveCards();
    await registry.refetchLiveCard('fake', 5_000);
    expect(cards.limits).toEqual([10_000, 10_000, 10_000, 5_000]);
  });

  test('the registry’s own limit, when it is given one', async () => {
    const {registry, cards} = await fresh({cardTimeoutMs: 250});
    await registry.install({
      appId: 'fake',
      cardUrl: cards.serveAt(CARD_URL, AS_LEGACY),
      catalogs: [],
    });
    expect(cards.limits).toEqual([250]);
  });

  test('a card that misses the limit at boot could not be fetched: its app stays installed and unroutable', async () => {
    const {cards, stateDir} = await installed(AS_LEGACY);
    cards.hanging.add(CARD_URL);
    const next = new Registry({
      stateDir,
      fetchCard: cards.fetch,
      cardTimeoutMs: 20,
      embedder: new FakeEmbedder(),
    });
    await next.load();
    await next.refreshCards();
    expect(next.card('fake')).toBeNull();
    expect(next.list().map(app => app.id)).toEqual(['fake']);
  });
});

describe('a change of A2A version or bindings alone is no update (phase-20 decision 5; task-20.3 decision 12)', () => {
  async function published(storeCard: ServedCard & {version: string}) {
    marketplace = await startFakeMarketplace();
    const client = new MarketplaceClient({url: marketplace.url, timeoutMs: 2_000});
    const made = await fresh({marketplace: client});
    made.cards.serveAt(CARD_URL, AS_LEGACY);
    await marketplace.publish('fake', {
      card: storeCard,
      cardUrl: CARD_URL,
      catalogs: [await fixtureArtifact(FIXTURE_CATALOG)],
    });
    const result = await made.registry.installFromMarketplace('fake');
    if (!result.ok) throw new Error(result.findings.join('; '));
    return {
      ...made,
      marketplace,
      check: new UpdateCheck({registry: made.registry, marketplace: client}),
    };
  }

  test('the live card served in A2A 1.0’s shape, nothing else changed: up to date, nothing reported, the stored copy in its older shape', async () => {
    const {registry, cards, marketplace, check} = await published(AS_LEGACY);
    cards.serveAt(CARD_URL, AS_CURRENT);
    const outcome = await check.check();
    expect(outcome.states).toEqual([
      {appId: 'fake', installedVersion: '0.1.0', state: 'up-to-date', publishedVersion: '0.1.0'},
    ]);
    expect(outcome.updated).toEqual([]);
    expect(marketplace.reports).toEqual([]);
    expect(registry.card('fake')).toEqual(readCard(AS_CURRENT));
    expect(registry.installed()[0]!.card).toEqual(AS_LEGACY);
    // Dispatch follows the live card.
    expect(registry.takenInterface('fake')?.protocolVersion).toBe('1.0');
  });

  test('the Store’s copy in A2A 1.0’s shape beside an installed one in 0.3’s: up to date, no consent to ask', async () => {
    const {check} = await published(AS_CURRENT);
    const [state] = (await check.check()).states;
    expect(state).toEqual({
      appId: 'fake',
      installedVersion: '0.1.0',
      state: 'up-to-date',
      publishedVersion: '0.1.0',
    });
  });

  test('an install over it with the card in the other shape says nothing changed, and stores the live card', async () => {
    const {registry, cards} = await installed(AS_LEGACY);
    const again = await registry.install({
      appId: 'fake',
      cardUrl: cards.serveAt(CARD_URL, AS_CURRENT),
      catalogs: [await fixtureArtifact(FIXTURE_CATALOG)],
    });
    expect(again.ok && again.summary).toMatch(/^reinstalled fake · nothing changed · card 0\.1\.0/);
    expect(registry.installed()[0]!.card).toEqual(AS_CURRENT);
  });

  test('a changed skill is still a changed card', async () => {
    const {registry, cards} = await installed(AS_LEGACY);
    const changed = {
      ...AS_CURRENT,
      skills: [{id: 'fake', name: 'Fake', description: 'Changed', tags: ['fake']}],
    };
    const again = await registry.install({
      appId: 'fake',
      cardUrl: cards.serveAt(CARD_URL, changed),
      catalogs: [await fixtureArtifact(FIXTURE_CATALOG)],
    });
    expect(again.ok && again.summary).toMatch(/^updated fake · card 0\.1\.0/);
  });
});

describe('an agent the platform cannot reach, at install (task-20.3 decision 16)', () => {
  test('an install from a local copy is refused under a cause of its own, with the finding, and nothing is installed', async () => {
    const {registry, cards, journal} = await fresh();
    const result = await registry.install({
      appId: 'fake',
      cardUrl: cards.serveAt(CARD_URL, GRPC_ONLY),
      catalogs: [await fixtureArtifact(FIXTURE_CATALOG)],
    });
    expect(result).toEqual({ok: false, cause: 'no-interface', findings: [NO_INTERFACE]});
    expect(registry.installed()).toEqual([]);
    expect(journal.entries.at(-1)).toMatchObject({
      operation: 'install',
      outcome: 'refused',
      findings: [NO_INTERFACE],
    });
  });

  test('an install from the marketplace is refused the same way, before its drift is judged', async () => {
    marketplace = await startFakeMarketplace();
    const client = new MarketplaceClient({url: marketplace.url, timeoutMs: 2_000});
    const {registry, cards} = await fresh({marketplace: client});
    cards.serveAt(CARD_URL, {...GRPC_ONLY, version: '9.9.9'});
    await marketplace.publish('fake', {
      card: AS_CURRENT,
      cardUrl: CARD_URL,
      catalogs: [await fixtureArtifact(FIXTURE_CATALOG)],
    });
    const result = await registry.installFromMarketplace('fake');
    expect(result).toEqual({ok: false, cause: 'no-interface', findings: [NO_INTERFACE]});
    expect(marketplace.reports).toEqual([]);
  });

  test('an update of an installed app is refused the same way, the app as installed', async () => {
    const {registry, cards} = await installed(AS_LEGACY);
    const result = await registry.install({
      appId: 'fake',
      cardUrl: cards.serveAt(CARD_URL, GRPC_ONLY),
      catalogs: [await fixtureArtifact(FIXTURE_CATALOG)],
    });
    expect(result).toEqual({ok: false, cause: 'no-interface', findings: [NO_INTERFACE]});
    expect(registry.installed()[0]!.card).toEqual(AS_LEGACY);
  });

  test('a card that lists no interface at all', async () => {
    const {registry, cards} = await fresh();
    const {supportedInterfaces: _none, ...bare} = fixture('python-1.0.json') as {
      supportedInterfaces: unknown;
    };
    const result = await registry.install({
      appId: 'fake',
      cardUrl: cards.serveAt(CARD_URL, bare),
      catalogs: [await fixtureArtifact(FIXTURE_CATALOG)],
    });
    expect(result).toEqual({
      ok: false,
      cause: 'no-interface',
      findings: ['the card lists no interface'],
    });
  });
});

describe('an installed app the platform cannot reach (task-20.3 decisions 13, 14)', () => {
  test('its live card listing nothing the platform speaks: it stays installed and routed, and is said so', async () => {
    const {registry, cards} = await installed(AS_LEGACY);
    expect(registry.liveUnreachable('fake')).toBe(false);
    cards.serveAt(CARD_URL, GRPC_ONLY);
    await registry.refetchLiveCards();
    expect(registry.liveUnreachable('fake')).toBe(true);
    expect(registry.takenInterface('fake')).toBeUndefined();
    expect(registry.get('fake').agentUrl).toBe('');
    expect(registry.routable().map(app => app.record.id)).toEqual(['fake']);
  });

  test('an agent down at startup is judged on its stored card, never said to be unreachable this way', async () => {
    const {cards, stateDir} = await installed(AS_LEGACY);
    cards.cards.delete(CARD_URL);
    const next = new Registry({stateDir, fetchCard: cards.fetch, embedder: new FakeEmbedder()});
    await next.load();
    await next.refreshCards();
    expect(next.liveUnreachable('fake')).toBe(false);
    expect(next.takenInterface('fake')?.protocolVersion).toBe('0.3');
  });

  test('its dispatch fails under the cause of its own before the agent is called, ahead of the update check and of any sign-in', async () => {
    const {registry, cards} = await installed(AS_LEGACY);
    cards.serveAt(CARD_URL, GRPC_ONLY);
    await registry.refetchLiveCards();
    const updates: UpdateGate = {
      catalogsChanged: vi.fn(() => true),
      permissionChanged: vi.fn(() => true),
      finding: vi.fn(async () => undefined),
      refetched: vi.fn(async () => 'unchanged' as const),
    };
    const credentials: Credentials = {
      prepare: vi.fn(async () => ({
        need: {cause: 'signIn' as const, scheme: 'signIn', keys: [], words: []},
      })),
      unauthorized: vi.fn(),
      markAgain: vi.fn(),
      requested: vi.fn(),
    };
    const fetchImpl = vi.fn<typeof fetch>();
    const pool = new AgentsPool(registry, {
      hardCapMs: 30_000,
      debugIds: false,
      updates,
      credentials,
      fetchImpl,
    });
    const {events, record} = await drain(pool.dispatch('fake', turn()));
    expect(events).toEqual([]);
    expect(record).toMatchObject({outcome: 'failed', cause: 'interface', error: NO_INTERFACE});
    expect(record.a2aVersion).toBeUndefined();
    expect(record.binding).toBeUndefined();
    expect(record.update).toBeUndefined();
    expect(record.authority).toBeUndefined();
    expect(updates.catalogsChanged).not.toHaveBeenCalled();
    expect(credentials.prepare).not.toHaveBeenCalled();
    expect(fetchImpl).not.toHaveBeenCalled();
  });
});

describe('a dispatch to an agent on A2A 1.0 (task-20.3 decisions 11, 20)', () => {
  /** A fake A2A 1.0 agent painting in `CAT`, installed as `shop`, its JSON-RPC interfaces in `order`. */
  async function poolFor(order: FakeA2aVersion[]) {
    const agent = await startFakeAgentV1({
      script: completingScriptV1(paintPartsV1(CAT)),
      card: interfaces => cardForV1(interfaces, {name: 'Shop', catalogs: [CAT], order}),
    });
    agents.push(agent);
    const made = await fresh();
    const result = await made.registry.install({
      appId: 'shop',
      cardUrl: made.cards.serveAt(agent.cardUrl, agent.served as ServedCard),
      catalogs: [await fixtureArtifact(CAT)],
    });
    if (!result.ok) throw new Error(result.findings.join('; '));
    const pool = new AgentsPool(made.registry, {hardCapMs: 30_000, debugIds: false});
    return {agent, pool, registry: made.registry};
  }

  test('A2A 1.0 alone: the dispatch reaches it and brings its paint back, the journal’s record naming the interface', async () => {
    const {agent, pool, registry} = await poolFor(['1.0']);
    const {events, record} = await drain(pool.dispatch('shop', turn()));
    expect(record).toMatchObject({
      outcome: 'completed',
      endState: 'TASK_STATE_COMPLETED',
      a2aVersion: '1.0',
      binding: 'JSONRPC',
    });
    expect(events.flatMap(datasOf).map(data => Object.keys(data)[1])).toEqual([
      'createSurface',
      'updateComponents',
    ]);
    expect(agent.requests.map(r => [r.reached, r.a2aVersion, r.method])).toEqual([
      ['1.0', '1.0', 'SendStreamingMessage'],
    ]);
    expect(registry.get('shop').agentUrl).toBe(agent.interfaces['1.0']);
  });

  test('A2A 1.0 listed first is the interface reached', async () => {
    const {agent, pool} = await poolFor(['1.0', '0.3']);
    const {record} = await drain(pool.dispatch('shop', turn()));
    expect(record).toMatchObject({outcome: 'completed', a2aVersion: '1.0', binding: 'JSONRPC'});
    expect(agent.requests.map(r => r.reached)).toEqual(['1.0']);
  });

  test('A2A 0.3 listed first is the interface reached, where the A2A SDK alone takes 1.0', async () => {
    const {agent, pool, registry} = await poolFor(['0.3', '1.0']);
    const {events, record} = await drain(pool.dispatch('shop', turn()));
    expect(record).toMatchObject({outcome: 'completed', a2aVersion: '0.3', binding: 'JSONRPC'});
    expect(events.flatMap(datasOf).map(data => Object.keys(data)[1])).toEqual([
      'createSurface',
      'updateComponents',
    ]);
    expect(agent.requests.map(r => [r.reached, r.a2aVersion, r.method])).toEqual([
      ['0.3', '0.3', 'message/stream'],
    ]);
    expect(registry.get('shop').agentUrl).toBe(agent.interfaces['0.3']);
  });
});

describe('the card URL of a 0.3 agent as the fixtures name it', () => {
  test('a card served for A2A 0.3 by the registry’s fixture reads', () => {
    const card = cardFor('http://127.0.0.1:11002', {name: 'Gmail'});
    expect(readCard(card).supportedInterfaces[0]?.url).toBe('http://127.0.0.1:11002');
    expect(cardUrlOf(card.url)).toBe('http://127.0.0.1:11002/.well-known/agent-card.json');
  });
});
