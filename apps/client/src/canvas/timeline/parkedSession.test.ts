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

  it('an uncomposed paint parks with an empty placement', () => {
    const store = createCanvasStore();
    const entry = departedEntry();
    store.appendEntry(entry);
    const session = createParkedSession(entry, {catalogs: [CATALOG], store});
    expect(session.placement.size).toBe(0);
  });
});
