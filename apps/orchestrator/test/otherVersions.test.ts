/**
 * An agent on another A2UI version (task-21.13 decisions 7, 12): upstream's ADK restaurant finder,
 * declaring v0.8 and v0.9, refused at install as older from disk and from the Store; a card
 * declaring only a newer version refused as newer; upstream's Node restaurant finder, declaring
 * no A2UI, installed on the basic catalog. An installed app whose live card declares only v0.9 is
 * not called and asked for no sign-in, its slot failing as older, the live card fetched again
 * first so an agent that has moved to v1.0 by then is called.
 */
import {readFileSync} from 'node:fs';
import {rm} from 'node:fs/promises';
import {afterEach, describe, expect, test} from 'vitest';
import type {AgentCard as LegacyAgentCard} from '@a2a-js/sdk-v0_3';
import type {ServedCard} from '@a2uiverse/card';
import {BASIC_CATALOG_ID} from '@a2uiverse/sdk';
import {textPart, userMessage} from '../src/a2a/parts.js';
import {AgentsPool, type Credentials} from '../src/agentsPool/agentsPool.js';
import type {DispatchTurn} from '../src/agentsPool/types.js';
import {MarketplaceClient} from '../src/registry/marketplace.js';
import {startFakeMarketplace, type FakeMarketplace} from './fakeMarketplace.js';
import {FAKE_CATALOG_ID, startFakeVendor, type FakeVendor} from './fakeVendor.js';
import {cardFor, cardUrlOf, fixtureArtifact, testRegistry} from './registryFixture.js';

/** A card fixture of the sdk: upstream's sample agents' cards as served. */
const upstream = (name: string): ServedCard & {version: string} =>
  JSON.parse(
    readFileSync(
      new URL(`../../../packages/sdk/js/test/fixtures/cards/${name}`, import.meta.url),
      'utf8',
    ),
  );
const ADK_FINDER = upstream('adk-restaurant-finder.json');
const NODE_FINDER = upstream('node-restaurant-finder.json');

/** A card written by hand that declares A2UI v1.1 alone. */
const newerOnly = (url: string): LegacyAgentCard => ({
  ...cardFor(url, {name: 'Shop B'}),
  capabilities: {
    streaming: true,
    extensions: [{uri: 'https://a2ui.org/a2a-extension/a2ui/v1.1'}],
  },
});

/** The same card declaring A2UI v0.9 alone. */
const olderOnly = (url: string): LegacyAgentCard => ({
  ...cardFor(url, {name: 'GitHub'}),
  capabilities: {
    streaming: true,
    extensions: [
      {
        uri: 'https://a2ui.org/a2a-extension/a2ui/v0.9',
        params: {supportedCatalogIds: [FAKE_CATALOG_ID]},
      },
    ],
  },
});

const dirs: string[] = [];
const vendors: FakeVendor[] = [];
let marketplace: FakeMarketplace | undefined;
afterEach(async () => {
  await Promise.all(vendors.splice(0).map(vendor => vendor.close()));
  await marketplace?.close();
  marketplace = undefined;
  await Promise.all(dirs.splice(0).map(dir => rm(dir, {recursive: true, force: true})));
});

async function fresh(options: Parameters<typeof testRegistry>[1] = {}) {
  const made = await testRegistry([], options);
  dirs.push(made.stateDir);
  return made;
}

describe('the install refused for the A2UI version (task-21.13 decision 12)', () => {
  test('upstream’s ADK restaurant finder, declaring v0.8 and v0.9, refused as older from disk', async () => {
    const {registry, cards} = await fresh();
    const result = await registry.install({
      appId: 'restaurants',
      cardUrl: cards.serveAt('http://localhost:11006/.well-known/agent-card.json', ADK_FINDER),
      catalogs: [],
    });
    expect(result).toMatchObject({ok: false, cause: 'older'});
    expect(registry.installed()).toEqual([]);
  });

  test('the same card refused as older from the Store', async () => {
    marketplace = await startFakeMarketplace();
    const client = new MarketplaceClient({url: marketplace.url, timeoutMs: 2_000});
    const {registry, cards} = await fresh({marketplace: client});
    const cardUrl = cards.serveAt('http://localhost:11006/.well-known/agent-card.json', ADK_FINDER);
    await marketplace.publish('restaurants', {card: ADK_FINDER, cardUrl});
    const result = await registry.installFromMarketplace('restaurants');
    expect(result).toMatchObject({ok: false, cause: 'older'});
    expect(registry.installed()).toEqual([]);
  });

  test('a card declaring only a newer version refused as newer', async () => {
    const {registry, cards} = await fresh();
    const result = await registry.install({
      appId: 'shop-b',
      cardUrl: cards.serve(newerOnly('http://127.0.0.1:12002')),
      catalogs: [],
    });
    expect(result).toMatchObject({ok: false, cause: 'newer'});
  });

  test('upstream’s Node restaurant finder, declaring no A2UI, installs on the basic catalog', async () => {
    const {registry, cards} = await fresh();
    const result = await registry.install({
      appId: 'restaurants',
      cardUrl: cards.serveAt('http://localhost:11002/.well-known/agent-card.json', NODE_FINDER),
      catalogs: [],
    });
    expect(result).toMatchObject({ok: true});
    expect(registry.get('restaurants').entitlement).toEqual([BASIC_CATALOG_ID]);
  });
});

describe('an installed app whose card declares only another version (task-21.13 decision 7)', () => {
  function turn(): DispatchTurn {
    const message = userMessage([textPart('hello')], {contextId: 'o-ctx', taskId: 'o-task'});
    return {clientContextId: 'o-ctx', clientTaskId: 'o-task', message};
  }

  async function drain(handle: ReturnType<AgentsPool['dispatch']>) {
    for await (const event of handle.events) void event;
    return handle.done;
  }

  /** The fake installed on v1.0, its live card then moved to v0.9 alone; a vault that records each ask. */
  async function movedToOlder() {
    const vendor = await startFakeVendor();
    vendors.push(vendor);
    const made = await fresh();
    await made.registry.install({
      appId: 'github',
      cardUrl: made.cards.serve(cardFor(vendor.url, {name: 'GitHub', catalogs: [FAKE_CATALOG_ID]})),
      catalogs: [await fixtureArtifact(FAKE_CATALOG_ID)],
    });
    made.cards.serve(olderOnly(vendor.url));
    await made.registry.refreshCards();
    const asked: string[] = [];
    const credentials: Credentials = {
      prepare: source => (asked.push(source), Promise.resolve(undefined)),
      unauthorized: () => Promise.reject(new Error('not asked')),
      markAgain: () => Promise.resolve(),
      requested: () => ({kind: 'unsigned'}),
    };
    const pool = new AgentsPool(made.registry, {hardCapMs: 30000, debugIds: false, credentials});
    return {...made, vendor, pool, asked};
  }

  test('not called and asked for no sign-in, its slot failing as older, the live card fetched again first', async () => {
    const {vendor, pool, asked, cards} = await movedToOlder();
    const fetchedBefore = cards.fetched.length;
    const record = await drain(pool.dispatch('github', turn()));
    expect(record).toMatchObject({outcome: 'failed', cause: 'older'});
    expect(vendor.requests).toEqual([]);
    expect(asked).toEqual([]);
    expect(cards.fetched.slice(fetchedBefore)).toEqual([cardUrlOf(vendor.url)]);
  });

  test('an agent that has moved to v1.0 by then is called', async () => {
    const {vendor, pool, cards} = await movedToOlder();
    cards.serve(cardFor(vendor.url, {name: 'GitHub', catalogs: [FAKE_CATALOG_ID]}));
    const record = await drain(pool.dispatch('github', turn()));
    expect(record.outcome).toBe('completed');
    expect(vendor.requests).toHaveLength(1);
  });
});
