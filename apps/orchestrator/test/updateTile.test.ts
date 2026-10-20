/**
 * The update on the canvas (task 15.5): whether an app can paint in what it is installed with,
 * judged before the call from the live card the run holds and after a refused paint from the card
 * fetched again, and the finding a slot's update tile is drawn from — the update state of a check
 * of that one app, its publisher and its line.
 */
import {rm} from 'node:fs/promises';
import {afterEach, describe, expect, test} from 'vitest';
import {BASIC_CATALOG_ID} from '@a2uiverse/sdk';
import {MarketplaceClient} from '../src/registry/marketplace.js';
import {UpdateTile} from '../src/registry/updateTile.js';
import {UpdateCheck} from '../src/registry/updates.js';
import {startFakeMarketplace, type FakeMarketplace} from './fakeMarketplace.js';
import {cardFor, fixtureArtifact, testRegistry, type TestRegistry} from './registryFixture.js';

const GMAIL = 'https://example.com/gmail/catalog.json';
const GMAIL_2 = 'https://example.com/gmail/v2/catalog.json';
const AGENT = 'http://127.0.0.1:11002';

let marketplace: FakeMarketplace | undefined;
let made: TestRegistry | undefined;
afterEach(async () => {
  await marketplace?.close();
  marketplace = undefined;
  if (made) await rm(made.stateDir, {recursive: true, force: true});
  made = undefined;
});

/** Gmail published on GMAIL by Acme and installed from the Store; its live card the test's to move. */
async function setUp(options: {liveShort?: (source: string) => boolean} = {}) {
  marketplace = await startFakeMarketplace();
  const client = new MarketplaceClient({url: marketplace.url, timeoutMs: 2_000});
  made = await testRegistry([], {marketplace: client});
  const {registry, cards} = made;
  const card = cardFor(AGENT, {catalogs: [GMAIL]});
  const cardUrl = cards.serve(card);
  await marketplace.publish('gmail', {
    card,
    cardUrl,
    publisher: 'Acme',
    catalogs: [await fixtureArtifact(GMAIL)],
  });
  const installed = await registry.installFromMarketplace('gmail');
  if (!installed.ok) throw new Error(installed.findings.join('; '));
  const updates = new UpdateCheck({registry, marketplace: client});
  const tile = new UpdateTile({
    registry,
    updates,
    ...(options.liveShort ? {liveShort: options.liveShort} : {}),
    refetchMs: 50,
  });
  /** The agent moves to `catalogs`; `held` makes the run hold that card, as a boot or check does. */
  const move = async (catalogs: string[], held = true) => {
    cards.cards.set(cardUrl, {...cardFor(AGENT, {catalogs}), version: '1.0.0'});
    if (held) await registry.refreshCards();
  };
  return {registry, cards, cardUrl, marketplace, tile, move};
}

describe('the catalog case before the call (task-15.5 decisions 1, 2)', () => {
  test('a live card naming nothing in the entitlement cannot paint here', async () => {
    const {tile, move} = await setUp();
    expect(tile.catalogsChanged('gmail')).toBe(false);
    await move([GMAIL_2]);
    expect(tile.catalogsChanged('gmail')).toBe(true);
  });

  test('a live card naming an installed id beside a new one, or the public catalog, still can', async () => {
    const {tile, move} = await setUp();
    await move([GMAIL, GMAIL_2]);
    expect(tile.catalogsChanged('gmail')).toBe(false);
    await move([BASIC_CATALOG_ID]);
    expect(tile.catalogsChanged('gmail')).toBe(false);
    await move([]);
    expect(tile.catalogsChanged('gmail')).toBe(false);
  });

  test('no live card held, or no such app, judges nothing', async () => {
    const {tile, cards, cardUrl, registry} = await setUp();
    cards.cards.delete(cardUrl);
    await registry.refreshCards();
    expect(registry.card('gmail')).toBeNull();
    expect(tile.catalogsChanged('gmail')).toBe(false);
    expect(tile.catalogsChanged('nobody')).toBe(false);
  });
});

describe('the new-permission case (task-15.5 decision 3)', () => {
  test("the vault's judgement of the account on the live card, by source", async () => {
    const asked: string[] = [];
    const {tile} = await setUp({liveShort: source => (asked.push(source), source === 'gmail.2')});
    expect(tile.permissionChanged('gmail.1')).toBe(false);
    expect(tile.permissionChanged('gmail.2')).toBe(true);
    expect(asked).toEqual(['gmail.1', 'gmail.2']);
  });
});

describe('the finding: the update state of a check of that one app, its publisher, its line (task-15.5 decisions 5, 6)', () => {
  test('the Store holding a version the app can paint in: needs an update', async () => {
    const {tile, move, marketplace, cards, cardUrl} = await setUp();
    const published = {...cardFor(AGENT, {catalogs: [GMAIL_2]}), version: '1.0.0'};
    await marketplace.publish('gmail', {
      card: published,
      cardUrl,
      publisher: 'Acme',
      catalogs: [await fixtureArtifact(GMAIL_2)],
      versions: ['0.0.0', '1.0.0'],
    });
    await move([GMAIL_2]);
    expect(cards.cards.get(cardUrl)).toEqual(published);
    expect(await tile.finding('gmail', 'catalogs')).toEqual({
      case: 'catalogs',
      state: {
        appId: 'gmail',
        installedVersion: '0.0.0',
        state: 'update-required',
        publishedVersion: '1.0.0',
        retired: [GMAIL],
        newScopes: [],
      },
      publisher: 'Acme',
      line: 'update',
    });
  });

  test('the Store holding nothing the app can paint in: waiting on its publisher', async () => {
    const {tile, move} = await setUp();
    await move([GMAIL_2]);
    expect(await tile.finding('gmail', 'catalogs')).toMatchObject({
      state: {state: 'ahead-of-store'},
      publisher: 'Acme',
      line: 'waiting',
    });
  });

  test('the Store unreached, or with no entry for the app', async () => {
    const {tile, move, marketplace} = await setUp();
    await move([GMAIL_2]);
    marketplace.unpublish('gmail');
    expect(await tile.finding('gmail', 'permission')).toEqual({
      case: 'permission',
      state: {appId: 'gmail', installedVersion: '0.0.0', state: 'not-published'},
      line: 'none',
    });
    await marketplace.close();
    expect(await tile.finding('gmail', 'catalogs')).toMatchObject({
      state: {state: 'unknown'},
      line: 'unreached',
    });
    expect(await tile.finding('nobody', 'catalogs')).toBeUndefined();
  });
});

describe('the catch after the call: the live card fetched again (task-15.5 decisions 4, 14)', () => {
  test('a card naming a catalog id beyond the entitlement has changed, and the run holds it', async () => {
    const {tile, move, registry} = await setUp();
    await move([GMAIL, GMAIL_2], false);
    expect(await tile.refetched('gmail')).toBe('changed');
    expect(registry.card('gmail')).toMatchObject({version: '1.0.0'});
  });

  test('a card naming nothing beyond it is unchanged; one that does not answer in time, unanswered', async () => {
    const {tile, cards, cardUrl} = await setUp();
    expect(await tile.refetched('gmail')).toBe('unchanged');
    cards.hanging.add(cardUrl);
    expect(await tile.refetched('gmail')).toBe('unanswered');
    cards.hanging.delete(cardUrl);
    cards.cards.delete(cardUrl);
    expect(await tile.refetched('gmail')).toBe('unanswered');
  });
});
