/**
 * The boot's update check (task-13.5 decision 8): after the cards are fetched and before the
 * orchestrator listens, the check runs once, a newer build of a marketplace app landing before any
 * client preloads; a marketplace that cannot be reached is one outcome line, never a failed boot.
 */
import {mkdtemp, rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {afterEach, describe, expect, test} from 'vitest';
import type {AgentCard} from '@a2a-js/sdk';
import {FakeEmbedder} from '@a2uiverse/embedder';
import {buildOrchestrator} from '../src/app.js';
import {nowhere, startFakeMarketplace, type FakeMarketplace} from './fakeMarketplace.js';
import {FakePlanner, layoutFor} from './fakePlanner.js';
import {FAKE_CATALOG_ID, startFakeVendor, type FakeVendor} from './fakeVendor.js';
import {fixtureArtifact} from './registryFixture.js';

let marketplace: FakeMarketplace | undefined;
let vendor: FakeVendor | undefined;
let dir: string | undefined;
afterEach(async () => {
  await marketplace?.close();
  marketplace = undefined;
  await vendor?.close();
  vendor = undefined;
  if (dir) await rm(dir, {recursive: true, force: true});
  dir = undefined;
});

function build(marketplaceUrl: string, stateDir: string) {
  return buildOrchestrator({
    config: {
      port: 0,
      baseUrl: 'http://127.0.0.1:0',
      stateDir,
      debugIds: false,
      googleApiKey: undefined,
      plannerModelId: 'test-model',
      plannerEffort: 'low',
      shortlistCap: 5,
      synthesizerModelId: 'test-model',
      synthesizerEffort: 'low',
      softDeadlineMs: 10_000,
      hardCapMs: 300_000,
      heartbeatMs: 30_000,
      faults: new Map(),
      marketplaceUrl,
      marketplaceTimeoutMs: 2_000,
    },
    overrides: {embedder: new FakeEmbedder(), planner: new FakePlanner(() => layoutFor([]))},
  });
}

describe('the boot runs the check (task-13.5 decisions 8, 9)', () => {
  test('a newer build of a marketplace app is installed before the orchestrator listens', async () => {
    marketplace = await startFakeMarketplace();
    vendor = await startFakeVendor({name: 'Gmail', catalogs: [FAKE_CATALOG_ID]});
    dir = await mkdtemp(join(tmpdir(), 'a2uiverse-boot-'));
    const cardUrl = `${vendor.url}/.well-known/agent-card.json`;
    const card = (await (await fetch(cardUrl)).json()) as AgentCard;
    await marketplace.publish('gmail', {
      card,
      cardUrl,
      catalogs: [await fixtureArtifact(FAKE_CATALOG_ID)],
    });
    const first = build(marketplace.url, dir);
    await first.init();
    expect(first.bootCheck).toMatchObject({marketplace: 'reached', states: [], updated: []});
    const installed = await first.registry.installFromMarketplace('gmail');
    expect(installed.ok).toBe(true);

    const entry = await marketplace.publish('gmail', {
      card,
      cardUrl,
      catalogs: [await fixtureArtifact(FAKE_CATALOG_ID, {version: '0.2.0'})],
    });
    const second = build(marketplace.url, dir);
    await second.init();
    expect(second.bootCheck?.updated).toEqual([
      {appId: 'gmail', summary: expect.stringMatching(/^updated gmail/)},
    ]);
    expect(second.bootCheck?.states).toEqual([
      expect.objectContaining({appId: 'gmail', state: 'up-to-date'}),
    ]);
    expect(second.registry.installed()[0].catalogs).toEqual(entry.catalogs);
  });

  test('a marketplace that cannot be reached is one outcome, the boot going on', async () => {
    vendor = await startFakeVendor({name: 'Shop A', catalogs: []});
    dir = await mkdtemp(join(tmpdir(), 'a2uiverse-boot-'));
    const built = build(await nowhere(), dir);
    await built.init();
    const installed = await built.registry.install({
      appId: 'shop-a',
      cardUrl: `${vendor.url}/.well-known/agent-card.json`,
      catalogs: [],
    });
    expect(installed.ok).toBe(true);
    const again = build(await nowhere(), dir);
    await again.init();
    expect(again.bootCheck).toMatchObject({
      marketplace: 'unreached',
      reason: 'ECONNREFUSED',
      states: [{appId: 'shop-a', installedVersion: expect.any(String), state: 'unknown'}],
    });
    expect(again.registry.list().map(app => app.id)).toEqual(['shop-a']);
  });
});
