/** Asserts the catalog projection against the normative contracts (`packages/sdk/contracts`). Drift is a red build. */
import {readFileSync} from 'node:fs';
import {expect, test} from 'vitest';
import {Ajv2020} from 'ajv/dist/2020.js';
import {CLIENT_CAPABILITIES_SCHEMA} from './a2ui/spec.generated';
import {
  ARTIFACT_CONTRACT_VERSION,
  ARTIFACT_DESCRIPTOR_FILE,
  ARTIFACT_DESCRIPTOR_SCHEMA,
} from './artifact';
import {
  A2UI_EXTENSION_URI,
  APP_ID_MAX_LENGTH,
  APP_ID_PATTERN,
  CATALOG_CONTRACT_VERSION,
  CATALOG_EXPORTS,
  CREDENTIAL_TERMS,
  HOST_INTERFACE_GLOBAL,
  HOST_INTERFACE_VERSION,
  HOST_SPECIFIERS,
  HOST_STYLESHEET_LOADER,
  PUBLIC_CATALOG_IDS,
  RESERVED_APP_IDS,
  clientCapabilities,
} from './catalog';

const read = (name: string) =>
  JSON.parse(readFileSync(new URL(`../../contracts/${name}`, import.meta.url), 'utf8'));

const contract = read('catalog.v1.json') as {
  version: string;
  a2uiExtensionUri: string;
  exportContract: {required: string[]; optional: string[]};
  hostInterface: {version: string; global: string; specifiers: string[]; stylesheetLoader: string};
  artifact: {descriptorFile: string; descriptorSchema: string};
  publicCatalogIds: string[];
  appId: {pattern: string; maxLength: number; reserved: string[]};
  credentialLint: {terms: string[]};
};

test('one version line', () => {
  expect(contract.version).toBe(CATALOG_CONTRACT_VERSION);
  expect(contract.a2uiExtensionUri).toBe(A2UI_EXTENSION_URI);
});

test('the export contract: CATALOG required, Provider optional', () => {
  expect(contract.exportContract.required).toEqual([...CATALOG_EXPORTS.required]);
  expect(contract.exportContract.optional).toEqual([...CATALOG_EXPORTS.optional]);
});

test('the host-module interface: the A2UI version, the global, six specifiers, the loader', () => {
  expect(contract.hostInterface.version).toBe(HOST_INTERFACE_VERSION);
  expect(contract.hostInterface.version).toBe('0.9.1');
  expect(contract.hostInterface.global).toBe(HOST_INTERFACE_GLOBAL);
  expect(contract.hostInterface.specifiers).toEqual([...HOST_SPECIFIERS]);
  expect(HOST_SPECIFIERS).toHaveLength(6);
  expect(contract.hostInterface.stylesheetLoader).toBe(HOST_STYLESHEET_LOADER);
});

test('the artifact: the descriptor file and its schema, equal to the projection', () => {
  expect(contract.artifact.descriptorFile).toBe(ARTIFACT_DESCRIPTOR_FILE);
  const schema = read(contract.artifact.descriptorSchema);
  expect(ARTIFACT_DESCRIPTOR_SCHEMA).toEqual(schema);
  expect(ARTIFACT_CONTRACT_VERSION).toMatch(new RegExp(schema.properties.contract.pattern));
});

test('the public catalogs are the basic catalog alone', () => {
  expect(contract.publicCatalogIds).toEqual([...PUBLIC_CATALOG_IDS]);
  expect(PUBLIC_CATALOG_IDS).toEqual([
    'https://a2ui.org/specification/v0_9/catalogs/basic/catalog.json',
  ]);
});

test('the app id grammar', () => {
  expect(new RegExp(contract.appId.pattern).source).toBe(APP_ID_PATTERN.source);
  expect(contract.appId.maxLength).toBe(APP_ID_MAX_LENGTH);
  expect(contract.appId.reserved).toEqual([...RESERVED_APP_IDS]);
});

test('the credential terms', () => {
  expect(contract.credentialLint.terms).toEqual([...CREDENTIAL_TERMS]);
});

test('what the hub writes validates against the pinned client_capabilities.json', () => {
  const ajv = new Ajv2020({allErrors: true, strict: true, allowUnionTypes: true});
  const validate = ajv.compile(CLIENT_CAPABILITIES_SCHEMA);
  expect(validate(clientCapabilities(['a', 'b']))).toBe(true);
  expect(validate(clientCapabilities([]))).toBe(true);
});
