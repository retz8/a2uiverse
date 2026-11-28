/**
 * A registry left from before the flip (task-21.13 decisions 1, 13): `registry.json` in the shape
 * `main` writes, each stored card declaring A2UI v0.9.1, each artifact packed for host-module
 * interface `0.16.1`. The orchestrator boots on it with the file unchanged; each app's entitlement
 * reads as the v1.0 basic catalog alone; an app from the Store whose live card names new catalog
 * ids takes the update tile, its agent not called; an app installed from the computer that paints
 * in the v1.0 basic catalog is relayed.
 */
import {readFile, rm} from 'node:fs/promises';
import {join} from 'node:path';
import {afterEach, describe, expect, test} from 'vitest';
import type {AgentCard as LegacyAgentCard} from '@a2a-js/sdk-v0_3';
import {FakeEmbedder} from '@a2uiverse/embedder';
import {
  ARTIFACT_DESCRIPTOR_FILE,
  artifactIdOf,
  BASIC_CATALOG_ID,
  OLDER_VERSION_HELD,
} from '@a2uiverse/sdk';
import {textPart, userMessage} from '../src/a2a/parts.js';
import {AgentsPool, type UpdateGate} from '../src/agentsPool/agentsPool.js';
import type {DispatchTurn} from '../src/agentsPool/types.js';
import {Registry} from '../src/registry/registry.js';
import {RegistryStore} from '../src/registry/store.js';
import type {InstalledRecord} from '../src/registry/types.js';
import type {UpdateFinding} from '../src/registry/updateTile.js';
import {startFakeVendor, type FakeVendor, type Script} from './fakeVendor.js';
import {datasOf} from './privateWire.js';
import {CardServer, cardFor, cardUrlOf, fixtureArtifact} from './registryFixture.js';
import {mkdtemp} from 'node:fs/promises';
import {tmpdir} from 'node:os';

const V091_URI = 'https://a2ui.org/a2a-extension/a2ui/v0.9.1';
const V09_BASIC = 'https://a2ui.org/specification/v0_9/catalogs/basic/catalog.json';
const OLD_SHOP_A =
  'https://github.com/retz8/a2uiverse-apps/blob/main/shop-a/catalogs/v0.9.1/catalog.json';
const NEW_SHOP_A =
  'https://github.com/retz8/a2uiverse-apps/blob/main/shop-a/catalogs/v1.0/catalog.json';
const SHOP_A_URL = 'http://127.0.0.1:12001';

const dirs: string[] = [];
const vendors: FakeVendor[] = [];
afterEach(async () => {
  await Promise.all(vendors.splice(0).map(vendor => vendor.close()));
  await Promise.all(dirs.splice(0).map(dir => rm(dir, {recursive: true, force: true})));
});

/** A card as `main` stored it: A2A 0.3's shape, A2UI declared at v0.9.1. */
function storedCard(url: string, name: string, catalogs: string[]): LegacyAgentCard {
  return {
    ...cardFor(url, {name}),
    capabilities: {
      streaming: true,
      extensions: [{uri: V091_URI, params: {supportedCatalogIds: catalogs}}],
    },
  };
}

/** A script that paints one surface in the v1.0 basic catalog and completes. */
const basicPaint: Script = ({ctx, vendorContextId}) => [
  {
    kind: 'status-update',
    taskId: ctx.taskId,
    contextId: vendorContextId,
    final: true,
    status: {
      state: 'completed',
      message: {
        kind: 'message',
        messageId: crypto.randomUUID(),
        role: 'agent',
        parts: [
          {
            kind: 'data',
            data: {version: '1.0', createSurface: {surfaceId: 's1', catalogId: BASIC_CATALOG_ID}},
          },
        ],
        contextId: vendorContextId,
        taskId: ctx.taskId,
      },
    },
  },
];

/**
 * A state directory holding what `main` wrote: Shop A from the Store with its catalog packed for
 * `0.16.1`, and Shop C from the computer on the basic catalog, its agent the fake given.
 */
async function leftFromMain(shopC: FakeVendor) {
  const stateDir = await mkdtemp(join(tmpdir(), 'a2uiverse-before-flip-'));
  dirs.push(stateDir);
  const artifact = await fixtureArtifact(OLD_SHOP_A, {
    hostInterface: '0.16.1',
    schema: {catalogId: OLD_SHOP_A, components: {Text: {type: 'object'}}},
  });
  const artifactId = await artifactIdOf(artifact.get(ARTIFACT_DESCRIPTOR_FILE)!);
  const store = new RegistryStore(stateDir);
  await store.load();
  await store.writeArtifact(artifactId, artifact);
  const records: InstalledRecord[] = [
    {
      id: 'shop-a',
      cardUrl: cardUrlOf(SHOP_A_URL),
      card: storedCard(SHOP_A_URL, 'Shop A', [OLD_SHOP_A]),
      catalogs: {[OLD_SHOP_A]: artifactId},
      entitlement: [V09_BASIC, OLD_SHOP_A],
      installedAt: '2026-11-20T00:00:00.000Z',
      source: 'marketplace',
    },
    {
      id: 'shop-c',
      cardUrl: cardUrlOf(shopC.url),
      card: storedCard(shopC.url, 'Shop C', []),
      catalogs: {},
      entitlement: [V09_BASIC],
      installedAt: '2026-11-20T00:00:00.000Z',
      source: 'local',
    },
  ];
  await store.writeRecords(records);
  // Each agent has moved to v1.0: Shop A names its new catalog id, Shop C the basic catalog.
  const cards = new CardServer();
  cards.serve({
    ...cardFor(SHOP_A_URL, {name: 'Shop A', catalogs: [NEW_SHOP_A]}),
    version: '0.3.0',
  });
  cards.serve(cardFor(shopC.url, {name: 'Shop C'}));
  return {stateDir, cards, recordPath: join(stateDir, 'registry', 'registry.json')};
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

describe('a registry left from before the flip (task-21.13 decision 13)', () => {
  test('boots with registry.json byte for byte unchanged, each entitlement the v1.0 basic catalog alone', async () => {
    const shopC = await startFakeVendor({script: basicPaint, catalogs: []});
    vendors.push(shopC);
    const {stateDir, cards, recordPath} = await leftFromMain(shopC);
    const before = await readFile(recordPath);
    const registry = new Registry({stateDir, fetchCard: cards.fetch, embedder: new FakeEmbedder()});
    await registry.load();
    await registry.refreshCards();
    expect(registry.get('shop-a').entitlement).toEqual([BASIC_CATALOG_ID]);
    expect(registry.get('shop-c').entitlement).toEqual([BASIC_CATALOG_ID]);
    expect(await readFile(recordPath)).toEqual(before);
  });

  test('an app from the Store whose live card names new catalog ids takes the update tile, its agent not called', async () => {
    const shopC = await startFakeVendor({script: basicPaint, catalogs: []});
    vendors.push(shopC);
    const {stateDir, cards} = await leftFromMain(shopC);
    const registry = new Registry({stateDir, fetchCard: cards.fetch, embedder: new FakeEmbedder()});
    await registry.load();
    await registry.refreshCards();
    const finding = {case: 'catalogs', line: 'needs-update'} as unknown as UpdateFinding;
    const changed: string[] = [];
    const updates: UpdateGate = {
      catalogsChanged: appId => {
        const app = registry.get(appId);
        const live = registry.card(appId);
        const named = live?.capabilities?.extensions[0]?.params?.supportedCatalogIds;
        const outside = Array.isArray(named) && !named.some(id => app.entitlement.includes(id));
        if (outside) changed.push(appId);
        return outside;
      },
      permissionChanged: () => false,
      finding: () => Promise.resolve(finding),
      refetched: () => Promise.resolve('unchanged'),
    };
    const pool = new AgentsPool(registry, {hardCapMs: 30000, debugIds: false, updates});
    const {record} = await drain(pool.dispatch('shop-a', turn()));
    expect(changed).toEqual(['shop-a']);
    expect(record).toMatchObject({outcome: 'failed', update: finding});
  });

  test('an app installed from the computer that paints in the v1.0 basic catalog is relayed', async () => {
    const shopC = await startFakeVendor({script: basicPaint, catalogs: []});
    vendors.push(shopC);
    const {stateDir, cards} = await leftFromMain(shopC);
    const registry = new Registry({stateDir, fetchCard: cards.fetch, embedder: new FakeEmbedder()});
    await registry.load();
    await registry.refreshCards();
    const pool = new AgentsPool(registry, {hardCapMs: 30000, debugIds: false});
    const {events, record} = await drain(pool.dispatch('shop-c', turn()));
    expect(record.outcome).toBe('completed');
    expect(events.flatMap(datasOf)).toEqual([
      {version: '1.0', createSurface: {surfaceId: 's1', catalogId: BASIC_CATALOG_ID}},
    ]);
    expect(shopC.requests[0]!.message.metadata?.a2uiRendererCapabilities).toEqual({
      '1.0': {supportedCatalogIds: [BASIC_CATALOG_ID]},
    });
  });
});

describe('a v1.0 build for an id held as an older-version catalog (task-21.15 decision 5)', () => {
  test('installed from the computer, another app following: one finding from the sdk, no walk', async () => {
    const shopC = await startFakeVendor({script: basicPaint, catalogs: []});
    vendors.push(shopC);
    const {stateDir, cards} = await leftFromMain(shopC);
    const registry = new Registry({stateDir, fetchCard: cards.fetch, embedder: new FakeEmbedder()});
    await registry.load();
    const result = await registry.install({
      appId: 'shop-x',
      cardUrl: cards.serve(
        cardFor('http://127.0.0.1:12009', {name: 'Shop X', catalogs: [OLD_SHOP_A]}),
      ),
      catalogs: [await fixtureArtifact(OLD_SHOP_A)],
    });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.findings).toEqual([
      `catalog ${JSON.stringify(OLD_SHOP_A)} at its new build is not an additive evolution of the build shop-a renders in: ${OLDER_VERSION_HELD}`,
    ]);
  });
});
