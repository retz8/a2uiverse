/**
 * The build each paint is drawn in (task 15.6): a create in the build assigned to it, a surface on
 * screen keeping its own beside a newer one, moved only by a change to its components assigned a
 * newer build — its tree and data carried over, no new paint — and a paint the way back returns to
 * restored in the build it was drawn in.
 */
import {describe, expect, it, vi} from 'vitest';
import {Catalog, type A2uiMessage} from '@a2ui/web_core/v0_9';
import {basicCatalog, type ReactComponentImplementation} from '@a2ui/react/v0_9';
import {capturePaint} from '../canvas/history/paintCopy';
import {resolveCatalog} from './clientCatalogs';
import {BuildProcessor, createPaintBuilds} from './paintBuilds';

const DEMO = 'urn:catalog:demo';
const msg = (m: Record<string, unknown>): A2uiMessage =>
  ({version: 'v0.9', ...m}) as unknown as A2uiMessage;
const create = (surfaceId: string) => msg({createSurface: {surfaceId, catalogId: DEMO}});
const tree = (surfaceId: string, text: string) =>
  msg({
    updateComponents: {
      surfaceId,
      components: [
        {id: 'root', component: 'Text', text: {path: '/greeting'}},
        {id: 'note', component: 'Text', text},
      ],
    },
  });
const data = (surfaceId: string, greeting: string) =>
  msg({updateDataModel: {surfaceId, path: '/', value: {greeting}}});

const buildOf = (artifact: string) =>
  resolveCatalog(
    new Catalog<ReactComponentImplementation>(
      DEMO,
      [...basicCatalog.components.values()],
      [...basicCatalog.functions.values()],
    ),
    undefined,
    artifact,
  );

function canvas() {
  const first = buildOf('sha256-first');
  const second = buildOf('sha256-second');
  const loaded = new Map([first, second].map(b => [b.build!, b]));
  const book = createPaintBuilds(artifact => loaded.get(artifact));
  const processor = new BuildProcessor([], book);
  /** Delivers messages the way the gate does: each one assigned its build. */
  const deliver = (build: typeof first | undefined, ...messages: A2uiMessage[]) => {
    for (const message of messages) if (build) book.assign(message, build);
    processor.processMessages(messages);
  };
  return {first, second, book, processor, deliver};
}

describe('a paint drawn in its build', () => {
  it('draws each create in the build assigned to it, a surface on screen keeping its own', () => {
    const {first, second, processor, deliver} = canvas();
    deliver(first, create('a'), tree('a', 'one'));
    deliver(second, create('b'), tree('b', 'two'));
    expect(processor.model.getSurface('a')!.catalog).toBe(first.catalog);
    expect(processor.model.getSurface('b')!.catalog).toBe(second.catalog);
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
    expect(moved.catalog).toBe(second.catalog);
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
    expect(processor.model.getSurface('a')!.catalog).toBe(first.catalog);
  });
});

describe('a paint the way back returns to', () => {
  it('is restored in the build it was drawn in, whatever was drawn since', () => {
    const {first, second, book, processor, deliver} = canvas();
    deliver(first, create('a'), tree('a', 'one'));
    const copy = capturePaint(processor, 'a')!;
    expect(copy.build).toBe('sha256-first');
    processor.model.deleteSurface('a');
    deliver(second, create('b'), tree('b', 'two'));
    processor.processMessages(book.rebuild(copy));
    expect(processor.model.getSurface('a')!.catalog).toBe(first.catalog);
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
    expect(capturePaint(processor, 'a')).not.toHaveProperty('build');
  });
});
