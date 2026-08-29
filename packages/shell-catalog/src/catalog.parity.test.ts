/** The catalog's two faces stay in lockstep: catalog.json ↔ runtime CATALOG. */
import {readFileSync} from 'node:fs';
import {expect, test} from 'vitest';
import {CATALOG} from './catalog';
import {CATALOG_ID} from './catalog-id';

// Path from the package root (vitest's cwd); import.meta.url is http-scheme under jsdom.
const schema = JSON.parse(readFileSync('catalogs/v0.9.1/catalog.json', 'utf8')) as {
  $id: string;
  catalogId: string;
  components: Record<string, unknown>;
  functions: Record<string, unknown>;
};

test('catalog id matches the schema', () => {
  expect(CATALOG.id).toBe(CATALOG_ID);
  expect(schema.$id).toBe(CATALOG_ID);
  expect(schema.catalogId).toBe(CATALOG_ID);
});

test('every schema component has an implementation and vice versa', () => {
  expect([...CATALOG.components.keys()].sort()).toEqual(Object.keys(schema.components).sort());
});

test('every schema function has an implementation', () => {
  // Subset, not equality: the upstream implementation ships arithmetic beyond its own
  // v0_9_1 schema (SPEC §14). Those stay undeclared until derived bindings need them (M2).
  const implemented = new Set(CATALOG.functions.keys());
  for (const name of Object.keys(schema.functions)) {
    expect(implemented.has(name), `function ${name} declared but not implemented`).toBe(true);
  }
});

test('the composition primitives are present', () => {
  expect(CATALOG.components.has('Slot')).toBe(true);
  expect(CATALOG.components.has('Attribution')).toBe(true);
});
