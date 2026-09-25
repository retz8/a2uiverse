/**
 * The canvas beat-replay driver: drives a recorded beat through the canvas
 * turn runner — one real turn per recorded turn — paced by the recorded offsets by default so
 * progressive rendering is observable, instant for tests and the `&instant` param.
 */
import {describe, it, expect, vi, afterEach} from 'vitest';
import type {A2uiMessage} from '@a2ui/web_core/v0_9';
import {createCanvasStore} from './canvasStore';
import type {TurnHandle} from './turn/canvasTurn';
import type {PaintCause} from './turn/cause';
import {replayBeatOnCanvas, type ReplaySides} from './replayBeat';
import type {BeatFixture, BeatTurn} from '../beats/beatFixtures';
import type {A2AMessageSender} from '../a2a/client';
import {buildOperationMessageParams, extractA2uiMessagesFromEvent} from '../a2a/messages';

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
    store.beginPaint();
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
    expect(runner.causes).toEqual([{kind: 'utterance', payload: {text: 'show me'}}]);
  });

  it('maps a surface-action turn to a surface-action cause', async () => {
    const store = createCanvasStore();
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
      {kind: 'surface-action', payload: {action: {name: 'open-issue', context: {}}}},
    ]);
  });

  it('wraps the replay in a turn: in-flight during, settled after', async () => {
    const store = createCanvasStore();
    const causes: PaintCause[] = [];
    let inFlightDuringApply = false;
    const runner = {
      begin: (cause: PaintCause): TurnHandle => {
        causes.push(cause);
        store.beginPaint();
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

  it("accumulates a turn's agent texts into one growing line", async () => {
    // Recorded texts are stream fragments (a sentence can split mid-word across events), so the
    // line shows the turn's accumulated prose — the same grouping the chat transcript does.
    const store = createCanvasStore();
    const runner = mockRunner(store);
    const seen: string[] = [];
    store.subscribe(() => {
      const notice = store.getState().notices[0];
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

  describe('on the page (task-9.6 decision 14)', () => {
    /** The page's canvases: each opened utterance its own runner and store. */
    function canvases() {
      const opened: Array<{id: string; prompt: string; runner: ReturnType<typeof mockRunner>}> = [];
      const viewed: string[] = [];
      const closed: string[] = [];
      /** Everything the page saw, in order: each canvas opened, viewed or closed, each batch applied. */
      const log: string[] = [];
      const page = {
        openReplayCanvas(prompt: string) {
          const store = createCanvasStore();
          const runner = mockRunner(store);
          const id = `c${opened.length + 1}`;
          opened.push({id, prompt, runner});
          log.push(`open ${id}`);
          const begin = (cause: PaintCause): TurnHandle => {
            const handle = runner.begin(cause);
            return {
              ...handle,
              apply: (messages, ...rest) => {
                log.push(`${id} ${(messages[0] as unknown as {marker: number}).marker}`);
                handle.apply(messages, ...rest);
              },
            };
          };
          return {id, runner: {begin}, store};
        },
        view(id: string) {
          viewed.push(id);
          log.push(`view ${id}`);
        },
        closeCanvas(id: string) {
          closed.push(id);
          log.push(`close ${id}`);
        },
      };
      return {page, opened, viewed, closed, log};
    }

    const event = (kind: 'view' | 'close', canvas: number, atMs: number): BeatTurn => ({
      taskId: null,
      kind,
      prompt: '',
      action: null,
      canvas,
      atMs,
      batches: [],
      outcome: 'completed',
      durationMs: 0,
    });

    it('every utterance opens a canvas of its own; an action runs on the one last opened', async () => {
      const {page, opened} = canvases();
      const multi = fixture();
      multi.turns = [
        {...multi.turns[0], batches: [{offsetMs: 0, messages: [msg(1)], texts: []}]},
        {
          ...multi.turns[0],
          kind: 'surface-action',
          action: {name: 'open', context: {}},
          batches: [{offsetMs: 0, messages: [msg(2)], texts: []}],
        },
        {
          ...multi.turns[0],
          prompt: 'and then',
          batches: [{offsetMs: 0, messages: [msg(3)], texts: []}],
        },
      ];
      await replayBeatOnCanvas(multi, {canvases: page, paced: false});
      expect(opened.map(c => c.prompt)).toEqual(['show me', 'and then']);
      expect(opened[0].runner.applied).toEqual([[msg(1)], [msg(2)]]);
      expect(opened[1].runner.applied).toEqual([[msg(3)]]);
    });

    it('a turn asked from an earlier canvas views it first, so the new one is its child', async () => {
      const {page, opened, viewed} = canvases();
      const multi = fixture();
      multi.turns = [
        {...multi.turns[0], batches: [{offsetMs: 0, messages: [msg(1)], texts: []}]},
        {
          ...multi.turns[0],
          prompt: 'second',
          batches: [{offsetMs: 0, messages: [msg(2)], texts: []}],
        },
        {
          ...multi.turns[0],
          prompt: 'from the first',
          askedFrom: 0,
          batches: [{offsetMs: 0, messages: [msg(3)], texts: []}],
        },
      ];
      await replayBeatOnCanvas(multi, {canvases: page, paced: false});
      expect(viewed).toEqual([opened[0].id]);
      expect(opened[2].runner.applied).toEqual([[msg(3)]]);
    });

    it('an utterance asked while the turn streams opens its canvas at its time, on that turn’s clock (task-9.8 decision 2)', async () => {
      const {page, log} = canvases();
      const beat = fixture();
      beat.turns = [
        {
          ...beat.turns[0],
          batches: [
            {offsetMs: 0, messages: [msg(1)], texts: []},
            {offsetMs: 300, messages: [msg(2)], texts: []},
          ],
        },
        {
          ...beat.turns[0],
          prompt: 'meanwhile',
          atMs: 100,
          batches: [
            {offsetMs: 0, messages: [msg(10)], texts: []},
            {offsetMs: 100, messages: [msg(11)], texts: []},
          ],
        },
        event('view', 0, 400),
      ];
      await replayBeatOnCanvas(beat, {canvases: page, paced: false});
      expect(log).toEqual(['open c1', 'c1 1', 'open c2', 'c2 10', 'c2 11', 'c1 2', 'view c1']);
    });

    it('a close lands at its time; what the closed canvas’s stream carries after is its own to drop', async () => {
      const {page, closed, log} = canvases();
      const beat = fixture();
      beat.turns = [
        {
          ...beat.turns[0],
          batches: [
            {offsetMs: 0, messages: [msg(1)], texts: []},
            {offsetMs: 200, messages: [msg(2)], texts: []},
          ],
        },
        event('close', 0, 100),
      ];
      await replayBeatOnCanvas(beat, {canvases: page, paced: false});
      expect(closed).toEqual(['c1']);
      expect(log).toEqual(['open c1', 'c1 1', 'close c1', 'c1 2']);
    });

    it('an action names its canvas; a press beside it acts there', async () => {
      const {page, opened} = canvases();
      const pressedOn: Array<string | undefined> = [];
      const sidesOnPage: ReplaySides = {
        attachReplay: () => () => {},
        press: async (_operation, canvas) => {
          pressedOn.push(canvas);
        },
      };
      const beat = fixture();
      beat.turns = [
        {...beat.turns[0], batches: [{offsetMs: 0, messages: [msg(1)], texts: []}]},
        {
          ...beat.turns[0],
          prompt: 'second',
          batches: [{offsetMs: 0, messages: [msg(2)], texts: []}],
        },
        {
          ...beat.turns[0],
          kind: 'surface-action',
          action: {name: 'open', context: {}},
          canvas: 0,
          batches: [{offsetMs: 0, messages: [msg(3)], texts: []}],
        },
        {
          taskId: 'p',
          kind: 'press',
          prompt: '',
          action: null,
          operation: {kind: 'retry', sources: ['gmail']},
          atMs: 10,
          batches: [],
          outcome: 'completed',
          durationMs: 0,
        },
      ];
      await replayBeatOnCanvas(beat, {canvases: page, paced: false, sides: sidesOnPage});
      expect(opened[0].runner.applied).toEqual([[msg(1)], [msg(3)]]);
      expect(opened[1].runner.applied).toEqual([[msg(2)]]);
      expect(pressedOn).toEqual(['c1']);
    });

    it('refuses a beat spanning canvases over one runtime', async () => {
      const store = createCanvasStore();
      const beat = fixture();
      beat.turns = [...beat.turns, event('view', 0, 0)];
      await expect(
        replayBeatOnCanvas(beat, {runner: mockRunner(store), store, paced: false}),
      ).rejects.toThrow(/several canvases/);
    });

    it('refuses a beat with neither the page nor a runtime', async () => {
      await expect(replayBeatOnCanvas(fixture(), {paced: false})).rejects.toThrow(/runtime/);
    });
  });

  describe('a press beside the turn (task 8.6)', () => {
    const include = {kind: 'include' as const, sources: ['gmail']};
    const pressTurn = (atMs: number, offsets: number[]): BeatTurn => ({
      taskId: 'p1',
      kind: 'press',
      prompt: '',
      action: null,
      operation: include,
      atMs,
      outcome: 'completed',
      durationMs: offsets.at(-1) ?? 0,
      batches: offsets.map((offsetMs, i) => ({offsetMs, messages: [msg(100 + i)], texts: []})),
    });

    /** Sides whose press reads its answer from the attached sender, as the wiring's does. */
    function sides(log: A2uiMessage[][]) {
      let sender: A2AMessageSender | null = null;
      const pressed: unknown[] = [];
      const value: ReplaySides = {
        attachReplay: attached => {
          sender = attached;
          return () => {
            sender = null;
          };
        },
        press: async operation => {
          pressed.push(operation);
          for await (const event of sender!.sendMessageStream(
            buildOperationMessageParams(operation),
          )) {
            const messages = extractA2uiMessagesFromEvent(event);
            if (messages.length) log.push(messages);
          }
        },
      };
      return {value, pressed, detached: () => sender === null};
    }

    it('fires through the press handler at its time, its batches on the turn’s clock', async () => {
      const store = createCanvasStore();
      const runner = mockRunner(store);
      const {value, pressed, detached} = sides(runner.applied);
      const beat = fixture();
      beat.turns = [...beat.turns, pressTurn(50, [0, 100])];
      await replayBeatOnCanvas(beat, {runner, store, paced: false, sides: value});
      // The press at 50 answers at 50 and 150: between the turn's batches at 0 and 100, then after.
      expect(runner.applied).toEqual([[msg(1)], [msg(100)], [msg(2)], [msg(101)]]);
      expect(pressed).toEqual([include]);
      expect(detached()).toBe(true);
    });

    it('a beat carrying one is refused without the wiring', async () => {
      const store = createCanvasStore();
      const beat = fixture();
      beat.turns = [...beat.turns, pressTurn(0, [0])];
      await expect(
        replayBeatOnCanvas(beat, {runner: mockRunner(store), store, paced: false}),
      ).rejects.toThrow(/beside its turns/);
    });

    it('a press the handler never sends leaves nothing waiting', async () => {
      const store = createCanvasStore();
      const runner = mockRunner(store);
      const refusing: ReplaySides = {attachReplay: () => () => {}, press: async () => {}};
      const beat = fixture();
      beat.turns = [...beat.turns, pressTurn(300, [0, 10])];
      await replayBeatOnCanvas(beat, {runner, store, paced: false, sides: refusing});
      expect(runner.applied).toEqual([[msg(1)], [msg(2)]]);
    });
  });
});
