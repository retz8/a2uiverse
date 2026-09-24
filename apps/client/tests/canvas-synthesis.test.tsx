/**
 * The synthesis turn end to end through the real canvas: store, turn runner and synthesis
 * session over one live processor, driven by the synthetic synthesis beat (task-5.5 decision
 * 7). What the orchestrator's synthesis tests prove on the wire, this proves on the canvas:
 * the reserved slot rests quietly, the model-authored view fills it as shell content with
 * evaluated cells, keyed refs survive a reorder untouched (task-5.10 decision 1), sort is
 * free, and the synthesis leaves with its composition.
 */
import {describe, expect, it} from 'vitest';
import {screen} from '@testing-library/react';
import {MessageProcessor} from '@a2ui/web_core/v0_9';
import {CATALOG_ID as SHELL_CATALOG_ID} from '@a2uiverse/shell-catalog/id';
import {OPERATORS, RELATIONS, SlotContentContext} from '@a2uiverse/shell-catalog';
import type {CellObject} from '@a2uiverse/shell-catalog';
import {createCanvasStore} from '../src/canvas/canvasStore';
import {createTurnRunner} from '../src/canvas/turn/canvasTurn';
import {
  createSynthesisSession,
  type SynthesisFailure,
} from '../src/canvas/synthesis/synthesisSession';
import type {EvaluatedModel} from '../src/canvas/synthesis/bindingEvaluator';
import {replayBeatOnCanvas} from '../src/canvas/replayBeat';
import {CanvasStage} from '../src/canvas/components/CanvasStage';
import {renderSlotContent} from '../src/canvas/composition/slotContent';
import {COMPOSED_BEAT, SYNTHESIS_BEAT} from '../src/beats/syntheticBeats';
import type {BeatFixture} from '../src/beats/beatFixtures';
import {
  PAYLOAD,
  SHOP_A,
  SHOP_A_ITEMS,
  SYNTHESIS_SOURCE,
  SYNTHESIS_SURFACE,
} from '../src/beats/synthesisFixture';
import {CATALOGS, renderWithShell} from './helpers';

const catalogs = CATALOGS.map(c => c.catalog);

type Row = Record<'name' | 'priceA' | 'priceB' | 'best', CellObject>;

function setup() {
  const processor = new MessageProcessor(catalogs);
  const store = createCanvasStore();
  const failures: SynthesisFailure[] = [];
  const shell = catalogs.find(c => c.id === SHELL_CATALOG_ID)!;
  const synthesis = createSynthesisSession({
    processor,
    functions: shell.functions,
    operators: OPERATORS,
    relations: RELATIONS,
    onInvalid: f => failures.push(f),
  });
  const runner = createTurnRunner({
    processor,
    store,
    createStaging: () => new MessageProcessor(catalogs),
    synthesis,
  });
  const model = () =>
    processor.model.getSurface(SYNTHESIS_SURFACE)?.dataModel.get('/') as EvaluatedModel | undefined;
  const rows = () => model()!.rows as Row[];
  const renderStage = () => {
    // The stage resolves its slots the way `CanvasApp` does; without the resolver every slot
    // renders empty.
    const resolve = (slot: string) =>
      renderSlotContent(processor, store.getState().placement.get(slot), 0);
    return renderWithShell(
      <SlotContentContext.Provider value={resolve}>
        <CanvasStage processor={processor} state={store.getState()} />
      </SlotContentContext.Provider>,
    );
  };
  return {processor, store, runner, synthesis, failures, model, rows, renderStage};
}

/** The beat's first turn alone: the composition with its first synthesis. */
const firstTurnOnly = (beat: BeatFixture): BeatFixture => ({
  ...beat,
  turns: beat.turns.slice(0, 1),
});

/** The first turn up to the storefronts: the reserved slot still waiting. */
const beforeSynthesis = (beat: BeatFixture): BeatFixture => ({
  ...beat,
  turns: [{...beat.turns[0]!, batches: beat.turns[0]!.batches.slice(0, 3)}],
});

/** The first turn with the document re-pointed onto positions: the index-ref path. */
describe('the synthesis turn on the canvas', () => {
  it('the reserved slot rests quietly as shell content while the sources answer', async () => {
    const {store, runner, renderStage} = setup();
    await replayBeatOnCanvas(beforeSynthesis(SYNTHESIS_BEAT), {runner, store, paced: false});
    expect(store.getState().roster.map(r => [r.appId, r.displayName])).toEqual([
      ['shell', 'Synthesis'],
      ['shop-a', 'Aperture & Co'],
      ['shop-b', 'Northlight'],
    ]);
    const {container} = renderStage();
    const slot = container.querySelector(`[data-slot="${SYNTHESIS_SOURCE}"]`)!;
    expect(slot.getAttribute('data-slot-state')).toBe('pending');
    expect(slot.getAttribute('data-slot-content')).toBe('shell');
    // Reserved as the merged view (task-7.15): skeleton rows, no words of its own.
    expect(slot.getAttribute('aria-busy')).toBe('true');
    expect(slot.querySelectorAll('tbody tr[data-skeleton-row]')).toHaveLength(4);
    // No attribution marker for the shell's own content; the vendors keep theirs. The marker is
    // the span whose accessible name is the app's; the slot region under it is a div.
    expect(screen.queryByLabelText('Synthesis', {selector: 'span'})).toBeNull();
    expect(screen.getByLabelText('Aperture & Co', {selector: 'span'})).toBeInTheDocument();
  });

  it('paints the merged view into its slot with evaluated cells, ordered by the declared sort', async () => {
    const {store, runner, synthesis, rows, model, failures} = setup();
    await replayBeatOnCanvas(firstTurnOnly(SYNTHESIS_BEAT), {runner, store, paced: false});

    expect(failures).toEqual([]);
    expect(store.getState().placement.get(SYNTHESIS_SOURCE)).toEqual({
      surfaceId: SYNTHESIS_SURFACE,
      source: 'shell',
    });
    expect(synthesis.payload).toEqual(PAYLOAD);
    expect(rows().map(r => r.name.value)).toEqual(['Lumen X100', 'Verity A7']);
    expect(rows().map(r => r.best)).toMatchObject([
      {value: 1299, contributed: 2, of: 2, absent: []},
      {value: 1799, contributed: 2, of: 2, absent: []},
    ]);
    expect(model()!.sorts[0]).toMatchObject({path: '/rows', key: '/best', direction: 'asc'});
  });

  it('renders the view as shell content: no boundary, derived values through the shell catalog', async () => {
    const {store, runner, renderStage} = setup();
    await replayBeatOnCanvas(firstTurnOnly(SYNTHESIS_BEAT), {runner, store, paced: false});
    const {container} = renderStage();
    const view = container.querySelector(
      `[data-shell-content][data-surface="${SYNTHESIS_SURFACE}"]`,
    );
    expect(view).not.toBeNull();
    expect(view!.closest('.fragment-boundary')).toBeNull();
    expect(
      container
        .querySelector(`[data-slot="${SYNTHESIS_SOURCE}"]`)!
        .getAttribute('data-slot-content'),
    ).toBe('shell');
    // Every cell is complete: drawn at full strength, unmarked. Two rows of four.
    expect(view!.querySelectorAll('[data-state="complete"]').length).toBe(8);
    expect(view!.querySelectorAll('[data-marked]').length).toBe(0);
    // The model's own words and the evaluator's values, side by side.
    expect(view!.textContent).toContain('Cameras in both stores');
    expect(view!.textContent).toContain('Best price');
    expect(view!.textContent).toContain('1,299');
    // The sort control shows the criterion the model named.
    expect(view!.querySelector('[aria-label="Sort by"]')).not.toBeNull();
  });

  it('keyed refs survive an in-place reorder: nothing is marked and the values follow the keys', async () => {
    const {store, runner, rows} = setup();
    await replayBeatOnCanvas(SYNTHESIS_BEAT, {runner, store, paced: false});
    expect(rows().every(r => Object.values(r).every(c => !('stale' in c)))).toBe(true);
    expect(rows().map(r => r.name.value)).toEqual(['Lumen X100', 'Verity A7']);
    expect(rows().map(r => r.priceA.value)).toEqual([1299, 1849]);
  });

  it('a sort change re-orders in place: no round trip', async () => {
    const {processor, store, runner, rows, model} = setup();
    await replayBeatOnCanvas(SYNTHESIS_BEAT, {runner, store, paced: false});
    const before = store.getState().appliedSeq;
    processor.model
      .getSurface(SYNTHESIS_SURFACE)!
      .dataModel.set('/sorts/0', {...model()!.sorts[0], direction: 'desc'});
    await Promise.resolve();
    expect(rows().map(r => r.name.value)).toEqual(['Verity A7', 'Lumen X100']);
    expect(store.getState().appliedSeq).toBe(before);
  });

  it('a two-way edit inside a storefront re-evaluates the merged view', async () => {
    const {processor, store, runner, rows} = setup();
    await replayBeatOnCanvas(firstTurnOnly(SYNTHESIS_BEAT), {runner, store, paced: false});
    processor.model.getSurface(SHOP_A)!.dataModel.set('/items/0/price', 1200);
    await Promise.resolve();
    expect(rows()[0]!.best).toMatchObject({value: 1200, contributed: 2, of: 2, absent: []});
  });

  it('a key that leaves a source degrades the view in place and comes back on its own (task-5.7 decision 9)', async () => {
    // The end-to-end the evaluator tests cannot give: a vendor repaint drops one keyed element,
    // and the canvas — intake, session, rendering — carries the absence to the cell and no
    // further. Nothing is thrown, nothing is marked stale, the row stands, the sort holds.
    const {processor, store, runner, rows, failures, renderStage} = setup();
    await replayBeatOnCanvas(firstTurnOnly(SYNTHESIS_BEAT), {runner, store, paced: false});
    const before = store.getState().appliedSeq;

    const withoutLumen = SHOP_A_ITEMS.filter(item => item.id !== 'lumen-x100').map(i => ({...i}));
    processor.model.getSurface(SHOP_A)!.dataModel.set('/items', withoutLumen);
    await Promise.resolve();

    expect(failures).toEqual([]);
    expect(rows().map(r => r.name.value)).toEqual([undefined, 'Verity A7']);
    const [lumen, verity] = rows();
    expect(lumen!.priceA).toMatchObject({
      value: undefined,
      contributed: 0,
      of: 1,
      absent: [SHOP_A],
    });
    expect(lumen!.priceB).toMatchObject({value: 1349, contributed: 1, of: 1, absent: []});
    expect(lumen!.best).toMatchObject({value: 1349, contributed: 1, of: 2, absent: [SHOP_A]});
    expect(verity!.best).toMatchObject({value: 1799, contributed: 2, of: 2, absent: []});
    expect(rows().every(r => Object.values(r).every(c => !('stale' in c)))).toBe(true);
    // Free: no turn ran.
    expect(store.getState().appliedSeq).toBe(before);

    const {container, unmount} = renderStage();
    const view = container.querySelector(
      `[data-shell-content][data-surface="${SYNTHESIS_SURFACE}"]`,
    )!;
    // Refs that existed and stopped resolving: the rule is there, unfilled (task-7.9 decision 21).
    expect(view.querySelectorAll('[data-state="absent"]').length).toBe(2);
    expect(view.querySelectorAll('[data-state="partial"]').length).toBe(1);
    expect(view.querySelectorAll('[data-marked]').length).toBe(3);
    expect(view.querySelectorAll('[data-state="complete"]').length).toBe(5);
    // The partial cell names the source that left in its accessible name (SPEC §5.4).
    expect(view.querySelector('[data-state="partial"]')!.getAttribute('aria-label')).toContain(
      '1 of 2 sources · shop-a not showing this',
    );
    unmount();

    // The list returning reconnects the same refs — again with no model call.
    processor.model.getSurface(SHOP_A)!.dataModel.set(
      '/items',
      SHOP_A_ITEMS.map(i => ({...i})),
    );
    await Promise.resolve();
    expect(rows().map(r => r.best)).toMatchObject([
      {value: 1299, contributed: 2, of: 2, absent: []},
      {value: 1799, contributed: 2, of: 2, absent: []},
    ]);
    const restored = renderStage().container.querySelector(
      `[data-shell-content][data-surface="${SYNTHESIS_SURFACE}"]`,
    )!;
    expect(restored.querySelectorAll('[data-marked]').length).toBe(0);
    expect(restored.querySelectorAll('[data-state="complete"]').length).toBe(8);
    expect(store.getState().appliedSeq).toBe(before);
  });

  it('the next composition retires the synthesis with the one it replaces, and the timeline keeps it with its payload', async () => {
    const {processor, store, runner, synthesis} = setup();
    await replayBeatOnCanvas(SYNTHESIS_BEAT, {runner, store, paced: false});
    await replayBeatOnCanvas(COMPOSED_BEAT, {runner, store, paced: false});

    expect(synthesis.payload).toBeUndefined();
    expect(processor.model.getSurface(SYNTHESIS_SURFACE)).toBeUndefined();
    const parked = store.getState().timeline[0]!;
    const fragment = parked.fragments?.find(f => f.surfaceId === SYNTHESIS_SURFACE);
    expect(fragment?.snapshot?.dataModel).toMatchObject({
      sorts: [{key: '/best', direction: 'asc'}],
      rows: [{name: {value: 'Lumen X100'}}, {name: {value: 'Verity A7'}}],
    });
    // Captured beside the fragments: what a parked visit re-sorts with (task 4.8).
    expect(parked.synthesis).toEqual({surfaceId: SYNTHESIS_SURFACE, payload: PAYLOAD});
  });
});
