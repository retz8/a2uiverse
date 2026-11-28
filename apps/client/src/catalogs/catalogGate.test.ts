/**
 * The catalog gate (task-11.5 decisions 1, 2, 4; task-21.14 decisions 3 to 6): a batch whose
 * builds are held passes at once; one that names a catalog not held — where it creates a surface,
 * in a component's `@catalogId`, in a function call — waits for its load, and everything after it
 * waits behind it, in order; a catalog a surface's components need that fails to load takes its
 * fragment's messages with it and is reported, and a fresh create of the surface tries again; a
 * call whose catalog fails is delivered for the release to answer. Each catalog is drawn in the
 * build the stamp names, else the table's, and a change to a surface's components is assigned the
 * build its catalog is named, a move whose build fails to load staying put (task-15.6 decisions 2
 * to 5).
 */
import {describe, expect, it, vi} from 'vitest';
import type {AgentToRendererMessage} from '@a2ui/web_core/v1_0';
import type {CompositionStamp} from '@a2uiverse/sdk';
import {createCatalogGate, type CatalogLoadFailure} from './catalogGate';
import type {ResolvedCatalog} from './clientCatalogs';
import {createPaintBuilds} from './paintBuilds';

const msg = (m: Record<string, unknown>): AgentToRendererMessage =>
  ({version: '1.0', ...m}) as unknown as AgentToRendererMessage;
const create = (surfaceId: string, catalogId: string) =>
  msg({createSurface: {surfaceId, catalogId}});
const update = (surfaceId: string) =>
  msg({updateComponents: {surfaceId, components: [{id: 'root', component: 'Text', text: 'hi'}]}});
const GMAIL: CompositionStamp = {source: 'gmail', role: 'fragment'};

/** A build's key: the catalog id alone for the table's, `id@artifact` for one a stamp names. */
const keyOf = (catalogId: string, named?: string) => (named ? `${catalogId}@${named}` : catalogId);

/** A gate over held builds, its loads answered by hand. */
function gateOver(held: string[]) {
  const holding = new Set(held);
  const builds = new Map<string, ResolvedCatalog>();
  const buildFor = (key: string) => {
    if (!builds.has(key)) builds.set(key, {id: key.split('@')[0]!, build: key} as ResolvedCatalog);
    return builds.get(key)!;
  };
  const pending = new Map<string, {resolve: () => void; reject: (err: Error) => void}>();
  const load = vi.fn(
    (catalogId: string, named?: string) =>
      new Promise<ResolvedCatalog>((resolve, reject) => {
        const key = keyOf(catalogId, named);
        pending.set(key, {
          resolve: () => {
            holding.add(key);
            resolve(buildFor(key));
          },
          reject,
        });
      }),
  );
  const failures: CatalogLoadFailure[] = [];
  const book = createPaintBuilds(() => undefined);
  const gate = createCatalogGate({
    builds: {
      held: (catalogId, named) => {
        const key = keyOf(catalogId, named);
        return holding.has(key) ? buildFor(key) : undefined;
      },
      load,
    },
    book,
    onLoadFailure: failure => failures.push(failure),
  });
  const delivered: unknown[] = [];
  const deliver = (messages: AgentToRendererMessage[], stamp?: CompositionStamp) =>
    delivered.push({messages, stamp});
  const drawnIn = (message: AgentToRendererMessage) =>
    book
      .of(message)
      ?.map(b => b.build)
      .join(' ');
  return {gate, load, pending, failures, delivered, deliver, drawnIn};
}

const flush = () => new Promise(resolve => setTimeout(resolve, 0));

describe('the catalog gate', () => {
  it('passes a batch in held catalogs at once', () => {
    const {gate, delivered, deliver, load} = gateOver(['urn:shell']);
    gate.apply(deliver, [create('shell:main', 'urn:shell')]);
    expect(delivered).toHaveLength(1);
    expect(load).not.toHaveBeenCalled();
  });

  it('holds a batch whose catalog is loading, and everything after it, in order', async () => {
    const {gate, delivered, deliver, pending} = gateOver(['urn:shell']);
    const steps: string[] = [];
    gate.apply(deliver, [create('gmail:inbox', 'urn:gmail')], GMAIL);
    gate.run(() => steps.push('meta'));
    gate.apply(deliver, [update('shell:main')]);
    gate.run(() => steps.push('end'));
    await flush();
    expect(delivered).toHaveLength(0);
    expect(steps).toEqual([]);
    pending.get('urn:gmail')!.resolve();
    await flush();
    expect(delivered.map(d => (d as {messages: AgentToRendererMessage[]}).messages.length)).toEqual(
      [1, 1],
    );
    expect(steps).toEqual(['meta', 'end']);
    // Idle again: a held catalog passes at once.
    gate.apply(deliver, [update('gmail:inbox')], GMAIL);
    expect(delivered).toHaveLength(3);
  });

  it('drops a fragment whose catalog fails, reports it, and keeps the rest of the batch', async () => {
    const {gate, delivered, deliver, pending, failures} = gateOver(['urn:shell']);
    gate.apply(deliver, [create('gmail:inbox', 'urn:gmail'), update('gmail:inbox')], GMAIL);
    gate.apply(deliver, [update('gmail:inbox'), update('shell:main')]);
    pending.get('urn:gmail')!.reject(new Error('the entry threw'));
    await flush();
    expect(failures).toEqual([
      {surfaceId: 'gmail:inbox', catalogId: 'urn:gmail', message: 'the entry threw', stamp: GMAIL},
    ]);
    // The failed surface's messages are gone; the stamp still reaches the runner, settled or not.
    expect(delivered).toEqual([
      {messages: [], stamp: GMAIL},
      {messages: [update('shell:main')], stamp: undefined},
    ]);
  });

  it('loads again for a fresh create of a surface whose catalog failed — a Retry’s answer', async () => {
    const {gate, delivered, deliver, pending, load} = gateOver([]);
    gate.apply(deliver, [create('gmail:inbox', 'urn:gmail')], GMAIL);
    pending.get('urn:gmail')!.reject(new Error('blip'));
    await flush();
    gate.apply(deliver, [create('gmail:inbox', 'urn:gmail'), update('gmail:inbox')], GMAIL);
    pending.get('urn:gmail')!.resolve();
    await flush();
    expect(load).toHaveBeenCalledTimes(2);
    expect((delivered.at(-1) as {messages: AgentToRendererMessage[]}).messages).toHaveLength(2);
  });
});

describe('the build each message is drawn in (task 15.6)', () => {
  const named = (build: string): CompositionStamp => ({...GMAIL, builds: {'urn:gmail': build}});

  it('draws a create in the build the stamp names, loading it first', async () => {
    const {gate, delivered, deliver, pending, load, drawnIn} = gateOver(['urn:gmail']);
    const created = create('gmail:inbox', 'urn:gmail');
    gate.apply(deliver, [created], named('sha256-new'));
    expect(load).toHaveBeenCalledWith('urn:gmail', 'sha256-new');
    expect(delivered).toHaveLength(0);
    pending.get('urn:gmail@sha256-new')!.resolve();
    await flush();
    expect(delivered).toHaveLength(1);
    expect(drawnIn(created)).toBe('urn:gmail@sha256-new');
  });

  it('draws a create the stamp names no build for in the table’s', () => {
    const {gate, delivered, deliver, load, drawnIn} = gateOver(['urn:gmail']);
    const created = create('gmail:inbox', 'urn:gmail');
    gate.apply(deliver, [created], GMAIL);
    expect(load).not.toHaveBeenCalled();
    expect(delivered).toHaveLength(1);
    expect(drawnIn(created)).toBe('urn:gmail');
  });

  it('assigns a change to a surface’s components the build its catalog is named, its data alone none', () => {
    const {gate, deliver, drawnIn} = gateOver([
      'urn:gmail',
      'urn:gmail@sha256-old',
      'urn:gmail@sha256-new',
    ]);
    gate.apply(deliver, [create('gmail:inbox', 'urn:gmail')], named('sha256-old'));
    const changed = update('gmail:inbox');
    const data = msg({updateDataModel: {surfaceId: 'gmail:inbox', path: '/', value: {}}});
    gate.apply(deliver, [changed, data], named('sha256-new'));
    expect(drawnIn(changed)).toBe('urn:gmail@sha256-new');
    expect(drawnIn(data)).toBeUndefined();
  });

  it('delivers a move whose build fails to load with no build, logged and not reported', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const {gate, delivered, deliver, pending, failures, drawnIn} = gateOver([
      'urn:gmail@sha256-old',
    ]);
    gate.apply(deliver, [create('gmail:inbox', 'urn:gmail')], named('sha256-old'));
    const changed = update('gmail:inbox');
    gate.apply(deliver, [changed], named('sha256-new'));
    pending.get('urn:gmail@sha256-new')!.reject(new Error('unreachable'));
    await flush();
    expect(delivered).toHaveLength(2);
    expect(drawnIn(changed)).toBeUndefined();
    expect(failures).toEqual([]);
    expect(warn).toHaveBeenCalled();
    warn.mockRestore();
  });

  it('assigns nothing to a change to a surface it never saw created', () => {
    const {gate, delivered, deliver, load, drawnIn} = gateOver([]);
    const changed = update('gmail:inbox');
    gate.apply(deliver, [changed], named('sha256-new'));
    expect(load).not.toHaveBeenCalled();
    expect(delivered).toHaveLength(1);
    expect(drawnIn(changed)).toBeUndefined();
  });
});

describe('a surface that mixes catalogs (task-21.14 decisions 3, 4)', () => {
  /** A change whose `note` is drawn in `catalogId`. */
  const naming = (surfaceId: string, catalogId: string) =>
    msg({
      updateComponents: {
        surfaceId,
        components: [
          {id: 'root', component: 'Column', children: ['note']},
          {id: 'note', component: 'Text', text: 'hi', '@catalogId': catalogId},
        ],
      },
    });

  it('draws a create whose own batch names a second catalog once, with both', async () => {
    const {gate, delivered, deliver, pending, load, drawnIn} = gateOver(['urn:gmail']);
    const created = create('gmail:inbox', 'urn:gmail');
    gate.apply(deliver, [created, naming('gmail:inbox', 'urn:basic-extra')], GMAIL);
    expect(load).toHaveBeenCalledExactlyOnceWith('urn:basic-extra', undefined);
    expect(delivered).toHaveLength(0);
    pending.get('urn:basic-extra')!.resolve();
    await flush();
    expect(delivered).toHaveLength(1);
    expect(drawnIn(created)).toBe('urn:gmail urn:basic-extra');
  });

  it('draws a create naming no default catalog in the catalogs its components name', async () => {
    const {gate, delivered, deliver, pending, drawnIn} = gateOver([]);
    const created = msg({
      createSurface: {
        surfaceId: 'gmail:inbox',
        components: [{id: 'root', component: 'Text', text: 'hi', '@catalogId': 'urn:gmail'}],
        dataModel: {},
      },
    });
    gate.apply(deliver, [created], GMAIL);
    pending.get('urn:gmail')!.resolve();
    await flush();
    expect(delivered).toHaveLength(1);
    expect(drawnIn(created)).toBe('urn:gmail');
  });

  it('loads a catalog a later batch first names on a surface on screen, assigning it to that change', async () => {
    const {gate, deliver, pending, load, drawnIn} = gateOver(['urn:gmail']);
    gate.apply(deliver, [create('gmail:inbox', 'urn:gmail')], GMAIL);
    const joined = naming('gmail:inbox', 'urn:calendar');
    gate.apply(deliver, [joined], GMAIL);
    expect(load).toHaveBeenCalledWith('urn:calendar', undefined);
    pending.get('urn:calendar')!.resolve();
    await flush();
    expect(drawnIn(joined)).toBe('urn:calendar');
    // Named again, it is the surface's own: nothing more to load or assign.
    const again = naming('gmail:inbox', 'urn:calendar');
    gate.apply(deliver, [again], GMAIL);
    expect(drawnIn(again)).toBeUndefined();
  });

  it('fails the fragment when a second catalog does not load: that batch and the surface’s later messages dropped, reported with that catalog', async () => {
    const {gate, delivered, deliver, pending, failures, load} = gateOver(['urn:gmail']);
    gate.apply(deliver, [create('gmail:inbox', 'urn:gmail')], GMAIL);
    gate.apply(deliver, [naming('gmail:inbox', 'urn:calendar')], GMAIL);
    gate.apply(deliver, [update('gmail:inbox'), update('shell:main')]);
    pending.get('urn:calendar')!.reject(new Error('the entry threw'));
    await flush();
    expect(failures).toEqual([
      {
        surfaceId: 'gmail:inbox',
        catalogId: 'urn:calendar',
        message: 'the entry threw',
        stamp: GMAIL,
      },
    ]);
    expect(delivered.slice(1)).toEqual([
      {messages: [], stamp: GMAIL},
      {messages: [update('shell:main')], stamp: undefined},
    ]);
    // A fresh create — a Retry's answer — loads it again.
    gate.apply(
      deliver,
      [create('gmail:inbox', 'urn:gmail'), naming('gmail:inbox', 'urn:calendar')],
      GMAIL,
    );
    expect(load).toHaveBeenCalledTimes(2);
    pending.get('urn:calendar')!.resolve();
    await flush();
    expect((delivered.at(-1) as {messages: AgentToRendererMessage[]}).messages).toHaveLength(2);
  });

  it('keeps a catalog the stamp names a build for on the surface where it was first used, a newer one a move', () => {
    const {gate, deliver, drawnIn} = gateOver([
      'urn:gmail',
      'urn:calendar@sha256-old',
      'urn:calendar@sha256-new',
    ]);
    const stamp = (build: string): CompositionStamp => ({
      ...GMAIL,
      builds: {'urn:calendar': build},
    });
    const created = create('gmail:inbox', 'urn:gmail');
    gate.apply(deliver, [created, naming('gmail:inbox', 'urn:calendar')], stamp('sha256-old'));
    expect(drawnIn(created)).toBe('urn:gmail urn:calendar@sha256-old');
    const moved = update('gmail:inbox');
    gate.apply(deliver, [moved], stamp('sha256-new'));
    expect(drawnIn(moved)).toBe('urn:calendar@sha256-new');
  });
});

describe('a renderer function call (task-21.14 decision 6)', () => {
  const call = (catalogId: string, surfaceId?: string) =>
    msg({
      callRendererFunction: {
        ...(surfaceId ? {surfaceId} : {}),
        functionCallId: 'gmail:1',
        callFunction: {'@call': 'now', catalogId, args: {}},
      },
    });

  it('waits behind a held batch, in its place', async () => {
    const {gate, delivered, deliver, pending} = gateOver(['urn:shell']);
    gate.apply(deliver, [create('gmail:inbox', 'urn:gmail')], GMAIL);
    const called = call('urn:shell', 'gmail:inbox');
    gate.apply(deliver, [called], GMAIL);
    expect(delivered).toHaveLength(0);
    pending.get('urn:gmail')!.resolve();
    await flush();
    expect(delivered).toEqual([
      {messages: [create('gmail:inbox', 'urn:gmail')], stamp: GMAIL},
      {messages: [called], stamp: GMAIL},
    ]);
  });

  it('loads its catalog first, and assigns it the call', async () => {
    const {gate, deliver, pending, drawnIn} = gateOver([]);
    const called = call('urn:gmail');
    gate.apply(deliver, [called], GMAIL);
    pending.get('urn:gmail')!.resolve();
    await flush();
    expect(drawnIn(called)).toBe('urn:gmail');
  });

  it('delivers a call whose catalog cannot load with no build, for the release to answer, the slot untouched', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const {gate, delivered, deliver, pending, failures, drawnIn} = gateOver([]);
    const called = call('urn:gmail', 'gmail:inbox');
    gate.apply(deliver, [called], GMAIL);
    pending.get('urn:gmail')!.reject(new Error('unreachable'));
    await flush();
    expect(delivered).toEqual([{messages: [called], stamp: GMAIL}]);
    expect(drawnIn(called)).toBeUndefined();
    expect(failures).toEqual([]);
    warn.mockRestore();
  });
});
