/**
 * Drives a recorded beat fixture through the canvas turn runner — the zero-LLM verification
 * path. Each recorded turn runs as a real canvas
 * turn (begin → apply per batch → end), so the replay rehearses the same hold-and-swap gate,
 * paced by the recorded `offsetMs` by default; instant mode collapses the waits for tests and
 * the `&instant` query param.
 *
 * On the page (task-9.6 decision 14) every utterance turn opens a canvas of its own through the
 * wiring — a turn's `askedFrom` views that earlier canvas first, so the new one is its child — and
 * an action runs on the canvas last opened. A test over one runtime passes its runner and store
 * instead, and every turn runs there.
 *
 * A beat spans several canvases (task-9.8 decision 2): an action, a press, a view or a close names
 * its canvas by the ordinal of the utterance that opened it; a stream beside a turn that names none
 * acts on that turn's canvas. An utterance asked while the turn before it still streams runs beside
 * that turn, on its clock, on a canvas of its own; the user viewing a canvas and closing one are
 * steps on the same clock.
 *
 * Unlike `beats/replay.ts` (the bare apply-loop), this rehearses the full shell:
 * turn lifecycle around each turn, and the recorded agent prose routed into the ambient-notice
 * channel.
 *
 * The streams beside a turn (task-8.6 decisions 1, 2) run on the same clock as the turn they
 * belong to. A press fires at its recorded time through the press handler the button calls, and
 * the replay transport answers it with its recorded batches, each at its place on that clock — so
 * instant mode applies the turn's and the press's batches in the order they arrived. A failure
 * report is the client's own doing: the transport answers it with the next recorded answer when
 * the client sends it.
 */
import type {A2uiClientAction} from '@a2ui/web_core/v0_9';
import type {CompositionOperation} from '@a2uiverse/sdk';
import type {A2AMessageSender} from '../a2a/client';
import {isBesideTurn, type BeatFixture, type BeatTurn} from '../beats/beatFixtures';
import type {CanvasStore} from './canvasStore';
import {createReplayTransport} from './replayTransport';
import type {TurnHandle} from './turn/canvasTurn';
import type {PaintCause} from './turn/cause';

/** What a beat's streams beside the turn replay through: the wiring's own. */
export interface ReplaySides {
  /** The press handler the button calls, on the canvas `canvas` names — the one on screen without it. */
  press(operation: CompositionOperation, canvas?: string): Promise<void>;
  /** Answer every stream beside the turn from `sender` until the returned detach is called. */
  attachReplay(sender: A2AMessageSender): () => void;
}

/** One canvas's runner and store — where a turn runs. */
export interface ReplayRuntime {
  /** The canvas turn runner; one turn per recorded turn, exactly as the live client runs. */
  runner: {begin(cause: PaintCause): TurnHandle};
  store: CanvasStore;
}

/** The page's canvases: a replayed utterance opens one, as a real question does. */
export interface ReplayCanvases {
  openReplayCanvas(prompt: string): ReplayRuntime & {id: string};
  view(id: string): void;
  closeCanvas(id: string): void;
}

/** A canvas the beat opened: where its turns run. */
type OpenedCanvas = ReplayRuntime & {id?: string};

export interface ReplayBeatOptions extends Partial<ReplayRuntime> {
  /** The page's canvases; without them every turn runs on `runner` and `store`. */
  canvases?: ReplayCanvases;
  /** Honour the recorded offsets (default); false applies everything immediately. */
  paced?: boolean;
  /** Required by a beat that carries a press or a failure report's answer. */
  sides?: ReplaySides;
}

const sleep = (ms: number) => new Promise<void>(resolve => setTimeout(resolve, ms));

function causeOf(turn: BeatTurn): PaintCause {
  if (turn.kind === 'surface-action' && turn.action) {
    return {kind: 'surface-action', payload: {action: turn.action as unknown as A2uiClientAction}};
  }
  return {kind: 'utterance', payload: {text: turn.prompt}};
}

/** A turn and the streams beside it, in recorded order. */
function groupsOf(fixture: BeatFixture): Array<{turn: BeatTurn; beside: BeatTurn[]}> {
  const groups: Array<{turn: BeatTurn; beside: BeatTurn[]}> = [];
  for (const turn of fixture.turns) {
    if (!isBesideTurn(turn)) groups.push({turn, beside: []});
    else if (groups.length > 0) groups[groups.length - 1].beside.push(turn);
    else throw new Error(`${fixture.name}: a ${turn.kind} before any turn`);
  }
  return groups;
}

/** One step on a group's clock. At one instant the turn goes first, then the streams beside it in order. */
interface Step {
  at: number;
  rank: number;
  run(): void | Promise<void>;
}

export async function replayBeatOnCanvas(
  fixture: BeatFixture,
  {runner, store, canvases, paced = true, sides}: ReplayBeatOptions,
): Promise<void> {
  const groups = groupsOf(fixture);
  const needsSides = fixture.turns.some(t => t.kind === 'press' || t.kind === 'failure-report');
  if (needsSides && !sides) {
    throw new Error(`${fixture.name} carries streams beside its turns; replay it with the wiring`);
  }
  if (!canvases && !(runner && store)) {
    throw new Error(`${fixture.name}: replay it with the page's canvases or one runtime`);
  }
  if (!canvases && fixture.turns.some(spansCanvases)) {
    throw new Error(`${fixture.name} spans several canvases; replay it with the page's canvases`);
  }
  const transport = needsSides ? createReplayTransport(fixture.contextId) : undefined;
  const detach = transport && sides ? sides.attachReplay(transport.sender) : undefined;
  /** The canvases the beat's utterances opened, in order — what `askedFrom` and `canvas` index. */
  const opened: OpenedCanvas[] = [];
  const page: Page = {canvases, opened, fixture: fixture.name};
  let current: OpenedCanvas | undefined = runner && store ? {runner, store} : undefined;
  try {
    for (const group of groups) {
      if (canvases && group.turn.kind === 'utterance') current = openCanvas(page, group.turn);
      else if (group.turn.canvas !== undefined) current = canvasAt(page, group.turn.canvas);
      else if (opened.length > 0) current = opened.at(-1);
      if (!current) throw new Error(`${fixture.name}: a ${group.turn.kind} before any question`);
      await replayGroup(group, current, {page, paced, sides, transport});
    }
  } finally {
    detach?.();
  }
}

/** A turn that only a beat over the page's canvases can play. */
const spansCanvases = (turn: BeatTurn) =>
  turn.kind === 'view' ||
  turn.kind === 'close' ||
  turn.canvas !== undefined ||
  (turn.kind === 'utterance' && turn.atMs !== undefined);

/** The page a beat replays on, and the canvases it has opened there. */
interface Page {
  canvases?: ReplayCanvases;
  opened: OpenedCanvas[];
  fixture: string;
}

/** An utterance opens a canvas of its own, a child of the one `askedFrom` names when it names one. */
function openCanvas({canvases, opened}: Page, turn: BeatTurn): OpenedCanvas {
  const from = turn.askedFrom;
  const parent = from !== undefined ? opened[from]?.id : undefined;
  if (parent !== undefined) canvases!.view(parent);
  const runtime = canvases!.openReplayCanvas(turn.prompt);
  opened.push(runtime);
  return runtime;
}

function canvasAt({opened, fixture}: Page, ordinal: number): OpenedCanvas {
  const canvas = opened[ordinal];
  if (!canvas) throw new Error(`${fixture}: no canvas ${ordinal} opened yet`);
  return canvas;
}

/**
 * One turn's stream as steps from `at` on the group's clock: each batch applied through the turn
 * handle at its place, the turn ended at its last. `rank` orders it among the group's streams.
 */
function turnSteps(
  turn: BeatTurn,
  runtime: ReplayRuntime,
  at: number,
  rank: number,
  steps: Step[],
): {lastAt: number; end(): void} {
  let handle: TurnHandle | undefined;
  let ended = false;
  const end = () => {
    if (ended || !handle) return;
    ended = true;
    handle.end();
  };
  steps.push({at, rank, run: () => void (handle = runtime.runner.begin(causeOf(turn)))});
  turn.batches.forEach(batch => {
    steps.push({
      at: at + batch.offsetMs,
      rank,
      run: () => {
        // Fresh objects per batch, as a real stream delivers them: the processor stores a
        // data-model value by reference, so replaying a fixture's own objects would let a
        // two-way edit or a later evaluation write back into the module-level fixture.
        if (batch.messages.length)
          handle!.apply(structuredClone(batch.messages), batch.stamp, batch.synthesis);
        // Same buffering as the live path: the batch's stamp says whose line the chunk joins.
        const source = batch.stamp?.role === 'fragment' ? batch.stamp.source : null;
        for (const text of batch.texts) runtime.store.appendProse(source, text);
      },
    });
  });
  const lastAt = at + (turn.batches.at(-1)?.offsetMs ?? 0);
  steps.push({at: lastAt, rank, run: end});
  return {lastAt, end};
}

async function replayGroup(
  {turn, beside}: {turn: BeatTurn; beside: BeatTurn[]},
  runtime: OpenedCanvas,
  {
    page,
    paced,
    sides,
    transport,
  }: {
    page: Page;
    paced: boolean;
    sides?: ReplaySides;
    transport?: ReturnType<typeof createReplayTransport>;
  },
): Promise<void> {
  transport?.queueReports(
    beside.filter(t => t.kind === 'failure-report'),
    paced,
  );
  const steps: Step[] = [];
  const pressing: Promise<void>[] = [];
  const own = turnSteps(turn, runtime, 0, 0, steps);
  const ends = [own.end];
  const lastAt = own.lastAt;
  /** The canvas a stream beside the turn acts on: the one it names, else the turn's. */
  const canvasOf = (t: BeatTurn) => (t.canvas !== undefined ? canvasAt(page, t.canvas) : runtime);

  beside.forEach((t, i) => {
    const at = t.atMs ?? lastAt;
    const rank = 1 + i;
    if (t.kind === 'utterance') {
      // Asked while the turn still streams: a canvas of its own, opened when it is asked.
      let asked: OpenedCanvas | undefined;
      const lazy: ReplayRuntime = {
        runner: {begin: cause => (asked = openCanvas(page, t)).runner.begin(cause)},
        get store() {
          return asked!.store;
        },
      };
      ends.push(turnSteps(t, lazy, at, rank, steps).end);
    } else if (t.kind === 'view') {
      steps.push({at, rank, run: () => page.canvases!.view(canvasOf(t).id!)});
    } else if (t.kind === 'close') {
      steps.push({at, rank, run: () => page.canvases!.closeCanvas(canvasOf(t).id!)});
    }
  });

  beside.forEach((press, i) => {
    if (press.kind !== 'press' || !press.operation || !sides || !transport) return;
    const at = press.atMs ?? lastAt;
    const operation = press.operation;
    let channel: ReturnType<typeof transport.armPress> | undefined;
    steps.push({
      at,
      rank: 1 + i,
      run: () => {
        channel = transport.armPress();
        const pressed = sides.press(operation, canvasOf(press).id);
        pressing.push(pressed);
        // A press the handler refused to send is read by nothing.
        void pressed.finally(() => channel?.abandon());
      },
    });
    for (const batch of press.batches) {
      steps.push({at: at + batch.offsetMs, rank: 1 + i, run: () => channel?.push(batch)});
    }
    const closeAt = at + (press.batches.at(-1)?.offsetMs ?? 0);
    steps.push({at: closeAt, rank: 1 + i, run: () => channel?.close()});
  });

  // Stable: equal times keep the turn's own order, then each stream's beside it.
  steps.sort((a, b) => a.at - b.at || a.rank - b.rank);
  try {
    let elapsed = 0;
    for (const step of steps) {
      if (paced && step.at > elapsed) {
        await sleep(step.at - elapsed);
        elapsed = step.at;
      }
      await step.run();
    }
  } finally {
    for (const end of ends) end();
  }
  if (!transport) return;
  await Promise.allSettled(pressing);
  // A failure report goes out once the turn has ended; its answer plays out before the next turn.
  await sleep(0);
  await transport.settled();
}
