/**
 * The catalog loader (phase-11 decisions 13, 14; task 11.5): every catalog the client renders
 * beyond its own two arrives at runtime from the registry. The loader reads the catalog table over
 * `orchestratorApi`, loads each artifact — its descriptor, its host-interface version, its entry
 * imported from its served URL, never a blob, so its stylesheet loads resolve against the
 * artifact's base URL — and checks the running code (the exports, the catalog id).
 *
 * A build is kept by its artifact id, loaded once for the page and shared by every set that holds
 * it, whether it was read from the registry or, for a Store sample, from the marketplace's
 * artifacts (task-14.7 decision 1). A set is what one renderer reads: each canvas has its own, and
 * the first build loaded into a set wins for that set — so a canvas keeps what it shows, and a
 * canvas opened after an install moved a catalog to a new build loads the new one.
 *
 * Nothing waits on it (task-11.5 decision 1): the preload runs in the background from boot, and a
 * surface arriving in a catalog not yet held waits on the same load (one in flight per build). A
 * failed load is not kept (decision 4), so
 * the next arrival tries again — its entry imported under a URL of its own, since the browser keeps
 * a module whose evaluation failed and answers its URL with the same failure. Every request it
 * makes is bounded: one that gets no answer in time is asked once more, then the load fails, so a
 * request nothing answers fails the catalog's slots rather than holding them pending (task-11.8
 * decision 20). A catalog the table does not list sends the loader back to the
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
  /** Reads JSON; `fresh` past the browser's cache — the table, which changes with every install, and each descriptor. */
  fetchJson?: (url: string, fresh: boolean) => Promise<unknown>;
  /** Imports an artifact's entry from its served URL. */
  importModule?: (url: string) => Promise<Record<string, unknown>>;
  /** How long a JSON read and an entry's import wait for an answer before each is asked once more. */
  timeouts?: {json: number; entry: number};
}

/** A JSON read is small; an entry carries its design system, megabytes through a slow link. */
export const LOADER_TIMEOUTS = {json: 10_000, entry: 30_000};

/**
 * `ask`, given `ms` to answer and asked once more if it does not: no answer to that either
 * rejects. An answer that is an error rejects at once.
 */
function bounded<T>(ask: () => Promise<T>, ms: number, what: string): Promise<T> {
  const attempt = () =>
    new Promise<T | typeof NO_ANSWER>((resolve, reject) => {
      const timer = setTimeout(() => resolve(NO_ANSWER), ms);
      ask().then(
        value => {
          clearTimeout(timer);
          resolve(value);
        },
        err => {
          clearTimeout(timer);
          reject(err);
        },
      );
    });
  return attempt().then(first =>
    first !== NO_ANSWER
      ? first
      : attempt().then(second => {
          if (second === NO_ANSWER) throw new Error(`${what}: no answer in ${ms / 1000} s, twice`);
          return second;
        }),
  );
}
const NO_ANSWER = Symbol('no answer');

/**
 * A set of held catalogs one renderer reads (task-14.7 decision 1): the array its processor is
 * built over and the map its frames look a Provider up in, each id held at one build, the first
 * one loaded into this set — never replaced.
 */
export interface HeldCatalogSet {
  /** The array a processor is built over: the client's own catalogs, then each one loaded. */
  readonly catalogs: Catalog<ReactComponentImplementation>[];
  /** Every held catalog by id, for the render layer's Provider lookup; a new map on each load. */
  resolved(): ReadonlyMap<string, ResolvedCatalog>;
  subscribe(listener: () => void): () => void;
  has(catalogId: string): boolean;
  /**
   * Resolves once the catalog is held, at the build the registry's table names; rejects with the
   * client's reason it could not be.
   */
  load(catalogId: string): Promise<void>;
}

/**
 * The page's loader: itself the set the page holds outside any canvas, every build it loads kept
 * by its artifact id and shared by every set that names it.
 */
export interface CatalogLoader extends HeldCatalogSet {
  /** Reads the table and loads every artifact it lists; failures are logged, never thrown. */
  preload(): Promise<void>;
  /**
   * A canvas's own set (task-14.7 decision 1): the builds the table names now, as far as they are
   * loaded; a catalog it loads later is the build the table names then, and stays.
   */
  forCanvas(): HeldCatalogSet;
  /**
   * Reads the table again after the registry changed — an install, an update, an uninstall from
   * the trusted page — and loads the builds it now names, for the canvases opened after. Failures
   * are logged, never thrown.
   */
  refresh(): Promise<void>;
  /**
   * One build of a catalog, read from `from`'s `artifacts/<id>/` — a Store sample's, from the
   * marketplace through the orchestrator — held by its artifact id beside the registry's.
   */
  loadBuild(catalogId: string, artifactId: string, from: string): Promise<ResolvedCatalog>;
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
  fetchJson: fetchJsonOnce = httpJson,
  importModule = importFromUrl,
  timeouts = LOADER_TIMEOUTS,
}: CatalogLoaderOptions): CatalogLoader {
  const fetchJson = (url: string, fresh: boolean) =>
    bounded(() => fetchJsonOnce(url, fresh), timeouts.json, url);
  // The routes resolve against the registry as a directory.
  const registry = registryBase.endsWith('/') ? registryBase : `${registryBase}/`;
  const own = new Map(defaults.map(r => [r.id, r]));
  /** Every build loaded, by its artifact id: a build is the same code wherever it was read from. */
  const builds = new Map<string, ResolvedCatalog>();
  /** One load in flight per build. */
  const loadingBuilds = new Map<string, Promise<ResolvedCatalog>>();
  /** Each build's imports of its entry so far: a later one takes a URL of its own. */
  const imports = new Map<string, number>();

  /** The table as last read; a failed read is not kept, so the next asks again. */
  let table: Promise<CatalogRow[]> | undefined;
  /** The rows of the last table read that answered: which build each catalog id names now. */
  let rows: readonly CatalogRow[] = [];
  const readTable = (fresh: boolean) => {
    if (fresh || !table) {
      const read = fetchJson(new URL('catalogs.json', registry).href, true).then(rowsOf);
      table = read;
      read.then(
        answered => {
          if (table === read) rows = answered;
        },
        () => {
          if (table === read) table = undefined;
        },
      );
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

  const fetchAndCheck = async (
    catalogId: string,
    artifactId: string,
    base: string,
    fallbackEntry?: string,
  ): Promise<ResolvedCatalog> => {
    // Past the browser's cache: it holds a second request for a URL behind one still unanswered,
    // so a cached read could never be asked again (task-11.8 decision 20).
    const descriptor = (await fetchJson(new URL('artifact.json', base).href, true)) as {
      catalogId?: unknown;
      entry?: unknown;
      hostInterface?: unknown;
    };
    if (descriptor.catalogId !== catalogId) {
      throw new Error(`the artifact is for ${String(descriptor.catalogId)}, not ${catalogId}`);
    }
    const interfaceErrors = checkHostInterface(String(descriptor.hostInterface));
    if (interfaceErrors.length > 0) throw new Error(interfaceErrors.join('; '));
    const entry = typeof descriptor.entry === 'string' ? descriptor.entry : fallbackEntry;
    if (entry === undefined) throw new Error('the artifact names no entry');
    const importEntry = () => {
      const attempt = (imports.get(artifactId) ?? 0) + 1;
      imports.set(artifactId, attempt);
      const entryUrl = new URL(entry, base);
      if (attempt > 1) entryUrl.searchParams.set('attempt', String(attempt));
      return importModule(entryUrl.href);
    };
    let module: Record<string, unknown>;
    try {
      module = await bounded(importEntry, timeouts.entry, 'its entry');
    } catch (err) {
      throw new Error(`the artifact's entry did not run: ${describe(err)}`);
    }
    const exportErrors = checkCatalogExports(module, catalogId);
    if (exportErrors.length > 0) throw new Error(exportErrors.join('; '));
    return resolveCatalog(
      module.CATALOG as Catalog<ReactComponentImplementation>,
      module.Provider as ComponentType<{children: ReactNode}> | undefined,
      artifactId,
    );
  };

  /** One build, loaded once for the page; a failed load is not kept (task-11.5 decision 4). */
  const loadBuild = (
    catalogId: string,
    artifactId: string,
    base: string,
    fallbackEntry?: string,
  ): Promise<ResolvedCatalog> => {
    const held = builds.get(artifactId);
    if (held) return Promise.resolve(held);
    const inFlight = loadingBuilds.get(artifactId);
    if (inFlight) return inFlight;
    const attempt = fetchAndCheck(catalogId, artifactId, base, fallbackEntry).then(resolved => {
      builds.set(artifactId, resolved);
      return resolved;
    });
    loadingBuilds.set(artifactId, attempt);
    const settle = () => {
      if (loadingBuilds.get(artifactId) === attempt) loadingBuilds.delete(artifactId);
    };
    attempt.then(settle, settle);
    return attempt;
  };

  /** The build the table names for a catalog now. */
  const loadNamed = async (catalogId: string): Promise<ResolvedCatalog> => {
    const row = await rowFor(catalogId);
    if (!('artifact' in row)) {
      const provided = own.get(catalogId);
      if (provided) return provided;
      throw new Error(`the catalog ${catalogId} is the client's own, and the client lacks it`);
    }
    return loadBuild(catalogId, row.artifact, artifactUrl(registry, row.artifact), row.entry);
  };

  /** The builds the table names now, as far as they are loaded: what a new canvas starts with. */
  const named = (): Map<string, ResolvedCatalog> => {
    const held = new Map(own);
    for (const row of rows) {
      if (!('artifact' in row)) continue;
      const build = builds.get(row.artifact);
      if (build) held.set(row.catalogId, build);
    }
    return held;
  };

  /** A set: each catalog id at the first build loaded into it, kept. */
  const heldSet = (initial: ReadonlyMap<string, ResolvedCatalog>): HeldCatalogSet => {
    const catalogs = [...initial.values()].map(r => r.catalog);
    let resolved: ReadonlyMap<string, ResolvedCatalog> = new Map(initial);
    const listeners = new Set<() => void>();
    const loading = new Map<string, Promise<void>>();
    const load = (catalogId: string): Promise<void> => {
      if (resolved.has(catalogId)) return Promise.resolve();
      const held = loading.get(catalogId);
      if (held) return held;
      const attempt = loadNamed(catalogId).then(build => {
        // The first load into this set wins (task-14.7 decision 1).
        if (resolved.has(catalogId)) return;
        catalogs.push(build.catalog);
        resolved = new Map([...resolved, [catalogId, build]]);
        for (const listener of [...listeners]) listener();
      });
      loading.set(catalogId, attempt);
      const settle = () => {
        if (loading.get(catalogId) === attempt) loading.delete(catalogId);
      };
      attempt.then(settle, settle);
      return attempt;
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
    };
  };

  /** Loads every artifact `rows` lists through `load`, logging each that fails. */
  const loadAll = async (rows: CatalogRow[], load: (catalogId: string) => Promise<unknown>) => {
    const artifacts = rows.filter(row => 'artifact' in row);
    const outcomes = await Promise.allSettled(artifacts.map(row => load(row.catalogId)));
    outcomes.forEach((outcome, i) => {
      if (outcome.status === 'rejected')
        console.warn(`[A2UI:catalogs] ${artifacts[i]!.catalogId} did not load`, outcome.reason);
    });
  };

  const page = heldSet(own);

  const preload = async () => {
    let rows: CatalogRow[];
    try {
      rows = await readTable(false);
    } catch (err) {
      console.warn('[A2UI:catalogs] the catalog table could not be read', err);
      return;
    }
    await loadAll(rows, page.load);
  };

  const refresh = async () => {
    // Until the table answers, which build a catalog id names is not known: a canvas opened in
    // the meantime starts with the client's own catalogs and loads each from the answer.
    rows = [];
    let read: CatalogRow[];
    try {
      read = await readTable(true);
    } catch (err) {
      console.warn('[A2UI:catalogs] the catalog table could not be read', err);
      return;
    }
    await loadAll(read, loadNamed);
  };

  return {
    ...page,
    preload,
    forCanvas: () => heldSet(named()),
    refresh,
    loadBuild: (catalogId, artifactId, from) =>
      loadBuild(
        catalogId,
        artifactId,
        artifactUrl(from.endsWith('/') ? from : `${from}/`, artifactId),
      ),
  };
}
