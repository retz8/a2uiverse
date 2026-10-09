/**
 * The transition gate: the synthetic fixtures (the wire shapes the recordings lack) and
 * cancellation, driven through the real store + turn runner + replay driver — zero LLM calls.
 */
import {describe, it, expect, vi, afterEach} from 'vitest';
import {MessageProcessor} from '@a2ui/web_core/v0_9';
import {createCanvasStore} from '../src/canvas/canvasStore';
import {createTurnRunner} from '../src/canvas/turn/canvasTurn';
import {replayBeatOnCanvas} from '../src/canvas/replayBeat';
import {
  PLAIN_PAINT_BEAT,
  VALIDATION_FAILURE_BEAT,
  QUESTION_BEAT,
} from '../src/beats/syntheticBeats';
import {snapshotCatalog} from './snapshot';

const {catalog: CATALOG} = await snapshotCatalog('github-catalog');

function setup() {
  const processor = new MessageProcessor([CATALOG]);
  const store = createCanvasStore();
  const runner = createTurnRunner({
    processor,
    store,
    createStaging: () => new MessageProcessor([CATALOG]),
  });
  return {processor, store, runner};
}

afterEach(() => {
  vi.useRealTimers();
});

describe('validation-failure turn (partial paint → cleanup delete → final)', () => {
  it('over an occupied stage: the failed paint never reaches the stage, which holds', async () => {
    const {processor, store, runner} = setup();
    await replayBeatOnCanvas(PLAIN_PAINT_BEAT, {runner, store, paced: false});
    const held = store.getState().stageId;

    await replayBeatOnCanvas(VALIDATION_FAILURE_BEAT, {runner, store, paced: false});

    const state = store.getState();
    expect(state.stageId).toBe(held);
    expect(state.error).toMatch(/keeping the current view/);
    expect(state.inFlight).toBeNull();
    expect(processor.model.getSurface('doomed-view')).toBeFalsy();
    expect(Array.from(processor.model.surfacesMap.keys())).toEqual([held]);
  });

  it('over the empty canvas: the progressive paint blanks back to empty with the notice', async () => {
    const {processor, store, runner} = setup();

    await replayBeatOnCanvas(VALIDATION_FAILURE_BEAT, {runner, store, paced: false});

    const state = store.getState();
    expect(state.stageId).toBeNull();
    expect(state.error).toMatch(/withdrawn/);
    // The agent's apology prose still reaches the ambient channel.
    expect(state.notices[0]?.text).toMatch(/could not build/);
    expect(processor.model.getSurface('doomed-view')).toBeFalsy();
  });
});

describe('question paint (declared kind="question")', () => {
  it('swaps in as the stage like any paint (task-12.13 decision 37)', async () => {
    const {processor, store, runner} = setup();
    await replayBeatOnCanvas(PLAIN_PAINT_BEAT, {runner, store, paced: false});

    await replayBeatOnCanvas(QUESTION_BEAT, {runner, store, paced: false});

    expect(store.getState().stageId).toBe('which-repo');
    expect(Array.from(processor.model.surfacesMap.keys())).toEqual(['which-repo']);
  });
});

describe('cancel mid-stream (last-intent-wins)', () => {
  it('a paced replay canceled between batches is discarded wholesale', async () => {
    vi.useFakeTimers();
    const {processor, store, runner} = setup();
    await replayBeatOnCanvas(PLAIN_PAINT_BEAT, {runner, store, paced: false});
    const held = store.getState().stageId;

    const replay = replayBeatOnCanvas(VALIDATION_FAILURE_BEAT, {runner, store, paced: true});
    await vi.advanceTimersByTimeAsync(120);
    const inFlightTurn = runner.current;
    expect(inFlightTurn).not.toBeNull();
    inFlightTurn?.cancel();
    expect(inFlightTurn?.signal.aborted).toBe(true);

    await vi.advanceTimersByTimeAsync(500);
    await replay;

    const state = store.getState();
    expect(state.stageId).toBe(held);
    expect(state.inFlight).toBeNull();
    expect(processor.model.getSurface('doomed-view')).toBeFalsy();
  });
});
