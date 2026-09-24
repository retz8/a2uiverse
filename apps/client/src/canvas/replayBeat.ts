/**
 * Drives a recorded beat fixture through the canvas turn runner — the zero-LLM verification
 * path. Each recorded turn runs as a real canvas
 * turn (begin → apply per batch → end), so the replay rehearses the same hold-and-swap gate,
 * paced by the recorded `offsetMs` by default; instant mode collapses the waits for tests and
 * the `&instant` query param.
 *
 * On the page (task-9.6 decision 14) every utterance turn opens a canvas of its own through the
 * wiring — a turn's `askedFrom` views that earlier canvas first, so the new one is its child — and
 * an action or press runs on the canvas last opened. A test over one runtime passes its runner
 * and store instead, and every turn runs there.
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
  /** The press handler the button calls. */
  press(operation: CompositionOperation): Promise<void>;
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
}

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

/** One step on a group's clock. At one instant the turn goes first, then the presses in order. */
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
  const needsSides = groups.some(g => g.beside.length > 0);
  if (needsSides && !sides) {
    throw new Error(`${fixture.name} carries streams beside its turns; replay it with the wiring`);
  }
  if (!canvases && !(runner && store)) {
    throw new Error(`${fixture.name}: replay it with the page's canvases or one runtime`);
  }
  const transport = needsSides ? createReplayTransport(fixture.contextId) : undefined;
  const detach = transport && sides ? sides.attachReplay(transport.sender) : undefined;
  /** The canvases the beat's utterances opened, in order — what `askedFrom` indexes. */
  const opened: string[] = [];
  let current: ReplayRuntime | undefined = runner && store ? {runner, store} : undefined;
  try {
    for (const group of groups) {
      if (canvases && group.turn.kind === 'utterance') {
        const from = group.turn.askedFrom;
        if (from !== undefined && opened[from] !== undefined) canvases.view(opened[from]);
        const runtime = canvases.openReplayCanvas(group.turn.prompt);
        opened.push(runtime.id);
        current = runtime;
      }
      if (!current) throw new Error(`${fixture.name}: a ${group.turn.kind} before any question`);
      await replayGroup(group, {...current, paced, sides, transport});
    }
  } finally {
    detach?.();
  }
}

async function replayGroup(
  {turn, beside}: {turn: BeatTurn; beside: BeatTurn[]},
  {
    runner,
    store,
    paced,
    sides,
    transport,
  }: ReplayRuntime & {
    paced: boolean;
    sides?: ReplaySides;
    transport?: ReturnType<typeof createReplayTransport>;
  },
): Promise<void> {
  transport?.queueReports(
    beside.filter(t => t.kind === 'failure-report'),
    paced,
  );
  const handle = runner.begin(causeOf(turn));
  const steps: Step[] = [];
  const pressing: Promise<void>[] = [];
  let ended = false;
  const end = () => {
    if (ended) return;
    ended = true;
    handle.end();
  };

  turn.batches.forEach(batch => {
    steps.push({
      at: batch.offsetMs,
      rank: 0,
      run: () => {
        // Fresh objects per batch, as a real stream delivers them: the processor stores a
        // data-model value by reference, so replaying a fixture's own objects would let a
        // two-way edit or a later evaluation write back into the module-level fixture.
        if (batch.messages.length)
          handle.apply(structuredClone(batch.messages), batch.stamp, batch.synthesis);
        // Same buffering as the live path: the batch's stamp says whose line the chunk joins.
        const source = batch.stamp?.role === 'fragment' ? batch.stamp.source : null;
        for (const text of batch.texts) store.appendProse(source, text);
      },
    });
  });
  const lastAt = turn.batches.at(-1)?.offsetMs ?? 0;
  steps.push({at: lastAt, rank: 1, run: end});

  beside.forEach((press, i) => {
    if (press.kind !== 'press' || !press.operation || !sides || !transport) return;
    const at = press.atMs ?? lastAt;
    const operation = press.operation;
    let channel: ReturnType<typeof transport.armPress> | undefined;
    steps.push({
      at,
      rank: 2 + i,
      run: () => {
        channel = transport.armPress();
        const pressed = sides.press(operation);
        pressing.push(pressed);
        // A press the handler refused to send is read by nothing.
        void pressed.finally(() => channel?.abandon());
      },
    });
    for (const batch of press.batches) {
      steps.push({at: at + batch.offsetMs, rank: 2 + i, run: () => channel?.push(batch)});
    }
    const closeAt = at + (press.batches.at(-1)?.offsetMs ?? 0);
    steps.push({at: closeAt, rank: 2 + i, run: () => channel?.close()});
  });

  // Stable: equal times keep the turn's own order, then each press's.
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
    end();
  }
  if (!transport) return;
  await Promise.allSettled(pressing);
  // A failure report goes out once the turn has ended; its answer plays out before the next turn.
  await sleep(0);
  await transport.settled();
}
