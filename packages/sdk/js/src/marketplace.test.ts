import {describe, expect, test} from 'vitest';
import {
  CLAIM_REQUEST_FIELDS,
  MARKETPLACE_ROUTES,
  PUBLISHER_TOKEN_PATTERN,
  SEARCH_QUERY_PARAM,
  UPDATE_STATES,
  artifactPath,
  checkPublisherName,
  checkPublisherToken,
  entryPath,
  hashPublisherToken,
  mintPublisherToken,
  previewPath,
  readClaimRequest,
  readPublishRequest,
  readReportRequest,
  readSearchResponse,
  readUnpublishRequest,
  readUpdateState,
  searchPath,
  validateIndexEntry,
  validatePreview,
} from './marketplace';

const card = {
  name: 'Shop A',
  description: 'A shop.',
  url: 'http://localhost:10100',
  version: '1.1.0',
  skills: [{id: 'browse', name: 'Browse', description: 'Browse.', tags: ['shop']}],
};

const entry = {
  appId: 'shop-a',
  publisher: 'acme',
  cardUrl: 'http://localhost:10100/.well-known/agent-card.json',
  card,
  catalogs: {'cat/v1': 'sha256-6htI5yVBOSkfXWXQgCYxjFuBXIDjvLdJOaeepCslAS0'},
  versions: ['1.0.0', '1.1.0'],
  publishedAt: '2026-10-10T00:00:00.000Z',
  retired: [],
};

const preview = {
  appId: 'shop-a',
  version: '1.1.0',
  words: 'show me the shop',
  messages: [
    {version: 'v0.9', createSurface: {surfaceId: 'main', catalogId: 'cat/v1'}},
    {
      version: 'v0.9',
      updateComponents: {
        surfaceId: 'main',
        components: [{id: 'root', component: 'Text', text: 'Hello'}],
      },
    },
  ],
  capturedBy: 'publisher',
  capturedAt: '2026-10-10T00:00:00.000Z',
};

describe('routes', () => {
  test('the static-shaped reads, search and the writes, at the root', () => {
    expect(MARKETPLACE_ROUTES.index).toBe('index.json');
    expect(entryPath('shop-a')).toBe('apps/shop-a/entry.json');
    expect(previewPath('shop-a')).toBe('apps/shop-a/preview.json');
    expect(artifactPath('sha256-abc', 'dist/theme.css')).toBe(
      'artifacts/sha256-abc/dist/theme.css',
    );
    expect(SEARCH_QUERY_PARAM).toBe('q');
    expect(searchPath('my open pull requests')).toBe('search?q=my%20open%20pull%20requests');
    expect(MARKETPLACE_ROUTES.claim).toBe('claim');
    expect(MARKETPLACE_ROUTES.publish).toBe('publish');
    expect(MARKETPLACE_ROUTES.unpublish).toBe('unpublish');
    expect(MARKETPLACE_ROUTES.report).toBe('report');
  });
});

describe('the publisher', () => {
  test('the name has the app id’s grammar, shell reserved', () => {
    expect(checkPublisherName('acme')).toEqual([]);
    expect(checkPublisherName('acme-labs-2')).toEqual([]);
    expect(checkPublisherName('')).toEqual(['a publisher name is required']);
    expect(checkPublisherName('Acme Inc')[0]).toMatch(/not a slug/);
    expect(checkPublisherName('a'.repeat(64))[0]).toMatch(/longer than 63/);
    expect(checkPublisherName('shell')).toEqual(['publisher name "shell" is reserved']);
  });

  test('a minted token is 32 random bytes as unpadded base64url, never the same twice', () => {
    const a = mintPublisherToken();
    const b = mintPublisherToken();
    expect(a).toMatch(PUBLISHER_TOKEN_PATTERN);
    expect(a).toHaveLength(43);
    expect(a).not.toBe(b);
    expect(checkPublisherToken(a)).toEqual([]);
    expect(checkPublisherToken('')).toEqual(['a token is required']);
    expect(checkPublisherToken('short')).toEqual(['the token is not in its form']);
    expect(checkPublisherToken(`${a.slice(0, 42)}=`)).toEqual(['the token is not in its form']);
  });

  test('the hash is SHA-256 in the artifact hashes’ form, the same for the same token', async () => {
    const token = mintPublisherToken();
    const hash = await hashPublisherToken(token);
    expect(hash).toMatch(/^sha256-[A-Za-z0-9+/]{43}=$/);
    expect(await hashPublisherToken(token)).toBe(hash);
    expect(await hashPublisherToken(mintPublisherToken())).not.toBe(hash);
  });
});

describe('the index entry', () => {
  test('a well-formed entry validates, with and without the flag', () => {
    expect(validateIndexEntry(entry)).toEqual({ok: true, value: entry});
    const flagged = {
      ...entry,
      aheadOfStore: {catalogIds: ['cat/v2'], version: '2.0.0', seenAt: '2026-10-11T00:00:00.000Z'},
    };
    expect(validateIndexEntry(flagged).ok).toBe(true);
  });

  test('a missing field, an unknown field, a card without a version, a bad artifact id', () => {
    const errors = (input: unknown) => {
      const result = validateIndexEntry(input);
      return result.ok ? [] : result.errors;
    };
    expect(errors({...entry, publisher: undefined})[0]).toMatch(/publisher/);
    expect(errors({...entry, extra: 1})[0]).toMatch(/extra/);
    expect(errors({...entry, card: {...card, version: undefined}})[0]).toMatch(/version/);
    expect(errors({...entry, catalogs: {'cat/v1': 'not-a-hash'}})[0]).toMatch(/catalogs/);
  });

  test('the card’s version is the last of versions, and a retired id is not among the catalogs', () => {
    const result = validateIndexEntry({...entry, versions: ['1.1.0', '1.0.0']});
    expect(result).toEqual({
      ok: false,
      errors: ['/versions: the last published version is "1.0.0", the card’s is "1.1.0"'],
    });
    expect(validateIndexEntry({...entry, retired: ['cat/v1']})).toEqual({
      ok: false,
      errors: ['/retired: "cat/v1" is retired and among the catalogs'],
    });
  });
});

describe('the captured preview', () => {
  test('a well-formed preview validates', () => {
    expect(validatePreview(preview)).toEqual({ok: true, value: preview});
  });

  test('no messages, a message with no version, an unknown capturer', () => {
    const errors = (input: unknown) => {
      const result = validatePreview(input);
      return result.ok ? [] : result.errors;
    };
    expect(errors({...preview, messages: []})[0]).toMatch(/messages/);
    expect(errors({...preview, messages: [{createSurface: {}}]})[0]).toMatch(/version/);
    expect(errors({...preview, capturedBy: 'someone'})[0]).toMatch(/capturedBy/);
  });
});

describe('the wire bodies', () => {
  test('the claim names a publisher', () => {
    expect(CLAIM_REQUEST_FIELDS).toEqual(['publisher']);
    expect(readClaimRequest({publisher: 'acme'})).toEqual({ok: true, value: {publisher: 'acme'}});
    expect(readClaimRequest({})).toEqual({ok: false, errors: ['publisher: expected a string']});
  });

  test('publish carries the app id, the card URL, each catalog’s files decoded, and the preview when there is one', () => {
    const files = {'artifact.json': Buffer.from('{}').toString('base64')};
    const read = readPublishRequest({
      appId: 'shop-a',
      cardUrl: 'http://localhost:10100/.well-known/agent-card.json',
      catalogs: [{files}],
      preview,
    });
    expect(read.ok).toBe(true);
    if (!read.ok) return;
    expect(read.value.appId).toBe('shop-a');
    expect(read.value.catalogs).toHaveLength(1);
    expect(new TextDecoder().decode(read.value.catalogs[0].get('artifact.json'))).toBe('{}');
    expect(read.value.preview).toEqual(preview);
    const bare = readPublishRequest({appId: 'shop-a', cardUrl: 'http://x', catalogs: []});
    expect(bare).toEqual({ok: true, value: {appId: 'shop-a', cardUrl: 'http://x', catalogs: []}});
  });

  test('publish refuses a bad shape, an unsafe path and a malformed preview, every finding named', () => {
    const read = readPublishRequest({
      appId: 1,
      catalogs: [{files: {'../x': 'AA=='}}, {}],
      preview: {...preview, messages: []},
    });
    expect(read.ok).toBe(false);
    if (read.ok) return;
    expect(read.errors).toEqual([
      'appId: expected a string',
      'cardUrl: expected a string',
      'catalogs[0].files["../x"]: expected a relative path to base64',
      'catalogs[1].files: expected a map of path to base64',
      expect.stringMatching(/^preview\/messages/),
    ]);
  });

  test('unpublish and report name an app', () => {
    expect(readUnpublishRequest({appId: 'shop-a'})).toEqual({ok: true, value: {appId: 'shop-a'}});
    expect(readUnpublishRequest({})).toEqual({ok: false, errors: ['appId: expected a string']});
    expect(readReportRequest({appId: 'shop-a'})).toEqual({ok: true, value: {appId: 'shop-a'}});
    expect(readReportRequest({appId: '', extra: 1})).toEqual({
      ok: false,
      errors: ['appId: expected a string'],
    });
  });

  test('search answers entries in rank order, each with its score', () => {
    const response = {results: [{entry, score: 0.5}]};
    expect(readSearchResponse(response)).toEqual({ok: true, value: response});
    const bad = readSearchResponse({results: [{entry: {...entry, appId: 1}, score: 'x'}]});
    expect(bad.ok).toBe(false);
    if (!bad.ok) {
      expect(bad.errors[0]).toMatch(/^results\[0\]\.entry/);
      expect(bad.errors.at(-1)).toBe('results[0].score: expected a number');
    }
  });
});

describe('the update state', () => {
  test('eight states in precedence order', () => {
    expect([...UPDATE_STATES]).toEqual([
      'unknown',
      'not-published',
      'ahead-of-store',
      'update-required',
      'major-update',
      'card-update',
      'newer-build',
      'up-to-date',
    ]);
  });

  test('each state reads back with its own details', () => {
    const base = {appId: 'shop-a', installedVersion: '1.0.0'};
    const build = {catalogId: 'cat/v1', installed: 'sha-old', published: 'sha-new'};
    const states = [
      {...base, state: 'unknown'},
      {...base, state: 'not-published'},
      {...base, state: 'ahead-of-store', publishedVersion: '1.1.0', catalogIds: ['cat/v2']},
      {
        ...base,
        state: 'ahead-of-store',
        publishedVersion: '1.1.0',
        catalogIds: [],
        version: '2.0.0',
      },
      {...base, state: 'update-required', publishedVersion: '2.0.0', retired: ['cat/v1']},
      {
        ...base,
        state: 'major-update',
        publishedVersion: '2.0.0',
        newCatalogIds: ['cat/v2'],
        builds: [],
      },
      {
        ...base,
        state: 'card-update',
        publishedVersion: '1.1.0',
        newScopes: [{scheme: 'oauth', scopes: ['mail.read']}],
        builds: [build],
      },
      {...base, state: 'newer-build', publishedVersion: '1.0.0', builds: [build]},
      {...base, state: 'up-to-date', publishedVersion: '1.0.0'},
    ];
    for (const state of states) expect(readUpdateState(state)).toEqual(state);
  });

  test('an unknown state, a missing detail, a detail of another state, or a bad build is not read', () => {
    const base = {appId: 'shop-a', installedVersion: '1.0.0'};
    expect(readUpdateState({...base, state: 'stale'})).toBeUndefined();
    expect(
      readUpdateState({...base, state: 'newer-build', publishedVersion: '1.0.0'}),
    ).toBeUndefined();
    expect(
      readUpdateState({...base, state: 'up-to-date', publishedVersion: '1.0.0', retired: []}),
    ).toBeUndefined();
    expect(readUpdateState({...base, state: 'unknown', publishedVersion: '1.0.0'})).toBeUndefined();
    expect(
      readUpdateState({
        ...base,
        state: 'newer-build',
        publishedVersion: '1.0.0',
        builds: [{catalogId: 'cat/v1', installed: 'a'}],
      }),
    ).toBeUndefined();
    expect(readUpdateState({state: 'unknown', installedVersion: '1.0.0'})).toBeUndefined();
  });
});
