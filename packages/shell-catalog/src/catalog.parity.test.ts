/** The catalog's two faces stay in lockstep: catalog.json ↔ runtime CATALOG. */
import {readFileSync} from 'node:fs';
import {expect, test} from 'vitest';
import {CATALOG, OPERATORS} from './catalog';
import {CATALOG_ID} from './catalog-id';

// Path from the package root (vitest's cwd); import.meta.url is http-scheme under jsdom.
const schema = JSON.parse(readFileSync('catalogs/v0.9.1/catalog.json', 'utf8')) as {
  $id: string;
  catalogId: string;
  components: Record<string, unknown>;
  functions: Record<string, unknown>;
  $defs: {anyFunction: {oneOf: {$ref: string}[]}};
};

/** The upstream basic catalog's own declared functions (validators, formatters, boolean logic). */
const UPSTREAM_FUNCTIONS = [
  'required',
  'regex',
  'length',
  'numeric',
  'email',
  'formatString',
  'formatNumber',
  'formatCurrency',
  'formatDate',
  'pluralize',
  'openUrl',
  'and',
  'or',
  'not',
];

test('catalog id matches the schema', () => {
  expect(CATALOG.id).toBe(CATALOG_ID);
  expect(schema.$id).toBe(CATALOG_ID);
  expect(schema.catalogId).toBe(CATALOG_ID);
});

test('every schema component has an implementation and vice versa', () => {
  expect([...CATALOG.components.keys()].sort()).toEqual(Object.keys(schema.components).sort());
});

test('every schema function has an implementation', () => {
  // Subset, not equality: the upstream implementation ships binary arithmetic and comparison
  // beyond its own v0_9_1 schema (SPEC §14). Those stay undeclared — no consumer.
  const implemented = new Set(CATALOG.functions.keys());
  for (const name of Object.keys(schema.functions)) {
    expect(implemented.has(name), `function ${name} declared but not implemented`).toBe(true);
  }
});

test('the declared functions are exactly the upstream set plus the operators', () => {
  expect(Object.keys(schema.functions).sort()).toEqual(
    [...UPSTREAM_FUNCTIONS, ...OPERATORS].sort(),
  );
});

test('every operator is declared, implemented, and in the anyFunction union', () => {
  const declared = new Set(Object.keys(schema.functions));
  const implemented = new Set(CATALOG.functions.keys());
  const union = new Set(
    schema.$defs.anyFunction.oneOf.map(r => r.$ref.replace('#/functions/', '')),
  );
  for (const op of OPERATORS) {
    expect(declared.has(op), `operator ${op} not declared`).toBe(true);
    expect(implemented.has(op), `operator ${op} not implemented`).toBe(true);
    expect(union.has(op), `operator ${op} missing from anyFunction`).toBe(true);
  }
});

test('the composition primitives are present', () => {
  expect(CATALOG.components.has('Slot')).toBe(true);
  expect(CATALOG.components.has('Attribution')).toBe(true);
});
