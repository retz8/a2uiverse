import {describe, expect, test} from 'vitest';
import {
  A2UI_EXTENSION_URI,
  BASIC_CATALOG_ID,
  checkAppId,
  checkCatalogExports,
  checkCoverage,
  checkHostInterface,
  claimAppId,
  classifySpecifier,
  coverageErrors,
  credentialLint,
  entitlementOf,
  readSupportedCatalogIds,
  SUPPORTED_HOST_INTERFACES,
  wordsOf,
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
      'zod',
    ]) {
      expect(classifySpecifier(s)).toBe('host');
    }
  });
  test('another specifier under a host package is refused', () => {
    expect(classifySpecifier('@a2ui/react/v0_8')).toBe('refuse');
    expect(classifySpecifier('react-dom/server')).toBe('refuse');
    expect(classifySpecifier('@a2ui/web_core/v0_9/basic_catalog')).toBe('refuse');
    expect(classifySpecifier('zod/v4')).toBe('refuse');
  });
  test('everything else is bundled', () => {
    expect(classifySpecifier('@primer/react')).toBe('bundle');
    expect(classifySpecifier('@material/material-color-utilities')).toBe('bundle');
    expect(classifySpecifier('./components/button/index.js')).toBe('bundle');
    expect(classifySpecifier('react-aria')).toBe('bundle');
  });
});

describe('readSupportedCatalogIds', () => {
  const card = (params?: Record<string, unknown>, uri = A2UI_EXTENSION_URI) => ({
    capabilities: {extensions: [{uri, ...(params ? {params} : {})}]},
  });

  test('no A2UI extension, or one without params, declares nothing', () => {
    expect(readSupportedCatalogIds({})).toEqual({ok: true, value: []});
    expect(readSupportedCatalogIds({capabilities: {}})).toEqual({ok: true, value: []});
    expect(readSupportedCatalogIds(card())).toEqual({ok: true, value: []});
    expect(
      readSupportedCatalogIds(card({supportedCatalogIds: [GITHUB]}, 'https://other/ext')),
    ).toEqual({
      ok: true,
      value: [],
    });
  });

  test('flat params, as the extension guide and the Python SDK write them', () => {
    expect(readSupportedCatalogIds(card({supportedCatalogIds: [GITHUB, GMAIL, GITHUB]}))).toEqual({
      ok: true,
      value: [GITHUB, GMAIL],
    });
    expect(readSupportedCatalogIds(card({acceptsInlineCatalogs: true}))).toEqual({
      ok: true,
      value: [],
    });
  });

  test('versioned params, as server_capabilities.json keys them', () => {
    expect(readSupportedCatalogIds(card({'v0.9': {supportedCatalogIds: [GITHUB]}}))).toEqual({
      ok: true,
      value: [GITHUB],
    });
  });

  test('a malformed declaration is an error, never none', () => {
    const flat = readSupportedCatalogIds(card({supportedCatalogIds: 'github'}));
    expect(flat.ok).toBe(false);
    if (!flat.ok)
      expect(flat.errors[0]).toMatch(/^A2UI extension params\/supportedCatalogIds: must be array/);
    const versioned = readSupportedCatalogIds(card({'v0.9': {supportedCatalogIds: [1]}}));
    expect(versioned.ok).toBe(false);
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

describe('the credential lint', () => {
  test('wordsOf splits case changes and separators', () => {
    expect(wordsOf('cardNumber')).toBe('card number');
    expect(wordsOf('OTPField')).toBe('otp field');
    expect(wordsOf('security-code')).toBe('security code');
    expect(wordsOf('pinned_items')).toBe('pinned items');
  });

  test('a clean schema has no findings', () => {
    const schema = {
      components: {
        TextField: {
          properties: {label: {type: 'string'}, inputType: {enum: ['text', 'email', 'number']}},
        },
        PinnedList: {properties: {items: {type: 'array'}}},
        Card: {properties: {title: {type: 'string'}, description: {type: 'string'}}},
      },
    };
    expect(credentialLint(schema)).toEqual([]);
  });

  test('component names, prop names, enum values and consts, in components and $defs', () => {
    const schema = {
      components: {
        PasswordField: {properties: {label: {type: 'string'}}},
        TextField: {
          properties: {inputType: {enum: ['text', 'password']}, cardNumber: {type: 'string'}},
        },
        Otp: {properties: {}},
      },
      $defs: {inputKind: {oneOf: [{const: 'text'}, {const: 'security-code'}]}},
    };
    expect(credentialLint(schema)).toEqual([
      'component "PasswordField": name matches "password"',
      'component "TextField", prop "cardNumber": name matches "card number"',
      'component "TextField": enum value "password" matches "password"',
      'component "Otp": name matches "otp"',
      '$defs "inputKind": const "security-code" matches "security code"',
    ]);
  });

  test('whole words only: pinned is not pin, and descriptions are not read', () => {
    const schema = {
      components: {
        List: {properties: {pinned: {type: 'boolean', description: 'a password is never asked'}}},
      },
    };
    expect(credentialLint(schema)).toEqual([]);
  });
});

describe('the host interface an artifact was built against (task-11.4 decision 4)', () => {
  test('one the platform supplies passes', () => {
    expect(SUPPORTED_HOST_INTERFACES).toEqual(['0.9.1']);
    expect(checkHostInterface('0.9.1')).toEqual([]);
  });

  test('any other is refused, naming what the platform supplies', () => {
    expect(checkHostInterface('1.0')).toEqual([
      'host interface "1.0" is not one the platform supplies (it supplies "0.9.1")',
    ]);
  });
});
