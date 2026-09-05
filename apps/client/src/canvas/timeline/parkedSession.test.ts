/**
 * The parked session: a frozen snapshot rehydrated through the real message path
 * into a per-visit sandbox processor, with teardown write-back into the stored entry.
 */
import {describe, it, expect, vi} from 'vitest';
import {MessageProcessor} from '@a2ui/web_core/v0_9';
import type {A2uiMessage} from '@a2ui/web_core/v0_9';
import {CATALOG, CATALOG_ID} from 'github-catalog';
import {CATALOG as SHELL_CATALOG, CATALOG_ID as SHELL_CATALOG_ID} from '@a2uiverse/shell-catalog';
import type {PaintEntry} from './paint';
import {createCanvasStore} from '../canvasStore';
import {createParkedSession} from './parkedSession';
import {serializeSurface} from './snapshotSurface';
import {evaluate} from '../synthesis/bindingEvaluator';
import {
  DOCUMENT,
  PAYLOAD,
  SHOP_A,
  SHOP_B,
  shopAMessages,
  shopBMessages,
  SYNTHESIS_SLOT,
  SYNTHESIS_SURFACE,
  synthesisMessages,
} from '../../beats/synthesisFixture';

const msg = (m: Record<string, unknown>): A2uiMessage =>
  ({version: 'v0.9', ...m}) as unknown as A2uiMessage;

/** Build a departed entry the way the runner does: live processor → serializeSurface. */
function departedEntry(paintId = 1): PaintEntry {
  const live = new MessageProcessor([CATALOG]);
  live.processMessages([
    msg({createSurface: {surfaceId: 'pull-request-list', catalogId: CATALOG_ID}}),
    msg({
      updateComponents: {
        surfaceId: 'pull-request-list',
        components: [
          {id: 'root', component: 'Stack', children: ['title', 'toggle']},
          {id: 'title', component: 'Text', text: {path: '/title'}},
          {
            id: 'toggle',
            component: 'Checkbox',
            accessibility: {label: 'urgent only'},
            checked: {path: '/urgent'},
          },
        ],
      },
    }),
    msg({
      updateDataModel: {surfaceId: 'pull-request-list', value: {title: 'Open PRs', urgent: false}},
    }),
  ]);
  const surface = live.model.getSurface('pull-request-list')!;
  return {
    paintId,
    surfaceId: 'pull-request-list',
    catalogId: CATALOG_ID,
    cause: {kind: 'utterance', parent: null, forked: false, payload: {text: 'show PRs'}},
    paintedAt: 1000,
    snapshot: Object.freeze({...serializeSurface(surface), capturedAt: 2000}),
  };
}

describe('createParkedSession', () => {
  it('rehydrates the snapshot into a sandbox surface via the real message path', () => {
    const store = createCanvasStore();
    const entry = departedEntry();
    store.appendEntry(entry);

    const session = createParkedSession(entry, {catalogs: [CATALOG], store});
    const surface = session.processor.model.getSurface('pull-request-list')!;
    expect(surface).toBeTruthy();
    expect(surface.componentsModel.get('root')?.type).toBe('Stack');
    expect(surface.componentsModel.get('title')?.properties.text).toEqual({path: '/title'});
    expect(surface.dataModel.get('/')).toEqual({title: 'Open PRs', urgent: false});
  });

  it('the sandbox data model is mutable — the frozen snapshot is untouched by edits', () => {
    const store = createCanvasStore();
    const entry = departedEntry();
    store.appendEntry(entry);

    const session = createParkedSession(entry, {catalogs: [CATALOG], store});
    const surface = session.processor.model.getSurface('pull-request-list')!;
    surface.dataModel.set('/urgent', true);
    expect(surface.dataModel.get('/urgent')).toBe(true);
    expect((entry.snapshot!.dataModel as {urgent: boolean}).urgent).toBe(false);
  });

  it('commit writes the sandbox data model back into the stored entry, frozen', () => {
    const store = createCanvasStore();
    const entry = departedEntry();
    store.appendEntry(entry);

    const session = createParkedSession(entry, {catalogs: [CATALOG], store});
    session.processor.model.getSurface('pull-request-list')!.dataModel.set('/urgent', true);
    session.commit();

    const stored = store.getState().timeline[0].snapshot!;
    expect(stored.dataModel).toEqual({title: 'Open PRs', urgent: true});
    expect(Object.isFrozen(stored.dataModel)).toBe(true);
    // Identity, tree, and capture moment are untouched.
    expect(stored.tree).toBe(entry.snapshot!.tree);
    expect(stored.capturedAt).toBe(2000);
  });

  it('sandbox actions dispatch to the provided handler', async () => {
    const store = createCanvasStore();
    const entry = departedEntry();
    store.appendEntry(entry);
    const onAction = vi.fn();

    const session = createParkedSession(entry, {catalogs: [CATALOG], store, onAction});
    await session.processor.model
      .getSurface('pull-request-list')!
      .dispatchAction({event: {name: 'open-pr', context: {number: 117}}}, 'root');
    expect(onAction).toHaveBeenCalledTimes(1);
  });

  it('refuses an entry that has no snapshot (the live paint is not parkable)', () => {
    const store = createCanvasStore();
    const entry = {...departedEntry(), snapshot: null};
    expect(() => createParkedSession(entry, {catalogs: [CATALOG], store})).toThrow(/snapshot/);
  });
});

describe('a parked composition', () => {
  /** A departed composition: the shell's snapshot plus its fragments', as retireStage captures. */
  function departedComposition(): PaintEntry {
    const live = new MessageProcessor([CATALOG, SHELL_CATALOG]);
    live.processMessages([
      msg({createSurface: {surfaceId: 'shell:main', catalogId: SHELL_CATALOG_ID}}),
      msg({
        updateComponents: {
          surfaceId: 'shell:main',
          components: [
            {id: 'root', component: 'Column', children: ['slot-github']},
            {id: 'slot-github', component: 'Slot', name: 'slot-github', state: 'pending'},
          ],
        },
      }),
      msg({createSurface: {surfaceId: 'github:prs', catalogId: CATALOG_ID}}),
      msg({
        updateComponents: {
          surfaceId: 'github:prs',
          components: [{id: 'root', component: 'Text', text: 'Pull requests'}],
        },
      }),
    ]);
    const capture = (id: string) => ({
      ...serializeSurface(live.model.getSurface(id)!),
      capturedAt: 2000,
    });
    return {
      paintId: 7,
      surfaceId: 'shell:main',
      catalogId: SHELL_CATALOG_ID,
      cause: {
        kind: 'utterance',
        parent: null,
        forked: false,
        payload: {text: 'what needs my attention'},
      },
      paintedAt: 1007,
      snapshot: capture('shell:main'),
      fragments: [
        {
          slot: 'slot-github',
          surfaceId: 'github:prs',
          source: 'github',
          catalogId: CATALOG_ID,
          snapshot: capture('github:prs'),
        },
      ],
    };
  }

  it('rehydrates the whole composition, not just the shell', () => {
    const store = createCanvasStore();
    const entry = departedComposition();
    store.appendEntry(entry);

    const session = createParkedSession(entry, {catalogs: [CATALOG, SHELL_CATALOG], store});
    expect(session.processor.model.getSurface('shell:main')).toBeDefined();
    expect(session.processor.model.getSurface('github:prs')).toBeDefined();
    expect(session.placement.get('slot-github')).toEqual({
      surfaceId: 'github:prs',
      source: 'github',
    });
  });

  it('a parked synthesis re-sorts over its own frozen partitions — sort crosses no wire (task 4.8)', async () => {
    const live = new MessageProcessor([SHELL_CATALOG]);
    live.processMessages([
      ...shopAMessages(SHELL_CATALOG_ID),
      ...shopBMessages(SHELL_CATALOG_ID),
      ...synthesisMessages(DOCUMENT, SHELL_CATALOG_ID),
      msg({createSurface: {surfaceId: 'shell:main', catalogId: SHELL_CATALOG_ID}}),
      msg({
        updateComponents: {
          surfaceId: 'shell:main',
          components: [
            {id: 'root', component: 'Column', children: [SYNTHESIS_SLOT]},
            {
              id: SYNTHESIS_SLOT,
              component: 'Slot',
              name: SYNTHESIS_SLOT,
              state: 'pending',
              content: 'shell',
            },
          ],
        },
      }),
    ]);
    const generations = {[SHOP_A]: 1, [SHOP_B]: 1};
    const functions = SHELL_CATALOG.functions;
    const models = (surface: string) => live.model.getSurface(surface)?.dataModel.get('/');
    live.model
      .getSurface(SYNTHESIS_SURFACE)!
      .dataModel.set('/', evaluate({payload: PAYLOAD, models, generations, functions}));
    const capture = (id: string) => ({
      ...serializeSurface(live.model.getSurface(id)!),
      capturedAt: 2000,
    });
    const fragment = (surfaceId: string, slot: string, source: string) => ({
      slot,
      surfaceId,
      source,
      catalogId: SHELL_CATALOG_ID,
      snapshot: capture(surfaceId),
    });
    const entry: PaintEntry = {
      paintId: 9,
      surfaceId: 'shell:main',
      catalogId: SHELL_CATALOG_ID,
      cause: {kind: 'utterance', parent: null, forked: false, payload: {text: 'compare'}},
      paintedAt: 1009,
      snapshot: capture('shell:main'),
      fragments: [
        fragment(SHOP_A, 'slot-shop-a', 'shop-a'),
        fragment(SHOP_B, 'slot-shop-b', 'shop-b'),
        fragment(SYNTHESIS_SURFACE, SYNTHESIS_SLOT, 'shell'),
      ],
      synthesis: {surfaceId: SYNTHESIS_SURFACE, payload: PAYLOAD, generations},
    };
    const store = createCanvasStore();
    store.appendEntry(entry);

    const session = createParkedSession(entry, {catalogs: [SHELL_CATALOG], store, functions});
    const parked = session.processor.model.getSurface(SYNTHESIS_SURFACE)!;
    const names = () =>
      (parked.dataModel.get('/rows') as Array<{name: {value: string}}>).map(e => e.name.value);
    expect(names()).toEqual(['Lumen X100', 'Verity A7']);

    parked.dataModel.set('/sorts/0', {...DOCUMENT.sorts[0], direction: 'desc'});
    await Promise.resolve();
    expect(names()).toEqual(['Verity A7', 'Lumen X100']);
    expect(parked.dataModel.get('/sorts/0')).toMatchObject({key: '/best', direction: 'desc'});

    // The re-sort stays in the sandbox: the stored entry is untouched until commit.
    const stored = store
      .getState()
      .timeline[0].fragments!.find(f => f.surfaceId === SYNTHESIS_SURFACE)!;
    expect((stored.snapshot!.dataModel as {sorts: unknown[]}).sorts[0]).toMatchObject(
      DOCUMENT.sorts[0]!,
    );
  });

  it('an uncomposed paint parks with an empty placement', () => {
    const store = createCanvasStore();
    const entry = departedEntry();
    store.appendEntry(entry);
    const session = createParkedSession(entry, {catalogs: [CATALOG], store});
    expect(session.placement.size).toBe(0);
  });
});
