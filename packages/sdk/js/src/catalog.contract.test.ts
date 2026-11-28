/** Asserts the catalog projection against the normative contracts (`packages/sdk/contracts`). Drift is a red build. */
import {readFileSync} from 'node:fs';
import {expect, test} from 'vitest';
import {Ajv2020} from 'ajv/dist/2020.js';
import {
  CATALOG_DEFINITION_SCHEMA,
  COMMON_TYPES_SCHEMA,
  RENDERER_CAPABILITIES_SCHEMA,
  RENDERER_DATA_MODEL_SCHEMA,
} from './a2ui/spec.generated';
import {A2UI_VERSION} from './a2ui/stamp';
import {ARTIFACT_DESCRIPTOR_FILE, ARTIFACT_DESCRIPTOR_SCHEMA} from './artifact';
import {CREDENTIAL_TERMS} from './credential';
import {
  A2UI_EXTENSION_BASE,
  A2UI_EXTENSION_URI,
  A2UI_RENDERER_CAPABILITIES_KEY,
  A2UI_RENDERER_DATA_MODEL_KEY,
  APP_ID_MAX_LENGTH,
  APP_ID_PATTERN,
  CATALOG_EXPORTS,
  HOST_INTERFACE_GLOBAL,
  HOST_INTERFACE_VERSION,
  SUPPORTED_HOST_INTERFACES,
  HOST_SPECIFIERS,
  HOST_STYLESHEET_LOADER,
  PUBLIC_CATALOG_IDS,
  RESERVED_APP_IDS,
  rendererCapabilities,
  rendererDataModel,
} from './catalog';

const read = (name: string) =>
  JSON.parse(readFileSync(new URL(`../../contracts/${name}`, import.meta.url), 'utf8'));

const contract = read('catalog.json') as {
  a2ui: {
    version: string;
    extensionBase: string;
    extensionUri: string;
    capabilitiesKey: string;
    rendererCapabilitiesKey: string;
    rendererDataModelKey: string;
  };
  cardRead: {rule: string};
  exportContract: {required: string[]; optional: string[]};
  hostInterfaces: Record<string, {global: string; specifiers: string[]; stylesheetLoader: string}>;
  artifact: {descriptorFile: string; descriptorSchema: string};
  publicCatalogIds: string[];
  appId: {pattern: string; maxLength: number; reserved: string[]};
  credentialBar: {terms: string[]};
};

test('no version line of its own: the sdk is the version; the A2UI version is the protocol', () => {
  expect(contract).not.toHaveProperty('version');
  expect(contract).not.toHaveProperty('a2uiVersions');
  expect(contract.a2ui).toEqual(
    expect.objectContaining({
      version: A2UI_VERSION,
      extensionBase: A2UI_EXTENSION_BASE,
      extensionUri: A2UI_EXTENSION_URI,
      capabilitiesKey: A2UI_VERSION,
      rendererCapabilitiesKey: A2UI_RENDERER_CAPABILITIES_KEY,
      rendererDataModelKey: A2UI_RENDERER_DATA_MODEL_KEY,
    }),
  );
  expect(A2UI_EXTENSION_URI).toBe('https://a2ui.org/a2a-extension/a2ui/v1.0');
});

test('the card read carries its rule: the v1.0 entry alone, flat, the keyed wrapper, the other versions', () => {
  const rule = contract.cardRead.rule;
  for (const words of ['extensionBase', 'extensionUri', 'flat', 'version key', 'below 1.0']) {
    expect(rule).toContain(words);
  }
});

test('the export contract: CATALOG required, Provider optional', () => {
  expect(contract.exportContract.required).toEqual([...CATALOG_EXPORTS.required]);
  expect(contract.exportContract.optional).toEqual([...CATALOG_EXPORTS.optional]);
});

test('the host-module interfaces named by the release and the A2UI version: one today, the global, eight specifiers, the loader', () => {
  expect(Object.keys(contract.hostInterfaces)).toEqual([HOST_INTERFACE_VERSION]);
  expect(Object.keys(contract.hostInterfaces)).toEqual([...SUPPORTED_HOST_INTERFACES]);
  expect(HOST_INTERFACE_VERSION).toBe('0.16.1-v1.0');
  const lent = contract.hostInterfaces[HOST_INTERFACE_VERSION];
  expect(lent.global).toBe(HOST_INTERFACE_GLOBAL);
  expect(lent.specifiers).toEqual([...HOST_SPECIFIERS]);
  expect(HOST_SPECIFIERS).toHaveLength(8);
  expect(lent.stylesheetLoader).toBe(HOST_STYLESHEET_LOADER);
});

test('the artifact: the descriptor file and its schema, equal to the projection', () => {
  expect(contract.artifact.descriptorFile).toBe(ARTIFACT_DESCRIPTOR_FILE);
  expect(contract.artifact.descriptorSchema).toBe('catalog-artifact.schema.json');
  const schema = read(contract.artifact.descriptorSchema);
  expect(ARTIFACT_DESCRIPTOR_SCHEMA).toEqual(schema);
  expect(schema.properties).not.toHaveProperty('contract');
});

test('the public catalogs are the basic catalog alone', () => {
  expect(contract.publicCatalogIds).toEqual([...PUBLIC_CATALOG_IDS]);
  expect(PUBLIC_CATALOG_IDS).toEqual([
    'https://a2ui.org/specification/v1_0/catalogs/basic/catalog.json',
  ]);
});

test('the app id grammar', () => {
  expect(new RegExp(contract.appId.pattern).source).toBe(APP_ID_PATTERN.source);
  expect(contract.appId.maxLength).toBe(APP_ID_MAX_LENGTH);
  expect(contract.appId.reserved).toEqual([...RESERVED_APP_IDS]);
});

test('the credential terms', () => {
  expect(contract.credentialBar.terms).toEqual([...CREDENTIAL_TERMS]);
});

test('what the hub writes validates against the pinned renderer_capabilities.json and renderer_data_model.json', () => {
  const ajv = new Ajv2020({allErrors: true, strict: false, allowUnionTypes: true});
  ajv.addSchema(COMMON_TYPES_SCHEMA);
  ajv.addSchema(CATALOG_DEFINITION_SCHEMA);
  const capabilities = ajv.compile(RENDERER_CAPABILITIES_SCHEMA);
  expect(capabilities(rendererCapabilities(['a', 'b']))).toBe(true);
  expect(capabilities(rendererCapabilities([]))).toBe(true);
  expect(Object.keys(rendererCapabilities(['a']))).toEqual(['1.0']);
  const dataModel = ajv.compile(RENDERER_DATA_MODEL_SCHEMA);
  expect(dataModel(rendererDataModel({s: {n: 1}}))).toBe(true);
  expect(rendererDataModel({})).toEqual({version: '1.0', surfaces: {}});
});
