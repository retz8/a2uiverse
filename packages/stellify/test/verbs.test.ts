/** `claim`, `publish`, `unpublish` and `listPublished` over the sdk's wire (task-13.4 decisions 3, 9–11). */
import {ARTIFACT_DESCRIPTOR_FILE} from '@a2uiverse/sdk';
import {afterEach, beforeAll, describe, expect, test} from 'vitest';
import {
  artifactFiles,
  claim,
  listPublished,
  publish,
  stellify,
  unpublish,
  type PreviewDocument,
} from '../src/index.js';
import {STAR_CATALOG_ID} from './fakeAgent.js';
import {entryFor, startFakeMarketplace, type FakeMarketplace} from './fakeMarketplace.js';
import {copyFixture} from './fixture.js';

let star: Map<string, Uint8Array>;
beforeAll(async () => {
  star = artifactFiles(await stellify(copyFixture()));
});

let marketplace: FakeMarketplace | undefined;
afterEach(async () => {
  await marketplace?.close();
  marketplace = undefined;
});

const PREVIEW: PreviewDocument = {
  appId: 'star',
  version: '0.1.0',
  words: 'Hello!',
  messages: [{version: 'v0.9', createSurface: {surfaceId: 's1', catalogId: STAR_CATALOG_ID}}],
  capturedBy: 'publisher',
  capturedAt: '2026-10-10T00:00:00.000Z',
};

describe('claim', () => {
  test('a free name: the token the marketplace minted, the claim body on the wire, no token sent', async () => {
    marketplace = await startFakeMarketplace();
    const result = await claim({marketplace: marketplace.url, name: 'acme'});
    expect(result).toEqual({
      ok: true,
      marketplace: marketplace.url,
      publisher: 'acme',
      token: marketplace.token,
    });
    expect(marketplace.requests).toEqual([
      expect.objectContaining({method: 'POST', path: 'claim', body: {publisher: 'acme'}}),
    ]);
    expect(marketplace.requests[0]?.headers.authorization).toBeUndefined();
  });

  test('a taken name: the marketplace’s findings and its status', async () => {
    marketplace = await startFakeMarketplace({
      claim: () => ({status: 409, body: {ok: false, findings: ['publisher name "acme" is taken']}}),
    });
    expect(await claim({marketplace: marketplace.url, name: 'acme'})).toEqual({
      ok: false,
      status: 409,
      findings: ['publisher name "acme" is taken'],
    });
  });

  test('a marketplace that cannot be reached', async () => {
    const result = await claim({marketplace: 'http://127.0.0.1:1', name: 'acme'});
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.findings[0]).toMatch(
      /^cannot reach the marketplace at http:\/\/127\.0\.0\.1:1: /,
    );
  });
});

describe('publish', () => {
  test('the body on the wire: the app id, the card URL, every file of each artifact as base64, the preview beside; the bearer token', async () => {
    marketplace = await startFakeMarketplace();
    const result = await publish({
      marketplace: marketplace.url,
      token: marketplace.token,
      appId: 'star',
      cardUrl: 'http://127.0.0.1:1/.well-known/agent-card.json',
      catalogs: [star],
      preview: PREVIEW,
    });
    expect(result).toEqual({
      ok: true,
      appId: 'star',
      version: '0.1.0',
      summary: 'published star · card 0.1.0 · catalog sha256-xxxxxxxx…',
      notes: ['app id "star" is now acme’s'],
    });
    const [request] = marketplace.requests;
    expect(request?.method).toBe('POST');
    expect(request?.path).toBe('publish');
    expect(request?.headers.authorization).toBe(`Bearer ${marketplace.token}`);
    const body = request?.body as {
      appId: string;
      cardUrl: string;
      catalogs: {files: Record<string, string>}[];
      preview: unknown;
    };
    expect(body.appId).toBe('star');
    expect(body.cardUrl).toBe('http://127.0.0.1:1/.well-known/agent-card.json');
    expect(body.preview).toEqual(PREVIEW);
    expect(body.catalogs).toHaveLength(1);
    expect(Object.keys(body.catalogs[0]!.files).sort()).toEqual([...star.keys()].sort());
    expect(Buffer.from(body.catalogs[0]!.files[ARTIFACT_DESCRIPTOR_FILE]!, 'base64')).toEqual(
      Buffer.from(star.get(ARTIFACT_DESCRIPTOR_FILE)!),
    );
  });

  test('no preview: none on the wire', async () => {
    marketplace = await startFakeMarketplace();
    await publish({
      marketplace: marketplace.url,
      token: marketplace.token,
      appId: 'star',
      cardUrl: 'http://127.0.0.1:1/card.json',
      catalogs: [],
    });
    expect('preview' in (marketplace.requests[0]?.body as object)).toBe(false);
  });

  test('a refusal: the marketplace’s findings and its status, 422, 403 and 401 alike', async () => {
    marketplace = await startFakeMarketplace({
      publish: () => ({status: 422, body: {ok: false, findings: ['one', 'two']}}),
    });
    expect(
      await publish({
        marketplace: marketplace.url,
        token: marketplace.token,
        appId: 'star',
        cardUrl: 'x',
        catalogs: [],
      }),
    ).toEqual({ok: false, status: 422, findings: ['one', 'two']});
    await marketplace.close();
    marketplace = await startFakeMarketplace();
    expect(
      await publish({
        marketplace: marketplace.url,
        token: 'wrong',
        appId: 'star',
        cardUrl: 'x',
        catalogs: [],
      }),
    ).toEqual({ok: false, status: 401, findings: ['the publisher token is missing or wrong']});
  });

  test('a malformed preview is refused before any request', async () => {
    marketplace = await startFakeMarketplace();
    const result = await publish({
      marketplace: marketplace.url,
      token: marketplace.token,
      appId: 'star',
      cardUrl: 'x',
      catalogs: [],
      preview: {appId: 'star'} as unknown as PreviewDocument,
    });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.findings[0]).toMatch(/^the preview /);
    expect(marketplace.requests).toEqual([]);
  });
});

describe('unpublish', () => {
  test('the owner’s: the app id on the wire with the bearer token', async () => {
    marketplace = await startFakeMarketplace();
    expect(
      await unpublish({marketplace: marketplace.url, token: marketplace.token, appId: 'star'}),
    ).toEqual({ok: true, appId: 'star'});
    expect(marketplace.requests).toEqual([
      expect.objectContaining({method: 'POST', path: 'unpublish', body: {appId: 'star'}}),
    ]);
    expect(marketplace.requests[0]?.headers.authorization).toBe(`Bearer ${marketplace.token}`);
  });

  test('not published: the marketplace’s 404 and its finding', async () => {
    marketplace = await startFakeMarketplace({
      unpublish: () => ({
        status: 404,
        body: {ok: false, findings: ['app "star" is not published']},
      }),
    });
    expect(
      await unpublish({marketplace: marketplace.url, token: marketplace.token, appId: 'star'}),
    ).toEqual({ok: false, status: 404, findings: ['app "star" is not published']});
  });
});

describe('listPublished', () => {
  test('the publisher’s apps alone, with the notices among them', async () => {
    marketplace = await startFakeMarketplace({
      entries: [
        entryFor('star', {
          publisher: 'acme',
          version: '0.2.0',
          versions: ['0.1.0', '0.2.0'],
          catalogs: {[STAR_CATALOG_ID]: `sha256-${'a'.repeat(43)}`},
          retired: ['https://example.com/old/catalog.json'],
        }),
        entryFor('moon', {
          publisher: 'acme',
          aheadOfStore: {
            catalogIds: ['https://example.com/moon/catalog.json'],
            seenAt: '2026-10-10T01:00:00.000Z',
          },
        }),
        entryFor('other', {publisher: 'someone-else'}),
      ],
    });
    const result = await listPublished({marketplace: marketplace.url, publisher: 'acme'});
    expect(result).toEqual({
      ok: true,
      apps: [
        {
          appId: 'star',
          version: '0.2.0',
          cardUrl: 'http://127.0.0.1:1/star/.well-known/agent-card.json',
          catalogs: {[STAR_CATALOG_ID]: `sha256-${'a'.repeat(43)}`},
          retired: ['https://example.com/old/catalog.json'],
          publishedAt: '2026-10-10T00:00:00.000Z',
        },
        {
          appId: 'moon',
          version: '0.1.0',
          cardUrl: 'http://127.0.0.1:1/moon/.well-known/agent-card.json',
          catalogs: {},
          retired: [],
          publishedAt: '2026-10-10T00:00:00.000Z',
          aheadOfStore: {
            catalogIds: ['https://example.com/moon/catalog.json'],
            seenAt: '2026-10-10T01:00:00.000Z',
          },
        },
      ],
      notices: [
        {
          appId: 'moon',
          catalogIds: ['https://example.com/moon/catalog.json'],
          seenAt: '2026-10-10T01:00:00.000Z',
        },
      ],
    });
  });

  test('a marketplace that cannot be reached', async () => {
    const result = await listPublished({marketplace: 'http://127.0.0.1:1', publisher: 'acme'});
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.findings[0]).toMatch(/^cannot reach the marketplace/);
  });
});
