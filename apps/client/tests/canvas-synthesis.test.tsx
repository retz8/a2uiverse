/**
 * The synthesis turn end to end through the real canvas: store, turn runner and synthesis
 * session over one live processor, driven by the synthetic synthesis beat (task 4.5 decision
 * 14). What the orchestrator's synthesis tests prove on the wire, this proves on the canvas:
 * the merged view fills its slot with evaluated values, a bump marks it stale before the new
 * wiring lands, sort is free, and the synthesis leaves with its composition.
 */
import {describe, expect, it} from 'vitest';
import {screen} from '@testing-library/react';
import {MessageProcessor} from '@a2ui/web_core/v0_9';
import {CATALOG_ID as SHELL_CATALOG_ID} from '@a2uiverse/shell-catalog/id';
import {OPERATORS} from '@a2uiverse/shell-catalog';
import {createCanvasStore} from '../src/canvas/canvasStore';
import {createTurnRunner} from '../src/canvas/turn/canvasTurn';
import {
  createSynthesisSession,
  type SynthesisFailure,
} from '../src/canvas/synthesis/synthesisSession';
import type {SynthesisModel} from '../src/canvas/synthesis/bindingEvaluator';
import {replayBeatOnCanvas} from '../src/canvas/replayBeat';
import {CanvasStage} from '../src/canvas/components/CanvasStage';
import {SlotContentContext} from '@a2uiverse/shell-catalog';
import {renderSlotContent} from '../src/canvas/composition/slotContent';
import {COMPOSED_BEAT, SYNTHESIS_BEAT} from '../src/beats/syntheticBeats';
import type {BeatFixture} from '../src/beats/beatFixtures';
import {SHOP_A, SYNTHESIS_SLOT, SYNTHESIS_SURFACE, WIRING} from '../src/beats/synthesisFixture';
import {CATALOGS, renderWithShell} from './helpers';

const catalogs = CATALOGS.map(c => c.catalog);

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
    processor.model.getSurface(SYNTHESIS_SURFACE)?.dataModel.get('/') as SynthesisModel | undefined;
  return {processor, store, runner, synthesis, failures, model};
}

/** The beat's first turn alone: the composition with its first synthesis. */
const firstTurnOnly = (beat: BeatFixture): BeatFixture => ({
  ...beat,
  turns: beat.turns.slice(0, 1),
});

describe('the synthesis turn on the canvas', () => {
  it('paints the merged view into its slot with evaluated cells, ordered by the wiring sort', async () => {
    const {store, runner, synthesis, model, failures} = setup();
    await replayBeatOnCanvas(firstTurnOnly(SYNTHESIS_BEAT), {runner, store, paced: false});

    expect(failures).toEqual([]);
    expect(store.getState().placement.get(SYNTHESIS_SLOT)).toEqual({
      surfaceId: SYNTHESIS_SURFACE,
      source: 'shell',
    });
    expect(synthesis.wiring).toEqual(WIRING);
    expect(synthesis.generations).toEqual({'shop-a:list': 1, 'shop-b:list': 1});
    const entities = model()!.entities;
    expect(entities.map(e => e.name.value)).toEqual(['X100', 'Z6']);
    expect(entities.map(e => e.best_price)).toEqual([
      {value: 899, contributed: 2, of: 2, absent: []},
      {value: 1899, contributed: 2, of: 2, absent: []},
    ]);
    expect(store.getState().roster.map(r => r.displayName)).toEqual([
      'Synthesis',
      'Shop A',
      'Shop B',
    ]);
  });

  it('renders the derived values through the shell catalog inside the synthesis slot', async () => {
    const {processor, store, runner} = setup();
    await replayBeatOnCanvas(firstTurnOnly(SYNTHESIS_BEAT), {runner, store, paced: false});
    // The stage resolves its slots the way `CanvasApp` does; without the resolver every slot
    // renders empty.
    const resolve = (slot: string) =>
      renderSlotContent(processor, store.getState().placement.get(slot), 0);
    renderWithShell(
      <SlotContentContext.Provider value={resolve}>
        <CanvasStage processor={processor} state={store.getState()} />
      </SlotContentContext.Provider>,
    );
    const boundary = document.querySelector(`[data-surface="${SYNTHESIS_SURFACE}"]`);
    expect(boundary).not.toBeNull();
    // Every cell is complete: no marker, the bare value.
    expect(boundary!.querySelectorAll('[data-state="complete"]').length).toBe(8);
    expect(boundary!.querySelectorAll('[data-marker]').length).toBe(0);
    // The merged view's own text: labels from the fields, the best price the evaluator found.
    expect(boundary!.textContent).toContain('Best Price');
    expect(boundary!.textContent).toContain('899');
    expect(screen.getAllByText('899').length).toBeGreaterThanOrEqual(2);
  });

  it('marks cells stale on the bump, then clears them when the re-synthesis lands', async () => {
    const {store, runner, model} = setup();
    await replayBeatOnCanvas(firstTurnOnly(SYNTHESIS_BEAT), {runner, store, paced: false});

    // The action turn, batch by batch: the vendor's bump, then the new wiring at turn end.
    const reorder = SYNTHESIS_BEAT.turns[1];
    const turn = runner.begin({
      kind: 'surface-action',
      parent: null,
      forked: false,
      payload: {action: reorder.action as never},
    });
    const [bump, rewire] = reorder.batches;
    turn.apply(bump.messages, bump.stamp, bump.wiring);
    const stale = model()!.entities;
    expect(stale.every(e => e.shopA_price.stale && e.best_price.stale)).toBe(true);
    expect(stale.every(e => e.shopB_price.stale === undefined)).toBe(true);
    // Under the old wiring the join is silently re-pointed: Z6 now reads shop A's X100 price.
    turn.apply(rewire.messages, rewire.stamp, rewire.wiring);
    // Staged mode holds the repaint until the swap.
    expect(model()!.entities[0].best_price.stale).toBe(true);
    turn.end();
    const fresh = model()!.entities;
    expect(fresh.every(e => e.best_price.stale === undefined)).toBe(true);
    expect(fresh.map(e => e.name.value)).toEqual(['X100', 'Z6']);
    expect(fresh.map(e => e.best_price.value)).toEqual([899, 1899]);
  });

  it('a sort change re-orders in place: no round trip, no generation touched', async () => {
    const {processor, store, runner, synthesis, model} = setup();
    await replayBeatOnCanvas(SYNTHESIS_BEAT, {runner, store, paced: false});
    const before = store.getState().appliedSeq;
    processor.model
      .getSurface(SYNTHESIS_SURFACE)!
      .dataModel.set('/sort', {...model()!.sort, direction: 'desc'});
    await Promise.resolve();
    expect(model()!.entities.map(e => e.name.value)).toEqual(['Z6', 'X100']);
    expect(synthesis.generations).toEqual({'shop-a:list': 2, 'shop-b:list': 1});
    expect(store.getState().appliedSeq).toBe(before);
  });

  it('a two-way edit inside a storefront re-evaluates the merged view', async () => {
    const {processor, store, runner, model} = setup();
    await replayBeatOnCanvas(firstTurnOnly(SYNTHESIS_BEAT), {runner, store, paced: false});
    processor.model.getSurface(SHOP_A)!.dataModel.set('/items/0/price', 850);
    await Promise.resolve();
    expect(model()!.entities[0].best_price).toEqual({
      value: 850,
      contributed: 2,
      of: 2,
      absent: [],
    });
  });

  it('the next composition retires the synthesis with the one it replaces, and the timeline keeps it with its wiring', async () => {
    const {processor, store, runner, synthesis} = setup();
    await replayBeatOnCanvas(SYNTHESIS_BEAT, {runner, store, paced: false});
    await replayBeatOnCanvas(COMPOSED_BEAT, {runner, store, paced: false});

    expect(synthesis.wiring).toBeUndefined();
    expect(synthesis.generations).toEqual({});
    expect(processor.model.getSurface(SYNTHESIS_SURFACE)).toBeUndefined();
    const parked = store.getState().timeline[0];
    const fragment = parked.fragments?.find(f => f.surfaceId === SYNTHESIS_SURFACE);
    expect(fragment?.snapshot?.dataModel).toMatchObject({
      sort: {field: 'best_price', direction: 'asc'},
      entities: [{name: {value: 'X100'}}, {name: {value: 'Z6'}}],
    });
    // Captured beside the fragments: what a parked visit re-sorts with (task 4.8).
    expect(parked.synthesis).toMatchObject({
      surfaceId: SYNTHESIS_SURFACE,
      generations: {[SHOP_A]: 2, 'shop-b:list': 1},
    });
    expect(parked.synthesis?.wiring.fields.map(f => f.name)).toEqual(
      SYNTHESIS_BEAT.turns
        .at(-1)!
        .batches.at(-1)!
        .wiring!.fields.map(f => f.name),
    );
  });
});
