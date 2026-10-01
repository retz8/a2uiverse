/**
 * The catalog loader (phase-11 decisions 13, 14; task 11.5): every catalog the client renders
 * beyond its own two arrives at runtime from the registry. The loader reads the catalog table over
 * `orchestratorApi`, loads each artifact — its descriptor, its host-interface version, its entry
 * imported from its served URL, never a blob, so its stylesheet loads resolve against the
 * artifact's base URL — checks the running code (the exports, the catalog id), and adds the
 * catalog to the one array every canvas runtime's processor is built over (task-11.5 decision 3).
 *
 * Nothing waits on it (decision 1): the preload runs in the background from boot, and a surface
 * arriving in a catalog not yet held waits on the same load (one in flight per catalog). The first
 * load of a catalog wins for the session (decision 6); a failed load is not kept (decision 4), so
 * the next arrival tries again. A catalog the table does not list sends the loader back to the
 * table once before it fails.
 */
import type {Catalog} from '@a2ui/web_core/v0_9';
import type {ReactComponentImplementation} from '@a2ui/react/v0_9';
import {checkCatalogExports, checkHostInterface} from '@a2uiverse/sdk';
import type {ComponentType, ReactNode} from 'react';
import {artifactUrl, fetchJson as fetchJsonOverHttp, type CatalogRow} from '../orchestratorApi';
import {resolveCatalog, type ResolvedCatalog} from './clientCatalogs';

export interface CatalogLoaderOptions {
  /** The registry's base URL: the orchestrator's `/registry/`, or a snapshot's root. */
  registry: string;
  /** The client's own catalogs, held from the start. */
  defaults: readonly ResolvedCatalog[];
  /** Reads JSON; `fresh` for the table, which changes with every install. */
  fetchJson?: (url: string, fresh: boolean) => Promise<unknown>;
  /** Imports an artifact's entry from its served URL. */
  importModule?: (url: string) => Promise<Record<string, unknown>>;
}

export interface CatalogLoader {
  /** The array every processor is built over: the client's own catalogs, then each one loaded. */
  readonly catalogs: Catalog<ReactComponentImplementation>[];
  /** Every held catalog by id, for the render layer's Provider lookup; a new map on each load. */
  resolved(): ReadonlyMap<string, ResolvedCatalog>;
  subscribe(listener: () => void): () => void;
  has(catalogId: string): boolean;
  /** Resolves once the catalog is held; rejects with the client's reason it could not be. */
  load(catalogId: string): Promise<void>;
  /** Reads the table and loads every artifact it lists; failures are logged, never thrown. */
  preload(): Promise<void>;
}

const httpJson = (url: string, fresh: boolean) =>
  fetchJsonOverHttp(url, fresh ? {cache: 'no-store'} : undefined);
const importFromUrl = (url: string) =>
  import(/* @vite-ignore */ url) as Promise<Record<string, unknown>>;

const describe = (err: unknown) => (err instanceof Error ? err.message : String(err));

function rowsOf(table: unknown): CatalogRow[] {
  if (!Array.isArray(table)) throw new Error('the catalog table is not a list');
  return table.filter(
    (row): row is CatalogRow =>
      typeof row === 'object' &&
      row !== null &&
      typeof (row as {catalogId?: unknown}).catalogId === 'string',
  );
}

export function createCatalogLoader({
  registry: registryBase,
  defaults,
  fetchJson = httpJson,
  importModule = importFromUrl,
}: CatalogLoaderOptions): CatalogLoader {
  // The routes resolve against the registry as a directory.
  const registry = registryBase.endsWith('/') ? registryBase : `${registryBase}/`;
  const catalogs = defaults.map(resolved => resolved.catalog);
  let resolved: ReadonlyMap<string, ResolvedCatalog> = new Map(defaults.map(r => [r.id, r]));
  const listeners = new Set<() => void>();
  const loading = new Map<string, Promise<void>>();

  /** The table as last read; a failed read is not kept, so the next asks again. */
  let table: Promise<CatalogRow[]> | undefined;
  const readTable = (fresh: boolean) => {
    if (fresh || !table) {
      const read = fetchJson(new URL('catalogs.json', registry).href, true).then(rowsOf);
      table = read;
      read.catch(() => {
        if (table === read) table = undefined;
      });
    }
    return table;
  };

  const rowFor = async (catalogId: string): Promise<CatalogRow> => {
    const reach = (fresh: boolean) =>
      readTable(fresh).catch(err => {
        throw new Error(`the registry could not be reached: ${describe(err)}`);
      });
    const find = (rows: CatalogRow[]) => rows.find(row => row.catalogId === catalogId);
    const row = find(await reach(false)) ?? find(await reach(true));
    if (!row) throw new Error(`the registry holds no catalog ${catalogId}`);
    return row;
  };

  const hold = (catalog: ResolvedCatalog) => {
    catalogs.push(catalog.catalog);
    resolved = new Map([...resolved, [catalog.id, catalog]]);
    for (const listener of [...listeners]) listener();
  };

  const fetchAndCheck = async (catalogId: string) => {
    const row = await rowFor(catalogId);
    if (!('artifact' in row)) {
      throw new Error(`the catalog ${catalogId} is the client's own, and the client lacks it`);
    }
    const base = artifactUrl(registry, row.artifact);
    const descriptor = (await fetchJson(new URL('artifact.json', base).href, false)) as {
      catalogId?: unknown;
      entry?: unknown;
      hostInterface?: unknown;
    };
    if (descriptor.catalogId !== catalogId) {
      throw new Error(`the artifact is for ${String(descriptor.catalogId)}, not ${catalogId}`);
    }
    const interfaceErrors = checkHostInterface(String(descriptor.hostInterface));
    if (interfaceErrors.length > 0) throw new Error(interfaceErrors.join('; '));
    const entry = typeof descriptor.entry === 'string' ? descriptor.entry : row.entry;
    let module: Record<string, unknown>;
    try {
      module = await importModule(new URL(entry, base).href);
    } catch (err) {
      throw new Error(`the artifact's entry did not run: ${describe(err)}`);
    }
    const exportErrors = checkCatalogExports(module, catalogId);
    if (exportErrors.length > 0) throw new Error(exportErrors.join('; '));
    // The first load of a catalog wins for the session (task-11.5 decision 6).
    if (resolved.has(catalogId)) return;
    hold(
      resolveCatalog(
        module.CATALOG as Catalog<ReactComponentImplementation>,
        module.Provider as ComponentType<{children: ReactNode}> | undefined,
      ),
    );
  };

  const load = (catalogId: string): Promise<void> => {
    if (resolved.has(catalogId)) return Promise.resolve();
    const held = loading.get(catalogId);
    if (held) return held;
    const attempt = fetchAndCheck(catalogId);
    loading.set(catalogId, attempt);
    const settle = () => {
      if (loading.get(catalogId) === attempt) loading.delete(catalogId);
    };
    attempt.then(settle, settle);
    return attempt;
  };

  const preload = async () => {
    let rows: CatalogRow[];
    try {
      rows = await readTable(false);
    } catch (err) {
      console.warn('[A2UI:catalogs] the catalog table could not be read', err);
      return;
    }
    const artifacts = rows.filter(row => 'artifact' in row);
    const outcomes = await Promise.allSettled(artifacts.map(row => load(row.catalogId)));
    outcomes.forEach((outcome, i) => {
      if (outcome.status === 'rejected')
        console.warn(`[A2UI:catalogs] ${artifacts[i]!.catalogId} did not load`, outcome.reason);
    });
  };

  return {
    catalogs,
    resolved: () => resolved,
    subscribe: listener => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    has: catalogId => resolved.has(catalogId),
    load,
    preload,
  };
}
