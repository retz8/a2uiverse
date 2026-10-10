/**
 * Install from the marketplace by app id (task-13.5 decisions 2, 3, 4): the entry read, the files
 * the registry lacks fetched, the same core as a local install; the Store-behind refusal and the
 * report that rides on it.
 */
import {readFile, rm} from 'node:fs/promises';
import {join} from 'node:path';
import {afterEach, describe, expect, test} from 'vitest';
import {ARTIFACT_DESCRIPTOR_FILE, artifactIdOf} from '@a2uiverse/sdk';
import {MarketplaceClient} from '../src/registry/marketplace.js';
import {
  cardFor,
  cardUrlOf,
  fixtureArtifact,
  testRegistry,
  type TestRegistry,
} from './registryFixture.js';
import {nowhere, startFakeMarketplace, type FakeMarketplace} from './fakeMarketplace.js';

const GMAIL = 'https://example.com/gmail/catalog.json';
const CALENDAR = 'https://example.com/calendar/catalog.json';
const AGENT = 'http://127.0.0.1:11002';

let marketplace: FakeMarketplace | undefined;
let made: TestRegistry | undefined;
afterEach(async () => {
  await marketplace?.close();
  marketplace = undefined;
  if (made) await rm(made.stateDir, {recursive: true, force: true});
  made = undefined;
});

const idOf = async (files: Map<string, Uint8Array>) =>
  artifactIdOf(files.get(ARTIFACT_DESCRIPTOR_FILE)!);

/** A registry on a fresh fake marketplace, the live card served by the card stub. */
async function setUp(options: {marketplaceUrl?: string} = {}) {
  marketplace = await startFakeMarketplace();
  const client = new MarketplaceClient({
    url: options.marketplaceUrl ?? marketplace.url,
    timeoutMs: 2_000,
  });
  made = await testRegistry([], {marketplace: client});
  return {...made, marketplace, client};
}

describe('install by id', () => {
  test('reads the entry, fetches the card from its URL and every file into an empty registry; the record came from the marketplace', async () => {
    const {registry, cards, marketplace, stateDir} = await setUp();
    const artifact = await fixtureArtifact(GMAIL);
    const card = cardFor(AGENT, {name: 'Gmail', catalogs: [GMAIL]});
    const cardUrl = cards.serve(card);
    await marketplace.publish('gmail', {card, cardUrl, catalogs: [artifact]});

    const result = await registry.installFromMarketplace('gmail');
    expect(result).toMatchObject({ok: true, appId: 'gmail', replaced: false, notes: []});
    const id = await idOf(artifact);
    expect(registry.installed()).toEqual([
      {
        id: 'gmail',
        cardUrl,
        card,
        catalogs: {[GMAIL]: id},
        entitlement: expect.any(Array),
        installedAt: expect.any(String),
        source: 'marketplace',
      },
    ]);
    expect(cards.fetched).toEqual([cardUrl]);
    for (const [path, bytes] of artifact) {
      expect(
        new Uint8Array(await readFile(join(stateDir, 'registry', 'artifacts', id, path))),
      ).toEqual(bytes);
    }
    expect(marketplace.requests).toEqual([
      '/apps/gmail/entry.json',
      `/artifacts/${id}/${ARTIFACT_DESCRIPTOR_FILE}`,
      `/artifacts/${id}/catalog.json`,
      `/artifacts/${id}/index.js`,
    ]);
  });

  test('a second build fetches only the files the registry lacks; the rest are copied from the held build', async () => {
    const {registry, cards, marketplace} = await setUp();
    const card = cardFor(AGENT, {catalogs: [GMAIL]});
    const cardUrl = cards.serve(card);
    const first = await fixtureArtifact(GMAIL);
    await marketplace.publish('gmail', {card, cardUrl, catalogs: [first]});
    await registry.installFromMarketplace('gmail');
    marketplace.requests.length = 0;

    // The same catalog and entry, a new descriptor: only the descriptor's hash is new.
    const second = await fixtureArtifact(GMAIL, {version: '0.2.0'});
    await marketplace.publish('gmail', {card, cardUrl, catalogs: [second]});
    const result = await registry.installFromMarketplace('gmail');
    expect(result).toMatchObject({ok: true, replaced: true});
    const id = await idOf(second);
    expect(marketplace.requests).toEqual([
      '/apps/gmail/entry.json',
      `/artifacts/${id}/${ARTIFACT_DESCRIPTOR_FILE}`,
    ]);
    expect(registry.table()).toContainEqual({catalogId: GMAIL, artifact: id, entry: 'index.js'});
  });

  test('a held artifact id is not fetched at all', async () => {
    const {registry, cards, marketplace} = await setUp();
    const artifact = await fixtureArtifact(GMAIL);
    const card = cardFor(AGENT, {catalogs: [GMAIL]});
    const cardUrl = cards.serve(card);
    await registry.install({appId: 'gmail', cardUrl, catalogs: [artifact]});
    await marketplace.publish('gmail', {card, cardUrl, catalogs: [artifact]});
    const result = await registry.installFromMarketplace('gmail');
    expect(result).toMatchObject({ok: true, replaced: true});
    expect(marketplace.requests).toEqual(['/apps/gmail/entry.json']);
    expect(registry.installed()[0].source).toBe('marketplace');
  });

  test('an app the marketplace does not list is refused naming the marketplace', async () => {
    const {registry, marketplace, journal} = await setUp();
    const result = await registry.installFromMarketplace('gmail');
    expect(result).toEqual({
      ok: false,
      findings: [`app "gmail" is not published on the marketplace at ${marketplace.url}`],
    });
    expect(journal.entries.at(-1)).toMatchObject({
      operation: 'install',
      appId: 'gmail',
      outcome: 'refused',
      source: 'marketplace',
    });
  });

  test('a marketplace that cannot be reached is refused naming the address', async () => {
    const url = await nowhere();
    const {registry} = await setUp({marketplaceUrl: url});
    const result = await registry.installFromMarketplace('gmail');
    expect(result).toEqual({
      ok: false,
      findings: [`the marketplace at ${url} could not be reached: ECONNREFUSED`],
    });
  });
});

describe('the Store behind the app (task-13.5 decision 4)', () => {
  test('a catalog id the Store has no build for refuses in the Store-behind words and reports', async () => {
    const {registry, cards, marketplace} = await setUp();
    const published = cardFor(AGENT, {catalogs: [GMAIL]});
    const live = cardFor(AGENT, {catalogs: [GMAIL, CALENDAR]});
    const cardUrl = cards.serve(live);
    await marketplace.publish('gmail', {
      card: published,
      cardUrl,
      catalogs: [await fixtureArtifact(GMAIL)],
    });
    const result = await registry.installFromMarketplace('gmail');
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.findings).toHaveLength(1);
    expect(result.findings[0]).toMatch(/^the Store is behind gmail/);
    expect(result.findings[0]).toContain(CALENDAR);
    expect(result.findings[0]).not.toMatch(/broken/);
    expect(result.findings[0]).toMatch(/publisher/);
    await new Promise(resolve => setTimeout(resolve, 50));
    expect(marketplace.reports).toEqual(['gmail']);
    expect(registry.list()).toEqual([]);
  });

  test('a version the Store does not know refuses the same way', async () => {
    const {registry, cards, marketplace} = await setUp();
    const published = cardFor(AGENT, {catalogs: [GMAIL]});
    const live = {...cardFor(AGENT, {catalogs: [GMAIL]}), version: '0.1.0'};
    const cardUrl = cards.serve(live);
    await marketplace.publish('gmail', {
      card: published,
      cardUrl,
      catalogs: [await fixtureArtifact(GMAIL)],
    });
    const result = await registry.installFromMarketplace('gmail');
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.findings[0]).toMatch(/^the Store is behind gmail/);
    expect(result.findings[0]).toContain('version 0.1.0');
    await new Promise(resolve => setTimeout(resolve, 50));
    expect(marketplace.reports).toEqual(['gmail']);
  });

  test('the marketplace’s flag alone never refuses: a covered live card installs', async () => {
    const {registry, cards, marketplace} = await setUp();
    const card = cardFor(AGENT, {catalogs: [GMAIL]});
    const cardUrl = cards.serve(card);
    await marketplace.publish('gmail', {
      card,
      cardUrl,
      catalogs: [await fixtureArtifact(GMAIL)],
      aheadOfStore: {catalogIds: [CALENDAR], seenAt: new Date().toISOString()},
    });
    const result = await registry.installFromMarketplace('gmail');
    expect(result).toMatchObject({ok: true, appId: 'gmail'});
    expect(marketplace.reports).toEqual([]);
  });

  test('a live card that cannot be fetched is refused as any install is, no report', async () => {
    const {registry, marketplace} = await setUp();
    const card = cardFor(AGENT, {catalogs: [GMAIL]});
    await marketplace.publish('gmail', {
      card,
      cardUrl: cardUrlOf(AGENT),
      catalogs: [await fixtureArtifact(GMAIL)],
    });
    const result = await registry.installFromMarketplace('gmail');
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.findings[0]).toMatch(/could not be fetched/);
    expect(marketplace.reports).toEqual([]);
  });
});
