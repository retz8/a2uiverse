/**
 * The entitlement rule (SPEC §9.1; task-21.10 decision 7): the one rule the hub's paint check and
 * the smoke check share. A v1.0 paint names a catalog in four places, and a catalog outside the
 * app's entitlement in any of them is outside:
 *
 * 1. `createSurface.catalogId`, the surface's default;
 * 2. a component's `@catalogId`;
 * 3. a component's bare `catalogId`, which `@a2ui/web_core` 0.16.1 reads as the component's catalog
 *    when the component's schema, in the surface's default catalog, declares no property of that
 *    name;
 * 4. a function call's `catalogId`: in a component's property, in an action's `functionCall`, or
 *    in a `callRendererFunction` message.
 *
 * A component naming no catalog on a surface with no default is not this rule's: it is the
 * release's own verdict.
 */
import type {A2uiCatalogSchema} from './a2ui/types.js';

/** The four places a paint names a catalog. */
export const CATALOG_PLACES = [
  'createSurface',
  'component',
  'bareComponent',
  'functionCall',
] as const;
export type CatalogPlace = (typeof CATALOG_PLACES)[number];

/** A catalog a paint names, where it names it. */
export interface NamedCatalog {
  place: CatalogPlace;
  catalogId: string;
  /** JSON Pointer into the messages, at the `catalogId` or `@catalogId` key. */
  path: string;
  /** The surface the message names, when it names one. */
  surfaceId?: string;
}

export interface EntitlementRuleOptions {
  /**
   * A catalog's schema by id, so a bare `catalogId` is read as the release reads it. A catalog
   * the caller does not hold reads every bare `catalogId` as the component's catalog.
   */
  schemaFor?: (catalogId: string) => A2uiCatalogSchema | undefined;
  /**
   * The default catalog of a surface created before these messages, by the surface id they name:
   * a bare `catalogId` on such a surface is read against that catalog's schema (task-21.13
   * decision 4). A surface these messages create is read by its own create.
   */
  surfaceCatalog?: (surfaceId: string) => string | undefined;
}

type Json = Record<string, unknown>;

const isObject = (value: unknown): value is Json =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const escape = (key: string) => key.replace(/~/g, '~0').replace(/\//g, '~1');

/** Whether a component's schema declares a property of the name. */
function declares(schema: unknown, name: string, defs: Json, seen = new Set<unknown>()): boolean {
  if (!isObject(schema) || seen.has(schema)) return false;
  seen.add(schema);
  if (isObject(schema.properties) && name in schema.properties) return true;
  const ref = schema.$ref;
  if (typeof ref === 'string' && ref.startsWith('#/$defs/')) {
    if (declares(defs[decodeURIComponent(ref.slice('#/$defs/'.length))], name, defs, seen))
      return true;
  }
  for (const key of ['allOf', 'anyOf', 'oneOf'] as const) {
    const branches = schema[key];
    if (Array.isArray(branches) && branches.some(b => declares(b, name, defs, seen))) return true;
  }
  return false;
}

/** Each function call under a value, with its `catalogId`: an object with a string `@call`. */
function* callsUnder(value: unknown, at: string): Generator<[string, string]> {
  if (Array.isArray(value)) {
    for (const [i, item] of value.entries()) yield* callsUnder(item, `${at}/${i}`);
    return;
  }
  if (!isObject(value)) return;
  if (typeof value['@call'] === 'string' && typeof value.catalogId === 'string') {
    yield [value.catalogId, `${at}/catalogId`];
  }
  for (const [key, child] of Object.entries(value)) {
    if (key === 'catalogId' && typeof value['@call'] === 'string') continue;
    yield* callsUnder(child, `${at}/${escape(key)}`);
  }
}

/** Every catalog a paint names, in the four places, in order. */
export function catalogsNamed(
  messages: readonly unknown[],
  options: EntitlementRuleOptions = {},
): NamedCatalog[] {
  const named: NamedCatalog[] = [];
  const defaults = new Map<string, string | undefined>();
  messages.forEach((message, index) => {
    if (!isObject(message)) return;
    const at = `/${index}`;
    const call = message.callRendererFunction;
    if (isObject(call)) {
      const surfaceId = typeof call.surfaceId === 'string' ? {surfaceId: call.surfaceId} : {};
      const fn = call.callFunction;
      if (isObject(fn) && typeof fn.catalogId === 'string') {
        named.push({
          place: 'functionCall',
          catalogId: fn.catalogId,
          path: `${at}/callRendererFunction/callFunction/catalogId`,
          ...surfaceId,
        });
      }
      return;
    }
    for (const key of ['createSurface', 'updateComponents'] as const) {
      const body = message[key];
      if (!isObject(body)) continue;
      const surfaceId = typeof body.surfaceId === 'string' ? body.surfaceId : undefined;
      const tag = surfaceId !== undefined ? {surfaceId} : {};
      if (key === 'createSurface' && surfaceId !== undefined) {
        defaults.set(surfaceId, typeof body.catalogId === 'string' ? body.catalogId : undefined);
      }
      if (key === 'createSurface' && typeof body.catalogId === 'string') {
        named.push({
          place: 'createSurface',
          catalogId: body.catalogId,
          path: `${at}/createSurface/catalogId`,
          ...tag,
        });
      }
      if (!Array.isArray(body.components)) continue;
      const fallback =
        surfaceId === undefined
          ? undefined
          : defaults.has(surfaceId)
            ? defaults.get(surfaceId)
            : options.surfaceCatalog?.(surfaceId);
      const schema = fallback !== undefined ? options.schemaFor?.(fallback) : undefined;
      body.components.forEach((component, i) => {
        if (!isObject(component)) return;
        const base = `${at}/${key}/components/${i}`;
        const own = component['@catalogId'];
        if (typeof own === 'string') {
          named.push({place: 'component', catalogId: own, path: `${base}/@catalogId`, ...tag});
        } else if (typeof component.catalogId === 'string') {
          const type = component.component;
          const definition =
            typeof type === 'string' && isObject(schema?.components)
              ? schema.components[type]
              : undefined;
          const defs = isObject(schema?.$defs) ? schema.$defs : {};
          if (!declares(definition, 'catalogId', defs)) {
            named.push({
              place: 'bareComponent',
              catalogId: component.catalogId,
              path: `${base}/catalogId`,
              ...tag,
            });
          }
        }
        for (const [prop, value] of Object.entries(component)) {
          if (prop === 'id' || prop === 'component' || prop === '@catalogId') continue;
          for (const [catalogId, path] of callsUnder(value, `${base}/${escape(prop)}`)) {
            named.push({place: 'functionCall', catalogId, path, ...tag});
          }
        }
      });
    }
  });
  return named;
}

/**
 * The catalogs a paint names outside the entitlement, each with its place. Empty when every
 * catalog it names is inside.
 */
export function catalogsOutside(
  messages: readonly unknown[],
  entitlement: readonly string[],
  options: EntitlementRuleOptions = {},
): NamedCatalog[] {
  const inside = new Set(entitlement);
  return catalogsNamed(messages, options).filter(named => !inside.has(named.catalogId));
}

const PLACE_WORDS: Readonly<Record<CatalogPlace, string>> = {
  createSurface: 'its createSurface',
  component: "a component's @catalogId",
  bareComponent: "a component's catalogId",
  functionCall: "a function call's catalogId",
};

/** A catalog outside in words: the place and the catalog, for a finding. */
export function describeCatalogOutside(outside: NamedCatalog): string {
  return `${PLACE_WORDS[outside.place]} names catalog ${JSON.stringify(outside.catalogId)}, outside its entitlement (${outside.path})`;
}
