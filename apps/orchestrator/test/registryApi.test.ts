/** `orchestratorApi` over HTTP (task-11.4 decisions 10, 11): the read routes and the token-guarded writes. */
import {createServer, type Server} from 'node:http';
import {readFile, rm} from 'node:fs/promises';
import {join} from 'node:path';
import {afterEach, describe, expect, test} from 'vitest';
import express from 'express';
import {
  ARTIFACT_DESCRIPTOR_FILE,
  artifactIdOf,
  BASIC_CATALOG_ID,
  readUpdateState,
} from '@a2uiverse/sdk';
import {registryRoutes, REGISTRY_ROUTE_PREFIX} from '../src/registry/api.js';
import {MarketplaceClient} from '../src/registry/marketplace.js';
import {issueWriteToken, readWriteToken} from '../src/registry/token.js';
import {UpdateCheck} from '../src/registry/updates.js';
import {startFakeMarketplace, type FakeMarketplace} from './fakeMarketplace.js';
import {cardFor, fixtureArtifact, testRegistry, type TestRegistry} from './registryFixture.js';

const GMAIL = 'https://example.com/gmail/catalog.json';

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
});

async function serve() {
  marketplace = await startFakeMarketplace();
  const client = new MarketplaceClient({url: marketplace.url, timeoutMs: 2_000});
  made = await testRegistry([], {marketplace: client});
  const token = await issueWriteToken(made.stateDir);
  const app = express();
  app.use(
    REGISTRY_ROUTE_PREFIX,
    registryRoutes({
      registry: made.registry,
      writeToken: () => token,
      updates: new UpdateCheck({registry: made.registry, marketplace: client}),
    }),
  );
  server = createServer(app);
  await new Promise<void>(resolve => server!.listen(0, '127.0.0.1', resolve));
  const address = server.address();
  if (!address || typeof address === 'string') throw new Error('no port');
  const base = `http://127.0.0.1:${address.port}${REGISTRY_ROUTE_PREFIX}`;
  return {
    base,
    token,
    registry: made.registry,
    cards: made.cards,
    stateDir: made.stateDir,
    marketplace,
  };
}

const base64 = (files: Map<string, Uint8Array>) =>
  Object.fromEntries(
    [...files].map(([path, bytes]) => [path, Buffer.from(bytes).toString('base64')]),
  );

const post = (url: string, body: unknown, token?: string) =>
  fetch(url, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      ...(token ? {authorization: `Bearer ${token}`} : {}),
    },
    body: JSON.stringify(body),
  });

describe('the write token', () => {
  test('is written into the state directory at startup, a fresh one each time', async () => {
    made = await testRegistry();
    const first = await issueWriteToken(made.stateDir);
    expect(await readWriteToken(made.stateDir)).toBe(first);
    const second = await issueWriteToken(made.stateDir);
    expect(second).not.toBe(first);
    expect(await readWriteToken(made.stateDir)).toBe(second);
  });
});

describe('the read routes', () => {
  test('the installed list and the catalog table are JSON files at fixed paths', async () => {
    const {base} = await serve();
    const apps = await fetch(`${base}/apps.json`);
    expect(apps.status).toBe(200);
    expect(apps.headers.get('content-type')).toMatch(/application\/json/);
    expect(apps.headers.get('cache-control')).toBe('no-cache');
    expect(await apps.json()).toEqual([]);
    const table = await fetch(`${base}/catalogs.json`);
    expect(((await table.json()) as {catalogId: string}[]).map(row => row.catalogId)).toContain(
      BASIC_CATALOG_ID,
    );
  });

  test('an unknown artifact file is not found', async () => {
    const {base} = await serve();
    expect((await fetch(`${base}/artifacts/sha256-nothing/index.js`)).status).toBe(404);
  });
});

describe('install and uninstall over HTTP', () => {
  test('a write without the token is refused and changes nothing', async () => {
    const {base, registry} = await serve();
    expect(
      (await post(`${base}/install`, {appId: 'gmail', cardUrl: 'x', catalogs: []})).status,
    ).toBe(401);
    expect((await post(`${base}/install`, {}, 'wrong')).status).toBe(401);
    expect((await post(`${base}/uninstall`, {appId: 'gmail'})).status).toBe(401);
    expect(registry.list()).toEqual([]);
  });

  test('install takes the files in the body; the app is listed and its artifact served, immutable', async () => {
    const {base, token, cards} = await serve();
    const artifact = await fixtureArtifact(GMAIL);
    const id = await artifactIdOf(artifact.get(ARTIFACT_DESCRIPTOR_FILE)!);
    const cardUrl = cards.serve(
      cardFor('http://127.0.0.1:11002', {name: 'Gmail', catalogs: [GMAIL]}),
    );
    const response = await post(
      `${base}/install`,
      {appId: 'gmail', cardUrl, catalogs: [{files: base64(artifact)}]},
      token,
    );
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({
      ok: true,
      appId: 'gmail',
      replaced: false,
      notes: [],
    });

    const apps = (await (await fetch(`${base}/apps.json`)).json()) as {id: string}[];
    expect(apps.map(app => app.id)).toEqual(['gmail']);
    const table = (await (await fetch(`${base}/catalogs.json`)).json()) as unknown[];
    expect(table).toContainEqual({catalogId: GMAIL, artifact: id, entry: 'index.js'});

    const entry = await fetch(`${base}/artifacts/${id}/index.js`);
    expect(entry.status).toBe(200);
    expect(entry.headers.get('content-type')).toMatch(/javascript/);
    expect(entry.headers.get('cache-control')).toBe('public, max-age=31536000, immutable');
    expect(new Uint8Array(await entry.arrayBuffer())).toEqual(artifact.get('index.js'));
    const descriptor = await fetch(`${base}/artifacts/${id}/${ARTIFACT_DESCRIPTOR_FILE}`);
    expect(await descriptor.text()).toBe(
      new TextDecoder().decode(artifact.get(ARTIFACT_DESCRIPTOR_FILE)),
    );
  });

  test('a refused install answers 422 with every finding', async () => {
    const {base, token, cards} = await serve();
    const cardUrl = cards.serve(cardFor('http://127.0.0.1:11002', {catalogs: [GMAIL]}));
    const response = await post(`${base}/install`, {appId: 'Gmail', cardUrl, catalogs: []}, token);
    expect(response.status).toBe(422);
    const body = (await response.json()) as {ok: boolean; findings: string[]};
    expect(body.ok).toBe(false);
    expect(body.findings).toHaveLength(2);
  });

  test('a body with the app id alone installs from the marketplace (task-13.5 decision 2)', async () => {
    const {base, token, cards, marketplace} = await serve();
    const artifact = await fixtureArtifact(GMAIL);
    const card = cardFor('http://127.0.0.1:11002', {name: 'Gmail', catalogs: [GMAIL]});
    await marketplace.publish('gmail', {card, cardUrl: cards.serve(card), catalogs: [artifact]});
    const response = await post(`${base}/install`, {appId: 'gmail'}, token);
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ok: true, appId: 'gmail', replaced: false});
    const apps = (await (await fetch(`${base}/apps.json`)).json()) as {
      id: string;
      source: string;
    }[];
    expect(apps).toEqual([expect.objectContaining({id: 'gmail', source: 'marketplace'})]);
  });

  test('an app id alone the marketplace does not list answers 422 with the finding', async () => {
    const {base, token} = await serve();
    const response = await post(`${base}/install`, {appId: 'gmail'}, token);
    expect(response.status).toBe(422);
    expect(await response.json()).toEqual({
      ok: false,
      findings: [expect.stringMatching(/is not published on the marketplace/)],
    });
  });

  test('a body mixing the two shapes — artifacts with no card URL — answers 400', async () => {
    const {base, token} = await serve();
    const response = await post(
      `${base}/install`,
      {appId: 'gmail', catalogs: [{files: base64(await fixtureArtifact(GMAIL))}]},
      token,
    );
    expect(response.status).toBe(400);
    expect(((await response.json()) as {findings: string[]}).findings).toEqual([
      'an install names a card URL and its artifacts, or the app id alone',
    ]);
  });

  test('a body that is not an install request answers 400', async () => {
    const {base, token} = await serve();
    const response = await post(`${base}/install`, {appId: 'gmail', catalogs: [{files: 3}]}, token);
    expect(response.status).toBe(400);
    expect(((await response.json()) as {findings: string[]}).findings.length).toBeGreaterThan(0);
  });

  test('uninstall removes the app; an app not installed answers 404', async () => {
    const {base, token, cards, registry, stateDir} = await serve();
    const cardUrl = cards.serve(cardFor('http://127.0.0.1:11002'));
    await post(`${base}/install`, {appId: 'gmail', cardUrl, catalogs: []}, token);
    const gone = await post(`${base}/uninstall`, {appId: 'gmail'}, token);
    expect(gone.status).toBe(200);
    expect(await gone.json()).toEqual({ok: true, appId: 'gmail'});
    expect(registry.list()).toEqual([]);
    const again = await post(`${base}/uninstall`, {appId: 'gmail'}, token);
    expect(again.status).toBe(404);
    expect(JSON.parse(await readFile(join(stateDir, 'registry', 'registry.json'), 'utf8'))).toEqual(
      {
        apps: [],
      },
    );
  });
});

describe('the update states (task-13.5 decision 8)', () => {
  test('GET updates.json runs the check and answers one state per installed app, no token, no caching', async () => {
    const {base, cards, marketplace} = await serve();
    const artifact = await fixtureArtifact(GMAIL);
    const card = cardFor('http://127.0.0.1:11002', {name: 'Gmail', catalogs: [GMAIL]});
    const cardUrl = cards.serve(card);
    await marketplace.publish('gmail', {card, cardUrl, catalogs: [artifact]});
    const response = await fetch(`${base}/updates.json`);
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual([]);

    const token = (await serveToken())!;
    await post(`${base}/install`, {appId: 'gmail'}, token);
    const second = await fixtureArtifact(GMAIL, {version: '0.2.0'});
    const entry = await marketplace.publish('gmail', {card, cardUrl, catalogs: [second]});
    const checked = await fetch(`${base}/updates.json`);
    expect(checked.headers.get('cache-control')).toBe('no-cache');
    const states = (await checked.json()) as unknown[];
    expect(states.map(readUpdateState)).toEqual([
      {appId: 'gmail', installedVersion: '0.0.0', state: 'up-to-date', publishedVersion: '0.0.0'},
    ]);
    // The newer build installed itself on the way (decision 9): the GET's one side effect.
    const apps = (await (await fetch(`${base}/apps.json`)).json()) as {catalogs: unknown}[];
    expect(apps[0].catalogs).toEqual(entry.catalogs);
  });
});

/** The token `serve()` issued, read back from the state directory as the command reads it. */
const serveToken = () => (made ? readWriteToken(made.stateDir) : undefined);
