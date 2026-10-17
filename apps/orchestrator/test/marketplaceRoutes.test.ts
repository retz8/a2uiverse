/** The marketplace's half of `orchestratorApi` (task 14.4): the Store's reads, the preview's files, the publisher. */
import {createServer, type Server} from 'node:http';
import {readFile, rm, stat, writeFile} from 'node:fs/promises';
import {join} from 'node:path';
import {afterEach, describe, expect, test, vi} from 'vitest';
import express from 'express';
import {ARTIFACT_DESCRIPTOR_FILE, artifactIdOf, type IndexEntry} from '@a2uiverse/sdk';
import {ArtifactRelay} from '../src/marketplace/artifacts.js';
import {
  PUBLISHER_FILE,
  Publisher,
  PublisherStore,
  type PublisherJournalEntry,
} from '../src/marketplace/publisher.js';
import {MARKETPLACE_ROUTE_PREFIX, marketplaceRoutes} from '../src/marketplace/routes.js';
import {MarketplaceClient} from '../src/registry/marketplace.js';
import {UpdateCheck} from '../src/registry/updates.js';
import {originAllowed, writeGuard} from '../src/writeGuard.js';
import {nowhere, startFakeMarketplace, type FakeMarketplace} from './fakeMarketplace.js';
import {cardFor, fixtureArtifact, testRegistry, type TestRegistry} from './registryFixture.js';

const GMAIL = 'https://example.com/gmail/catalog.json';
const SHOP = 'https://example.com/shop/catalog.json';
const PAGE = 'http://localhost:5173';
const WRITE_TOKEN = 'w'.repeat(64);

let server: Server | undefined;
let made: TestRegistry | undefined;
let marketplace: FakeMarketplace | undefined;
afterEach(async () => {
  await new Promise<void>(resolve => (server ? server.close(() => resolve()) : resolve()));
  server = undefined;
  await marketplace?.close();
  marketplace = undefined;
  if (made) await rm(made.stateDir, {recursive: true, force: true});
  made = undefined;
  vi.restoreAllMocks();
});

async function serve({marketplaceUrl}: {marketplaceUrl?: string} = {}) {
  marketplace = await startFakeMarketplace();
  const client = new MarketplaceClient({url: marketplaceUrl ?? marketplace.url, timeoutMs: 2_000});
  made = await testRegistry([], {marketplace: client});
  const updates = new UpdateCheck({registry: made.registry, marketplace: client});
  const store = new PublisherStore(made.stateDir);
  await store.load();
  const journal: PublisherJournalEntry[] = [];
  const publisher = new Publisher({store, marketplace: client, journal: e => journal.push(e)});
  const app = express();
  app.use(
    MARKETPLACE_ROUTE_PREFIX,
    marketplaceRoutes({
      registry: made.registry,
      marketplace: client,
      updates,
      artifacts: new ArtifactRelay(client),
      publisher,
      resolveCard: made.cards.resolve,
      guard: writeGuard({token: () => WRITE_TOKEN, allowed: originAllowed(PAGE)}),
    }),
  );
  server = createServer(app);
  await new Promise<void>(resolve => server!.listen(0, '127.0.0.1', resolve));
  const address = server.address();
  if (!address || typeof address === 'string') throw new Error('no port');
  return {
    base: `http://127.0.0.1:${address.port}${MARKETPLACE_ROUTE_PREFIX}`,
    marketplace,
    registry: made.registry,
    cards: made.cards,
    stateDir: made.stateDir,
    updates,
    store,
    journal,
  };
}

const fromPage = (url: string, body: unknown) =>
  fetch(url, {
    method: 'POST',
    headers: {'content-type': 'application/json', origin: PAGE},
    body: JSON.stringify(body),
  });

const json = async (response: Response) => [response.status, await response.json()] as const;

/** Publishes an app to the fake marketplace with one catalog; returns its card URL and artifact. */
async function published(
  m: FakeMarketplace,
  cards: TestRegistry['cards'],
  appId: string,
  catalogId: string,
  port: number,
) {
  const artifact = await fixtureArtifact(catalogId, {
    files: {'dist/theme.css': '.shop { color: #222; }\n'},
  });
  const card = cardFor(`http://127.0.0.1:${port}`, {name: appId, catalogs: [catalogId]});
  const cardUrl = cards.serve(card);
  await m.publish(appId, {card, cardUrl, catalogs: [artifact], publisher: 'acme'});
  return {
    cardUrl,
    artifact,
    artifactId: await artifactIdOf(artifact.get(ARTIFACT_DESCRIPTOR_FILE)!),
  };
}

describe('the Store’s reads (task-14.4 decisions 1, 3)', () => {
  test('each listing carries installed from the registry and the update state as last computed, no check run', async () => {
    const {base, marketplace, cards, registry, updates} = await serve();
    await published(marketplace, cards, 'gmail', GMAIL, 11002);
    await published(marketplace, cards, 'shop', SHOP, 11003);
    expect((await registry.installFromMarketplace('gmail')).ok).toBe(true);

    const [status, before] = await json(await fetch(`${base}/index.json`));
    expect(status).toBe(200);
    expect(before.map((l: {entry: {appId: string}}) => [l.entry.appId, l])).toEqual([
      ['gmail', {entry: expect.objectContaining({publisher: 'acme'}), installed: true}],
      ['shop', {entry: expect.objectContaining({appId: 'shop'}), installed: false}],
    ]);

    await updates.check();
    const reads = marketplace.requests.length;
    const [, after] = await json(await fetch(`${base}/index.json`));
    expect(after[0].update).toMatchObject({appId: 'gmail', state: 'up-to-date'});
    expect(after[1]).not.toHaveProperty('update');
    // The read ran no check: only the index was asked for.
    expect(marketplace.requests.slice(reads)).toEqual(['/index.json']);

    const [, results] = await json(await fetch(`${base}/search?q=mail`));
    expect(results.results[0]).toMatchObject({
      entry: {appId: 'gmail'},
      installed: true,
      update: {state: 'up-to-date'},
      score: expect.any(Number),
    });
    const [, one] = await json(await fetch(`${base}/apps/shop/entry.json`));
    expect(one).toEqual({entry: expect.objectContaining({appId: 'shop'}), installed: false});
  });

  test('the preview, checked; not published is 404; search with no words is 400', async () => {
    const {base, marketplace} = await serve();
    const preview = {
      appId: 'shop',
      version: '0.0.0',
      words: 'what do you sell?',
      messages: [{version: 'v0.9', createSurface: {surfaceId: 's', catalogId: SHOP}}],
      capturedBy: 'marketplace',
      capturedAt: '2026-10-11T00:00:00.000Z',
    };
    marketplace.servePreview('shop', preview);
    expect(await json(await fetch(`${base}/apps/shop/preview.json`))).toEqual([200, preview]);
    const [status, missing] = await json(await fetch(`${base}/apps/nope/preview.json`));
    expect(status).toBe(404);
    expect(missing).toMatchObject({ok: false, reason: 'not-published'});
    expect((await fetch(`${base}/apps/nope/entry.json`)).status).toBe(404);
    expect((await fetch(`${base}/search?q=`)).status).toBe(400);
    marketplace.servePreview('bad', {appId: 'bad'});
    const [badStatus, bad] = await json(await fetch(`${base}/apps/bad/preview.json`));
    expect(badStatus).toBe(502);
    expect(bad).toMatchObject({ok: false, reason: 'malformed'});
  });

  test('a malformed index entry is left out and logged, the rest kept; one read alone answers malformed', async () => {
    const {base, marketplace, cards} = await serve();
    await published(marketplace, cards, 'gmail', GMAIL, 11002);
    marketplace.serveEntry('broken', {appId: 'broken'});
    const log = vi.spyOn(console, 'log').mockImplementation(() => {});
    const [status, listings] = await json(await fetch(`${base}/index.json`));
    expect(status).toBe(200);
    expect(listings.map((l: {entry: {appId: string}}) => l.entry.appId)).toEqual(['gmail']);
    expect(log.mock.calls.flat().join('\n')).toMatch(/left out the marketplace's index\.json\[1\]/);
    const [oneStatus, one] = await json(await fetch(`${base}/apps/broken/entry.json`));
    expect(oneStatus).toBe(502);
    expect(one).toMatchObject({ok: false, reason: 'malformed'});
  });

  test('the marketplace unreached is its own answer, 503, on every read', async () => {
    const {base} = await serve({marketplaceUrl: await nowhere()});
    for (const path of ['index.json', 'search?q=x', 'apps/a/entry.json', 'apps/a/preview.json']) {
      const [status, body] = await json(await fetch(`${base}/${path}`));
      expect([path, status, body.reason]).toEqual([path, 503, 'unreached']);
    }
  });
});

describe('a publisher’s listings (task-14.11 decision 38)', () => {
  test('each app’s live card read again: its drift shown at once and reported; one covered says none', async () => {
    const {base, marketplace, cards} = await serve();
    const shop = await published(marketplace, cards, 'shop', SHOP, 11003);
    await published(marketplace, cards, 'gmail', GMAIL, 11002);
    await marketplace.publish('other', {
      card: cardFor('http://127.0.0.1:11009', {name: 'other'}),
      cardUrl: cards.serve(cardFor('http://127.0.0.1:11009', {name: 'other'})),
      catalogs: [],
      publisher: 'someone-else',
    });
    cards.cards.set(shop.cardUrl, {...cards.cards.get(shop.cardUrl)!, version: '0.2.0'});

    const [status, listings] = await json(await fetch(`${base}/listings.json?publisher=acme`));
    expect(status).toBe(200);
    expect(listings.map((l: {entry: {appId: string}}) => l.entry.appId).sort()).toEqual([
      'gmail',
      'shop',
    ]);
    const byId = Object.fromEntries(
      listings.map((l: {entry: IndexEntry}) => [l.entry.appId, l.entry]),
    );
    expect(byId.shop.aheadOfStore).toEqual({
      catalogIds: [],
      version: '0.2.0',
      seenAt: expect.any(String),
    });
    expect(byId.gmail).not.toHaveProperty('aheadOfStore');
    await vi.waitFor(() => expect(marketplace.reports).toEqual(['shop']));
  });

  test('a card that cannot be read leaves the Store’s flag, nothing reported; no name is 400', async () => {
    const {base, marketplace, cards} = await serve();
    const shop = await published(marketplace, cards, 'shop', SHOP, 11003);
    const flagged = {catalogIds: [], version: '0.2.0', seenAt: '2026-10-17T04:00:00.000Z'};
    marketplace.serveEntry('shop', {...marketplace.entry('shop'), aheadOfStore: flagged});
    cards.cards.delete(shop.cardUrl);
    const [, listings] = await json(await fetch(`${base}/listings.json?publisher=acme`));
    expect(listings).toEqual([
      {entry: expect.objectContaining({appId: 'shop', aheadOfStore: flagged}), installed: false},
    ]);
    expect(marketplace.reports).toEqual([]);
    expect((await fetch(`${base}/listings.json`)).status).toBe(400);
  });
});

describe('the preview’s artifact files (task-14.4 decisions 4, 5)', () => {
  test('an artifact the registry lacks comes from the marketplace, checked, immutable, never written into the registry', async () => {
    const {base, marketplace, cards, registry} = await serve();
    const {artifact, artifactId} = await published(marketplace, cards, 'shop', SHOP, 11003);
    const index = await fetch(`${base}/artifacts/${artifactId}/index.js`);
    expect(index.status).toBe(200);
    expect(index.headers.get('cache-control')).toBe('public, max-age=31536000, immutable');
    expect(index.headers.get('content-type')).toMatch(/javascript/);
    expect(new Uint8Array(await index.arrayBuffer())).toEqual(artifact.get('index.js'));
    // A file in a folder is typed by its extension, so the browser takes the stylesheet.
    const theme = await fetch(`${base}/artifacts/${artifactId}/dist/theme.css`);
    expect(theme.status).toBe(200);
    expect(theme.headers.get('content-type')).toMatch(/^text\/css/);
    const descriptor = await fetch(`${base}/artifacts/${artifactId}/${ARTIFACT_DESCRIPTOR_FILE}`);
    expect(new Uint8Array(await descriptor.arrayBuffer())).toEqual(
      artifact.get(ARTIFACT_DESCRIPTOR_FILE),
    );
    expect(registry.holdsArtifact(artifactId)).toBe(false);
    expect((await fetch(`${base}/artifacts/${artifactId}/not-listed.js`)).status).toBe(404);
    expect((await fetch(`${base}/artifacts/sha256-${'A'.repeat(43)}/index.js`)).status).toBe(404);
  });

  test('a file whose bytes are not its descriptor’s hash is refused, never served', async () => {
    const {base, marketplace, cards} = await serve();
    const {artifactId} = await published(marketplace, cards, 'shop', SHOP, 11003);
    marketplace.tamper(artifactId, 'index.js', new TextEncoder().encode('export const evil = 1;'));
    vi.spyOn(console, 'log').mockImplementation(() => {});
    const [status, body] = await json(await fetch(`${base}/artifacts/${artifactId}/index.js`));
    expect(status).toBe(502);
    expect(body.findings[0]).toMatch(/index\.js hashes to .*, its descriptor says/);
  });

  test('a descriptor that does not hash to its id is refused', async () => {
    const {base, marketplace, cards} = await serve();
    const {artifactId} = await published(marketplace, cards, 'shop', SHOP, 11003);
    marketplace.tamper(artifactId, ARTIFACT_DESCRIPTOR_FILE, new TextEncoder().encode('{}'));
    vi.spyOn(console, 'log').mockImplementation(() => {});
    const [status, body] = await json(await fetch(`${base}/artifacts/${artifactId}/catalog.json`));
    expect(status).toBe(502);
    expect(body.findings[0]).toMatch(/hashes to sha256-/);
  });

  test('an artifact the registry holds is served from the registry, the marketplace not asked', async () => {
    const {base, marketplace, cards, registry} = await serve();
    const {artifact, artifactId} = await published(marketplace, cards, 'gmail', GMAIL, 11002);
    expect((await registry.installFromMarketplace('gmail')).ok).toBe(true);
    const reads = marketplace.requests.length;
    const file = await fetch(`${base}/artifacts/${artifactId}/catalog.json`);
    expect(file.status).toBe(200);
    expect(file.headers.get('cache-control')).toBe('public, max-age=31536000, immutable');
    expect(new Uint8Array(await file.arrayBuffer())).toEqual(artifact.get('catalog.json'));
    expect(marketplace.requests.length).toBe(reads);
  });
});

describe('the publisher (task-14.4 decisions 6–13, 17)', () => {
  test('claim: the token kept owner-only with its marketplace and shown once; nothing reads it again', async () => {
    const {base, marketplace, stateDir, journal} = await serve();
    expect(await json(await fetch(`${base}/publisher.json`))).toEqual([200, {state: 'signed-out'}]);
    const [status, claimed] = await json(await fromPage(`${base}/claim`, {publisher: 'acme'}));
    expect(status).toBe(201);
    expect(claimed).toEqual({publisher: 'acme', token: expect.any(String), kept: true});
    const path = join(stateDir, PUBLISHER_FILE);
    expect((await stat(path)).mode & 0o777).toBe(0o600);
    expect((await stat(join(stateDir, 'publisher'))).mode & 0o777).toBe(0o700);
    expect(JSON.parse(await readFile(path, 'utf8'))).toEqual({
      marketplace: marketplace.url,
      publisher: 'acme',
      token: claimed.token,
    });
    const [, status2] = await json(await fetch(`${base}/publisher.json`));
    expect(status2).toEqual({state: 'signed-in', publisher: 'acme', store: 'accepted'});
    expect(JSON.stringify(status2)).not.toContain(claimed.token);
    expect(journal).toEqual([{act: 'claim', publisher: 'acme', outcome: 'done', by: 'page'}]);
  });

  test('a claim the orchestrator cannot keep still shows the token, saying so', async () => {
    const {base, stateDir, journal} = await serve();
    // A file where the publisher's directory would go: the keep fails, the claim has taken.
    await writeFile(join(stateDir, 'publisher'), 'in the way');
    const [status, claimed] = await json(await fromPage(`${base}/claim`, {publisher: 'acme'}));
    expect(status).toBe(201);
    expect(claimed).toMatchObject({publisher: 'acme', token: expect.any(String), kept: false});
    expect(claimed.findings[0]).toMatch(
      /could not be kept on this computer.*save it, then sign in/,
    );
    expect(journal[0]).toMatchObject({act: 'claim', outcome: 'done', kept: false});
    expect(JSON.stringify(journal)).not.toContain(claimed.token);
  });

  test('a taken name is the marketplace’s refusal, relayed', async () => {
    const {base} = await serve();
    await fromPage(`${base}/claim`, {publisher: 'acme'});
    await fromPage(`${base}/sign-out`, {});
    const [status, body] = await json(await fromPage(`${base}/claim`, {publisher: 'acme'}));
    expect(status).toBe(409);
    expect(body).toEqual({ok: false, findings: ['publisher name "acme" is taken']});
  });

  test('one publisher at a time: claim and sign-in refused while one is held; sign-out forgets the file only', async () => {
    const {base, marketplace, stateDir, journal} = await serve();
    const [, claimed] = await json(await fromPage(`${base}/claim`, {publisher: 'acme'}));
    const [status, refused] = await json(await fromPage(`${base}/claim`, {publisher: 'other'}));
    expect(status).toBe(409);
    expect(refused).toMatchObject({ok: false, reason: 'held'});
    const [signInStatus] = await json(
      await fromPage(`${base}/sign-in`, {publisher: 'acme', token: claimed.token}),
    );
    expect(signInStatus).toBe(409);

    expect(await json(await fromPage(`${base}/sign-out`, {}))).toEqual([
      200,
      {ok: true, publisher: 'acme'},
    ]);
    await expect(stat(join(stateDir, PUBLISHER_FILE))).rejects.toThrow();
    expect(await json(await fetch(`${base}/publisher.json`))).toEqual([200, {state: 'signed-out'}]);
    // The token is still the marketplace's: signing in with it brings the publisher back.
    const [back, signedIn] = await json(
      await fromPage(`${base}/sign-in`, {publisher: 'acme', token: claimed.token}),
    );
    expect([back, signedIn]).toEqual([200, {ok: true, publisher: 'acme'}]);
    expect(marketplace.asked.at(-1)).toBe(claimed.token);
    expect((await fromPage(`${base}/sign-out`, {})).status).toBe(200);
    expect((await fromPage(`${base}/sign-out`, {})).status).toBe(404);
    expect(journal.map(e => [e.act, e.outcome])).toEqual([
      ['claim', 'done'],
      ['claim', 'refused'],
      ['signIn', 'refused'],
      ['signOut', 'done'],
      ['signIn', 'done'],
      ['signOut', 'done'],
    ]);
  });

  test('sign-in: a token the marketplace does not know, or another publisher’s, or not in its form, is refused, nothing kept', async () => {
    const {base, stateDir, journal} = await serve();
    const [, rival] = await json(await fromPage(`${base}/claim`, {publisher: 'rival'}));
    await fromPage(`${base}/sign-out`, {});
    for (const token of [rival.token, 'x'.repeat(43), 'short']) {
      const [status, body] = await json(
        await fromPage(`${base}/sign-in`, {publisher: 'acme', token}),
      );
      expect(status).toBe(401);
      expect(body).toEqual({
        ok: false,
        reason: 'not-accepted',
        findings: ["that token is not acme's"],
      });
    }
    await expect(stat(join(stateDir, PUBLISHER_FILE))).rejects.toThrow();
    expect((await fromPage(`${base}/sign-in`, {publisher: 'acme'})).status).toBe(400);
    expect(journal.filter(e => e.act === 'signIn').map(e => e.outcome)).toEqual([
      'refused',
      'refused',
      'refused',
    ]);
    expect(JSON.stringify(journal)).not.toContain(rival.token);
  });

  test('opening Publish asks about the held token: no longer accepted, or the Store unreached; never deleted', async () => {
    const {base, marketplace, stateDir} = await serve();
    const [, claimed] = await json(await fromPage(`${base}/claim`, {publisher: 'acme'}));
    marketplace.forgetTokens();
    expect(await json(await fetch(`${base}/publisher.json`))).toEqual([
      200,
      {state: 'signed-in', publisher: 'acme', store: 'not-accepted'},
    ]);
    marketplace.failing = true;
    expect(await json(await fetch(`${base}/publisher.json`))).toEqual([
      200,
      {state: 'signed-in', publisher: 'acme', store: 'unreached'},
    ]);
    expect(JSON.parse(await readFile(join(stateDir, PUBLISHER_FILE), 'utf8')).token).toBe(
      claimed.token,
    );
  });

  test('a publisher held for another marketplace: named alone, its token never sent, claim and sign-in waiting for sign-out', async () => {
    const {base, marketplace, store} = await serve();
    await store.keep({
      marketplace: 'http://localhost:9999',
      publisher: 'acme',
      token: 'k'.repeat(43),
    });
    expect(await json(await fetch(`${base}/publisher.json`))).toEqual([
      200,
      {state: 'another-store', publisher: 'acme'},
    ]);
    const [status, refused] = await json(await fromPage(`${base}/claim`, {publisher: 'acme2'}));
    expect(status).toBe(409);
    expect(refused.findings[0]).toMatch(/for another Store: sign out first/);
    const [publishStatus, publish] = await json(
      await fromPage(`${base}/publish`, {appId: 'shop', cardUrl: 'x', catalogs: []}),
    );
    expect(publishStatus).toBe(409);
    expect(publish).toMatchObject({ok: false, reason: 'another-store'});
    expect(marketplace.asked).toEqual([]);
    expect(marketplace.writes).toEqual([]);
  });
});

describe('publish and unpublish, relayed (task-14.4 decisions 15–17)', () => {
  test('the body forwarded untouched with the held token, the answer returned as it came, journaled', async () => {
    const {base, marketplace, journal} = await serve();
    const [, claimed] = await json(await fromPage(`${base}/claim`, {publisher: 'acme'}));
    const body = {
      appId: 'shop',
      cardUrl: 'http://127.0.0.1:11003/.well-known/agent-card.json',
      catalogs: [{files: {'artifact.json': 'e30='}}],
    };
    const [status, outcome] = await json(await fromPage(`${base}/publish`, body));
    expect(status).toBe(200);
    expect(outcome).toEqual({
      ok: true,
      appId: 'shop',
      version: '0.1.0',
      summary: 'published shop',
      notes: [],
    });
    expect(marketplace.writes).toEqual([
      {route: 'publish', authorization: `Bearer ${claimed.token}`, body},
    ]);

    marketplace.writeAnswer = {status: 422, body: {ok: false, findings: ['a look can only grow']}};
    const [refusedStatus, refused] = await json(await fromPage(`${base}/publish`, body));
    expect([refusedStatus, refused]).toEqual([
      422,
      {ok: false, findings: ['a look can only grow']},
    ]);

    marketplace.writeAnswer = undefined;
    expect(await json(await fromPage(`${base}/unpublish`, {appId: 'shop'}))).toEqual([
      200,
      {ok: true, appId: 'shop'},
    ]);
    expect(journal.slice(1)).toEqual([
      {
        act: 'publish',
        publisher: 'acme',
        appId: 'shop',
        version: '0.1.0',
        outcome: 'done',
        by: 'page',
      },
      {
        act: 'publish',
        publisher: 'acme',
        appId: 'shop',
        outcome: 'refused',
        findings: ['a look can only grow'],
        by: 'page',
      },
      {act: 'unpublish', publisher: 'acme', appId: 'shop', outcome: 'done', by: 'page'},
    ]);
    expect(JSON.stringify(journal)).not.toContain(claimed.token);
  });

  test('the token the marketplace no longer accepts is said as such; the publisher kept', async () => {
    const {base, marketplace, store} = await serve();
    await fromPage(`${base}/claim`, {publisher: 'acme'});
    marketplace.forgetTokens();
    const [status, body] = await json(await fromPage(`${base}/unpublish`, {appId: 'shop'}));
    expect(status).toBe(401);
    expect(body).toMatchObject({ok: false, reason: 'not-accepted'});
    expect(body.findings[0]).toMatch(/no longer accepts acme's token: sign out and sign in again/);
    expect(store.record?.publisher).toBe('acme');
  });

  test('with no publisher held both are refused, saying to sign in; nothing reaches the marketplace', async () => {
    const {base, marketplace} = await serve();
    const [status, body] = await json(await fromPage(`${base}/unpublish`, {appId: 'shop'}));
    expect(status).toBe(409);
    expect(body).toEqual({ok: false, reason: 'signed-out', findings: ['sign in to unpublish']});
    expect(marketplace.writes).toEqual([]);
  });

  test('a caller with the write token: the marketplace gets the held token, never the write token', async () => {
    const {base, marketplace, journal} = await serve();
    const [, claimed] = await json(await fromPage(`${base}/claim`, {publisher: 'acme'}));
    const response = await fetch(`${base}/unpublish`, {
      method: 'POST',
      headers: {'content-type': 'application/json', authorization: `Bearer ${WRITE_TOKEN}`},
      body: JSON.stringify({appId: 'shop'}),
    });
    expect(response.status).toBe(200);
    expect(marketplace.writes[0]!.authorization).toBe(`Bearer ${claimed.token}`);
    expect(journal.at(-1)).toMatchObject({act: 'unpublish', by: 'token'});
  });

  test('the write guard: a form post or a foreign origin is refused before the marketplace', async () => {
    const {base, marketplace} = await serve();
    const form = await fetch(`${base}/claim`, {
      method: 'POST',
      headers: {'content-type': 'application/x-www-form-urlencoded', origin: PAGE},
      body: 'publisher=acme',
    });
    expect(form.status).toBe(415);
    const foreign = await fetch(`${base}/claim`, {
      method: 'POST',
      headers: {'content-type': 'application/json', origin: 'https://evil.example'},
      body: JSON.stringify({publisher: 'acme'}),
    });
    expect(foreign.status).toBe(403);
    expect(marketplace.asked).toEqual([]);
    expect(await json(await fetch(`${base}/publisher.json`))).toEqual([200, {state: 'signed-out'}]);
  });
});
