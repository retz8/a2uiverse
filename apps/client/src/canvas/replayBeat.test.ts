/**
 * The canvas beat-replay driver (tasks 8.2 + 8.3): drives a recorded beat through the canvas
 * turn runner — one real turn per recorded turn — paced by the recorded offsets by default so
 * progressive rendering is observable, instant for tests and the `&instant` param.
 */
import {describe, it, expect, vi, afterEach} from 'vitest';
import type {A2uiMessage} from '@a2ui/web_core/v0_9';
import {createCanvasStore} from './canvasStore';
import type {TurnHandle} from './turn/canvasTurn';
import type {PaintCause} from './timeline/paint';
import {replayBeatOnCanvas} from './replayBeat';
import type {BeatFixture} from '../beats/beatFixtures';

const msg = (id: number) => ({version: 'v0.9', marker: id}) as unknown as A2uiMessage;

function fixture(overrides: Partial<BeatFixture> = {}): BeatFixture {
  return {
    name: 'beat-1-test',
    beat: 1,
    title: 'test beat',
    prompt: 'show me',
    model: 'test-model',
    recordedAt: '2026-08-14T00:00:00Z',
    contextId: 'ctx',
    chainedFrom: null,
    turns: [
      {
        taskId: 't1',
        kind: 'utterance',
        prompt: 'show me',
        action: null,
        outcome: 'completed',
        durationMs: 300,
        batches: [
          {offsetMs: 0, messages: [msg(1)], texts: []},
          {offsetMs: 100, messages: [msg(2)], texts: ['here you go']},
          {offsetMs: 250, messages: [], texts: ['done']},
        ],
      },
    ],
    ...overrides,
  };
}

/** A runner double that mirrors the real one's store lifecycle around each turn. */
function mockRunner(store: ReturnType<typeof createCanvasStore>) {
  const causes: PaintCause[] = [];
  const applied: A2uiMessage[][] = [];
  const begin = (cause: PaintCause): TurnHandle => {
    causes.push(cause);
    store.beginPaint('Generating…');
    return {
      signal: new AbortController().signal,
      canceled: false,
      apply: messages => applied.push(messages),
      acceptPaintMeta: () => {},
      end: () => store.endPaint(),
      cancel: () => {},
    };
  };
  return {begin, causes, applied};
}

afterEach(() => {
  vi.useRealTimers();
});

describe('replayBeatOnCanvas', () => {
  it('instant mode applies each non-empty batch separately, in order', async () => {
    const store = createCanvasStore();
    const runner = mockRunner(store);
    await replayBeatOnCanvas(fixture(), {runner, store, paced: false});
    expect(runner.applied).toEqual([[msg(1)], [msg(2)]]);
  });

  it('runs each recorded turn as one canvas turn with an utterance cause', async () => {
    const store = createCanvasStore();
    const runner = mockRunner(store);
    await replayBeatOnCanvas(fixture(), {runner, store, paced: false});
    expect(runner.causes).toEqual([
      {kind: 'utterance', parent: null, forked: false, payload: {text: 'show me'}},
    ]);
  });

  it('maps a surface-action turn to a surface-action cause with the live paint as parent', async () => {
    const store = createCanvasStore();
    // A live paint on the stage: entry #7 is the head and its surface occupies the stage.
    store.appendEntry({
      paintId: 7,
      surfaceId: 'stage',
      catalogId: 'primer',
      cause: {kind: 'utterance', parent: null, forked: false, payload: {text: 'earlier'}},
      paintedAt: 1000,
      snapshot: null,
    });
    store.setStage('stage');
    const runner = mockRunner(store);
    const beat = fixture();
    beat.turns = [
      {
        ...beat.turns[0],
        kind: 'surface-action',
        action: {name: 'open-issue', context: {}},
        batches: [{offsetMs: 0, messages: [msg(1)], texts: []}],
      },
    ];
    await replayBeatOnCanvas(beat, {runner, store, paced: false});
    expect(runner.causes).toEqual([
      {
        kind: 'surface-action',
        parent: 7,
        forked: false,
        payload: {action: {name: 'open-issue', context: {}}},
      },
    ]);
  });

  it('wraps the replay in a turn: in-flight during, settled after', async () => {
    const store = createCanvasStore();
    const causes: PaintCause[] = [];
    let inFlightDuringApply = false;
    const runner = {
      begin: (cause: PaintCause): TurnHandle => {
        causes.push(cause);
        store.beginPaint('Generating…');
        return {
          signal: new AbortController().signal,
          canceled: false,
          apply: () => {
            inFlightDuringApply = store.getState().inFlight !== null;
          },
          acceptPaintMeta: () => {},
          end: () => store.endPaint(),
          cancel: () => {},
        };
      },
    };
    await replayBeatOnCanvas(fixture(), {runner, store, paced: false});
    expect(inFlightDuringApply).toBe(true);
    expect(store.getState().inFlight).toBeNull();
  });

  it("accumulates a turn's agent texts into one growing ambient notice", async () => {
    // Recorded texts are stream fragments (a sentence can split mid-word across events), so the
    // notice shows the turn's accumulated prose — the same grouping the chat transcript does.
    const store = createCanvasStore();
    const runner = mockRunner(store);
    const seen: string[] = [];
    store.subscribe(() => {
      const notice = store.getState().notice;
      if (notice && seen[seen.length - 1] !== notice.text) seen.push(notice.text);
    });
    await replayBeatOnCanvas(fixture(), {runner, store, paced: false});
    expect(seen).toEqual(['here you go', 'here you godone']);
  });

  it('paced mode holds each batch until its recorded offset', async () => {
    vi.useFakeTimers();
    const store = createCanvasStore();
    const runner = mockRunner(store);
    const done = replayBeatOnCanvas(fixture(), {runner, store, paced: true});
    await vi.advanceTimersByTimeAsync(0);
    expect(runner.applied).toEqual([[msg(1)]]);
    await vi.advanceTimersByTimeAsync(99);
    expect(runner.applied).toEqual([[msg(1)]]);
    await vi.advanceTimersByTimeAsync(1);
    expect(runner.applied).toEqual([[msg(1)], [msg(2)]]);
    await vi.advanceTimersByTimeAsync(150);
    await done;
    expect(store.getState().inFlight).toBeNull();
  });

  it('replays every turn of a multi-turn fixture in order', async () => {
    const store = createCanvasStore();
    const runner = mockRunner(store);
    const multi = fixture();
    multi.turns = [
      {...multi.turns[0], batches: [{offsetMs: 0, messages: [msg(1)], texts: []}]},
      {...multi.turns[0], batches: [{offsetMs: 0, messages: [msg(2)], texts: []}]},
    ];
    await replayBeatOnCanvas(multi, {runner, store, paced: false});
    expect(runner.applied).toEqual([[msg(1)], [msg(2)]]);
    expect(runner.causes).toHaveLength(2);
  });
});
