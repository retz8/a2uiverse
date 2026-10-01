/**
 * The catalog gate (task-11.5 decisions 1, 2, 4): a batch whose catalogs are held passes at once;
 * one that creates a surface in a catalog not held waits for its load, and everything after it
 * waits behind it, in order; a catalog that fails to load takes its fragment's messages with it
 * and is reported, and a fresh create of the surface tries again.
 */
import {describe, expect, it, vi} from 'vitest';
import type {A2uiMessage} from '@a2ui/web_core/v0_9';
import type {CompositionStamp} from '@a2uiverse/sdk';
import {createCatalogGate, type CatalogLoadFailure} from './catalogGate';

const msg = (m: Record<string, unknown>): A2uiMessage =>
  ({version: 'v0.9', ...m}) as unknown as A2uiMessage;
const create = (surfaceId: string, catalogId: string) =>
  msg({createSurface: {surfaceId, catalogId}});
const update = (surfaceId: string) =>
  msg({updateComponents: {surfaceId, components: [{id: 'root', component: 'Text', text: 'hi'}]}});
const GMAIL: CompositionStamp = {source: 'gmail', role: 'fragment'};

/** A gate over a held set, its loads answered by hand. */
function gateOver(held: string[]) {
  const holding = new Set(held);
  const pending = new Map<string, {resolve: () => void; reject: (err: Error) => void}>();
  const load = vi.fn(
    (catalogId: string) =>
      new Promise<void>((resolve, reject) => {
        pending.set(catalogId, {
          resolve: () => {
            holding.add(catalogId);
            resolve();
          },
          reject,
        });
      }),
  );
  const failures: CatalogLoadFailure[] = [];
  const gate = createCatalogGate({
    has: catalogId => holding.has(catalogId),
    load,
    onLoadFailure: failure => failures.push(failure),
  });
  const delivered: unknown[] = [];
  const deliver = (messages: A2uiMessage[], stamp?: CompositionStamp) =>
    delivered.push({messages, stamp});
  return {gate, load, pending, failures, delivered, deliver};
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
