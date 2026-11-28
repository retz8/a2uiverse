/**
 * The registry snapshot in the client's tests (task-11.5 decision 11): every catalog a test
 * renders with arrives through the real loader, from the snapshot the registry-snapshot package
 * generates — its table and its artifacts read from disk, each entry imported from its file URL,
 * which its stylesheet loads resolve against. jsdom applies no stylesheet, as it applied none of
 * the compiled-in catalogs' either: the host records each URL it is asked for and resolves.
 */
import {existsSync, readFileSync} from 'node:fs';
import {join} from 'node:path';
import {fileURLToPath, pathToFileURL} from 'node:url';
import {REGISTRY_SNAPSHOT_DIR} from '@a2uiverse/registry-snapshot';
import {SUPPORTED_HOST_INTERFACES} from '@a2uiverse/sdk';
import {
  clientCatalogs,
  type ClientCatalogOptions,
  type ResolvedCatalog,
} from '../src/catalogs/clientCatalogs';
import {registerHost} from '../src/catalogs/host';
import {createCatalogLoader, type CatalogLoader} from '../src/catalogs/loader';

/** Every stylesheet an artifact asked the host for, in order. */
export const STYLESHEETS_REQUESTED: string[] = [];

registerHost(async url => {
  STYLESHEETS_REQUESTED.push(url);
});

/** The snapshot's root, as the loader reads it: what the orchestrator serves under `/registry`. */
export const SNAPSHOT_REGISTRY = pathToFileURL(REGISTRY_SNAPSHOT_DIR).href;

const readJson = async (url: string) => JSON.parse(readFileSync(fileURLToPath(url), 'utf8'));
const importFile = (url: string) =>
  import(/* @vite-ignore */ url) as Promise<Record<string, unknown>>;

/** A loader over the snapshot, nothing loaded yet but the client's own two catalogs. */
export function snapshotLoader(host?: ClientCatalogOptions): CatalogLoader {
  return createCatalogLoader({
    registry: SNAPSHOT_REGISTRY,
    defaults: clientCatalogs(host),
    fetchJson: readJson,
    importModule: importFile,
  });
}

/** The snapshot's table, as built; none when it has not been. */
const TABLE = join(REGISTRY_SNAPSHOT_DIR, 'catalogs.json');

/**
 * Each artifact the snapshot's table names that the client can load — packed for a host-module
 * interface it lends — with the package it was packed from, its catalog id and its directory, and
 * not the second build packed beside one of them for the replay suite (task-15.10 decision 11).
 * None while the snapshot holds no catalog packed for the client's interface (task-21.14
 * decision 14).
 */
export const SNAPSHOT_ARTIFACTS: {package: string; catalogId: string; dir: string}[] = (
  existsSync(TABLE) ? (JSON.parse(readFileSync(TABLE, 'utf8')) as {artifact?: string}[]) : []
).flatMap(({artifact: id}) => {
  if (id === undefined) return [];
  const dir = join(REGISTRY_SNAPSHOT_DIR, 'artifacts', id);
  const descriptor = JSON.parse(readFileSync(join(dir, 'artifact.json'), 'utf8')) as {
    catalogId: string;
    hostInterface?: string;
    package: {name: string};
  };
  if (!SUPPORTED_HOST_INTERFACES.includes(String(descriptor.hostInterface))) return [];
  return [{package: descriptor.package.name, catalogId: descriptor.catalogId, dir}];
});

/**
 * Whether the snapshot holds the app catalogs a test draws in. A test that draws an app catalog,
 * reads one from the snapshot or replays a beat painting in one skips itself while it does not
 * (task-21.14 decision 14).
 */
export const SNAPSHOT_READY = SNAPSHOT_ARTIFACTS.length > 0;

/** The catalog id the snapshot holds for a catalog package, by the package's name. */
export function snapshotCatalogId(packageName: string): string {
  const artifact = SNAPSHOT_ARTIFACTS.find(a => a.package === packageName);
  if (!artifact) throw new Error(`the registry snapshot holds no ${packageName}`);
  return artifact.catalogId;
}

/** Every catalog the snapshot holds, loaded: the client's own two first, then each artifact's. */
export async function loadSnapshot(host?: ClientCatalogOptions): Promise<CatalogLoader> {
  const loader = snapshotLoader(host);
  for (const {catalogId} of SNAPSHOT_ARTIFACTS) await loader.load(catalogId);
  return loader;
}

/** The snapshot's catalogs as a fixed set, in the snapshot's order. */
export async function snapshotCatalogs(host?: ClientCatalogOptions): Promise<ResolvedCatalog[]> {
  return [...(await loadSnapshot(host)).resolved().values()];
}

/** One catalog of the snapshot, loaded, by the package it was packed from. */
export async function snapshotCatalog(packageName: string): Promise<ResolvedCatalog> {
  const loader = snapshotLoader();
  const catalogId = snapshotCatalogId(packageName);
  await loader.load(catalogId);
  return loader.resolved().get(catalogId)!;
}
