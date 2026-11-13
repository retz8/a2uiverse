import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest';
import {artifactIdOf} from '@a2uiverse/sdk';
import {servedCard} from './canvas/trustedPage/cardFixture';
import {
  checkUpdates,
  claimPublisher,
  installApp,
  publishApp,
  readAccounts,
  readInstalled,
  readInstalledApps,
  readPublisher,
  readStoreEntry,
  readStoreIndex,
  renameAccount,
  signOutAccount,
  uninstallApp,
  unpublishApp,
  PUBLISH_TIMEOUT_MS,
  READ_TIMEOUT_MS,
  WRITE_TIMEOUT_MS,
} from './orchestratorApi';

const BASE = 'https://orchestrator.test';

/** A fetch that never answers until its signal aborts — a request the tunnel leaves hanging. */
const silent = (_url: unknown, init?: RequestInit) =>
  new Promise<Response>((_, reject) => {
    init?.signal?.addEventListener('abort', () =>
      reject(new DOMException('aborted', 'AbortError')),
    );
  });

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {status, headers: {'Content-Type': 'application/json'}});

beforeEach(() => vi.useFakeTimers());
afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe('the page’s reads are bounded (task-14.11 decision 26)', () => {
  it('asks once more when the first ask gets no answer in time, and takes the second answer', async () => {
    const states = [{appId: 'gmail', installedVersion: '0.1.0', state: 'up-to-date'}];
    const fetch = vi
      .fn()
      .mockImplementationOnce(silent)
      .mockImplementationOnce(async () => json(states));
    vi.stubGlobal('fetch', fetch);
    const read = checkUpdates(BASE);
    await vi.advanceTimersByTimeAsync(READ_TIMEOUT_MS);
    expect(await read).toEqual(states);
    expect(fetch).toHaveBeenCalledTimes(2);
  });

  it('counts two silences as the orchestrator unreached', async () => {
    const fetch = vi.fn(silent);
    vi.stubGlobal('fetch', fetch);
    const installed = readInstalled(BASE);
    const accounts = readAccounts(BASE);
    const publisher = readPublisher(BASE);
    const index = readStoreIndex(BASE);
    await vi.advanceTimersByTimeAsync(2 * READ_TIMEOUT_MS);
    expect(await installed).toBeNull();
    expect(await accounts).toBeNull();
    expect(await publisher).toBeNull();
    expect(await index).toEqual({ok: false, reason: 'unreached'});
    expect(fetch).toHaveBeenCalledTimes(8);
  });

  it('never asks again once an answer arrived, even one that refuses', async () => {
    const fetch = vi.fn(async () => json({ok: false, reason: 'not-published'}, 404));
    vi.stubGlobal('fetch', fetch);
    expect(await readStoreIndex(BASE)).toEqual({ok: false, reason: 'not-published'});
    expect(fetch).toHaveBeenCalledTimes(1);
  });
});

describe('a card is read where it arrives (task-20.3 decision 6)', () => {
  /** A card in A2A 1.0's shape, as its agent serves it. */
  const current = {
    name: 'Shop B',
    description: 'Cameras.',
    version: '2.0.0',
    supportedInterfaces: [
      {url: 'http://127.0.0.1:12002/a2a', protocolBinding: 'JSONRPC', protocolVersion: '1.0'},
    ],
    skills: [
      {id: 'stock', name: 'Stock', description: 'In stock.', tags: [], examples: ['Any Z6?']},
    ],
  };
  const entryOf = (appId: string, card: unknown, version: string) => ({
    appId,
    publisher: 'northlight',
    cardUrl: `http://127.0.0.1:12002/${appId}/.well-known/agent-card.json`,
    card,
    catalogs: {},
    versions: [version],
    publishedAt: '2026-10-03T10:00:00Z',
    retired: [],
  });
  const serve = (routes: Record<string, unknown>) =>
    vi.stubGlobal(
      'fetch',
      vi.fn(async (input: unknown) => {
        const path = new URL(String(input)).pathname;
        return path in routes ? json(routes[path]) : json({}, 404);
      }),
    );

  it('the installed apps: each stored card read, whichever A2A version it was written in, beside what the list says of it', async () => {
    serve({
      '/registry/apps.json': [
        {id: 'linear', card: servedCard('Linear', {version: '0.2.0'}), reachable: true},
        {id: 'shop-b', card: current, reachable: true, noInterface: true},
      ],
    });
    const apps = await readInstalledApps(BASE);
    expect(apps.map(app => [app.id, app.card.name, app.card.version, app.noInterface])).toEqual([
      ['linear', 'Linear', '0.2.0', undefined],
      ['shop-b', 'Shop B', '2.0.0', true],
    ]);
    expect(apps[0]!.card.supportedInterfaces[0]).toMatchObject({
      protocolBinding: 'JSONRPC',
      protocolVersion: '0.3.0',
    });
    expect(apps[1]!.card.skills[0]!.examples).toEqual(['Any Z6?']);
  });

  it('the Store’s listings: each entry’s card read, one whose card does not read left out', async () => {
    serve({
      '/marketplace/index.json': [
        {entry: entryOf('linear', servedCard('Linear'), '1.0.0'), installed: true},
        {entry: entryOf('shop-b', current, '2.0.0'), installed: false},
        {entry: entryOf('broken', {name: 'Broken', url: 'http://x'}, '1.0.0'), installed: false},
      ],
    });
    const read = await readStoreIndex(BASE);
    expect(read.ok && read.value.map(l => [l.entry.appId, l.entry.card.name])).toEqual([
      ['linear', 'Linear'],
      ['shop-b', 'Shop B'],
    ]);
  });

  it('one app’s listing whose card does not read is an answer that does not read', async () => {
    serve({
      '/marketplace/apps/broken/entry.json': {
        entry: entryOf('broken', {name: 'Broken', url: 'http://x'}, '1.0.0'),
        installed: false,
      },
      '/marketplace/apps/shop-b/entry.json': {
        entry: entryOf('shop-b', current, '2.0.0'),
        installed: false,
      },
    });
    expect(await readStoreEntry(BASE, 'broken')).toEqual({ok: false, reason: 'malformed'});
    const read = await readStoreEntry(BASE, 'shop-b');
    expect(read.ok && read.value.entry.card.version).toBe('2.0.0');
  });
});

describe('a write that gets no answer is read back, never sent again (task-14.11 decision 40)', () => {
  const CATALOG = 'https://example.com/linear/catalog.json';
  /** Linear's card as its agent serves it: the page reads it where it arrives. */
  const card = (version: string) => servedCard('Linear', {version});

  /** The page's fetch: every write left unanswered, each read answered from `reads` by its path. */
  function tunnel(reads: Record<string, () => unknown>) {
    const fetch = vi.fn((input: unknown, init?: RequestInit) => {
      if (init?.method === 'POST') return silent(input, init);
      const path = new URL(String(input)).pathname;
      const read = reads[path];
      if (!read) throw new Error(`unread: ${path}`);
      return Promise.resolve(json(read()));
    });
    vi.stubGlobal('fetch', fetch);
    return {posts: () => fetch.mock.calls.filter(([, init]) => init?.method === 'POST').length};
  }

  const settle = async <T>(write: Promise<T>, ms = WRITE_TIMEOUT_MS) => {
    await vi.advanceTimersByTimeAsync(ms);
    return write;
  };

  it('an update is done when the app is installed as the Store lists it now', async () => {
    const listed = {
      entry: {
        appId: 'linear',
        card: card('0.2.0'),
        catalogs: {[CATALOG]: 'sha256-b'},
        versions: ['0.1.0', '0.2.0'],
      },
    };
    const installed = (version: string, build: string) => [
      {id: 'linear', card: card(version), catalogs: {[CATALOG]: build}},
    ];
    let held = installed('0.2.0', 'sha256-b');
    const sent = tunnel({
      '/registry/apps.json': () => held,
      '/marketplace/apps/linear/entry.json': () => listed,
    });
    expect(await settle(installApp(BASE, 'linear'))).toEqual({
      ok: true,
      appId: 'linear',
      replaced: true,
      followed: [],
    });
    held = installed('0.1.0', 'sha256-b');
    expect(await settle(installApp(BASE, 'linear'))).toEqual({ok: false, cause: 'unheard'});
    expect(sent.posts()).toBe(2);
  });

  it('an answer naming no cause the page knows says only that it didn’t go through (task-15.11 decision 48)', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => new Response('<html>Bad gateway</html>', {status: 502})),
    );
    expect(await installApp(BASE, 'linear')).toEqual({ok: false, cause: 'unheard'});
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => json({ok: false, cause: 'not-in-store'}, 422)),
    );
    expect(await installApp(BASE, 'linear')).toEqual({ok: false, cause: 'not-in-store'});
  });

  it('a rename, a sign-out and an uninstall are read back from the accounts and the apps', async () => {
    let accounts = [{appId: 'gmail', accounts: [{source: 'gmail.1', label: 'Work'}]}];
    tunnel({
      '/auth/accounts.json': () => accounts,
      '/registry/apps.json': () => [{id: 'github', card: card('0.1.0')}],
    });
    expect(await settle(renameAccount(BASE, 'gmail.1', ' Work '))).toEqual({
      ok: true,
      label: 'Work',
    });
    expect(await settle(renameAccount(BASE, 'gmail.1', 'Home'))).toEqual({ok: false});
    expect(await settle(signOutAccount(BASE, 'gmail.1', 'Work'))).toEqual({ok: false});
    accounts = [{appId: 'gmail', accounts: []}];
    expect(await settle(signOutAccount(BASE, 'gmail.1', 'Work'))).toEqual({
      ok: true,
      label: 'Work',
      revocation: 'unknown',
    });
    expect(await settle(uninstallApp(BASE, 'gmail'))).toEqual({ok: true, accounts: []});
    expect(await settle(uninstallApp(BASE, 'github'))).toEqual({ok: false});
  });

  it('a claim held here is claimed with no secret to show; one not held was not claimed', async () => {
    let status: unknown = {state: 'signed-in', publisher: 'northlight', store: 'accepted'};
    tunnel({'/marketplace/publisher.json': () => status});
    expect(await settle(claimPublisher(BASE, 'northlight'))).toEqual({
      ok: true,
      publisher: 'northlight',
      token: null,
      kept: true,
    });
    status = {state: 'signed-out'};
    expect(await settle(claimPublisher(BASE, 'northlight'))).toEqual({
      ok: false,
      refusal: 'unreached',
      findings: [],
    });
  });

  it('a publish waits the longer bound, then is done when listed at its builds and not ahead', async () => {
    const descriptor = '{"catalogId":"linear"}';
    const handed = await artifactIdOf(new TextEncoder().encode(descriptor));
    let entry: Record<string, unknown> = {
      appId: 'linear',
      card: card('0.2.0'),
      catalogs: {[CATALOG]: handed},
      versions: ['0.2.0'],
    };
    tunnel({
      '/marketplace/publisher.json': () => ({
        state: 'signed-in',
        publisher: 'acme',
        store: 'accepted',
      }),
      '/marketplace/listings.json': () => [{entry, installed: false}],
    });
    const request = {
      appId: 'linear',
      cardUrl: 'http://localhost:11005/.well-known/agent-card.json',
      catalogs: [{files: {'artifact.json': btoa(descriptor)}}],
    };
    let settled = false;
    const publish = publishApp(BASE, request).then(answer => ((settled = true), answer));
    await vi.advanceTimersByTimeAsync(WRITE_TIMEOUT_MS);
    expect(settled).toBe(false);
    expect(await settle(publish, PUBLISH_TIMEOUT_MS)).toEqual({
      ok: true,
      appId: 'linear',
      version: '0.2.0',
      summary: '',
      notes: [],
    });
    entry = {
      ...entry,
      aheadOfStore: {catalogIds: [], version: '0.2.0', seenAt: '2026-10-17T05:00:00Z'},
    };
    expect(await settle(publishApp(BASE, request), PUBLISH_TIMEOUT_MS)).toMatchObject({
      ok: false,
      refusal: 'unreached',
    });
    expect(await settle(unpublishApp(BASE, 'linear'))).toMatchObject({ok: false});
    entry = {...entry, appId: 'other'};
    expect(await settle(unpublishApp(BASE, 'linear'))).toEqual({ok: true});
  });
});
