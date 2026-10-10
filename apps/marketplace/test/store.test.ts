/** The marketplace on disk (task-13.3 decisions 2, 14, 15): the served subtree, the publishers file, the boot's reading. */
import {mkdir, mkdtemp, readFile, rm, stat, writeFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {afterEach, beforeEach, describe, expect, test} from 'vitest';
import {ARTIFACT_DESCRIPTOR_FILE} from '@a2uiverse/sdk';
import {
  ARTIFACTS_DIR,
  APPS_DIR,
  ENTRY_FILE,
  INDEX_FILE,
  MarketplaceStore,
  PREVIEW_FILE,
  PUBLIC_DIR,
  PUBLISHERS_FILE,
  type PublisherRecord,
} from '../src/store.js';
import {cardFor, encode, entryFor, fixtureArtifact, idOf, previewFor} from './fixture.js';

const CAT = 'https://example.com/shop/catalog.json';

let stateDir: string;
beforeEach(async () => {
  stateDir = await mkdtemp(join(tmpdir(), 'a2uiverse-marketplace-'));
});
afterEach(async () => {
  await rm(stateDir, {recursive: true, force: true});
});

const publisher: PublisherRecord = {
  name: 'acme',
  tokenHash: 'sha256-AAAA',
  claimedAt: '2026-10-10T00:00:00.000Z',
  apps: ['shop'],
  catalogs: [CAT],
};

async function populated() {
  const store = new MarketplaceStore(stateDir);
  await store.load();
  const files = await fixtureArtifact(CAT);
  const artifactId = await idOf(files);
  const card = cardFor('http://127.0.0.1:1', {catalogs: [CAT]});
  const entry = entryFor('shop', card, {[CAT]: artifactId});
  const preview = previewFor('shop', card.version, CAT);
  await store.writeArtifact(artifactId, files);
  await store.writeEntry(entry);
  await store.writePreview(preview);
  await store.writePublishers([publisher]);
  return {store, files, artifactId, entry, preview};
}

describe('MarketplaceStore', () => {
  test('an empty state directory is an empty marketplace, its directories made', async () => {
    const store = new MarketplaceStore(stateDir);
    const loaded = await store.load();
    expect(loaded).toEqual({
      publishers: [],
      entries: [],
      previews: new Map(),
      descriptors: new Map(),
    });
    expect((await stat(join(stateDir, PUBLIC_DIR, APPS_DIR))).isDirectory()).toBe(true);
    expect((await stat(join(stateDir, PUBLIC_DIR, ARTIFACTS_DIR))).isDirectory()).toBe(true);
  });

  test('the served subtree and the publishers file are read back as written', async () => {
    const {store, artifactId, entry, preview} = await populated();
    const loaded = await new MarketplaceStore(stateDir).load();
    expect(loaded.publishers).toEqual([publisher]);
    expect(loaded.entries).toEqual([entry]);
    expect(loaded.previews.get('shop')).toEqual(preview);
    expect(loaded.descriptors.get(artifactId)?.catalogId).toBe(CAT);
    expect(store.publicDir).toBe(join(stateDir, PUBLIC_DIR));
    expect(
      JSON.parse(await readFile(join(stateDir, PUBLIC_DIR, APPS_DIR, 'shop', ENTRY_FILE), 'utf8')),
    ).toEqual(entry);
    expect(
      JSON.parse(
        await readFile(join(stateDir, PUBLIC_DIR, APPS_DIR, 'shop', PREVIEW_FILE), 'utf8'),
      ),
    ).toEqual(preview);
  });

  test("the publishers file is the owner's alone", async () => {
    await populated();
    const mode = (await stat(join(stateDir, PUBLISHERS_FILE))).mode & 0o777;
    expect(mode).toBe(0o600);
  });

  test('the index is written as the list of entries', async () => {
    const {store, entry} = await populated();
    await store.writeIndex([entry]);
    expect(JSON.parse(await readFile(join(stateDir, PUBLIC_DIR, INDEX_FILE), 'utf8'))).toEqual([
      entry,
    ]);
  });

  test('removing an app removes its directory', async () => {
    const {store} = await populated();
    await store.removeApp('shop');
    const loaded = await new MarketplaceStore(stateDir).load();
    expect(loaded.entries).toEqual([]);
    expect(loaded.previews.size).toBe(0);
  });

  test('an artifact already there is not written again; the unkept ones go', async () => {
    const {store, artifactId, files} = await populated();
    await store.writeArtifact(artifactId, files);
    const other = await fixtureArtifact('https://example.com/other/catalog.json');
    const otherId = await idOf(other);
    await store.writeArtifact(otherId, other);
    await mkdir(join(stateDir, PUBLIC_DIR, ARTIFACTS_DIR, '.tmp-left'), {recursive: true});
    await store.removeArtifactsExcept(new Set([artifactId]));
    await expect(stat(join(stateDir, PUBLIC_DIR, ARTIFACTS_DIR, otherId))).rejects.toThrow();
    await expect(stat(join(stateDir, PUBLIC_DIR, ARTIFACTS_DIR, '.tmp-left'))).rejects.toThrow();
    expect((await stat(join(stateDir, PUBLIC_DIR, ARTIFACTS_DIR, artifactId))).isDirectory()).toBe(
      true,
    );
  });

  test('reads one file of a held artifact', async () => {
    const {store, artifactId, files} = await populated();
    expect(await store.readArtifactFile(artifactId, 'catalog.json')).toEqual(
      files.get('catalog.json'),
    );
    expect(await store.readArtifactFile(artifactId, 'nope.json')).toBeUndefined();
  });

  test('an entry that does not validate refuses the boot, naming its path', async () => {
    await populated();
    const path = join(stateDir, PUBLIC_DIR, APPS_DIR, 'shop', ENTRY_FILE);
    await writeFile(path, '{"appId": "shop"}');
    await expect(new MarketplaceStore(stateDir).load()).rejects.toThrow(path);
  });

  test('an entry whose directory is not its app id refuses the boot', async () => {
    const {entry} = await populated();
    const dir = join(stateDir, PUBLIC_DIR, APPS_DIR, 'other');
    await mkdir(dir);
    await writeFile(join(dir, ENTRY_FILE), JSON.stringify(entry));
    await writeFile(join(dir, PREVIEW_FILE), JSON.stringify(previewFor('shop', '0.1.0', CAT)));
    await expect(new MarketplaceStore(stateDir).load()).rejects.toThrow(join(dir, ENTRY_FILE));
  });

  test('an entry without its preview refuses the boot, naming the preview', async () => {
    await populated();
    const path = join(stateDir, PUBLIC_DIR, APPS_DIR, 'shop', PREVIEW_FILE);
    await rm(path);
    await expect(new MarketplaceStore(stateDir).load()).rejects.toThrow(path);
  });

  test('an artifact whose file changed under its hash refuses the boot, naming the directory', async () => {
    const {artifactId} = await populated();
    const dir = join(stateDir, PUBLIC_DIR, ARTIFACTS_DIR, artifactId);
    await writeFile(join(dir, 'index.js'), encode('changed'));
    await expect(new MarketplaceStore(stateDir).load()).rejects.toThrow(dir);
  });

  test('a publishers file that is not one refuses the boot', async () => {
    await populated();
    await writeFile(join(stateDir, PUBLISHERS_FILE), '{"publishers": [{"name": 1}]}');
    await expect(new MarketplaceStore(stateDir).load()).rejects.toThrow(
      join(stateDir, PUBLISHERS_FILE),
    );
  });

  test('an artifact named by an entry but missing refuses the boot', async () => {
    const {artifactId} = await populated();
    await rm(join(stateDir, PUBLIC_DIR, ARTIFACTS_DIR, artifactId), {recursive: true});
    await expect(new MarketplaceStore(stateDir).load()).rejects.toThrow(artifactId);
    expect(ARTIFACT_DESCRIPTOR_FILE).toBe('artifact.json');
  });
});
