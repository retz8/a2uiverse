/**
 * The catalog loader (task 11.5): a catalog not held is loaded from the registry — the table, the
 * descriptor, the entry from its served URL — checked, and added to the set's array its processor
 * reads; one load in flight per build; a miss sends it back to the table once; a failed load is not
 * kept; the first load into a set wins for that set, each canvas a set of its own, a build loaded
 * once for the page by its artifact id (task-14.7 decision 1).
 */
import {describe, expect, it, vi} from 'vitest';
import {Catalog} from '@a2ui/web_core/v0_9';
import type {ReactComponentImplementation} from '@a2ui/react/v0_9';
import {BASIC_CATALOG_ID} from '@a2uiverse/sdk';
import {CATALOG_ID as SHELL_CATALOG_ID} from '@a2uiverse/shell-catalog/id';
import type {CatalogRow} from '../orchestratorApi';
import {clientCatalogs} from './clientCatalogs';
import {createCatalogLoader} from './loader';
import {SNAPSHOT_ARTIFACTS, snapshotLoader} from '../../tests/snapshot';

const REGISTRY = 'http://hub.test/registry/';
const DEMO = 'urn:catalog:demo';
const DEMO_ROW: CatalogRow = {catalogId: DEMO, artifact: 'sha256-demo', entry: 'index.js'};
const CLIENT_ROWS: CatalogRow[] = [
  {catalogId: BASIC_CATALOG_ID, provided: 'client'},
  {catalogId: SHELL_CATALOG_ID, provided: 'client'},
];

const demoModule = (catalogId = DEMO): Record<string, unknown> => ({
  CATALOG: new Catalog<ReactComponentImplementation>(catalogId, [], []),
  Provider: ({children}: {children: unknown}) => children,
});

/** A registry in memory: the tables it answers in turn, one descriptor, one module. */
function fakeRegistry({
  tables = [[...CLIENT_ROWS, DEMO_ROW]],
  descriptor = {catalogId: DEMO, entry: 'index.js', hostInterface: '0.9.1'},
  module = () => Promise.resolve(demoModule()),
}: {
  tables?: CatalogRow[][];
  descriptor?: Record<string, unknown>;
  module?: () => Promise<Record<string, unknown>>;
} = {}) {
  let reads = 0;
  const fetchJson = vi.fn(async (url: string, _fresh?: boolean) => {
    if (url === `${REGISTRY}catalogs.json`) return tables[Math.min(reads++, tables.length - 1)];
    if (/\/artifacts\/sha256-[a-z]+\/artifact\.json$/.test(url)) return descriptor;
    throw new Error(`no route ${url}`);
  });
  const importModule = vi.fn((_url: string) => module());
  const loader = createCatalogLoader({
    registry: REGISTRY,
    defaults: clientCatalogs(),
    fetchJson,
    importModule,
  });
  return {loader, fetchJson, importModule, tableReads: () => reads};
}

describe('the client’s own catalogs', () => {
  it('holds the shell catalog and the basic catalog from the start (task-11.5 decision 5)', () => {
    const {loader} = fakeRegistry();
    expect(loader.has(SHELL_CATALOG_ID)).toBe(true);
    expect(loader.has(BASIC_CATALOG_ID)).toBe(true);
    expect(loader.catalogs.map(c => c.id)).toEqual([SHELL_CATALOG_ID, BASIC_CATALOG_ID]);
    expect(loader.resolved().get(BASIC_CATALOG_ID)?.catalog.components.has('Text')).toBe(true);
  });
});

describe('loading a catalog', () => {
  it('imports the entry from its served URL and adds the catalog to the shared array', async () => {
    const {loader, importModule} = fakeRegistry();
    const array = loader.catalogs;
    const seen = vi.fn();
    loader.subscribe(seen);
    expect(loader.has(DEMO)).toBe(false);
    await loader.load(DEMO);
    expect(importModule).toHaveBeenCalledWith(`${REGISTRY}artifacts/sha256-demo/index.js`);
    expect(loader.has(DEMO)).toBe(true);
    expect(loader.catalogs).toBe(array);
    expect(array.map(c => c.id)).toContain(DEMO);
    expect(seen).toHaveBeenCalledTimes(1);
  });

  it('keeps one load in flight per catalog', async () => {
    const {loader, importModule} = fakeRegistry();
    await Promise.all([loader.load(DEMO), loader.load(DEMO)]);
    await loader.load(DEMO);
    expect(importModule).toHaveBeenCalledTimes(1);
  });

  it('goes back to the table once for a catalog it does not list, finding one installed since', async () => {
    const {loader, tableReads} = fakeRegistry({tables: [CLIENT_ROWS, [...CLIENT_ROWS, DEMO_ROW]]});
    await loader.load(DEMO);
    expect(tableReads()).toBe(2);
    expect(loader.has(DEMO)).toBe(true);
  });

  it('fails a catalog the registry does not hold, after reading the table again', async () => {
    const {loader, tableReads} = fakeRegistry({tables: [CLIENT_ROWS]});
    await expect(loader.load(DEMO)).rejects.toThrow(`the registry holds no catalog ${DEMO}`);
    expect(tableReads()).toBe(2);
  });

  it('fails when the registry cannot be reached', async () => {
    const loader = createCatalogLoader({
      registry: REGISTRY,
      defaults: clientCatalogs(),
      fetchJson: () => Promise.reject(new Error('connection refused')),
    });
    await expect(loader.load(DEMO)).rejects.toThrow(
      'the registry could not be reached: connection refused',
    );
  });

  it('refuses an artifact built against a host interface the client does not provide', async () => {
    const {loader, importModule} = fakeRegistry({
      descriptor: {catalogId: DEMO, entry: 'index.js', hostInterface: '0.8.0'},
    });
    await expect(loader.load(DEMO)).rejects.toThrow('host interface "0.8.0"');
    expect(importModule).not.toHaveBeenCalled();
  });

  it('refuses a descriptor for another catalog', async () => {
    const {loader} = fakeRegistry({
      descriptor: {catalogId: 'urn:catalog:other', entry: 'index.js', hostInterface: '0.9.1'},
    });
    await expect(loader.load(DEMO)).rejects.toThrow('the artifact is for urn:catalog:other');
  });

  it('checks the running code: the exports and the catalog id', async () => {
    const noCatalog = fakeRegistry({module: () => Promise.resolve({Provider: () => null})});
    await expect(noCatalog.loader.load(DEMO)).rejects.toThrow('CATALOG');
    const otherId = fakeRegistry({module: () => Promise.resolve(demoModule('urn:catalog:other'))});
    await expect(otherId.loader.load(DEMO)).rejects.toThrow('urn:catalog:other');
    expect(otherId.loader.has(DEMO)).toBe(false);
  });

  it('fails an entry that throws as it runs', async () => {
    const {loader} = fakeRegistry({module: () => Promise.reject(new Error('boom'))});
    await expect(loader.load(DEMO)).rejects.toThrow("the artifact's entry did not run: boom");
  });

  it('keeps no failed load: the next asks again (task-11.5 decision 4)', async () => {
    let attempt = 0;
    const {loader, importModule} = fakeRegistry({
      module: () =>
        attempt++ === 0 ? Promise.reject(new Error('blip')) : Promise.resolve(demoModule()),
    });
    await expect(loader.load(DEMO)).rejects.toThrow('blip');
    await loader.load(DEMO);
    expect(importModule).toHaveBeenCalledTimes(2);
    expect(loader.has(DEMO)).toBe(true);
  });

  it('imports the entry again under a URL of its own after one failed, the browser keeping a failed module (task-11.8 decision 20)', async () => {
    let attempt = 0;
    const {loader, importModule} = fakeRegistry({
      module: () =>
        attempt++ < 2 ? Promise.reject(new Error('blip')) : Promise.resolve(demoModule()),
    });
    await expect(loader.load(DEMO)).rejects.toThrow('blip');
    await expect(loader.load(DEMO)).rejects.toThrow('blip');
    await loader.load(DEMO);
    expect(importModule.mock.calls.map(([url]) => url)).toEqual([
      `${REGISTRY}artifacts/sha256-demo/index.js`,
      `${REGISTRY}artifacts/sha256-demo/index.js?attempt=2`,
      `${REGISTRY}artifacts/sha256-demo/index.js?attempt=3`,
    ]);
  });

  it('keeps the first load of a catalog for the page’s own set (task-11.5 decision 6)', async () => {
    const {loader, importModule} = fakeRegistry({
      tables: [
        [...CLIENT_ROWS, DEMO_ROW],
        [...CLIENT_ROWS, {...DEMO_ROW, artifact: 'sha256-newer'}],
      ],
    });
    await loader.load(DEMO);
    await loader.preload();
    await loader.load(DEMO);
    expect(importModule).toHaveBeenCalledTimes(1);
  });
});

describe('the preload', () => {
  it('loads every artifact the table lists and throws nothing for one that fails', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const broken = fakeRegistry({module: () => Promise.reject(new Error('boom'))});
    await expect(broken.loader.preload()).resolves.toBeUndefined();
    expect(warn).toHaveBeenCalled();
    warn.mockRestore();
    const {loader} = fakeRegistry();
    await loader.preload();
    expect(loader.has(DEMO)).toBe(true);
  });

  it('loads every artifact of the registry snapshot through its served files', async () => {
    const loader = snapshotLoader();
    await loader.preload();
    for (const {catalogId} of SNAPSHOT_ARTIFACTS) expect(loader.has(catalogId)).toBe(true);
    expect(loader.catalogs).toHaveLength(SNAPSHOT_ARTIFACTS.length + 2);
  });
});

describe('a request that gets no answer (task-11.8 decision 20)', () => {
  const never = () => new Promise<never>(() => {});

  it('reads the table and the descriptor past the browser’s cache, which holds a URL behind its unanswered request', async () => {
    const {loader, fetchJson} = fakeRegistry();
    await loader.load(DEMO);
    expect(fetchJson.mock.calls.map(([url, fresh]) => [url.slice(REGISTRY.length), fresh])).toEqual(
      [
        ['catalogs.json', true],
        ['artifacts/sha256-demo/artifact.json', true],
      ],
    );
  });

  it('asks the table once more after the timeout, and loads on that answer', async () => {
    vi.useFakeTimers();
    try {
      let reads = 0;
      const fetchJson = vi.fn(async (url: string) => {
        if (url === `${REGISTRY}catalogs.json`)
          return reads++ === 0 ? never() : [...CLIENT_ROWS, DEMO_ROW];
        return {catalogId: DEMO, entry: 'index.js', hostInterface: '0.9.1'};
      });
      const loader = createCatalogLoader({
        registry: REGISTRY,
        defaults: clientCatalogs(),
        fetchJson,
        importModule: async () => demoModule(),
      });
      const loaded = loader.load(DEMO);
      await vi.advanceTimersByTimeAsync(10_000);
      await loaded;
      expect(loader.has(DEMO)).toBe(true);
      expect(reads).toBe(2);
    } finally {
      vi.useRealTimers();
    }
  });

  it('imports an entry with no answer once more under a URL of its own, then fails', async () => {
    vi.useFakeTimers();
    try {
      const {loader, importModule} = fakeRegistry({module: never});
      const failed = loader.load(DEMO);
      const settled = failed.then(
        () => new Error('loaded'),
        (err: unknown) => err as Error,
      );
      await vi.advanceTimersByTimeAsync(30_000);
      await vi.advanceTimersByTimeAsync(30_000);
      expect((await settled).message).toContain('no answer in 30 s, twice');
      expect(importModule.mock.calls.map(([url]) => url)).toEqual([
        `${REGISTRY}artifacts/sha256-demo/index.js`,
        `${REGISTRY}artifacts/sha256-demo/index.js?attempt=2`,
      ]);
    } finally {
      vi.useRealTimers();
    }
  });
});

describe('a canvas’s own set (task-14.7 decision 1)', () => {
  const NEWER_ROW: CatalogRow = {...DEMO_ROW, artifact: 'sha256-newer'};

  it('starts with the builds the table names, loaded, and loads the rest into itself alone', async () => {
    const {loader, importModule} = fakeRegistry();
    const before = loader.forCanvas();
    expect(before.has(DEMO)).toBe(false);
    await loader.preload();
    const after = loader.forCanvas();
    expect(after.has(DEMO)).toBe(true);
    expect(after.catalogs.map(c => c.id)).toEqual([SHELL_CATALOG_ID, BASIC_CATALOG_ID, DEMO]);
    expect(before.has(DEMO)).toBe(false);
    await before.load(DEMO);
    expect(before.resolved().get(DEMO)).toBe(after.resolved().get(DEMO));
    expect(importModule).toHaveBeenCalledTimes(1);
  });

  it('keeps its build when an install moves the catalog; a canvas opened after takes the new one', async () => {
    const modules = new Map([
      [`${REGISTRY}artifacts/sha256-demo/index.js`, demoModule()],
      [`${REGISTRY}artifacts/sha256-newer/index.js`, demoModule()],
    ]);
    const {loader, importModule} = fakeRegistry({
      tables: [
        [...CLIENT_ROWS, DEMO_ROW],
        [...CLIENT_ROWS, NEWER_ROW],
      ],
    });
    importModule.mockImplementation(url => Promise.resolve(modules.get(url)!));
    await loader.preload();
    const open = loader.forCanvas();
    const held = open.resolved().get(DEMO);
    await loader.refresh();
    expect(importModule).toHaveBeenLastCalledWith(`${REGISTRY}artifacts/sha256-newer/index.js`);
    expect(open.resolved().get(DEMO)).toBe(held);
    const later = loader.forCanvas();
    expect(later.has(DEMO)).toBe(true);
    expect(later.resolved().get(DEMO)).not.toBe(held);
    // Each carries its build, the root its stylesheets are held to (task-14.11 decision 39).
    expect(held?.build).toBe('sha256-demo');
    expect(later.resolved().get(DEMO)?.build).toBe('sha256-newer');
  });

  it('a canvas opened before the new build loaded loads it on its first surface', async () => {
    const {loader, importModule} = fakeRegistry({
      tables: [
        [...CLIENT_ROWS, DEMO_ROW],
        [...CLIENT_ROWS, NEWER_ROW],
      ],
    });
    await loader.preload();
    const held = loader.forCanvas().resolved().get(DEMO);
    const refreshed = loader.refresh();
    const opened = loader.forCanvas();
    await refreshed;
    await opened.load(DEMO);
    expect(importModule).toHaveBeenCalledTimes(2);
    expect(opened.resolved().get(DEMO)).not.toBe(held);
  });
});

describe('a Store sample’s build (task-14.7 decision 1)', () => {
  const MARKETPLACE = 'http://hub.test/marketplace/';

  it('reads the build from the marketplace’s artifacts and changes no set', async () => {
    const {loader, importModule} = fakeRegistry();
    const canvas = loader.forCanvas();
    const build = await loader.loadBuild(DEMO, 'sha256-other', MARKETPLACE);
    expect(build.id).toBe(DEMO);
    expect(importModule).toHaveBeenCalledWith(`${MARKETPLACE}artifacts/sha256-other/index.js`);
    expect(loader.has(DEMO)).toBe(false);
    expect(canvas.has(DEMO)).toBe(false);
  });

  it('shares one load with the registry’s when it is the same build', async () => {
    const {loader, importModule} = fakeRegistry();
    const build = await loader.loadBuild(DEMO, 'sha256-demo', MARKETPLACE);
    const canvas = loader.forCanvas();
    await canvas.load(DEMO);
    expect(canvas.resolved().get(DEMO)).toBe(build);
    expect(importModule).toHaveBeenCalledTimes(1);
  });
});
