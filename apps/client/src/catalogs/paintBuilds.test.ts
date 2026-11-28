/**
 * The builds each paint is drawn in (task 15.6; task-21.14 decisions 3, 5): a create in the builds
 * assigned to it, a surface on screen keeping its own beside a newer one, moved only by a change to
 * its components assigned a build it does not hold — a newer one, or a catalog it draws in for the
 * first time — its tree and data carried over, no new paint; and a paint the way back returns to
 * restored with each component in its catalog and each catalog in the build it was drawn in.
 */
import {describe, expect, it, vi} from 'vitest';
import {Catalog, type AgentToRendererMessage} from '@a2ui/web_core/v1_0';
import {basicCatalog} from '@a2ui/web_core/catalogs/basic/v1';
import type {ReactCatalogComponent} from '@a2ui/react';
import {capturePaint} from '../canvas/history/paintCopy';
import {resolveCatalog} from './clientCatalogs';
import {BuildProcessor, createPaintBuilds} from './paintBuilds';

const DEMO = 'urn:catalog:demo';
const msg = (m: Record<string, unknown>): AgentToRendererMessage =>
  ({version: '1.0', ...m}) as unknown as AgentToRendererMessage;
const create = (surfaceId: string) => msg({createSurface: {surfaceId, catalogId: DEMO}});
const tree = (surfaceId: string, text: string) =>
  msg({
    updateComponents: {
      surfaceId,
      components: [
        {id: 'root', component: 'Text', text: {'@path': '/greeting'}},
        {id: 'note', component: 'Text', text},
      ],
    },
  });
const data = (surfaceId: string, greeting: string) =>
  msg({updateDataModel: {surfaceId, path: '/', value: {greeting}}});

/** A catalog of the basic catalog's components and functions under `id`. */
const catalogOf = (id: string) =>
  new Catalog<ReactCatalogComponent>(
    id,
    basicCatalog.protocolVersion,
    [...basicCatalog.components.values()],
    [...basicCatalog.functions.values()],
  );

const buildOf = (artifact: string) => resolveCatalog(catalogOf(DEMO), undefined, artifact);

/** A canvas whose processor starts holding `held`, the demo catalog's two builds loaded. */
function canvas(held: Catalog<ReactCatalogComponent>[] = []) {
  const first = buildOf('sha256-first');
  const second = buildOf('sha256-second');
  const loaded = new Map([first, second].map(b => [b.build!, b]));
  const book = createPaintBuilds(artifact => loaded.get(artifact));
  const processor = new BuildProcessor(held, book);
  /** Delivers messages the way the gate does: each one assigned its build. */
  const deliver = (build: typeof first | undefined, ...messages: AgentToRendererMessage[]) => {
    for (const message of messages) if (build) book.assign(message, [build]);
    processor.processMessages(messages);
  };
  return {first, second, book, processor, deliver};
}

describe('a paint drawn in its build', () => {
  it('draws each create in the build assigned to it, a surface on screen keeping its own', () => {
    const {first, second, processor, deliver} = canvas();
    deliver(first, create('a'), tree('a', 'one'));
    deliver(second, create('b'), tree('b', 'two'));
    expect(processor.model.getSurface('a')!.defaultCatalog).toBe(first.catalog);
    expect(processor.model.getSurface('b')!.defaultCatalog).toBe(second.catalog);
  });

  it('takes a catalog it does not hold through addCatalog, another build of it in that one’s place (task-16.7 decision 2)', () => {
    const {first, second, processor, deliver} = canvas();
    const added = vi.spyOn(processor, 'addCatalog');
    deliver(first, create('a'), tree('a', 'one'));
    expect(added).toHaveBeenCalledExactlyOnceWith(first.catalog);
    // `addCatalog` refuses an id the processor holds: the second build takes the first one's place.
    deliver(second, create('b'), tree('b', 'two'));
    expect(added).toHaveBeenCalledOnce();
    deliver(first, create('c'), tree('c', 'three'));
    expect(processor.model.getSurface('c')!.defaultCatalog).toBe(first.catalog);
    expect(processor.model.getSurface('b')!.defaultCatalog).toBe(second.catalog);
  });

  it('swaps a build in beside the other catalogs it holds and draws in it as loaded, the others held as they were', () => {
    const other = catalogOf('urn:catalog:other');
    const {first, second, processor, deliver} = canvas([other]);
    deliver(first, create('a'), tree('a', 'one'));
    deliver(second, create('b'), tree('b', 'two'));
    const held = processor.catalogs;
    expect(held).toHaveLength(2);
    expect(held[0]).toBe(other);
    expect(held[1]).toBe(second.catalog);
    const drawn = processor.model.getSurface('b')!;
    expect(drawn.defaultCatalog).toBe(second.catalog);
    expect(drawn.componentsModel.get('note')!.properties.text).toBe('two');
    expect(processor.model.getSurface('a')!.defaultCatalog).toBe(first.catalog);
  });

  it('moves a surface to the newer build a change to its components is assigned, its tree and data kept', () => {
    const {first, second, processor, deliver} = canvas();
    deliver(first, create('a'), tree('a', 'one'), data('a', 'hi'));
    const created = vi.fn();
    processor.onSurfaceCreated(created);
    deliver(
      second,
      msg({
        updateComponents: {
          surfaceId: 'a',
          components: [{id: 'note', component: 'Text', text: 'two'}],
        },
      }),
    );
    const moved = processor.model.getSurface('a')!;
    expect(moved.defaultCatalog).toBe(second.catalog);
    expect(moved.componentsModel.get('root')).toBeDefined();
    expect(moved.componentsModel.get('note')!.properties.text).toBe('two');
    expect(moved.dataModel.get('/greeting')).toBe('hi');
    expect(created).toHaveBeenCalledTimes(1);
  });

  it('leaves a surface where it is for a change assigned the build it already has, or none', () => {
    const {first, processor, deliver} = canvas();
    deliver(first, create('a'), tree('a', 'one'));
    const surface = processor.model.getSurface('a');
    const deleted = vi.fn();
    processor.onSurfaceDeleted(deleted);
    deliver(first, tree('a', 'again'));
    deliver(undefined, tree('a', 'once more'));
    expect(deleted).not.toHaveBeenCalled();
    expect(processor.model.getSurface('a')).toBe(surface);
    expect(surface!.componentsModel.get('note')!.properties.text).toBe('once more');
  });

  it('moves nothing on a change to the data alone', () => {
    const {first, second, processor, deliver} = canvas();
    deliver(first, create('a'), tree('a', 'one'));
    deliver(second, data('a', 'hi'));
    expect(processor.model.getSurface('a')!.defaultCatalog).toBe(first.catalog);
  });
});

describe('a paint the way back returns to', () => {
  it('is restored in the build it was drawn in, whatever was drawn since', () => {
    const {first, second, book, processor, deliver} = canvas();
    deliver(first, create('a'), tree('a', 'one'));
    const copy = capturePaint(processor, 'a')!;
    expect(copy.builds).toEqual({[DEMO]: 'sha256-first'});
    processor.model.deleteSurface('a');
    deliver(second, create('b'), tree('b', 'two'));
    processor.processMessages(book.rebuild(copy));
    expect(processor.model.getSurface('a')!.defaultCatalog).toBe(first.catalog);
  });

  it('a copy of a catalog the client provides names no build', () => {
    const processor = new BuildProcessor(
      [basicCatalog],
      createPaintBuilds(() => undefined),
    );
    processor.processMessages([
      msg({createSurface: {surfaceId: 'a', catalogId: basicCatalog.id}}),
      msg({
        updateComponents: {
          surfaceId: 'a',
          components: [{id: 'root', component: 'Text', text: 'hi'}],
        },
      }),
    ]);
    expect(capturePaint(processor, 'a')).not.toHaveProperty('builds');
  });
});

describe('a surface that mixes catalogs (task-21.14 decisions 3, 5)', () => {
  const OTHER = 'urn:catalog:other';
  const otherBuild = (artifact: string) => resolveCatalog(catalogOf(OTHER), undefined, artifact);
  /** A tree whose `note` is drawn in the other catalog. */
  const mixed = (surfaceId: string, text: string) =>
    msg({
      updateComponents: {
        surfaceId,
        components: [
          {id: 'root', component: 'Column', children: ['note']},
          {id: 'note', component: 'Text', text, '@catalogId': OTHER},
        ],
      },
    });

  function mixedCanvas() {
    const demo = buildOf('sha256-demo');
    const one = otherBuild('sha256-one');
    const two = otherBuild('sha256-two');
    const loaded = new Map([demo, one, two].map(b => [b.build!, b]));
    const book = createPaintBuilds(artifact => loaded.get(artifact));
    const processor = new BuildProcessor([], book);
    const deliver = (builds: typeof demo[], ...messages: AgentToRendererMessage[]) => {
      for (const message of messages) book.assign(message, builds);
      processor.processMessages(messages);
    };
    return {demo, one, two, book, processor, deliver};
  }

  it('draws a create with every catalog its batch names, each component in its own', () => {
    const {demo, one, processor, deliver} = mixedCanvas();
    deliver([demo, one], create('a'));
    deliver([], mixed('a', 'one'));
    const surface = processor.model.getSurface('a')!;
    expect(surface.defaultCatalog).toBe(demo.catalog);
    expect(surface.componentsModel.get('note')!.catalog).toBe(one.catalog);
    expect(surface.componentsModel.get('root')!.catalog).toBe(demo.catalog);
  });

  it('re-creates a surface in place when a later change first names a catalog, its data kept and no paint counted', () => {
    const {demo, one, processor, deliver} = mixedCanvas();
    deliver([demo], create('a'), tree('a', 'one'), data('a', 'hi'));
    const created = vi.fn();
    processor.onSurfaceCreated(created);
    deliver([one], mixed('a', 'joined'));
    const surface = processor.model.getSurface('a')!;
    expect(surface.componentsModel.get('note')!.catalog).toBe(one.catalog);
    expect(surface.dataModel.get('/greeting')).toBe('hi');
    expect(created).toHaveBeenCalledTimes(1);
  });

  it('keeps each catalog’s build beside a newer one, a newer build named for the second catalog moving the surface', () => {
    const {demo, one, two, processor, deliver} = mixedCanvas();
    deliver([demo, one], create('a'), mixed('a', 'first'));
    // Another surface draws the other catalog in its newer build.
    deliver([demo, two], create('b'), mixed('b', 'second'));
    expect(processor.model.getSurface('a')!.componentsModel.get('note')!.catalog).toBe(
      one.catalog,
    );
    expect(processor.model.getSurface('b')!.componentsModel.get('note')!.catalog).toBe(
      two.catalog,
    );
    deliver([two], mixed('a', 'moved'));
    const moved = processor.model.getSurface('a')!;
    expect(moved.componentsModel.get('note')!.catalog).toBe(two.catalog);
    expect(moved.componentsModel.get('note')!.properties.text).toBe('moved');
    expect(moved.defaultCatalog).toBe(demo.catalog);
  });

  it('restores a mixed paint the way back returns to with each component in its catalog and build', () => {
    const {demo, one, two, book, processor, deliver} = mixedCanvas();
    deliver([demo, one], create('a'), mixed('a', 'first'));
    const copy = capturePaint(processor, 'a')!;
    expect(copy.builds).toEqual({[DEMO]: 'sha256-demo', [OTHER]: 'sha256-one'});
    expect(copy.tree.note).toMatchObject({'@catalogId': OTHER});
    processor.model.deleteSurface('a');
    deliver([demo, two], create('b'), mixed('b', 'second'));
    processor.processMessages(book.rebuild(copy));
    const restored = processor.model.getSurface('a')!;
    expect(restored.defaultCatalog).toBe(demo.catalog);
    expect(restored.componentsModel.get('note')!.catalog).toBe(one.catalog);
  });
});
