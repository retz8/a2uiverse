// @vitest-environment node
/**
 * The hand-written v1.0 document held to the models (task-21.12 decision 2): each entry is what
 * the release's `Catalog.toJson()` computes from the entry's model, descriptions aside, and the
 * basic catalog's entries are upstream's published v1 entries. The document passes the sdk's
 * catalog gate, and a `Slot` painted as the orchestrator paints it validates (decision 3).
 */
import {readFileSync} from 'node:fs';
import {
  BASIC_CATALOG_SCHEMA,
  checkCatalogDocument,
  createA2uiValidator,
  createSchemaFormCheck,
  type A2uiCatalogSchema,
} from '@a2uiverse/sdk';
import {describe, expect, test} from 'vitest';
import {CATALOG_ID} from './catalog-id';
import {SCHEMA_CATALOG} from './schema';

type Json = Record<string, unknown>;

const DOCUMENT = JSON.parse(readFileSync('catalogs/v1.0/catalog.json', 'utf8')) as Json & {
  components: Record<string, Json>;
  functions: Record<string, Json>;
  $defs: Record<string, Json>;
};
const MODEL = SCHEMA_CATALOG.toJson() as typeof DOCUMENT;
const BASIC = BASIC_CATALOG_SCHEMA as unknown as typeof DOCUMENT;

/** A schema with every description taken out, at every depth. */
function shape(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(shape);
  if (value === null || typeof value !== 'object') return value;
  return Object.fromEntries(
    Object.entries(value)
      .filter(([key]) => key !== 'description')
      .map(([key, item]) => [key, shape(item)]),
  );
}

describe('the document', () => {
  test('is the v1.0 document under the new catalog id', () => {
    expect(DOCUMENT.protocolVersion).toBe('1.0');
    expect(DOCUMENT.catalogId).toBe(CATALOG_ID);
    expect(DOCUMENT.$id).toBe(CATALOG_ID);
    expect(CATALOG_ID).toBe(
      'https://github.com/retz8/a2uiverse/blob/main/packages/shell-catalog/catalogs/v1.0/catalog.json',
    );
  });

  test('carries none of v1.0’s catalog additions (task-21.12 decision 7)', () => {
    expect(DOCUMENT).not.toHaveProperty('instructions');
    const own = Object.keys(DOCUMENT.functions).filter(name => !(name in BASIC.functions));
    for (const entry of own.map(name => DOCUMENT.functions[name])) {
      expect(entry).not.toHaveProperty('requiresUserActivation');
      expect(entry).not.toHaveProperty('allowedCallers');
    }
    for (const entry of Object.values(DOCUMENT.components)) {
      expect(entry).not.toHaveProperty('allowedParents');
      expect(entry).not.toHaveProperty('allowedChildren');
    }
  });

  test('passes the sdk’s catalog gate', () => {
    expect(checkCatalogDocument(DOCUMENT)).toEqual([]);
  });
});

describe('each entry is what its model computes, descriptions aside', () => {
  test('the same components and functions', () => {
    expect(Object.keys(DOCUMENT.components)).toEqual(Object.keys(MODEL.components));
    expect(Object.keys(DOCUMENT.functions)).toEqual(Object.keys(MODEL.functions));
  });

  for (const section of ['components', 'functions'] as const) {
    for (const name of Object.keys(MODEL[section])) {
      test(`${section}/${name}`, () => {
        expect(shape(DOCUMENT[section][name])).toEqual(shape(MODEL[section][name]));
      });
    }
  }

  test('$defs', () => {
    expect(shape(DOCUMENT.$defs)).toEqual(shape(MODEL.$defs));
  });
});

describe('the basic catalog’s entries are upstream’s published v1 entries', () => {
  for (const section of ['components', 'functions'] as const) {
    for (const [name, published] of Object.entries(BASIC[section])) {
      test(`${section}/${name}`, () => {
        const entry = DOCUMENT[section][name];
        if (name !== 'TextField') return expect(entry).toEqual(published);
        // Less `obscured`: the shell carries no credential input (task 12.3).
        const variant = (published as {allOf: [unknown, {properties: {variant: Json}}]}).allOf[1]
          .properties.variant as {enum: string[]};
        const expected = structuredClone(published) as typeof published;
        (
          expected as {allOf: [unknown, {properties: {variant: {enum: string[]}}}]}
        ).allOf[1].properties.variant.enum = variant.enum.filter(value => value !== 'obscured');
        expect(entry).toEqual(expected);
      });
    }
  }
  test('Weight', () => {
    expect(DOCUMENT.$defs.Weight).toEqual(BASIC.$defs.Weight);
  });
});

describe('a Slot as the orchestrator paints it (task-21.12 decision 3)', () => {
  const catalog = DOCUMENT as unknown as A2uiCatalogSchema;
  const messages = (slot: Json) => [
    {version: '1.0', createSurface: {surfaceId: 'shell:main', catalogId: CATALOG_ID}},
    {
      version: '1.0',
      updateComponents: {
        surfaceId: 'shell:main',
        components: [{id: 'root', component: 'Slot', content: 'shell', ...slot}],
      },
    },
  ];
  const union = {
    join: {home: null, entity: 'pull requests', nouns: {github: 'pull requests'}},
  };
  const collapse = {
    state: 'collapsed',
    collapse: {cause: 'few', answered: ['GitHub'], failed: ['linear']},
  };

  test('a union join and a collapse naming what failed validate', () => {
    const validator = createA2uiValidator({catalogs: [catalog]});
    expect(validator.validate(messages({source: 'shell', ...union}))).toEqual([]);
    expect(validator.validate(messages({source: 'shell', ...collapse}))).toEqual([]);
  });

  test('and are in the v1.0 schema’s form', () => {
    const check = createSchemaFormCheck({catalog});
    expect(check.agentToRenderer(messages({source: 'shell', ...union}))).toEqual([]);
    expect(check.agentToRenderer(messages({source: 'shell', ...collapse}))).toEqual([]);
  });
});
