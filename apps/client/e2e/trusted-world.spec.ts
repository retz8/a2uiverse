/**
 * The fixed world as the preview server serves it (task-14.10 decisions 14, 15), held to the sdk's
 * own checks: every entry, sample and update state well formed; each build the snapshot's; six
 * apps installed in six different states, one left for the Store to install; the publisher signed
 * in with one listing ahead of the Store.
 */
import {test, expect, type APIRequestContext} from '@playwright/test';
import {
  readUpdateState,
  validateIndexEntry,
  validatePreview,
  type IndexEntry,
  type UpdateState,
} from '@a2uiverse/sdk';

const read = async <T>(request: APIRequestContext, path: string): Promise<T> => {
  const response = await request.get(path);
  expect(response.ok(), path).toBe(true);
  return (await response.json()) as T;
};

test('the world is legal: entries, samples and states as the sdk reads them, the builds the snapshot’s', async ({
  request,
}) => {
  const table = await read<{catalogId: string; artifact?: string}[]>(
    request,
    '/registry/catalogs.json',
  );
  const builds = new Map(
    table.flatMap(row => (row.artifact ? [[row.catalogId, row.artifact]] : [])),
  );
  const index = await read<{entry: IndexEntry; installed: boolean; update?: UpdateState}[]>(
    request,
    '/marketplace/index.json',
  );
  const installed = await read<{id: string; card: {version: string}; source: string}[]>(
    request,
    '/registry/apps.json',
  );
  const updates = await read<UpdateState[]>(request, '/registry/updates.json');

  expect(index).toHaveLength(7);
  for (const {entry, installed: isInstalled, update} of index) {
    expect(validateIndexEntry(entry), entry.appId).toMatchObject({ok: true});
    for (const [catalogId, artifact] of Object.entries(entry.catalogs)) {
      expect(builds.get(catalogId), catalogId).toBe(artifact);
    }
    const preview = await read<unknown>(request, `/marketplace/apps/${entry.appId}/preview.json`);
    expect(validatePreview(preview), entry.appId).toMatchObject({ok: true});
    expect(await read(request, `/marketplace/apps/${entry.appId}/entry.json`)).toEqual({
      entry,
      installed: isInstalled,
      ...(update ? {update} : {}),
    });
    expect(isInstalled).toBe(installed.some(app => app.id === entry.appId));
  }
  expect(index.filter(l => !l.installed).map(l => l.entry.appId)).toEqual(['linear']);
  expect(index.filter(l => l.entry.aheadOfStore).map(l => l.entry.appId)).toEqual(['shop-a']);

  expect(updates.map(s => s.appId)).toEqual(installed.map(app => app.id));
  for (const state of updates) {
    expect(readUpdateState(state), state.appId).toEqual(state);
    const {entry, update} = index.find(l => l.entry.appId === state.appId)!;
    expect(update).toEqual(state);
    expect(state.installedVersion).toBe(installed.find(a => a.id === state.appId)!.card.version);
    if ('publishedVersion' in state) expect(state.publishedVersion).toBe(entry.card.version);
    if ('builds' in state) {
      for (const move of state.builds) expect(move.published).toBe(entry.catalogs[move.catalogId]);
    }
  }
  expect(new Set(updates.map(s => s.state)).size).toBe(updates.length);

  expect(await read(request, '/marketplace/publisher.json')).toEqual({
    state: 'signed-in',
    publisher: 'a2uiverse-apps',
    store: 'accepted',
  });
});
