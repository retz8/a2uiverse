/**
 * The slot's Install, Update and Show it here (task 15.9): the consent card where it asks, the
 * install on `orchestratorApi`, then the press that fills the slot — `useApp` on an offer, the
 * slot's Retry on an update tile.
 */
import {describe, expect, it, vi} from 'vitest';
import type {CompositionOperation, IndexEntry} from '@a2uiverse/sdk';
import type {AppActRequest, SlotUpdate} from '@a2uiverse/shell-catalog';
import type {InstallAnswer, InstalledApp, StoreListing, StoreRead} from '../orchestratorApi';
import {appActOf, createCanvasStore} from './canvasStore';
import {createInstalledApps} from './installedApps';
import {createSlotActs, slotActState, type SlotActsOptions} from './slotActs';
import {createTrailStore} from './trail/trailStore';

const GAP = 'camera prices';
const entry = (appId: string, name: string) =>
  ({
    appId,
    publisher: 'northlight',
    card: {name, description: `${name}.`, version: '2.0.0'},
  }) as unknown as IndexEntry;
const listing = (appId: string, name: string, installed = false): StoreRead<StoreListing> => ({
  ok: true,
  value: {entry: entry(appId, name), installed},
});
const installedApp = (id: string, name: string, version: string) =>
  ({id, card: {name, version}}) as InstalledApp;

/** The offer slot's components on the shell surface, as `fillFromPage` reads them. */
function shellSurface(props: Record<string, unknown>) {
  return {
    componentsModel: {
      get: (id: string) => (id === 'gap-slot' ? {id, type: 'Slot', properties: props} : undefined),
    },
  };
}

function runtime(id = 'a', slotProps?: Record<string, unknown>) {
  const store = createCanvasStore();
  const pressed: CompositionOperation[] = [];
  return {
    id,
    store,
    pressed,
    press: vi.fn(async (operation: CompositionOperation) => {
      pressed.push(operation);
      store.addPress(operation);
    }),
    processor: {
      model: {
        getSurface: (surfaceId: string) =>
          surfaceId === 'shell:main' && slotProps ? shellSurface(slotProps) : undefined,
      },
    },
  };
}

function setup({
  answer = {ok: true, appId: 'shop-b', replaced: false, followed: []},
  read = listing('shop-b', 'Shop B'),
  registry = [installedApp('shop-b', 'Shop B', '2.0.0')],
  canvas = runtime(),
}: {
  answer?: InstallAnswer;
  read?: StoreRead<StoreListing>;
  registry?: InstalledApp[];
  canvas?: ReturnType<typeof runtime>;
} = {}) {
  const trail = createTrailStore();
  trail.open({id: canvas.id, question: 'compare', askedAt: 1});
  const apps = createInstalledApps({read: async () => registry});
  const install = vi.fn(async () => answer);
  const readEntry = vi.fn(async () => read);
  const refreshCatalogs = vi.fn();
  const runtimes = new Map([[canvas.id, canvas]]);
  const options: SlotActsOptions = {
    apps,
    trail,
    runtimeOf: id => runtimes.get(id) as never,
    install,
    readEntry,
    refreshCatalogs,
  };
  const acts = createSlotActs(options);
  return {acts, apps, trail, canvas, install, readEntry, refreshCatalogs, runtimes};
}

const button = () => document.createElement('button');
const installPress = (appId = 'shop-b'): AppActRequest => ({
  kind: 'install',
  appId,
  gap: GAP,
  surfaceId: 'shell:main',
  componentId: 'gap-slot',
  anchor: button(),
});
const updatePress = (kind: 'update' | 'show' = 'update'): AppActRequest => ({
  kind,
  appId: 'shop-b',
  source: 'shop-b',
  surfaceId: 'shell:main',
  componentId: 'shop-b',
  anchor: button(),
});
const flush = () => new Promise(resolve => setTimeout(resolve, 0));

describe('Install on an offer', () => {
  it('reads the app’s entry again, holding the press and the app, then asks on the consent card', async () => {
    const {acts, apps, canvas, readEntry} = setup();
    const press = installPress();
    acts.onAppAct(press);
    expect(appActOf(canvas.store.getState(), {gap: GAP})).toEqual({
      appId: 'shop-b',
      status: 'asking',
    });
    expect(apps.getState().held.has('shop-b')).toBe(true);
    await flush();
    expect(readEntry).toHaveBeenCalledWith('shop-b');
    expect(acts.getState()).toMatchObject({
      canvas: 'a',
      ask: {kind: 'install', entry: {appId: 'shop-b'}},
      anchor: press.anchor,
    });
  });

  it('confirmed: installs, reads the installed apps and the catalog table again, then fills the slot with useApp', async () => {
    const {acts, apps, canvas, install, refreshCatalogs} = setup();
    acts.onAppAct(installPress());
    await flush();
    acts.confirm();
    expect(acts.getState()).toBeNull();
    expect(appActOf(canvas.store.getState(), {gap: GAP})?.status).toBe('running');
    await flush();
    expect(install).toHaveBeenCalledWith('shop-b');
    expect(refreshCatalogs).toHaveBeenCalledOnce();
    expect(apps.getState().versions.get('shop-b')).toBe('2.0.0');
    expect(canvas.pressed).toEqual([{kind: 'useApp', sources: ['shop-b'], gap: GAP}]);
    expect(appActOf(canvas.store.getState(), {gap: GAP})).toBeUndefined();
    expect(apps.getState().held.has('shop-b')).toBe(false);
  });

  it('refused: says why on its row, in the Store’s cause; nothing pressed; the app let go', async () => {
    const {acts, apps, canvas} = setup({answer: {ok: false, cause: 'store-behind'}});
    acts.onAppAct(installPress());
    await flush();
    acts.confirm();
    await flush();
    expect(appActOf(canvas.store.getState(), {gap: GAP})).toEqual({
      appId: 'shop-b',
      status: 'refused',
      cause: 'store-behind',
    });
    expect(canvas.pressed).toEqual([]);
    expect(apps.getState().held.has('shop-b')).toBe(false);
  });

  it('cancelled: the row as it was, the app let go, nothing installed', async () => {
    const {acts, apps, canvas, install} = setup();
    acts.onAppAct(installPress());
    await flush();
    acts.cancel();
    expect(acts.getState()).toBeNull();
    expect(appActOf(canvas.store.getState(), {gap: GAP})).toBeUndefined();
    expect(apps.getState().held.has('shop-b')).toBe(false);
    expect(install).not.toHaveBeenCalled();
  });

  it('an entry that cannot be read is refused on the row as the Store unreached, no card (task-15.9 decision 7)', async () => {
    const {acts, apps, canvas} = setup({read: {ok: false, reason: 'unreached'}});
    acts.onAppAct(installPress());
    await flush();
    expect(acts.getState()).toBeNull();
    expect(appActOf(canvas.store.getState(), {gap: GAP})).toMatchObject({
      status: 'refused',
      cause: 'store-unreached',
    });
    expect(apps.getState().held.has('shop-b')).toBe(false);
  });

  it('an app installed outside the page fills the slot with no card (task-15.4 decision 14)', async () => {
    const {acts, apps, canvas, install} = setup({read: listing('shop-b', 'Shop B', true)});
    acts.onAppAct(installPress());
    await flush();
    expect(acts.getState()).toBeNull();
    expect(install).not.toHaveBeenCalled();
    expect(apps.getState().versions.get('shop-b')).toBe('2.0.0');
    expect(canvas.pressed).toEqual([{kind: 'useApp', sources: ['shop-b'], gap: GAP}]);
  });

  it('a press on an app already held anywhere does nothing (task-15.9 decision 1)', async () => {
    const {acts, apps, readEntry} = setup();
    apps.hold('shop-b');
    acts.onAppAct(installPress());
    await flush();
    expect(readEntry).not.toHaveBeenCalled();
    expect(acts.getState()).toBeNull();
  });

  it('Try again, after a refusal the Store answers with it, installs with no second card', async () => {
    const {acts, canvas, install, readEntry} = setup();
    canvas.store.setAppAct(
      {gap: GAP},
      {appId: 'shop-b', status: 'refused', cause: 'app-unreached'},
    );
    acts.onAppAct(installPress());
    await flush();
    expect(readEntry).not.toHaveBeenCalled();
    expect(install).toHaveBeenCalledWith('shop-b');
    expect(canvas.pressed).toEqual([{kind: 'useApp', sources: ['shop-b'], gap: GAP}]);
  });

  it('the apps that followed it onto a new build are named in that canvas’s notice line, in the Store’s words (task-15.9 decision 4)', async () => {
    const {acts, canvas} = setup({
      answer: {ok: true, appId: 'shop-b', replaced: false, followed: ['shop-a']},
      registry: [
        installedApp('shop-b', 'Shop B', '2.0.0'),
        installedApp('shop-a', 'Shop A', '1.1.0'),
      ],
    });
    acts.onAppAct(installPress());
    await flush();
    acts.confirm();
    await flush();
    expect(canvas.store.getState().notices.map(notice => notice.text)).toEqual([
      'Shop B is installed. Also updated along with it: Shop A.',
    ]);
  });

  it('says nothing in the notice line when no app followed it', async () => {
    const {acts, canvas} = setup();
    acts.onAppAct(installPress());
    await flush();
    acts.confirm();
    await flush();
    expect(canvas.store.getState().notices).toEqual([]);
  });
});

describe('Update on an update tile', () => {
  const NEEDS: SlotUpdate = {
    state: 'major-update',
    installedVersion: '1.0.0',
    publishedVersion: '2.0.0',
    newScopes: [],
    publisher: 'northlight',
  };
  const onUpdate = (update: SlotUpdate = NEEDS) => {
    const canvas = runtime();
    canvas.store.mergeSlotStates(new Map([['shop-b', 'update' as const]]));
    canvas.store.mergeUpdates(new Map([['shop-b', update]]));
    return canvas;
  };

  it('an update asking nothing new goes straight through, then the slot’s Retry', async () => {
    const canvas = onUpdate();
    const {acts, install, readEntry} = setup({canvas});
    acts.onAppAct(updatePress());
    expect(appActOf(canvas.store.getState(), {source: 'shop-b'})?.status).toBe('running');
    await flush();
    expect(readEntry).not.toHaveBeenCalled();
    expect(install).toHaveBeenCalledWith('shop-b');
    expect(canvas.pressed).toEqual([{kind: 'retry', sources: ['shop-b']}]);
  });

  it('an update that asks for more reads the entry again and asks on the consent card, with only what is new', async () => {
    const newScopes = [{scheme: 'oauth', scopes: ['write']}];
    const canvas = onUpdate({...NEEDS, newScopes});
    const {acts} = setup({canvas});
    acts.onAppAct(updatePress());
    expect(appActOf(canvas.store.getState(), {source: 'shop-b'})?.status).toBe('asking');
    await flush();
    expect(acts.getState()?.ask).toMatchObject({
      kind: 'update',
      entry: {appId: 'shop-b'},
      news: {newScopes, newLook: false},
    });
  });

  it('a refused update remembers the version the app was installed at, so it gives way once updated elsewhere', async () => {
    const canvas = onUpdate();
    const {acts, apps} = setup({canvas, answer: {ok: false, cause: 'app-unreached'}});
    await apps.read();
    acts.onAppAct(updatePress());
    await flush();
    expect(appActOf(canvas.store.getState(), {source: 'shop-b'})).toEqual({
      appId: 'shop-b',
      status: 'refused',
      cause: 'app-unreached',
      version: '2.0.0',
    });
  });

  it('the update’s notice names the apps that followed it as updated', async () => {
    const canvas = onUpdate();
    const {acts} = setup({
      canvas,
      answer: {ok: true, appId: 'shop-b', replaced: true, followed: ['shop-a']},
      registry: [
        installedApp('shop-b', 'Shop B', '2.0.0'),
        installedApp('shop-a', 'Shop A', '1.1.0'),
      ],
    });
    acts.onAppAct(updatePress());
    await flush();
    expect(canvas.store.getState().notices.map(notice => notice.text)).toEqual([
      'Shop B is updated. Also updated along with it: Shop A.',
    ]);
  });
});

describe('Show it here', () => {
  it('on an offer is useApp, with no install and no card', () => {
    const {acts, canvas, install} = setup();
    acts.onAppAct({...installPress(), kind: 'show'});
    expect(install).not.toHaveBeenCalled();
    expect(canvas.pressed).toEqual([{kind: 'useApp', sources: ['shop-b'], gap: GAP}]);
  });

  it('on an update tile is the slot’s Retry', () => {
    const {acts, canvas} = setup();
    acts.onAppAct(updatePress('show'));
    expect(canvas.pressed).toEqual([{kind: 'retry', sources: ['shop-b']}]);
  });
});

describe('leaving the canvas', () => {
  it('another canvas on screen cancels the card', async () => {
    const {acts, apps, trail} = setup();
    acts.onAppAct(installPress());
    await flush();
    trail.open({id: 'b', question: 'next', askedAt: 2});
    expect(acts.getState()).toBeNull();
    expect(apps.getState().held.has('shop-b')).toBe(false);
  });

  it('the trusted page opening cancels the card', async () => {
    const {acts, trail} = setup();
    acts.onAppAct(installPress());
    await flush();
    trail.openTrustedPage({page: 'appLibrary'});
    expect(acts.getState()).toBeNull();
  });

  it('a read landing after the person left asks nothing', async () => {
    const {acts, apps, trail} = setup();
    acts.onAppAct(installPress());
    trail.openTrustedPage({page: 'store'});
    await flush();
    expect(acts.getState()).toBeNull();
    expect(apps.getState().held.has('shop-b')).toBe(false);
  });
});

describe('an install on the Store page opened from a slot (task-15.9 decision 3)', () => {
  const OFFER = {
    gap: GAP,
    offer: {apps: [{appId: 'shop-b', name: 'Shop B', publisher: 'northlight', description: ''}]},
  };
  const tie = {canvas: 'a', surfaceId: 'shell:main', componentId: 'gap-slot', gap: GAP};

  it('fills that slot when it offered the app and is still an offer, once', () => {
    const {acts, trail, canvas} = setup({canvas: runtime('a', OFFER)});
    trail.openTrustedPage({page: 'store', query: GAP}, tie);
    expect(acts.fillFromPage('shop-b')).toBe(true);
    expect(canvas.pressed).toEqual([{kind: 'useApp', sources: ['shop-b'], gap: GAP}]);
    expect(trail.getState().openedFrom).toBeNull();
    expect(acts.fillFromPage('shop-b')).toBe(false);
  });

  it('an app the slot did not offer leaves it as it is, the tie kept', () => {
    const {acts, trail, canvas} = setup({canvas: runtime('a', OFFER)});
    trail.openTrustedPage({page: 'store', query: GAP}, tie);
    expect(acts.fillFromPage('shop-c')).toBe(false);
    expect(canvas.pressed).toEqual([]);
    expect(trail.getState().openedFrom).toEqual(tie);
  });

  it('a slot no longer an offer is not filled', () => {
    const {acts, trail, canvas} = setup({
      canvas: runtime('a', {source: 'shop-b', offered: {gap: GAP, apps: [], appId: 'shop-b'}}),
    });
    trail.openTrustedPage({page: 'store', query: GAP}, tie);
    expect(acts.fillFromPage('shop-b')).toBe(false);
    expect(canvas.pressed).toEqual([]);
  });

  it('a page opened from no slot fills nothing', () => {
    const {acts, trail} = setup({canvas: runtime('a', OFFER)});
    trail.openTrustedPage({page: 'store'});
    expect(acts.fillFromPage('shop-b')).toBe(false);
  });
});

describe('the slot a shell action opens the Store from', () => {
  it('an offer with apps ties the page to it; any other slot, or none, does not', () => {
    const OFFER = {
      gap: GAP,
      offer: {apps: [{appId: 'shop-b', name: 'Shop B', publisher: 'northlight', description: ''}]},
    };
    const {acts} = setup({canvas: runtime('a', OFFER)});
    expect(
      acts.originOf({
        name: 'openStore',
        surfaceId: 'shell:main',
        componentId: 'gap-slot',
        query: GAP,
      }),
    ).toEqual({canvas: 'a', surfaceId: 'shell:main', componentId: 'gap-slot', gap: GAP});
    expect(acts.originOf({name: 'openStore', surfaceId: 'shell:main', query: GAP})).toBeUndefined();
    const nothing = setup({canvas: runtime('a', {gap: GAP, offer: {apps: [], none: 'nothing'}})});
    expect(
      nothing.acts.originOf({
        name: 'openStore',
        surfaceId: 'shell:main',
        componentId: 'gap-slot',
        query: GAP,
      }),
    ).toBeUndefined();
  });
});

describe('what the shell catalog reads of the slots’ presses (task 15.9)', () => {
  const holds = (versions: Record<string, string>, held: string[] = []) => ({
    versions: new Map(Object.entries(versions)),
    names: new Map<string, string>(),
    held: new Set(held),
  });

  it('a refusal stays on its slot while the app stands where it was refused', () => {
    const store = createCanvasStore();
    store.setAppAct(
      {source: 'shop-b'},
      {appId: 'shop-b', status: 'refused', cause: 'app-unreached', version: '1.0.0'},
    );
    const acts = slotActState(store.getState(), holds({'shop-b': '1.0.0'}));
    expect(acts.act({source: 'shop-b'})).toMatchObject({status: 'refused'});
  });

  it('a refusal gives way once the app is installed or updated elsewhere (decision 5)', () => {
    const store = createCanvasStore();
    store.setAppAct(
      {source: 'shop-b'},
      {appId: 'shop-b', status: 'refused', cause: 'app-unreached', version: '1.0.0'},
    );
    store.setAppAct({gap: GAP}, {appId: 'shop-c', status: 'refused', cause: 'store-behind'});
    const acts = slotActState(store.getState(), holds({'shop-b': '2.0.0', 'shop-c': '1.0.0'}));
    expect(acts.act({source: 'shop-b'})).toBeUndefined();
    expect(acts.act({gap: GAP})).toBeUndefined();
  });

  it('reads the installed versions and the apps held', () => {
    const acts = slotActState(
      createCanvasStore().getState(),
      holds({'shop-b': '2.0.0'}, ['shop-a']),
    );
    expect(acts.installed('shop-b')).toBe('2.0.0');
    expect(acts.installed('shop-a')).toBeUndefined();
    expect(acts.busy('shop-a')).toBe(true);
    expect(acts.busy('shop-b')).toBe(false);
  });
});
