/**
 * The catalog gate (task-11.5 decisions 1, 2, 4): a batch whose builds are held passes at once;
 * one that creates a surface in a build not held waits for its load, and everything after it
 * waits behind it, in order; a catalog that fails to load takes its fragment's messages with it
 * and is reported, and a fresh create of the surface tries again. Each create is drawn in the
 * build the stamp names, else the table's, and a change to a surface's components is assigned the
 * build its catalog is named, a move whose build fails to load staying put (task-15.6 decisions 2
 * to 5).
 */
import {describe, expect, it, vi} from 'vitest';
import type {A2uiMessage} from '@a2ui/web_core/v0_9';
import type {CompositionStamp} from '@a2uiverse/sdk';
import {createCatalogGate, type CatalogLoadFailure} from './catalogGate';
import type {ResolvedCatalog} from './clientCatalogs';
import {createPaintBuilds} from './paintBuilds';

const msg = (m: Record<string, unknown>): A2uiMessage =>
  ({version: 'v0.9', ...m}) as unknown as A2uiMessage;
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
  const deliver = (messages: A2uiMessage[], stamp?: CompositionStamp) =>
    delivered.push({messages, stamp});
  const drawnIn = (message: A2uiMessage) => book.of(message)?.build;
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
    expect(delivered.map(d => (d as {messages: A2uiMessage[]}).messages.length)).toEqual([1, 1]);
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
    expect((delivered.at(-1) as {messages: A2uiMessage[]}).messages).toHaveLength(2);
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
