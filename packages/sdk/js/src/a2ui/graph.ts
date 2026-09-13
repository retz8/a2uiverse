/**
 * The component graph of an A2UI payload, following upstream's `a2ui_core` validating modules
 * (`catalog_schema_validator.extract_ref_fields`, `integrity_checker`, `topology_analyzer`): which
 * props of a catalog's components name other components, and the checks over the graph those
 * names form — duplicate ids, the root, dangling references, self-references, cycles, depth,
 * orphans — plus the payload-wide recursion and path-syntax limits. Messages are upstream's, so a
 * finding reads the same here as in the reference validator.
 */
import type {A2uiCatalogSchema, A2uiFinding} from './types.js';

export const ROOT_ID = 'root';
export const MAX_GLOBAL_DEPTH = 50;
export const MAX_FUNC_CALL_DEPTH = 5;
const RELAXED_PATH_PATTERN =
  /^(?:(?:\/(?:[^~/]|~[01])*)*|(?:[^~/]|~[01])+(?:\/(?:[^~/]|~[01])*)*)$/;

type Json = Record<string, unknown>;

/** The props of one component that name components: singly, as a list, or nested in list items. */
export interface RefFields {
  single: Set<string>;
  list: Set<string>;
  /** For a list prop whose items are objects: the item keys that name components. */
  nested: Map<string, Set<string>>;
}

const isObject = (value: unknown): value is Json =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

function refEndsWith(schema: unknown, suffix: string): boolean {
  if (!isObject(schema)) return false;
  if (typeof schema.$ref === 'string' && schema.$ref.endsWith(suffix)) return true;
  for (const key of ['oneOf', 'anyOf', 'allOf']) {
    const branches = schema[key];
    if (Array.isArray(branches) && branches.some(sub => refEndsWith(sub, suffix))) return true;
  }
  return false;
}

const isComponentId = (schema: unknown) => refEndsWith(schema, '/ComponentId');
const isChildList = (schema: unknown) => refEndsWith(schema, '/ChildList');

/** Follows a local `#/…` ref inside the catalog, leaving `ComponentId`/`ChildList` refs as they are. */
function resolveLocal(
  schema: unknown,
  catalog: A2uiCatalogSchema,
  seen = new Set<string>(),
): unknown {
  if (!isObject(schema) || typeof schema.$ref !== 'string') return schema;
  const ref = schema.$ref;
  if (!ref.startsWith('#/') || seen.has(ref) || isComponentId(schema) || isChildList(schema)) {
    return schema;
  }
  seen.add(ref);
  let node: unknown = catalog;
  for (const part of ref.slice(2).split('/')) {
    if (!isObject(node)) return schema;
    node = node[part];
  }
  return isObject(node) ? resolveLocal(node, catalog, seen) : schema;
}

/** Every component's reference props, read off its schema. */
export function extractRefFields(catalog: A2uiCatalogSchema): Map<string, RefFields> {
  const map = new Map<string, RefFields>();
  for (const [name, componentSchema] of Object.entries(catalog.components ?? {})) {
    const fields: RefFields = {single: new Set(), list: new Set(), nested: new Map()};
    const visit = (schema: unknown) => {
      if (!isObject(schema)) return;
      for (const [prop, propSchema] of Object.entries(
        isObject(schema.properties) ? schema.properties : {},
      )) {
        const resolved = resolveLocal(propSchema, catalog);
        if (isComponentId(resolved)) {
          fields.single.add(prop);
        } else if (isChildList(resolved)) {
          fields.list.add(prop);
        } else if (
          isObject(resolved) &&
          resolved.type === 'array' &&
          resolved.items !== undefined
        ) {
          const items = resolveLocal(resolved.items, catalog);
          if (isComponentId(items) || isChildList(items)) {
            fields.list.add(prop);
          } else if (isObject(items) && isObject(items.properties)) {
            for (const [key, sub] of Object.entries(items.properties)) {
              const resolvedSub = resolveLocal(sub, catalog);
              if (isComponentId(resolvedSub) || isChildList(resolvedSub)) {
                fields.list.add(prop);
                const keys = fields.nested.get(prop) ?? new Set<string>();
                keys.add(key);
                fields.nested.set(prop, keys);
              }
            }
          }
        }
      }
      for (const key of ['allOf', 'oneOf', 'anyOf']) {
        const branches = schema[key];
        if (Array.isArray(branches)) branches.forEach(visit);
      }
    };
    visit(componentSchema);
    if (fields.single.size > 0 || fields.list.size > 0) map.set(name, fields);
  }
  return map;
}

/** The ids a component names, each with the field that names it (`children`, `children.componentId`, `tabs[0].child`). */
export function componentReferences(
  component: Json,
  refFields: ReadonlyMap<string, RefFields>,
): Array<{id: string; field: string}> {
  const type = component.component;
  if (typeof type !== 'string') return [];
  const fields = refFields.get(type);
  if (!fields) return [];
  const found: Array<{id: string; field: string}> = [];
  const extract = (value: unknown, path: string) => {
    if (typeof value === 'string') {
      found.push({id: value, field: path});
    } else if (Array.isArray(value)) {
      value.forEach((item, index) => {
        const sub = typeof item === 'string' && !path.includes('[') ? path : `${path}[${index}]`;
        extract(item, sub);
      });
    } else if (isObject(value)) {
      if ('componentId' in value) {
        if (typeof value.componentId === 'string') {
          found.push({id: value.componentId, field: `${path}.componentId`});
        }
        return;
      }
      const top = path.split('[')[0]!.split('.')[0]!;
      const allowed = fields.nested.get(top);
      for (const [key, sub] of Object.entries(value)) {
        if (allowed && !path.includes('.') && !allowed.has(key)) continue;
        extract(sub, `${path}.${key}`);
      }
    }
  };
  for (const [key, value] of Object.entries(component)) {
    if (fields.single.has(key) || fields.list.has(key)) extract(value, key);
  }
  return found;
}

const idOf = (component: Json): string | undefined =>
  typeof component.id === 'string' ? component.id : undefined;

/** Duplicate ids, the root, dangling references (upstream `validate_component_integrity`). */
export function integrityFindings(
  components: readonly Json[],
  refFields: ReadonlyMap<string, RefFields>,
  requireRoot: boolean,
): A2uiFinding[] {
  const findings: A2uiFinding[] = [];
  const ids = new Set<string>();
  for (const component of components) {
    const id = idOf(component);
    if (id === undefined) continue;
    if (ids.has(id)) {
      findings.push({
        category: 'IntegrityError',
        componentId: id,
        message: `Duplicate component ID: ${id}`,
      });
    }
    ids.add(id);
  }
  if (requireRoot && !ids.has(ROOT_ID)) {
    findings.push({
      category: 'IntegrityError',
      message: `Missing root component: No component has id='${ROOT_ID}'`,
    });
  }
  for (const component of components) {
    const id = idOf(component) ?? 'Unknown';
    for (const ref of componentReferences(component, refFields)) {
      if (!ids.has(ref.id)) {
        findings.push({
          category: 'IntegrityError',
          componentId: id,
          message: `Component '${id}' references non-existent component '${ref.id}' in field '${ref.field}'`,
        });
      }
    }
  }
  return findings;
}

/** Self-references, cycles, logical depth, and orphans (upstream `analyze_topology`). */
export function topologyFindings(
  components: readonly Json[],
  refFields: ReadonlyMap<string, RefFields>,
  requireRoot: boolean,
): A2uiFinding[] {
  const findings: A2uiFinding[] = [];
  const adjacency = new Map<string, string[]>();
  for (const component of components) {
    const id = idOf(component);
    if (id === undefined) continue;
    const edges = adjacency.get(id) ?? [];
    adjacency.set(id, edges);
    for (const ref of componentReferences(component, refFields)) {
      if (ref.id === id) {
        findings.push({
          category: 'RecursionError',
          componentId: id,
          message: `Self-reference detected: Component '${id}' references itself in field '${ref.field}'`,
        });
        continue;
      }
      edges.push(ref.id);
    }
  }
  if (findings.length > 0) return findings;

  const visited = new Set<string>();
  const stack = new Set<string>();
  const dfs = (id: string, depth: number): A2uiFinding | undefined => {
    if (depth > MAX_GLOBAL_DEPTH) {
      return {
        category: 'RecursionError',
        message: `Global recursion limit exceeded: logical depth > ${MAX_GLOBAL_DEPTH}`,
      };
    }
    visited.add(id);
    stack.add(id);
    for (const next of adjacency.get(id) ?? []) {
      if (!visited.has(next)) {
        const found = dfs(next, depth + 1);
        if (found) return found;
      } else if (stack.has(next)) {
        return {
          category: 'RecursionError',
          componentId: next,
          message: `Circular reference detected involving component '${next}'`,
        };
      }
    }
    stack.delete(id);
    return undefined;
  };

  if (!requireRoot) {
    for (const id of [...adjacency.keys()].sort()) {
      if (visited.has(id)) continue;
      const found = dfs(id, 0);
      if (found) return [found];
    }
    return [];
  }
  if (adjacency.has(ROOT_ID)) {
    const found = dfs(ROOT_ID, 0);
    if (found) return [found];
  }
  for (const id of [...adjacency.keys()].filter(id => !visited.has(id)).sort()) {
    findings.push({
      category: 'IntegrityError',
      componentId: id,
      message: `Component '${id}' is not reachable from '${ROOT_ID}'`,
    });
  }
  return findings;
}

/** Payload-wide depth, function-call nesting and path syntax (upstream `validate_recursion_and_paths`). */
export function recursionAndPathFindings(data: unknown): A2uiFinding[] {
  const findings: A2uiFinding[] = [];
  const traverse = (item: unknown, depth: number, funcDepth: number, at: string): boolean => {
    if (depth > MAX_GLOBAL_DEPTH) {
      findings.push({
        category: 'RecursionError',
        path: at,
        message: `Global recursion limit exceeded: Depth > ${MAX_GLOBAL_DEPTH}`,
      });
      return false;
    }
    if (Array.isArray(item)) {
      return item.every((x, i) => traverse(x, depth + 1, funcDepth, `${at}/${i}`));
    }
    if (!isObject(item)) return true;
    if (typeof item.path === 'string' && !RELAXED_PATH_PATTERN.test(item.path)) {
      findings.push({
        category: 'ValidationError',
        path: `${at}/path`,
        message: `Invalid path syntax: '${item.path}'`,
      });
    }
    const legacyCall = isObject(item.functionCall);
    const call = 'call' in item && 'args' in item;
    if ((legacyCall || call) && funcDepth >= MAX_FUNC_CALL_DEPTH) {
      findings.push({
        category: 'RecursionError',
        path: at,
        message: `Recursion limit exceeded: functionCall depth > ${MAX_FUNC_CALL_DEPTH}`,
      });
      return false;
    }
    if (legacyCall) {
      return traverse(item.functionCall, depth + 1, funcDepth + 1, `${at}/functionCall`);
    }
    return Object.entries(item).every(([key, value]) =>
      traverse(
        value,
        depth + 1,
        call && key === 'args' ? funcDepth + 1 : funcDepth,
        `${at}/${key}`,
      ),
    );
  };
  traverse(data, 0, 0, '');
  return findings;
}
