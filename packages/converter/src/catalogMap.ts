/**
 * A catalog's map (task-21.11 decision 7): the one declarative statement of what moving a catalog
 * to v1.0 changes in the payloads painted in it, in a closed vocabulary — the old catalog id and
 * the new one, the component names renamed, the property names renamed, and the component whose
 * `variant` follows the evolution guide's heading rule. Each map is written by the sub-task that
 * moves the catalog; a change the vocabulary cannot say goes back to that sub-task.
 */
import {readdirSync, readFileSync} from 'node:fs';

/** Where a catalog document is: a repo, by its folder name, and a path inside it. */
export interface DocumentPlace {
  repo: 'a2uiverse' | 'a2uiverse-apps';
  path: string;
}

export interface CatalogMap {
  /** The catalog, by a name of its own. */
  name: string;
  /** The v0.9.1 catalog: its id, and its document as git holds it before the flip. */
  from: {catalogId: string} & DocumentPlace;
  /** The v1.0 catalog: its id, and its document in the flip branch's checkout. */
  to: {catalogId: string} & DocumentPlace;
  /** Component names renamed, old to new. */
  components?: Readonly<Record<string, string>>;
  /** Property names renamed, by the component's old name, old to new. */
  properties?: Readonly<Record<string, Readonly<Record<string, string>>>>;
  /** The component whose `variant` `h1` to `h5` becomes Markdown heading markers on its `text`. */
  heading?: string;
}

const KEYS = new Set(['name', 'from', 'to', 'components', 'properties', 'heading']);

const isObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const isPlace = (value: unknown): boolean =>
  isObject(value) &&
  typeof value.catalogId === 'string' &&
  (value.repo === 'a2uiverse' || value.repo === 'a2uiverse-apps') &&
  typeof value.path === 'string';

const isRenames = (value: unknown): boolean =>
  isObject(value) && Object.values(value).every(v => typeof v === 'string');

/** A map as read from its file, refused when it says anything outside the vocabulary. */
export function readCatalogMap(text: string, file: string): CatalogMap {
  const map = JSON.parse(text) as unknown;
  const fail = (why: string) => new Error(`${file}: ${why}`);
  if (!isObject(map)) throw fail('a map is an object');
  for (const key of Object.keys(map))
    if (!KEYS.has(key)) throw fail(`"${key}" is not in a map's vocabulary`);
  if (typeof map.name !== 'string') throw fail('"name" is a string');
  if (!isPlace(map.from) || !isPlace(map.to))
    throw fail('"from" and "to" each name a catalogId, a repo and a path');
  if (map.components !== undefined && !isRenames(map.components))
    throw fail('"components" maps names to names');
  if (
    map.properties !== undefined &&
    !(isObject(map.properties) && Object.values(map.properties).every(isRenames))
  ) {
    throw fail('"properties" maps each component to its renames');
  }
  if (map.heading !== undefined && typeof map.heading !== 'string')
    throw fail('"heading" names a component');
  return map as unknown as CatalogMap;
}

/** Every map the converter holds, keyed by the old catalog id. */
export function loadCatalogMaps(
  folder = new URL('../maps/', import.meta.url),
): Map<string, CatalogMap> {
  const maps = new Map<string, CatalogMap>();
  for (const file of readdirSync(folder)
    .filter(f => f.endsWith('.json'))
    .sort()) {
    const map = readCatalogMap(readFileSync(new URL(file, folder), 'utf8'), file);
    if (maps.has(map.from.catalogId))
      throw new Error(`${file}: a second map for ${map.from.catalogId}`);
    maps.set(map.from.catalogId, map);
  }
  return maps;
}
