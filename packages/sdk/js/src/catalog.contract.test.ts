/** Asserts the catalog projection against the normative contracts (`packages/sdk/contracts`). Drift is a red build. */
import {readFileSync} from 'node:fs';
import {expect, test} from 'vitest';
import {Ajv2020} from 'ajv/dist/2020.js';
import {CLIENT_CAPABILITIES_SCHEMA} from './a2ui/spec.generated';
import {ARTIFACT_DESCRIPTOR_FILE, ARTIFACT_DESCRIPTOR_SCHEMA} from './artifact';
import {
  A2UI_EXTENSION_URI,
  APP_ID_MAX_LENGTH,
  APP_ID_PATTERN,
  CATALOG_EXPORTS,
  CREDENTIAL_TERMS,
  HOST_INTERFACE_GLOBAL,
  HOST_INTERFACE_VERSION,
  SUPPORTED_HOST_INTERFACES,
  HOST_SPECIFIERS,
  HOST_STYLESHEET_LOADER,
  PUBLIC_CATALOG_IDS,
  RESERVED_APP_IDS,
  clientCapabilities,
} from './catalog';

const read = (name: string) =>
  JSON.parse(readFileSync(new URL(`../../contracts/${name}`, import.meta.url), 'utf8'));

const contract = read('catalog.json') as {
  a2uiExtensionUri: string;
  exportContract: {required: string[]; optional: string[]};
  hostInterfaces: Record<string, {global: string; specifiers: string[]; stylesheetLoader: string}>;
  artifact: {descriptorFile: string; descriptorSchema: string};
  publicCatalogIds: string[];
  appId: {pattern: string; maxLength: number; reserved: string[]};
  credentialLint: {terms: string[]};
};

test('no version line of its own: the sdk is the version; the A2UI extension URI is the protocol', () => {
  expect(contract).not.toHaveProperty('version');
  expect(contract.a2uiExtensionUri).toBe(A2UI_EXTENSION_URI);
});

test('the export contract: CATALOG required, Provider optional', () => {
  expect(contract.exportContract.required).toEqual([...CATALOG_EXPORTS.required]);
  expect(contract.exportContract.optional).toEqual([...CATALOG_EXPORTS.optional]);
});

test('the host-module interfaces keyed by A2UI version: one today, the global, seven specifiers, the loader', () => {
  expect(Object.keys(contract.hostInterfaces)).toEqual([HOST_INTERFACE_VERSION]);
  expect(Object.keys(contract.hostInterfaces)).toEqual([...SUPPORTED_HOST_INTERFACES]);
  expect(HOST_INTERFACE_VERSION).toBe('0.9.1');
  const lent = contract.hostInterfaces[HOST_INTERFACE_VERSION];
  expect(lent.global).toBe(HOST_INTERFACE_GLOBAL);
  expect(lent.specifiers).toEqual([...HOST_SPECIFIERS]);
  expect(HOST_SPECIFIERS).toHaveLength(7);
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
