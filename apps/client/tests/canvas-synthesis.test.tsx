/**
 * The synthesis turn end to end through the real canvas: store, turn runner and synthesis
 * session over one live processor, driven by the synthetic synthesis beat (task-5.5 decision
 * 7). What the orchestrator's synthesis tests prove on the wire, this proves on the canvas:
 * the reserved slot rests quietly, the model-authored view fills it as shell content with
 * evaluated cells, keyed refs survive a reorder while index refs go stale until the
 * re-synthesis lands, sort is free, and the synthesis leaves with its composition.
 */
import {describe, expect, it} from 'vitest';
import {screen} from '@testing-library/react';
import {MessageProcessor} from '@a2ui/web_core/v0_9';
import {CATALOG_ID as SHELL_CATALOG_ID} from '@a2uiverse/shell-catalog/id';
import {OPERATORS, SlotContentContext} from '@a2uiverse/shell-catalog';
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
  INDEXED_DOCUMENT,
  INDEXED_PAYLOAD,
  PAYLOAD,
  REPOINTED_DOCUMENT,
  REPOINTED_PAYLOAD,
  SHOP_A,
  SHOP_B,
  SYNTHESIS_SLOT,
  SYNTHESIS_SURFACE,
  synthesisMessages,
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
const indexedFirstTurn = (beat: BeatFixture): BeatFixture => {
  const turn = beat.turns[0]!;
  const last = turn.batches.at(-1)!;
  return {
    ...beat,
    turns: [
      {
        ...turn,
        batches: [
          ...turn.batches.slice(0, -1),
          {
            ...last,
            messages: synthesisMessages(INDEXED_DOCUMENT, SHELL_CATALOG_ID),
            synthesis: INDEXED_PAYLOAD,
          },
        ],
      },
    ],
  };
};

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
    const slot = container.querySelector(`[data-slot="${SYNTHESIS_SLOT}"]`)!;
    expect(slot.getAttribute('data-slot-state')).toBe('pending');
    expect(slot.getAttribute('data-slot-content')).toBe('shell');
    expect(slot.textContent).toBe('Painting…');
    // No attribution tile for the shell's own content; the vendors keep theirs.
    expect(screen.queryByLabelText('Painted by Synthesis')).toBeNull();
    expect(screen.getByLabelText('Painted by Aperture & Co')).toBeInTheDocument();
  });

  it('paints the merged view into its slot with evaluated cells, ordered by the declared sort', async () => {
    const {store, runner, synthesis, rows, model, failures} = setup();
    await replayBeatOnCanvas(firstTurnOnly(SYNTHESIS_BEAT), {runner, store, paced: false});

    expect(failures).toEqual([]);
    expect(store.getState().placement.get(SYNTHESIS_SLOT)).toEqual({
      surfaceId: SYNTHESIS_SURFACE,
      source: 'shell',
    });
    expect(synthesis.payload).toEqual(PAYLOAD);
    expect(synthesis.generations).toEqual({[SHOP_A]: 1, [SHOP_B]: 1});
    expect(rows().map(r => r.name.value)).toEqual(['Lumen X100', 'Verity A7']);
    expect(rows().map(r => r.best)).toEqual([
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
      container.querySelector(`[data-slot="${SYNTHESIS_SLOT}"]`)!.getAttribute('data-slot-content'),
    ).toBe('shell');
    // Every cell is complete: no marker, the bare value. Two rows of four.
    expect(view!.querySelectorAll('[data-state="complete"]').length).toBe(8);
    expect(view!.querySelectorAll('[data-marker]').length).toBe(0);
    // The model's own words and the evaluator's values, side by side.
    expect(view!.textContent).toContain('Cameras in both stores');
    expect(view!.textContent).toContain('Best price');
    expect(view!.textContent).toContain('1,299');
    // The sort control shows the criterion the model named.
    expect(view!.querySelector('[aria-label="Sort by"]')).not.toBeNull();
  });

  it('keyed refs survive an in-place reorder: the bump marks nothing stale and the values follow the keys', async () => {
    const {store, runner, synthesis, rows} = setup();
    await replayBeatOnCanvas(SYNTHESIS_BEAT, {runner, store, paced: false});
    expect(synthesis.generations).toEqual({[SHOP_A]: 2, [SHOP_B]: 1});
    expect(rows().every(r => Object.values(r).every(c => c.stale === undefined))).toBe(true);
    expect(rows().map(r => r.name.value)).toEqual(['Lumen X100', 'Verity A7']);
    expect(rows().map(r => r.priceA.value)).toEqual([1299, 1849]);
  });

  it('index refs go stale on the bump, then clear when the re-synthesis lands', async () => {
    const {store, runner, rows} = setup();
    await replayBeatOnCanvas(indexedFirstTurn(SYNTHESIS_BEAT), {runner, store, paced: false});

    // The action turn, batch by batch: the vendor's bump, then the new document at turn end.
    const reorder = SYNTHESIS_BEAT.turns[1]!;
    const turn = runner.begin({
      kind: 'surface-action',
      parent: null,
      forked: false,
      payload: {action: reorder.action as never},
    });
    const [bump] = reorder.batches;
    turn.apply(structuredClone(bump!.messages), bump!.stamp);
    // The bump marked stale synchronously; the data write behind it re-evaluates on the microtask.
    await Promise.resolve();
    const stale = rows();
    expect(stale.every(r => r.priceA.stale && r.best.stale)).toBe(true);
    expect(stale.every(r => r.priceB.stale === undefined)).toBe(true);
    // Under the old positions the join is silently re-pointed: another camera reads first.
    expect(stale.map(r => r.name.value)).toContain('Lumen Z6');
    turn.apply(
      synthesisMessages(REPOINTED_DOCUMENT, SHELL_CATALOG_ID),
      {source: 'shell', slot: SYNTHESIS_SLOT, role: 'fragment'},
      REPOINTED_PAYLOAD,
    );
    // Staged mode holds the repaint until the swap.
    expect(rows()[0]!.best.stale).toBe(true);
    turn.end();
    const fresh = rows();
    expect(fresh.every(r => r.best.stale === undefined)).toBe(true);
    expect(fresh.map(r => r.name.value)).toEqual(['Lumen X100', 'Verity A7']);
    expect(fresh.map(r => r.best.value)).toEqual([1299, 1799]);
  });

  it('a sort change re-orders in place: no round trip, no generation touched', async () => {
    const {processor, store, runner, synthesis, rows, model} = setup();
    await replayBeatOnCanvas(SYNTHESIS_BEAT, {runner, store, paced: false});
    const before = store.getState().appliedSeq;
    processor.model
      .getSurface(SYNTHESIS_SURFACE)!
      .dataModel.set('/sorts/0', {...model()!.sorts[0], direction: 'desc'});
    await Promise.resolve();
    expect(rows().map(r => r.name.value)).toEqual(['Verity A7', 'Lumen X100']);
    expect(synthesis.generations).toEqual({[SHOP_A]: 2, [SHOP_B]: 1});
    expect(store.getState().appliedSeq).toBe(before);
  });

  it('a two-way edit inside a storefront re-evaluates the merged view', async () => {
    const {processor, store, runner, rows} = setup();
    await replayBeatOnCanvas(firstTurnOnly(SYNTHESIS_BEAT), {runner, store, paced: false});
    processor.model.getSurface(SHOP_A)!.dataModel.set('/items/0/price', 1200);
    await Promise.resolve();
    expect(rows()[0]!.best).toEqual({value: 1200, contributed: 2, of: 2, absent: []});
  });

  it('the next composition retires the synthesis with the one it replaces, and the timeline keeps it with its payload', async () => {
    const {processor, store, runner, synthesis} = setup();
    await replayBeatOnCanvas(SYNTHESIS_BEAT, {runner, store, paced: false});
    await replayBeatOnCanvas(COMPOSED_BEAT, {runner, store, paced: false});

    expect(synthesis.payload).toBeUndefined();
    expect(synthesis.generations).toEqual({});
    expect(processor.model.getSurface(SYNTHESIS_SURFACE)).toBeUndefined();
    const parked = store.getState().timeline[0]!;
    const fragment = parked.fragments?.find(f => f.surfaceId === SYNTHESIS_SURFACE);
    expect(fragment?.snapshot?.dataModel).toMatchObject({
      sorts: [{key: '/best', direction: 'asc'}],
      rows: [{name: {value: 'Lumen X100'}}, {name: {value: 'Verity A7'}}],
    });
    // Captured beside the fragments: what a parked visit re-sorts with (task 4.8).
    expect(parked.synthesis).toEqual({
      surfaceId: SYNTHESIS_SURFACE,
      payload: PAYLOAD,
      generations: {[SHOP_A]: 2, [SHOP_B]: 1},
    });
  });
});
