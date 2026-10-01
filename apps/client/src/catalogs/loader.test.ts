/**
 * The catalog loader (task 11.5): a catalog not held is loaded from the registry — the table, the
 * descriptor, the entry from its served URL — checked, and added to the one array every processor
 * reads; one load in flight per catalog; a miss sends it back to the table once; a failed load is
 * not kept; the first load wins for the session.
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
  const fetchJson = vi.fn(async (url: string) => {
    if (url === `${REGISTRY}catalogs.json`) return tables[Math.min(reads++, tables.length - 1)];
    if (url === `${REGISTRY}artifacts/sha256-demo/artifact.json`) return descriptor;
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

  it('keeps the first load of a catalog for the session (task-11.5 decision 6)', async () => {
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
