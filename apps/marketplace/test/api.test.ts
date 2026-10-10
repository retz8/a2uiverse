/** The marketplace's HTTP surface (task-13.3 decision 11): methods, codes and bodies over the sdk's routes. */
import {createServer, type Server} from 'node:http';
import {mkdtemp, rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {afterEach, describe, expect, test} from 'vitest';
import {ARTIFACT_DESCRIPTOR_FILE, MARKETPLACE_ROUTES} from '@a2uiverse/sdk';
import {FakeEmbedder} from '@a2uiverse/embedder';
import {buildMarketplace} from '../src/app.js';
import {FAKE_CATALOG_ID, startFakeAgent, type FakeAgent} from './fakeAgent.js';
import {base64, fixtureArtifact, idOf, previewFor} from './fixture.js';

let server: Server | undefined;
let stateDir: string | undefined;
const agents: FakeAgent[] = [];
afterEach(async () => {
  await new Promise<void>(resolve => (server ? server.close(() => resolve()) : resolve()));
  server = undefined;
  await Promise.all(agents.splice(0).map(a => a.close()));
  if (stateDir) await rm(stateDir, {recursive: true, force: true});
  stateDir = undefined;
});

async function serve() {
  stateDir = await mkdtemp(join(tmpdir(), 'a2uiverse-marketplace-api-'));
  const built = buildMarketplace({
    config: {port: 0, stateDir, cardTimeoutMs: 2000, smokeTimeoutMs: 5000},
    overrides: {embedder: new FakeEmbedder()},
  });
  await built.init();
  server = createServer(built.app);
  await new Promise<void>(resolve => server!.listen(0, '127.0.0.1', resolve));
  const address = server.address();
  if (!address || typeof address === 'string') throw new Error('no port');
  return {base: `http://127.0.0.1:${address.port}`, marketplace: built.marketplace};
}

async function agentOf(options: Parameters<typeof startFakeAgent>[0] = {}) {
  const agent = await startFakeAgent(options);
  agents.push(agent);
  return agent;
}

const post = (url: string, body: unknown, token?: string) =>
  fetch(url, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      ...(token ? {authorization: `Bearer ${token}`} : {}),
    },
    body: JSON.stringify(body),
  });

async function claimed(base: string, name = 'acme'): Promise<string> {
  const response = await post(`${base}/${MARKETPLACE_ROUTES.claim}`, {publisher: name});
  if (response.status !== 201) throw new Error(`claim: ${response.status}`);
  return ((await response.json()) as {token: string}).token;
}

async function published(base: string, token: string, appId: string, agent: FakeAgent) {
  const files = await fixtureArtifact(FAKE_CATALOG_ID);
  const response = await post(
    `${base}/${MARKETPLACE_ROUTES.publish}`,
    {appId, cardUrl: agent.cardUrl, catalogs: [{files: base64(files)}]},
    token,
  );
  if (response.status !== 200) throw new Error(`publish: ${JSON.stringify(await response.json())}`);
  return {files, artifactId: await idOf(files)};
}

describe('the reads', () => {
  test('index.json is the empty list on a fresh marketplace, never cached; an unpublished app is not found', async () => {
    const {base} = await serve();
    const index = await fetch(`${base}/index.json`);
    expect(index.status).toBe(200);
    expect(index.headers.get('cache-control')).toBe('no-cache');
    expect(await index.json()).toEqual([]);
    const entry = await fetch(`${base}/apps/shop/entry.json`);
    expect(entry.status).toBe(404);
    expect(await entry.json()).toEqual({ok: false, findings: ['app "shop" is not published']});
    expect((await fetch(`${base}/apps/shop/preview.json`)).status).toBe(404);
    expect((await fetch(`${base}/artifacts/sha256-nope/artifact.json`)).status).toBe(404);
  });

  test('after a publish: the entry, the preview, the artifact immutable, the index', async () => {
    const {base} = await serve();
    const token = await claimed(base);
    const agent = await agentOf();
    const {files, artifactId} = await published(base, token, 'shop', agent);
    const entry = await fetch(`${base}/apps/shop/entry.json`);
    expect(entry.status).toBe(200);
    expect(entry.headers.get('cache-control')).toBe('no-cache');
    expect(((await entry.json()) as {catalogs: Record<string, string>}).catalogs).toEqual({
      [FAKE_CATALOG_ID]: artifactId,
    });
    const preview = await fetch(`${base}/apps/shop/preview.json`);
    expect(preview.status).toBe(200);
    expect(((await preview.json()) as {capturedBy: string}).capturedBy).toBe('marketplace');
    const descriptor = await fetch(`${base}/artifacts/${artifactId}/${ARTIFACT_DESCRIPTOR_FILE}`);
    expect(descriptor.status).toBe(200);
    expect(descriptor.headers.get('cache-control')).toBe('public, max-age=31536000, immutable');
    expect(new Uint8Array(await descriptor.arrayBuffer())).toEqual(
      files.get(ARTIFACT_DESCRIPTOR_FILE),
    );
    expect(
      ((await (await fetch(`${base}/index.json`)).json()) as {appId: string}[]).map(e => e.appId),
    ).toEqual(['shop']);
  });
});

describe('claim', () => {
  test('201 with the token once; 409 for a taken name; 422 for a bad one; 400 for a bad body', async () => {
    const {base} = await serve();
    const first = await post(`${base}/claim`, {publisher: 'acme'});
    expect(first.status).toBe(201);
    expect(await first.json()).toEqual({
      publisher: 'acme',
      token: expect.stringMatching(/^[A-Za-z0-9_-]{43}$/),
    });
    const again = await post(`${base}/claim`, {publisher: 'acme'});
    expect(again.status).toBe(409);
    expect(await again.json()).toEqual({ok: false, findings: ['publisher name "acme" is taken']});
    expect((await post(`${base}/claim`, {publisher: 'Acme!'})).status).toBe(422);
    const bad = await post(`${base}/claim`, {name: 'acme'});
    expect(bad.status).toBe(400);
    expect(((await bad.json()) as {ok: boolean}).ok).toBe(false);
  });
});

describe('publish', () => {
  test('401 with no token or a wrong one; 400 for a body that does not read', async () => {
    const {base} = await serve();
    const token = await claimed(base);
    const none = await post(`${base}/publish`, {appId: 'shop', cardUrl: 'x', catalogs: []});
    expect(none.status).toBe(401);
    expect(await none.json()).toEqual({
      ok: false,
      findings: ['the publisher token is missing or wrong'],
    });
    expect(
      (await post(`${base}/publish`, {appId: 'shop', cardUrl: 'x', catalogs: []}, 'x'.repeat(43)))
        .status,
    ).toBe(401);
    const bad = await post(`${base}/publish`, {appId: 'shop'}, token);
    expect(bad.status).toBe(400);
    expect(((await bad.json()) as {findings: string[]}).findings.length).toBeGreaterThan(0);
  });

  test("200 with the outcome; 403 for another publisher's app; 422 listing every finding", async () => {
    const {base} = await serve();
    const token = await claimed(base);
    const rival = await claimed(base, 'rival');
    const agent = await agentOf();
    const files = await fixtureArtifact(FAKE_CATALOG_ID);
    const body = {appId: 'shop', cardUrl: agent.cardUrl, catalogs: [{files: base64(files)}]};
    const took = await post(`${base}/publish`, body, token);
    expect(took.status).toBe(200);
    expect(await took.json()).toEqual({
      ok: true,
      appId: 'shop',
      version: '0.1.0',
      summary: expect.stringMatching(/^published shop · card 0\.1\.0 · catalog sha256-/),
      notes: expect.any(Array),
    });
    const forbidden = await post(`${base}/publish`, body, rival);
    expect(forbidden.status).toBe(403);
    expect(await forbidden.json()).toEqual({
      ok: false,
      findings: ['app id "shop" belongs to publisher "acme"'],
    });
    const broken = await fixtureArtifact(FAKE_CATALOG_ID, {hostInterface: '9.9.9'});
    const refused = await post(
      `${base}/publish`,
      {...body, appId: 'other', catalogs: [{files: base64(broken)}]},
      token,
    );
    expect(refused.status).toBe(422);
    expect(((await refused.json()) as {findings: string[]}).findings).toEqual([
      expect.stringContaining('host interface'),
    ]);
  });

  test('a sign-in app with its captured preview, over the wire', async () => {
    const {base} = await serve();
    const token = await claimed(base);
    const agent = await agentOf({signIn: true, admit: () => false});
    const files = await fixtureArtifact(FAKE_CATALOG_ID);
    const response = await post(
      `${base}/publish`,
      {
        appId: 'locked',
        cardUrl: agent.cardUrl,
        catalogs: [{files: base64(files)}],
        preview: previewFor('locked', '0.1.0', FAKE_CATALOG_ID, 'publisher'),
      },
      token,
    );
    expect(response.status).toBe(200);
    expect(
      ((await (await fetch(`${base}/apps/locked/preview.json`)).json()) as {capturedBy: string})
        .capturedBy,
    ).toBe('publisher');
  });
});

describe('search', () => {
  test('400 without words; 200 with every entry ranked', async () => {
    const {base} = await serve();
    const token = await claimed(base);
    const agent = await agentOf({
      name: 'Sky',
      skills: [{id: 'w', name: 'Forecast', description: 'weather', tags: []}],
    });
    await published(base, token, 'sky', agent);
    expect((await fetch(`${base}/search`)).status).toBe(400);
    expect((await fetch(`${base}/search?q=%20`)).status).toBe(400);
    const found = await fetch(`${base}/search?q=weather`);
    expect(found.status).toBe(200);
    expect(found.headers.get('cache-control')).toBe('no-cache');
    const {results} = (await found.json()) as {results: {entry: {appId: string}; score: number}[]};
    expect(results.map(r => r.entry.appId)).toEqual(['sky']);
    expect(results[0].score).toBeGreaterThan(0);
  });
});

describe('unpublish', () => {
  test("401; 404 for an app not published; 403 for another's; 200 for the owner", async () => {
    const {base} = await serve();
    const token = await claimed(base);
    const rival = await claimed(base, 'rival');
    const agent = await agentOf();
    await published(base, token, 'shop', agent);
    expect((await post(`${base}/unpublish`, {appId: 'shop'})).status).toBe(401);
    expect((await post(`${base}/unpublish`, {appId: 'nope'}, token)).status).toBe(404);
    expect((await post(`${base}/unpublish`, {appId: 'shop'}, rival)).status).toBe(403);
    expect((await post(`${base}/unpublish`, {}, token)).status).toBe(400);
    const gone = await post(`${base}/unpublish`, {appId: 'shop'}, token);
    expect(gone.status).toBe(200);
    expect(await gone.json()).toEqual({ok: true, appId: 'shop'});
    expect((await fetch(`${base}/apps/shop/entry.json`)).status).toBe(404);
  });
});

describe('report', () => {
  test('202 with an empty body, at once, for any app id; 400 for a body that is not one', async () => {
    const {base} = await serve();
    const accepted = await post(`${base}/report`, {appId: 'anything'});
    expect(accepted.status).toBe(202);
    expect(await accepted.text()).toBe('');
    expect((await post(`${base}/report`, {})).status).toBe(400);
  });
});

describe('CORS', () => {
  test('a local or tunnel origin is allowed; another is not', async () => {
    const {base} = await serve();
    const local = await fetch(`${base}/index.json`, {headers: {origin: 'http://localhost:5173'}});
    expect(local.headers.get('access-control-allow-origin')).toBe('http://localhost:5173');
    const tunnel = await fetch(`${base}/index.json`, {
      headers: {origin: 'https://abc-5173.asse.devtunnels.ms'},
    });
    expect(tunnel.headers.get('access-control-allow-origin')).toBe(
      'https://abc-5173.asse.devtunnels.ms',
    );
    const other = await fetch(`${base}/index.json`, {headers: {origin: 'https://evil.example'}});
    expect(other.headers.get('access-control-allow-origin')).toBeNull();
  });
});
