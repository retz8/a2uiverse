import {readFileSync} from 'node:fs';
import {describe, expect, test} from 'vitest';
import {
  A2UI_EXTENSION_BASE,
  A2UI_EXTENSION_URI,
  A2UI_RENDERER_CAPABILITIES_KEY,
  A2UI_RENDERER_DATA_MODEL_KEY,
  BASIC_CATALOG_ID,
  checkAppId,
  checkCatalogExports,
  checkCoverage,
  checkHostInterface,
  claimAppId,
  classifySpecifier,
  coverageErrors,
  entitlementOf,
  readSupportedCatalogIds,
  rendererCapabilities,
  SUPPORTED_HOST_INTERFACES,
} from './catalog';

test('the message-metadata keys, as the v1.0 A2UI extension specification spells them', () => {
  expect(A2UI_RENDERER_CAPABILITIES_KEY).toBe('a2uiRendererCapabilities');
  expect(A2UI_RENDERER_DATA_MODEL_KEY).toBe('a2uiRendererDataModel');
  expect(A2UI_EXTENSION_URI).toBe('https://a2ui.org/a2a-extension/a2ui/v1.0');
  expect(BASIC_CATALOG_ID).toBe('https://a2ui.org/specification/v1_0/catalogs/basic/catalog.json');
});

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
  test('the eight lent specifiers are host', () => {
    for (const s of [
      'react',
      'react/jsx-runtime',
      'react-dom',
      'react-dom/client',
      'zod',
      '@a2ui/react',
      '@a2ui/web_core/v1_0',
      '@a2ui/web_core/catalogs/basic/v1',
    ]) {
      expect(classifySpecifier(s)).toBe('host');
    }
  });
  test('another specifier under a host package is refused', () => {
    expect(classifySpecifier('@a2ui/react/v0_9')).toBe('refuse');
    expect(classifySpecifier('@a2ui/web_core/v0_9')).toBe('refuse');
    expect(classifySpecifier('@a2ui/web_core/v0_9/basic_catalog')).toBe('refuse');
    expect(classifySpecifier('react-dom/server')).toBe('refuse');
    expect(classifySpecifier('zod/v4')).toBe('refuse');
  });
  test('the @a2ui/web_core root and @a2ui/web_core/universal are refused', () => {
    expect(classifySpecifier('@a2ui/web_core')).toBe('refuse');
    expect(classifySpecifier('@a2ui/web_core/universal')).toBe('refuse');
  });
  test('everything else is bundled', () => {
    expect(classifySpecifier('@primer/react')).toBe('bundle');
    expect(classifySpecifier('@material/material-color-utilities')).toBe('bundle');
    expect(classifySpecifier('./components/button/index.js')).toBe('bundle');
    expect(classifySpecifier('react-aria')).toBe('bundle');
  });
});

const V09 = `${A2UI_EXTENSION_BASE}v0.9`;
const V08 = `${A2UI_EXTENSION_BASE}v0.8`;
const V11 = `${A2UI_EXTENSION_BASE}v1.1`;

/** A card from its extension entries alone: `[uri, params]`, params left out for a bare entry. */
const cardOf = (...entries: [string, Record<string, unknown>?][]) => ({
  capabilities: {
    extensions: entries.map(([uri, params]) => ({uri, ...(params ? {params} : {})})),
  },
});
const fixture = (name: string) =>
  JSON.parse(readFileSync(new URL(`../test/fixtures/cards/${name}`, import.meta.url), 'utf8'));

describe('readSupportedCatalogIds: the cards as their agents serve them (task-21.10 decision 23.3)', () => {
  test('the Node restaurant finder declares no A2UI entry: nothing, the basic-catalog fallback', () => {
    expect(readSupportedCatalogIds(fixture('node-restaurant-finder.json'))).toEqual({
      ok: true,
      value: [],
    });
  });

  test('the ADK restaurant finder declares v0.8 and v0.9: a finding of its own, all older', () => {
    expect(readSupportedCatalogIds(fixture('adk-restaurant-finder.json'))).toEqual({
      ok: false,
      errors: [
        'the card declares A2UI v0.8 and v0.9, which A2UIVerse no longer supports: A2UIVerse speaks A2UI v1.0',
      ],
      otherVersions: {versions: ['v0.8', 'v0.9'], allOlder: true},
    });
  });

  test('the end-to-end TypeScript agent declares v1.0 flat: read from that entry alone', () => {
    expect(readSupportedCatalogIds(fixture('e2e-typescript-agent.json'))).toEqual({
      ok: true,
      value: [BASIC_CATALOG_ID],
    });
  });

  test('a card with the keyed wrapper fails, naming the key', () => {
    expect(readSupportedCatalogIds(fixture('keyed-wrapper.json'))).toEqual({
      ok: false,
      errors: ['A2UI v1.0 extension params: keyed under "1.0"; v1.0 params are read flat'],
    });
  });

  test('a card declaring only a newer version: a finding of its own, not all older', () => {
    expect(readSupportedCatalogIds(fixture('newer-only.json'))).toEqual({
      ok: false,
      errors: [
        'the card declares A2UI v1.1, which is newer than this A2UIVerse supports: A2UIVerse speaks A2UI v1.0',
      ],
      otherVersions: {versions: ['v1.1'], allOlder: false},
    });
  });
});

describe('readSupportedCatalogIds: the rule (task-21.10 decisions 5 and 6)', () => {
  test('no extension, or none under the A2UI base, declares nothing', () => {
    expect(readSupportedCatalogIds({})).toEqual({ok: true, value: []});
    expect(readSupportedCatalogIds(cardOf(['https://example.com/ext/v1']))).toEqual({
      ok: true,
      value: [],
    });
  });

  test('a v1.0 entry naming no ids declares nothing: no params, empty params, no list', () => {
    for (const card of [
      cardOf([A2UI_EXTENSION_URI]),
      cardOf([A2UI_EXTENSION_URI, {}]),
      cardOf([A2UI_EXTENSION_URI, {acceptsInlineCatalogs: false}]),
    ]) {
      expect(readSupportedCatalogIds(card)).toEqual({ok: true, value: []});
    }
  });

  test('beside a v1.0 entry, an older one is passed over', () => {
    expect(
      readSupportedCatalogIds(
        cardOf(
          [V09, {supportedCatalogIds: [GMAIL]}],
          [A2UI_EXTENSION_URI, {supportedCatalogIds: [GITHUB]}],
        ),
      ),
    ).toEqual({ok: true, value: [GITHUB]});
  });

  test('two v1.0 entries merge, each id once, in card order', () => {
    expect(
      readSupportedCatalogIds(
        cardOf(
          [A2UI_EXTENSION_URI, {supportedCatalogIds: [GITHUB, GMAIL]}],
          [A2UI_EXTENSION_URI, {supportedCatalogIds: [GMAIL, BASIC_CATALOG_ID]}],
        ),
      ),
    ).toEqual({ok: true, value: [GITHUB, GMAIL, BASIC_CATALOG_ID]});
  });

  test('a version key of any spelling is the keyed wrapper', () => {
    const read = readSupportedCatalogIds(
      cardOf([A2UI_EXTENSION_URI, {'v1.0': {supportedCatalogIds: [GITHUB]}}]),
    );
    expect(read).toEqual({
      ok: false,
      errors: ['A2UI v1.0 extension params: keyed under "v1.0"; v1.0 params are read flat'],
    });
  });

  test('malformed ids are an error naming the path', () => {
    const read = readSupportedCatalogIds(cardOf([A2UI_EXTENSION_URI, {supportedCatalogIds: 'x'}]));
    expect(read.ok).toBe(false);
    expect(!read.ok && read.errors[0]).toMatch(
      /^A2UI v1\.0 extension params\/supportedCatalogIds: /,
    );
  });

  test('one malformed entry beside a good one fails the whole read', () => {
    const read = readSupportedCatalogIds(
      cardOf(
        [A2UI_EXTENSION_URI, {supportedCatalogIds: [GITHUB]}],
        [A2UI_EXTENSION_URI, {supportedCatalogIds: [1]}],
      ),
    );
    expect(read.ok).toBe(false);
  });

  test('older entries alone, in any number: their versions once each, all older', () => {
    expect(readSupportedCatalogIds(cardOf([V08], [V09, {}], [V09]))).toEqual({
      ok: false,
      errors: [
        'the card declares A2UI v0.8 and v0.9, which A2UIVerse no longer supports: A2UIVerse speaks A2UI v1.0',
      ],
      otherVersions: {versions: ['v0.8', 'v0.9'], allOlder: true},
    });
  });

  test('an older and a newer one: not all older, the newer named (task-21.15 decision 2)', () => {
    expect(readSupportedCatalogIds(cardOf([V09], [V11]))).toEqual({
      ok: false,
      errors: [
        'the card declares A2UI v0.9 and v1.1, not v1.0: v1.1 is newer than this A2UIVerse supports, and A2UIVerse speaks A2UI v1.0',
      ],
      otherVersions: {versions: ['v0.9', 'v1.1'], allOlder: false},
    });
  });

  test('three versions listed in a sentence, two newer ones named together', () => {
    const read = readSupportedCatalogIds(
      cardOf([V08], [V11], ['https://a2ui.org/a2a-extension/a2ui/v2.0']),
    );
    expect(!read.ok && read.errors).toEqual([
      'the card declares A2UI v0.8, v1.1 and v2.0, not v1.0: v1.1 and v2.0 are newer than this A2UIVerse supports, and A2UIVerse speaks A2UI v1.0',
    ]);
    const newer = readSupportedCatalogIds(
      cardOf([V11], ['https://a2ui.org/a2a-extension/a2ui/v2.0']),
    );
    expect(!newer.ok && newer.errors).toEqual([
      'the card declares A2UI v1.1 and v2.0, which are newer than this A2UIVerse supports: A2UIVerse speaks A2UI v1.0',
    ]);
  });
});

describe('rendererCapabilities', () => {
  test("the ids under v1.0's key alone", () => {
    expect(rendererCapabilities([GITHUB, BASIC_CATALOG_ID])).toEqual({
      '1.0': {supportedCatalogIds: [GITHUB, BASIC_CATALOG_ID]},
    });
  });

  test('what is written is a copy', () => {
    const ids = [GITHUB];
    const written = rendererCapabilities(ids) as {'1.0': {supportedCatalogIds: string[]}};
    ids.push(GMAIL);
    expect(written['1.0'].supportedCatalogIds).toEqual([GITHUB]);
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

describe('the host interface an artifact was built against (task-21.10 decision 11)', () => {
  test('one the platform supplies passes: named by the release and the A2UI version it lends', () => {
    expect(SUPPORTED_HOST_INTERFACES).toEqual(['0.16.1-v1.0']);
    expect(checkHostInterface('0.16.1-v1.0')).toEqual([]);
  });

  test('an artifact packed for 0.16.1, the v0.9 entry points, is refused by name', () => {
    expect(checkHostInterface('0.16.1')).toEqual([
      'host interface "0.16.1" is not one the platform supplies (it supplies "0.16.1-v1.0")',
    ]);
  });

  test('any other is refused, naming what the platform supplies', () => {
    expect(checkHostInterface('0.14.0')).toEqual([
      'host interface "0.14.0" is not one the platform supplies (it supplies "0.16.1-v1.0")',
    ]);
  });
});
