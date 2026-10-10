/**
 * The update check (task-13.5 decisions 7, 8, 9, 10): the eight states over the installed record,
 * the entry and the live card; one operation that fetches, computes, installs the newer builds of
 * marketplace apps by itself, reports drift and answers the states as they stand.
 */
import {rm} from 'node:fs/promises';
import {afterEach, describe, expect, test} from 'vitest';
import type {AgentCard} from '@a2a-js/sdk';
import {BASIC_CATALOG_ID, readUpdateState, type IndexEntry} from '@a2uiverse/sdk';
import type {EntryLookup} from '../src/registry/marketplace.js';
import {MarketplaceClient} from '../src/registry/marketplace.js';
import type {InstalledRecord} from '../src/registry/types.js';
import {UpdateCheck, updateStateOf} from '../src/registry/updates.js';
import {nowhere, startFakeMarketplace, type FakeMarketplace} from './fakeMarketplace.js';
import {cardFor, fixtureArtifact, testRegistry, type TestRegistry} from './registryFixture.js';

const GMAIL = 'https://example.com/gmail/catalog.json';
const GMAIL_2 = 'https://example.com/gmail/v2/catalog.json';
const CALENDAR = 'https://example.com/calendar/catalog.json';
const AGENT = 'http://127.0.0.1:11002';

const record = (
  card: AgentCard,
  catalogs: Record<string, string>,
  source: InstalledRecord['source'] = 'marketplace',
): InstalledRecord => ({
  id: 'gmail',
  cardUrl: `${AGENT}/.well-known/agent-card.json`,
  card,
  catalogs,
  entitlement: [BASIC_CATALOG_ID, ...Object.keys(catalogs)],
  installedAt: '2026-10-10T00:00:00.000Z',
  source,
});

const entryOf = (
  card: AgentCard,
  catalogs: Record<string, string>,
  extra: Partial<IndexEntry> = {},
): EntryLookup => ({
  kind: 'entry',
  entry: {
    appId: 'gmail',
    publisher: 'tests',
    cardUrl: `${AGENT}/.well-known/agent-card.json`,
    card: card as IndexEntry['card'],
    catalogs,
    versions: [card.version],
    publishedAt: '2026-10-10T00:00:00.000Z',
    retired: [],
    ...extra,
  },
});

const v = (card: AgentCard, version: string): AgentCard => ({...card, version});

describe('updateStateOf: the eight states in order (task-13.2 decision 8, task-13.5 decision 7)', () => {
  const installedCard = cardFor(AGENT, {catalogs: [GMAIL]});
  const installed = record(installedCard, {[GMAIL]: 'sha256-old'});

  test('unknown when the marketplace was not reached, or the entry is malformed', () => {
    expect(
      updateStateOf(installed, {kind: 'unreached', reason: 'ECONNREFUSED'}, installedCard),
    ).toEqual({appId: 'gmail', installedVersion: '0.0.0', state: 'unknown'});
    expect(updateStateOf(installed, {kind: 'malformed', errors: ['x']}, installedCard).state).toBe(
      'unknown',
    );
  });

  test('not published when the marketplace has no entry', () => {
    expect(updateStateOf(installed, {kind: 'not-published'}, installedCard)).toEqual({
      appId: 'gmail',
      installedVersion: '0.0.0',
      state: 'not-published',
    });
  });

  test('ahead of the Store from the live card, before anything else', () => {
    const live = v(cardFor(AGENT, {catalogs: [GMAIL, CALENDAR]}), '0.5.0');
    const published = v(cardFor(AGENT, {catalogs: [GMAIL_2]}), '1.0.0');
    const state = updateStateOf(installed, entryOf(published, {[GMAIL_2]: 'sha256-two'}), live);
    expect(state).toEqual({
      appId: 'gmail',
      installedVersion: '0.0.0',
      state: 'ahead-of-store',
      publishedVersion: '1.0.0',
      catalogIds: [GMAIL, CALENDAR],
      version: '0.5.0',
    });
  });

  test('no live card this run: no drift computed, the other states judged', () => {
    const published = v(cardFor(AGENT, {catalogs: [GMAIL]}), '0.0.0');
    expect(updateStateOf(installed, entryOf(published, {[GMAIL]: 'sha256-old'}), null).state).toBe(
      'up-to-date',
    );
  });

  test('update required when an installed line is retired by the published card', () => {
    const published = v(cardFor(AGENT, {catalogs: [GMAIL_2]}), '1.0.0');
    const state = updateStateOf(
      installed,
      entryOf(published, {[GMAIL_2]: 'sha256-two'}, {retired: [GMAIL]}),
      published,
    );
    expect(state).toEqual({
      appId: 'gmail',
      installedVersion: '0.0.0',
      state: 'update-required',
      publishedVersion: '1.0.0',
      retired: [GMAIL],
    });
  });

  test('a major update when the published card adds an id and keeps the installed ones, the moved build named', () => {
    const published = v(cardFor(AGENT, {catalogs: [GMAIL, GMAIL_2]}), '1.0.0');
    const state = updateStateOf(
      installed,
      entryOf(published, {[GMAIL]: 'sha256-new', [GMAIL_2]: 'sha256-two'}),
      published,
    );
    expect(state).toEqual({
      appId: 'gmail',
      installedVersion: '0.0.0',
      state: 'major-update',
      publishedVersion: '1.0.0',
      newCatalogIds: [GMAIL_2],
      builds: [{catalogId: GMAIL, installed: 'sha256-old', published: 'sha256-new'}],
    });
  });

  test('a card update when the version moved with no id added or dropped: the new scopes from `security`, a build riding with it named', () => {
    const was: AgentCard = {
      ...installedCard,
      securitySchemes: {google: {type: 'oauth2', flows: {}}},
      security: [{google: ['mail.read']}],
    };
    const published: AgentCard = {
      ...v(installedCard, '0.1.0'),
      securitySchemes: {
        google: {type: 'oauth2', flows: {}},
        key: {type: 'apiKey', in: 'header', name: 'X'},
      },
      security: [{google: ['mail.read', 'mail.send']}, {key: []}],
    };
    const state = updateStateOf(
      record(was, {[GMAIL]: 'sha256-old'}),
      entryOf(published, {[GMAIL]: 'sha256-new'}),
      published,
    );
    expect(state).toEqual({
      appId: 'gmail',
      installedVersion: '0.0.0',
      state: 'card-update',
      publishedVersion: '0.1.0',
      newScopes: [
        {scheme: 'google', scopes: ['mail.send']},
        {scheme: 'key', scopes: []},
      ],
      builds: [{catalogId: GMAIL, installed: 'sha256-old', published: 'sha256-new'}],
    });
  });

  test('a card update with nothing new to ask carries no scopes', () => {
    const published = v(installedCard, '0.1.0');
    const state = updateStateOf(installed, entryOf(published, {[GMAIL]: 'sha256-old'}), published);
    expect(state).toMatchObject({state: 'card-update', newScopes: [], builds: []});
  });

  test('a newer build when only a build moved', () => {
    const state = updateStateOf(
      installed,
      entryOf(installedCard, {[GMAIL]: 'sha256-new'}),
      installedCard,
    );
    expect(state).toEqual({
      appId: 'gmail',
      installedVersion: '0.0.0',
      state: 'newer-build',
      publishedVersion: '0.0.0',
      builds: [{catalogId: GMAIL, installed: 'sha256-old', published: 'sha256-new'}],
    });
  });

  test('up to date otherwise', () => {
    expect(
      updateStateOf(installed, entryOf(installedCard, {[GMAIL]: 'sha256-old'}), installedCard),
    ).toEqual({
      appId: 'gmail',
      installedVersion: '0.0.0',
      state: 'up-to-date',
      publishedVersion: '0.0.0',
    });
  });

  test('every state is one the sdk reads back', () => {
    const published = v(cardFor(AGENT, {catalogs: [GMAIL, GMAIL_2]}), '1.0.0');
    for (const state of [
      updateStateOf(installed, {kind: 'not-published'}, installedCard),
      updateStateOf(
        installed,
        entryOf(published, {[GMAIL]: 'sha256-new', [GMAIL_2]: 'x'}),
        installedCard,
      ),
      updateStateOf(installed, entryOf(installedCard, {[GMAIL]: 'sha256-new'}), installedCard),
    ]) {
      expect(readUpdateState(JSON.parse(JSON.stringify(state)))).toEqual(state);
    }
  });
});

let marketplace: FakeMarketplace | undefined;
let made: TestRegistry | undefined;
afterEach(async () => {
  await marketplace?.close();
  marketplace = undefined;
  if (made) await rm(made.stateDir, {recursive: true, force: true});
  made = undefined;
});

async function setUp(options: {marketplaceUrl?: string} = {}) {
  marketplace = await startFakeMarketplace();
  const client = new MarketplaceClient({
    url: options.marketplaceUrl ?? marketplace.url,
    timeoutMs: 2_000,
  });
  made = await testRegistry([], {marketplace: client});
  const check = new UpdateCheck({registry: made.registry, marketplace: client});
  return {...made, marketplace, client, check};
}

describe('the check (task-13.5 decisions 8, 9, 10)', () => {
  test('a marketplace that cannot be reached makes every state unknown and says so', async () => {
    const {registry, cards, check} = await setUp({marketplaceUrl: await nowhere()});
    await registry.install({
      appId: 'shop-a',
      cardUrl: cards.serve(cardFor('http://127.0.0.1:12001')),
      catalogs: [],
    });
    const outcome = await check.check();
    expect(outcome.marketplace).toBe('unreached');
    expect(outcome.reason).toBe('ECONNREFUSED');
    expect(outcome.states).toEqual([
      {appId: 'shop-a', installedVersion: '0.0.0', state: 'unknown'},
    ]);
  });

  test('one entry per installed app: a malformed one makes its app unknown, the others judged', async () => {
    const {registry, cards, marketplace, check} = await setUp();
    const shop = cardFor('http://127.0.0.1:12001', {name: 'Shop A'});
    const inbox = cardFor('http://127.0.0.1:12002', {name: 'Inbox'});
    await registry.install({appId: 'shop-a', cardUrl: cards.serve(shop), catalogs: []});
    await registry.install({appId: 'inbox', cardUrl: cards.serve(inbox), catalogs: []});
    await marketplace.publish('shop-a', {card: shop, cardUrl: cards.serve(shop)});
    marketplace.serveEntry('inbox', {appId: 'inbox', nonsense: true});
    const outcome = await check.check();
    expect(outcome.marketplace).toBe('reached');
    expect(outcome.states).toEqual([
      {appId: 'inbox', installedVersion: '0.0.0', state: 'unknown'},
      {appId: 'shop-a', installedVersion: '0.0.0', state: 'up-to-date', publishedVersion: '0.0.0'},
    ]);
    expect(marketplace.requests.sort()).toEqual([
      '/apps/inbox/entry.json',
      '/apps/shop-a/entry.json',
    ]);
  });

  test('a newer build of a marketplace app installs itself; the state answered is after it, the journal line automatic', async () => {
    const {registry, cards, marketplace, check, journal} = await setUp();
    const card = cardFor(AGENT, {catalogs: [GMAIL]});
    const cardUrl = cards.serve(card);
    const first = await fixtureArtifact(GMAIL);
    await marketplace.publish('gmail', {card, cardUrl, catalogs: [first]});
    await registry.installFromMarketplace('gmail');
    const second = await fixtureArtifact(GMAIL, {version: '0.2.0'});
    const entry = await marketplace.publish('gmail', {card, cardUrl, catalogs: [second]});

    const outcome = await check.check();
    expect(outcome.updated).toEqual([
      {appId: 'gmail', summary: expect.stringMatching(/^updated gmail/)},
    ]);
    expect(outcome.failed).toEqual([]);
    expect(outcome.states).toEqual([
      {appId: 'gmail', installedVersion: '0.0.0', state: 'up-to-date', publishedVersion: '0.0.0'},
    ]);
    expect(registry.installed()[0].catalogs).toEqual(entry.catalogs);
    expect(journal.entries.at(-1)).toMatchObject({
      operation: 'install-over',
      appId: 'gmail',
      outcome: 'installed',
      source: 'marketplace',
      automatic: true,
    });
  });

  test('a newer build of an app from a local pack is reported, never installed', async () => {
    const {registry, cards, marketplace, check} = await setUp();
    const card = cardFor(AGENT, {catalogs: [GMAIL]});
    const cardUrl = cards.serve(card);
    const first = await fixtureArtifact(GMAIL);
    await registry.install({appId: 'gmail', cardUrl, catalogs: [first]});
    const second = await fixtureArtifact(GMAIL, {version: '0.2.0'});
    await marketplace.publish('gmail', {card, cardUrl, catalogs: [second]});
    const before = registry.installed()[0];
    const outcome = await check.check();
    expect(outcome.updated).toEqual([]);
    expect(outcome.states[0]).toMatchObject({state: 'newer-build'});
    expect(registry.installed()[0]).toEqual(before);
  });

  test('a failed automatic update leaves the installed build, the state still the newer build, the refusal journaled', async () => {
    const {registry, cards, marketplace, check, journal} = await setUp();
    const card = cardFor(AGENT, {catalogs: [GMAIL]});
    const cardUrl = cards.serve(card);
    const first = await fixtureArtifact(GMAIL);
    await marketplace.publish('gmail', {card, cardUrl, catalogs: [first]});
    await registry.installFromMarketplace('gmail');
    const second = await fixtureArtifact(GMAIL, {version: '0.2.0'});
    await marketplace.publish('gmail', {card, cardUrl, catalogs: [second]});
    cards.cards.delete(cardUrl); // the agent is down: the install's card fetch fails
    const before = registry.installed()[0];
    const outcome = await check.check();
    expect(outcome.updated).toEqual([]);
    expect(outcome.failed).toEqual([
      {appId: 'gmail', findings: [expect.stringMatching(/could not be fetched/)]},
    ]);
    expect(outcome.states[0]).toMatchObject({state: 'newer-build'});
    expect(registry.installed()[0]).toEqual(before);
    expect(journal.entries.at(-1)).toMatchObject({
      outcome: 'refused',
      automatic: true,
      source: 'marketplace',
    });
  });

  test('an app ahead of the Store is reported, every check that sees it', async () => {
    const {registry, cards, marketplace, check} = await setUp();
    const published = cardFor(AGENT, {catalogs: [GMAIL]});
    const cardUrl = cards.serve(published);
    await marketplace.publish('gmail', {
      card: published,
      cardUrl,
      catalogs: [await fixtureArtifact(GMAIL)],
    });
    await registry.installFromMarketplace('gmail');
    cards.cards.set(cardUrl, cardFor(AGENT, {catalogs: [GMAIL, CALENDAR]}));
    await registry.refreshCards();
    const outcome = await check.check();
    expect(outcome.states[0]).toMatchObject({state: 'ahead-of-store', catalogIds: [CALENDAR]});
    expect(outcome.reported).toEqual(['gmail']);
    await check.check();
    await new Promise(resolve => setTimeout(resolve, 50));
    expect(marketplace.reports).toEqual(['gmail', 'gmail']);
  });

  test('concurrent checks coalesce onto the one in flight', async () => {
    const {registry, cards, marketplace, check} = await setUp();
    const shop = cardFor('http://127.0.0.1:12001');
    await registry.install({appId: 'shop-a', cardUrl: cards.serve(shop), catalogs: []});
    await marketplace.publish('shop-a', {card: shop, cardUrl: cards.serve(shop)});
    const [a, b] = await Promise.all([check.check(), check.check()]);
    expect(a).toBe(b);
    expect(marketplace.requests).toEqual(['/apps/shop-a/entry.json']);
  });
});
