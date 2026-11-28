/**
 * What the catalog gate asks of a catalog document (task-21.10 decision 14), at pack, publish and
 * install: it declares `protocolVersion: "1.0"`; it loads through `@a2ui/web_core` at 1.0; each
 * component's schema compiles against the pinned v1.0 `common_types.json`; it validates against
 * the pinned `catalog_definition.json`.
 */
import {Ajv2020} from 'ajv/dist/2020.js';
import {Catalog} from '@a2ui/web_core/catalog';
import {schemaErrors} from '../validate.js';
import {CATALOG_DEFINITION_SCHEMA, COMMON_TYPES_SCHEMA} from './spec.generated.js';
import {A2UI_VERSION} from './stamp.js';
import type {A2uiCatalogSchema} from './types.js';

const messageOf = (error: unknown): string =>
  error instanceof Error ? error.message : String(error);

const isObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

/** A catalog's components or functions as a union, the shape the common types reference. */
const unionOf = (section: 'components' | 'functions', catalog: A2uiCatalogSchema) => {
  const names = Object.keys(isObject(catalog[section]) ? catalog[section] : {});
  return names.length > 0 ? {oneOf: names.map(name => ({$ref: `#/${section}/${name}`}))} : false;
};

/**
 * Each component's schema compiled against the pinned common types: one error per component, as
 * `components/<name>: <reason>`. A catalog's relative `common_types.json` reference resolves to
 * the pinned file; an absolute one to another version resolves to nothing and fails.
 */
function compileErrors(catalog: A2uiCatalogSchema): string[] {
  const catalogUri = new URL('catalog.json', String(COMMON_TYPES_SCHEMA.$id)).href;
  const defs = {...(catalog.$defs ?? {})};
  // The common types reference the catalog's union of functions; a catalog declaring none compiles.
  defs.anyFunction ??= unionOf('functions', catalog);
  defs.anyComponent ??= unionOf('components', catalog);
  const own: Record<string, unknown> = {...catalog, $defs: defs, $id: catalogUri};
  delete own.$schema;
  const ajv = new Ajv2020({allErrors: true, strict: false, validateFormats: false});
  ajv.addSchema(COMMON_TYPES_SCHEMA);
  try {
    ajv.addSchema(own);
  } catch (error) {
    return [`is not a JSON Schema: ${messageOf(error)}`];
  }
  const errors: string[] = [];
  for (const name of Object.keys(catalog.components ?? {})) {
    try {
      ajv.compile({$ref: `${catalogUri}#/components/${encodeURIComponent(name)}`});
    } catch (error) {
      errors.push(`components/${name}: ${messageOf(error)}`);
    }
  }
  return errors;
}

let definition: ReturnType<Ajv2020['compile']> | undefined;
/** The pinned `catalog_definition.json`, compiled once beside the common types it references. */
function catalogDefinition() {
  if (!definition) {
    const ajv = new Ajv2020({allErrors: true, strict: false, validateFormats: false});
    ajv.addSchema(COMMON_TYPES_SCHEMA);
    definition = ajv.compile(CATALOG_DEFINITION_SCHEMA);
  }
  return definition;
}

/** Every way a catalog document fails the gate's four checks; empty when it passes. */
export function catalogDocumentErrors(schema: unknown): string[] {
  if (!isObject(schema)) return ['not a JSON object'];
  const catalog = schema as A2uiCatalogSchema;
  if (!isObject(catalog.components)) return ['components is not an object'];
  const errors: string[] = [];
  if (catalog.protocolVersion !== A2UI_VERSION) {
    errors.push(
      catalog.protocolVersion === undefined
        ? `declares no protocolVersion; a catalog for A2UI ${A2UI_VERSION} declares "${A2UI_VERSION}"`
        : `protocolVersion is ${JSON.stringify(catalog.protocolVersion)}, not "${A2UI_VERSION}"`,
    );
  }
  const id = typeof catalog.catalogId === 'string' ? catalog.catalogId : 'catalog';
  try {
    Catalog.fromJson(catalog, A2UI_VERSION, id);
  } catch (error) {
    errors.push(`does not load at A2UI ${A2UI_VERSION}: ${messageOf(error)}`);
  }
  errors.push(...compileErrors(catalog));
  errors.push(
    ...schemaErrors(catalogDefinition(), catalog).map(e => `catalog_definition.json${e}`),
  );
  return errors;
}
