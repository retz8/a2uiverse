import {readFileSync} from 'node:fs';
import {describe, expect, test} from 'vitest';
import {SERVER_CAPABILITIES_SCHEMA, SERVER_CAPABILITIES_SCHEMA_V09} from './a2ui/spec.generated';
import {
  A2UI_EXTENSION_URIS,
  A2UI_VERSIONS,
  BASIC_CATALOG_ID,
  checkAppId,
  checkCatalogExports,
  checkCoverage,
  checkHostInterface,
  claimAppId,
  classifySpecifier,
  coverageErrors,
  clientCapabilities,
  entitlementOf,
  readCatalogIdsByVersion,
  readSupportedCatalogIds,
  SUPPORTED_HOST_INTERFACES,
} from './catalog';

const GITHUB = 'https://example.com/github/catalog.json';
const GMAIL = 'https://example.com/gmail/catalog.json';

describe('checkCatalogExports', () => {
  const catalog = {id: GITHUB, components: new Map(), functions: new Map()};

  test('CATALOG alone conforms; Provider is optional', () => {
    expect(checkCatalogExports({CATALOG: catalog})).toEqual([]);
    expect(checkCatalogExports({CATALOG: catalog, Provider: () => null})).toEqual([]);
    expect(checkCatalogExports({CATALOG: catalog, COMPONENT_APIS: {}, FONT_STACK: 'x'})).toEqual(
      [],
    );
  });

  test('a memo or forwardRef Provider is a component', () => {
    expect(checkCatalogExports({CATALOG: catalog, Provider: {$$typeof: Symbol('memo')}})).toEqual(
      [],
    );
  });

  test('no CATALOG, a non-catalog, a wrong id, a non-component Provider', () => {
    expect(checkCatalogExports({})).toEqual([
      'the entry exports no CATALOG — export your Catalog from @a2ui/web_core',
    ]);
    expect(checkCatalogExports({CATALOG: {id: GITHUB}})[0]).toMatch(/not a Catalog/);
    expect(checkCatalogExports({CATALOG: catalog}, GMAIL)[0]).toMatch(/CATALOG\.id is/);
    expect(checkCatalogExports({CATALOG: catalog, Provider: 'x'})).toEqual([
      'Provider is exported but is not a component',
    ]);
  });
});

describe('classifySpecifier', () => {
  test('the seven lent specifiers are host', () => {
    for (const s of [
      'react',
      'react/jsx-runtime',
      'react-dom',
      'react-dom/client',
      '@a2ui/react/v0_9',
      '@a2ui/web_core/v0_9',
      '@a2ui/web_core/v0_9/basic_catalog',
      'zod',
    ]) {
      expect(classifySpecifier(s)).toBe('host');
    }
  });
  test('another specifier under a host package is refused', () => {
    expect(classifySpecifier('@a2ui/react/v0_8')).toBe('refuse');
    expect(classifySpecifier('react-dom/server')).toBe('refuse');
    expect(classifySpecifier('@a2ui/web_core/v1_0')).toBe('refuse');
    expect(classifySpecifier('zod/v4')).toBe('refuse');
  });
  test('everything else is bundled', () => {
    expect(classifySpecifier('@primer/react')).toBe('bundle');
    expect(classifySpecifier('@material/material-color-utilities')).toBe('bundle');
    expect(classifySpecifier('./components/button/index.js')).toBe('bundle');
    expect(classifySpecifier('react-aria')).toBe('bundle');
  });
});

const V09 = A2UI_EXTENSION_URIS['v0.9'];
const V091 = A2UI_EXTENSION_URIS['v0.9.1'];
const V08 = 'https://a2ui.org/a2a-extension/a2ui/v0.8';
const V10 = 'https://a2ui.org/a2a-extension/a2ui/v1.0';

/** A card from its extension entries alone: `[uri, params]`, params left out for a bare entry. */
const cardOf = (...entries: [string, Record<string, unknown>?][]) => ({
  capabilities: {
    extensions: entries.map(([uri, params]) => ({uri, ...(params ? {params} : {})})),
  },
});
const fixture = (name: string) =>
  JSON.parse(readFileSync(new URL(`../test/fixtures/cards/${name}`, import.meta.url), 'utf8'));
const both = (ids: string[]) => ({'v0.9': ids, 'v0.9.1': ids});

describe('the versions the platform speaks (task 19.1)', () => {
  test('v0.9 and v0.9.1, in that order, each with its extension URI', () => {
    expect(A2UI_VERSIONS).toEqual(['v0.9', 'v0.9.1']);
    expect(A2UI_EXTENSION_URIS).toEqual({
      'v0.9': 'https://a2ui.org/a2a-extension/a2ui/v0.9',
      'v0.9.1': 'https://a2ui.org/a2a-extension/a2ui/v0.9.1',
    });
  });
});

describe('readCatalogIdsByVersion (phase 19 decisions 2 and 3)', () => {
  test('no extension declares nothing: both versions empty', () => {
    expect(readCatalogIdsByVersion({})).toEqual({ok: true, value: both([])});
    expect(readCatalogIdsByVersion({capabilities: {}})).toEqual({ok: true, value: both([])});
  });

  test('a bare entry declares nothing: no params, empty params, params naming no ids', () => {
    expect(readCatalogIdsByVersion(cardOf([V091]))).toEqual({ok: true, value: both([])});
    expect(readCatalogIdsByVersion(cardOf([V091, {}]))).toEqual({ok: true, value: both([])});
    expect(readCatalogIdsByVersion(cardOf([V09, {acceptsInlineCatalogs: true}]))).toEqual({
      ok: true,
      value: both([]),
    });
    expect(readCatalogIdsByVersion(cardOf([V091, {'v0.9.1': {}}]))).toEqual({
      ok: true,
      value: both([]),
    });
  });

  test("another version's URI alone is passed over, not an error", () => {
    expect(readCatalogIdsByVersion(cardOf([V08, {supportedCatalogIds: [GITHUB]}]))).toEqual({
      ok: true,
      value: both([]),
    });
    expect(readCatalogIdsByVersion(cardOf([V10, {supportedCatalogIds: [GITHUB]}]))).toEqual({
      ok: true,
      value: both([]),
    });
  });

  test('one flat entry under either URI fills both versions', () => {
    expect(readCatalogIdsByVersion(cardOf([V09, {supportedCatalogIds: [GITHUB]}]))).toEqual({
      ok: true,
      value: both([GITHUB]),
    });
    expect(readCatalogIdsByVersion(cardOf([V091, {supportedCatalogIds: [GITHUB]}]))).toEqual({
      ok: true,
      value: both([GITHUB]),
    });
  });

  test('ids are read once each, in card order', () => {
    expect(
      readCatalogIdsByVersion(cardOf([V091, {supportedCatalogIds: [GITHUB, GMAIL, GITHUB]}])),
    ).toEqual({ok: true, value: both([GITHUB, GMAIL])});
  });

  test('keyed under either key, under either URI, the root requirement of v0.9 not applied', () => {
    for (const uri of [V09, V091]) {
      for (const key of ['v0.9', 'v0.9.1']) {
        expect(
          readCatalogIdsByVersion(cardOf([uri, {[key]: {supportedCatalogIds: [GITHUB]}}])),
        ).toEqual({ok: true, value: both([GITHUB])});
      }
    }
  });

  test('the URI decides the version; the key never retargets', () => {
    expect(
      readCatalogIdsByVersion(
        cardOf(
          [V09, {'v0.9.1': {supportedCatalogIds: [GITHUB]}}],
          [V091, {supportedCatalogIds: [GMAIL]}],
        ),
      ),
    ).toEqual({ok: true, value: {'v0.9': [GITHUB], 'v0.9.1': [GMAIL]}});
  });

  test("both keys in one entry union into that entry's set", () => {
    expect(
      readCatalogIdsByVersion(
        cardOf([
          V091,
          {'v0.9': {supportedCatalogIds: [GITHUB]}, 'v0.9.1': {supportedCatalogIds: [GMAIL]}},
        ]),
      ),
    ).toEqual({ok: true, value: both([GITHUB, GMAIL])});
  });

  test('a third version key beside a counted one is passed over', () => {
    expect(
      readCatalogIdsByVersion(
        cardOf([
          V091,
          {'v0.9.1': {supportedCatalogIds: [GITHUB]}, 'v1.0': {supportedCatalogIds: [GMAIL]}},
        ]),
      ),
    ).toEqual({ok: true, value: both([GITHUB])});
  });

  test('a flat field beside a version key is not read', () => {
    expect(
      readCatalogIdsByVersion(
        cardOf([V091, {supportedCatalogIds: [GMAIL], 'v0.9.1': {supportedCatalogIds: [GITHUB]}}]),
      ),
    ).toEqual({ok: true, value: both([GITHUB])});
  });

  test("a bare entry beside a declaring one takes the other's set", () => {
    expect(readCatalogIdsByVersion(cardOf([V091], [V09, {supportedCatalogIds: [GITHUB]}]))).toEqual(
      {
        ok: true,
        value: both([GITHUB]),
      },
    );
  });

  test('two entries naming one set: no version axis', () => {
    expect(
      readCatalogIdsByVersion(
        cardOf([V09, {supportedCatalogIds: [GITHUB]}], [V091, {supportedCatalogIds: [GITHUB]}]),
      ),
    ).toEqual({ok: true, value: both([GITHUB])});
  });

  test('two entries naming different sets keep each under its own version', () => {
    expect(
      readCatalogIdsByVersion(
        cardOf([V09, {supportedCatalogIds: [GITHUB]}], [V091, {supportedCatalogIds: [GMAIL]}]),
      ),
    ).toEqual({ok: true, value: {'v0.9': [GITHUB], 'v0.9.1': [GMAIL]}});
  });

  test('two entries under one URI merge', () => {
    expect(
      readCatalogIdsByVersion(
        cardOf(
          [V091, {supportedCatalogIds: [GITHUB]}],
          [V091, {supportedCatalogIds: [GMAIL, GITHUB]}],
        ),
      ),
    ).toEqual({ok: true, value: both([GITHUB, GMAIL])});
  });

  test("the ADK restaurant finder's real card: its v0.8 entry passed over, its v0.9 entry read", () => {
    const read = readCatalogIdsByVersion(fixture('adk-restaurant-finder.json'));
    expect(read).toEqual({ok: true, value: both([BASIC_CATALOG_ID])});
    expect(JSON.stringify(read)).not.toContain('v0_8');
  });

  test("the kit's three shapes", () => {
    const github = 'https://a2uiverse.dev/catalogs/github/catalog.json';
    const shopA = 'https://a2uiverse.dev/catalogs/shop-a/catalog.json';
    const calendar = 'https://a2uiverse.dev/catalogs/calendar/catalog.json';
    expect(readCatalogIdsByVersion(fixture('kit-v091-only.json'))).toEqual({
      ok: true,
      value: both([github]),
    });
    expect(readCatalogIdsByVersion(fixture('kit-v09-only.json'))).toEqual({
      ok: true,
      value: both([shopA]),
    });
    expect(readCatalogIdsByVersion(fixture('kit-both.json'))).toEqual({
      ok: true,
      value: both([calendar]),
    });
  });

  test('an object keyed with neither key is an error naming the entry', () => {
    const read = readCatalogIdsByVersion(cardOf([V09, {'v0.8': {supportedCatalogIds: [GITHUB]}}]));
    expect(read.ok).toBe(false);
    if (!read.ok) {
      expect(read.errors).toHaveLength(1);
      expect(read.errors[0]).toMatch(
        /^A2UI v0\.9 extension params: keyed under neither v0\.9 nor v0\.9\.1/,
      );
    }
  });

  test('malformed ids are an error naming the entry and the path', () => {
    const flat = readCatalogIdsByVersion(cardOf([V09, {supportedCatalogIds: 'github'}]));
    expect(flat.ok).toBe(false);
    if (!flat.ok) {
      expect(flat.errors[0]).toMatch(
        /^A2UI v0\.9 extension params\/supportedCatalogIds: must be array/,
      );
    }
    const keyed = readCatalogIdsByVersion(cardOf([V091, {'v0.9.1': {supportedCatalogIds: [1]}}]));
    expect(keyed.ok).toBe(false);
    if (!keyed.ok) {
      expect(keyed.errors[0]).toMatch(
        /^A2UI v0\.9\.1 extension params\/v0\.9\.1\/supportedCatalogIds\/0: must be string/,
      );
    }
  });

  test('one malformed entry beside a good one fails the whole read', () => {
    const read = readCatalogIdsByVersion(
      cardOf([V09, {supportedCatalogIds: [GITHUB]}], [V091, {supportedCatalogIds: 'gmail'}]),
    );
    expect(read.ok).toBe(false);
    if (!read.ok)
      expect(read.errors).toEqual([expect.stringMatching(/^A2UI v0\.9\.1 extension params/)]);
  });
});

describe('readSupportedCatalogIds: the union', () => {
  test("one entry: that entry's ids, as before", () => {
    expect(readSupportedCatalogIds({})).toEqual({ok: true, value: []});
    expect(readSupportedCatalogIds(cardOf([V091]))).toEqual({ok: true, value: []});
    expect(
      readSupportedCatalogIds(cardOf([V091, {supportedCatalogIds: [GITHUB, GMAIL, GITHUB]}])),
    ).toEqual({
      ok: true,
      value: [GITHUB, GMAIL],
    });
    expect(
      readSupportedCatalogIds(cardOf([V091, {'v0.9': {supportedCatalogIds: [GITHUB]}}])),
    ).toEqual({
      ok: true,
      value: [GITHUB],
    });
  });

  test("two entries naming different sets: both versions' ids, v0.9's first, each once", () => {
    expect(
      readSupportedCatalogIds(
        cardOf(
          [V091, {supportedCatalogIds: [GMAIL, GITHUB]}],
          [V09, {supportedCatalogIds: [GITHUB]}],
        ),
      ),
    ).toEqual({ok: true, value: [GITHUB, GMAIL]});
  });

  test('the finder: the basic catalog alone', () => {
    expect(readSupportedCatalogIds(fixture('adk-restaurant-finder.json'))).toEqual({
      ok: true,
      value: [BASIC_CATALOG_ID],
    });
  });

  test('a malformed declaration is an error, never none', () => {
    const read = readSupportedCatalogIds(cardOf([V09, {supportedCatalogIds: 'github'}]));
    expect(read.ok).toBe(false);
  });
});

describe('clientCapabilities', () => {
  test('one list is written under both version keys, in version order', () => {
    const written = clientCapabilities([GITHUB]);
    expect(written).toEqual({
      'v0.9': {supportedCatalogIds: [GITHUB]},
      'v0.9.1': {supportedCatalogIds: [GITHUB]},
    });
    expect(Object.keys(written)).toEqual([...A2UI_VERSIONS]);
  });

  test("a map by version is written key by key, each version's own set", () => {
    expect(clientCapabilities({'v0.9': [GITHUB], 'v0.9.1': [GITHUB, GMAIL]})).toEqual({
      'v0.9': {supportedCatalogIds: [GITHUB]},
      'v0.9.1': {supportedCatalogIds: [GITHUB, GMAIL]},
    });
  });

  test('what is written is a copy', () => {
    const ids = [GITHUB];
    const written = clientCapabilities(ids) as Record<string, {supportedCatalogIds: string[]}>;
    written['v0.9'].supportedCatalogIds.push(GMAIL);
    expect(ids).toEqual([GITHUB]);
    expect(written['v0.9.1'].supportedCatalogIds).toEqual([GITHUB]);
  });
});

describe('coverage and entitlement', () => {
  test('covered: declared ids handed, the basic catalog free', () => {
    expect(checkCoverage([GITHUB, BASIC_CATALOG_ID], [GITHUB])).toEqual({missing: [], orphan: []});
    expect(checkCoverage([], [])).toEqual({missing: [], orphan: []});
  });
  test('missing: declared, neither handed nor public — whether or not the table holds it', () => {
    expect(checkCoverage([GITHUB], [])).toEqual({missing: [GITHUB], orphan: []});
  });
  test('orphan: handed, not declared', () => {
    expect(checkCoverage([], [GMAIL])).toEqual({missing: [], orphan: [GMAIL]});
    expect(checkCoverage([GITHUB], [GITHUB, GMAIL])).toEqual({missing: [], orphan: [GMAIL]});
  });
  test('the errors name each id and its direction', () => {
    const errors = coverageErrors(checkCoverage([GITHUB], [GMAIL]));
    expect(errors).toHaveLength(2);
    expect(errors[0]).toMatch(/declares catalog .*github.* but no artifact/);
    expect(errors[1]).toMatch(
      /artifact for catalog .*gmail.* was handed but the card does not declare/,
    );
  });
  test('entitlement is the public catalogs then the handed ids, each once', () => {
    expect(entitlementOf([GITHUB, GITHUB])).toEqual([BASIC_CATALOG_ID, GITHUB]);
    expect(entitlementOf([])).toEqual([BASIC_CATALOG_ID]);
    expect(entitlementOf([BASIC_CATALOG_ID])).toEqual([BASIC_CATALOG_ID]);
  });
});

describe('the app id', () => {
  test('slugs pass', () => {
    for (const id of ['github', 'gmail', 'shop-a', 'a', 'x1-y2'])
      expect(checkAppId(id)).toEqual([]);
  });
  test('not slugs', () => {
    expect(checkAppId('GitHub')[0]).toMatch(/not a slug/);
    expect(checkAppId('github ')[0]).toMatch(/not a slug/);
    expect(checkAppId('gıthub')[0]).toMatch(/not a slug/);
    expect(checkAppId('1st')[0]).toMatch(/not a slug/);
    expect(checkAppId('a:b')[0]).toMatch(/not a slug/);
    expect(checkAppId('')).toEqual(['an app id is required']);
    expect(checkAppId('a'.repeat(64))[0]).toMatch(/longer than 63/);
  });
  test('shell is reserved', () => {
    expect(checkAppId('shell')).toEqual(['app id "shell" is reserved']);
  });
  test('claiming: grammar first, then uniqueness', () => {
    expect(claimAppId('github', new Set(['gmail']))).toEqual([]);
    expect(claimAppId('github', new Set(['github']))).toEqual(['app id "github" is already taken']);
    expect(claimAppId('GitHub', new Set(['github']))).toHaveLength(1);
  });
});

describe('the host interface an artifact was built against (task-11.4 decision 4)', () => {
  test('one the platform supplies passes', () => {
    expect(SUPPORTED_HOST_INTERFACES).toEqual(['0.14.0']);
    expect(checkHostInterface('0.14.0')).toEqual([]);
  });

  test('any other is refused, naming what the platform supplies', () => {
    expect(checkHostInterface('1.0')).toEqual([
      'host interface "1.0" is not one the platform supplies (it supplies "0.14.0")',
    ]);
  });
});

describe('the pinned capabilities schemas (task 19.1)', () => {
  test("v0.9's and v0.9.1's server capabilities name one version part, equal in both", () => {
    expect(SERVER_CAPABILITIES_SCHEMA_V09.properties).toEqual(
      SERVER_CAPABILITIES_SCHEMA.properties,
    );
    expect(Object.keys(SERVER_CAPABILITIES_SCHEMA.properties as object)).toEqual(['v0.9']);
  });
});
