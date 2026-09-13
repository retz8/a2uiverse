/**
 * Catalog pruning: a full `catalog.json` narrowed to a keep-set of components and functions. The
 * pruned catalog is a catalog in its own right — what an author is shown and what its output is
 * validated against — so the unions naming the dropped entries lose them, and a shared definition
 * that only dropped entries referenced goes with them. A definition nothing in the catalog
 * references at all (`anyComponent`, `anyFunction`, `theme` — the spec's own entry points) stays.
 */
import type {A2uiCatalogSchema} from './types.js';

/** The components and functions a pruned catalog keeps, by name. */
export interface KeepSet {
  components: readonly string[];
  functions: readonly string[];
}

type Json = Record<string, unknown>;

const isObject = (value: unknown): value is Json =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

/** Every local `#/<section>/<name>` ref inside a schema, as `[section, name]`. */
function localRefs(schema: unknown, found: Array<[string, string]> = []): Array<[string, string]> {
  if (Array.isArray(schema)) {
    for (const item of schema) localRefs(item, found);
  } else if (isObject(schema)) {
    const match = typeof schema.$ref === 'string' ? /^#\/([^/]+)\/([^/]+)/.exec(schema.$ref) : null;
    if (match) found.push([decodeURIComponent(match[1]!), decodeURIComponent(match[2]!)]);
    for (const value of Object.values(schema)) localRefs(value, found);
  }
  return found;
}

/** Removes union branches that ref a dropped component or function; an emptied union matches nothing. */
function withoutDropped(
  schema: unknown,
  dropped: (section: string, name: string) => boolean,
): unknown {
  if (Array.isArray(schema)) {
    return schema
      .filter(item => {
        const refs =
          isObject(item) && typeof item.$ref === 'string' ? localRefs({$ref: item.$ref}) : [];
        return !(refs.length === 1 && dropped(...refs[0]!));
      })
      .map(item => withoutDropped(item, dropped));
  }
  if (!isObject(schema)) return schema;
  const out: Json = {};
  for (const [key, value] of Object.entries(schema)) {
    const next = withoutDropped(value, dropped);
    out[key] =
      ['oneOf', 'anyOf'].includes(key) && Array.isArray(next) && next.length === 0 ? [false] : next;
  }
  return out;
}

export function pruneCatalog(catalog: A2uiCatalogSchema, keep: KeepSet): A2uiCatalogSchema {
  const components = catalog.components ?? {};
  const functions = catalog.functions ?? {};
  const defs = catalog.$defs ?? {};
  for (const name of keep.components) {
    if (!Object.hasOwn(components, name)) throw new Error(`pruneCatalog: no component '${name}'`);
  }
  for (const name of keep.functions) {
    if (!Object.hasOwn(functions, name)) throw new Error(`pruneCatalog: no function '${name}'`);
  }

  const kept = {components: new Set(keep.components), functions: new Set(keep.functions)};
  const dropped = (section: string, name: string) =>
    (section === 'components' && !kept.components.has(name)) ||
    (section === 'functions' && !kept.functions.has(name));

  const pick = (all: Record<string, unknown>, names: Set<string>) =>
    Object.fromEntries(
      Object.entries(all)
        .filter(([name]) => names.has(name))
        .map(([name, schema]) => [name, withoutDropped(schema, dropped)]),
    );
  const nextComponents = pick(components, kept.components);
  const nextFunctions = pick(functions, kept.functions);
  const allDefs = Object.fromEntries(
    Object.entries(defs).map(([name, schema]) => [name, withoutDropped(schema, dropped)]),
  );

  // Entry points: definitions the full catalog never references itself.
  const referenced = new Set(
    localRefs([components, functions, defs])
      .filter(([section]) => section === '$defs')
      .map(([, name]) => name),
  );
  const reachable = new Set<string>();
  const queue: unknown[] = [
    nextComponents,
    nextFunctions,
    ...Object.keys(defs)
      .filter(name => !referenced.has(name))
      .map(name => {
        reachable.add(name);
        return allDefs[name];
      }),
  ];
  while (queue.length > 0) {
    for (const [section, name] of localRefs(queue.pop())) {
      if (section !== '$defs' || reachable.has(name) || !Object.hasOwn(allDefs, name)) continue;
      reachable.add(name);
      queue.push(allDefs[name]);
    }
  }

  const pruned: A2uiCatalogSchema = {...catalog};
  if (catalog.components) pruned.components = nextComponents;
  if (catalog.functions) pruned.functions = nextFunctions;
  if (catalog.$defs) {
    pruned.$defs = Object.fromEntries(
      Object.entries(allDefs).filter(([name]) => reachable.has(name)),
    );
  }
  return pruned;
}
