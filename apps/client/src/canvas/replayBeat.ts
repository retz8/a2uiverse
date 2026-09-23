/**
 * Drives a recorded beat fixture through the canvas turn runner — the zero-LLM verification
 * path. Each recorded turn runs as a real canvas
 * turn (begin → apply per batch → end), so the replay rehearses the same hold-and-swap gate,
 * paced by the recorded `offsetMs` by default; instant mode collapses the waits for tests and
 * the `&instant` query param.
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
 * the client sends it. The next utterance ends them all, as a live one does.
 */
import type {A2uiClientAction} from '@a2ui/web_core/v0_9';
import type {CompositionOperation} from '@a2uiverse/sdk';
import type {A2AMessageSender} from '../a2a/client';
import {isBesideTurn, type BeatFixture, type BeatTurn} from '../beats/beatFixtures';
import type {CanvasStore} from './canvasStore';
import {currentPaintId} from './canvasStore';
import {createReplayTransport} from './replayTransport';
import type {TurnHandle} from './turn/canvasTurn';
import type {PaintCause} from './timeline/paint';

/** What a beat's streams beside the turn replay through: the wiring's own. */
export interface ReplaySides {
  /** The press handler the button calls. */
  press(operation: CompositionOperation): Promise<void>;
  /** Answer every stream beside the turn from `sender` until the returned detach is called. */
  attachReplay(sender: A2AMessageSender): () => void;
}

export interface ReplayBeatOptions {
  /** The canvas turn runner; one turn per recorded turn, exactly as the live client runs. */
  runner: {begin(cause: PaintCause): TurnHandle};
  store: CanvasStore;
  /** Honour the recorded offsets (default); false applies everything immediately. */
  paced?: boolean;
  /** Required by a beat that carries a press or a failure report's answer. */
  sides?: ReplaySides;
}

const sleep = (ms: number) => new Promise<void>(resolve => setTimeout(resolve, ms));

function causeOf(turn: BeatTurn, store: CanvasStore): PaintCause {
  const state = store.getState();
  const parent = currentPaintId(state);
  const forked = state.viewing !== null;
  if (turn.kind === 'surface-action' && turn.action) {
    return {
      kind: 'surface-action',
      parent,
      forked,
      payload: {action: turn.action as unknown as A2uiClientAction},
    };
  }
  return {kind: 'utterance', parent, forked, payload: {text: turn.prompt}};
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
  {runner, store, paced = true, sides}: ReplayBeatOptions,
): Promise<void> {
  const groups = groupsOf(fixture);
  const needsSides = groups.some(g => g.beside.length > 0);
  if (needsSides && !sides) {
    throw new Error(`${fixture.name} carries streams beside its turns; replay it with the wiring`);
  }
  const transport = needsSides ? createReplayTransport(fixture.contextId) : undefined;
  const detach = transport && sides ? sides.attachReplay(transport.sender) : undefined;
  try {
    for (const group of groups) await replayGroup(group, {runner, store, paced, sides, transport});
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
  }: Required<Pick<ReplayBeatOptions, 'runner' | 'store' | 'paced'>> & {
    sides?: ReplaySides;
    transport?: ReturnType<typeof createReplayTransport>;
  },
): Promise<void> {
  transport?.queueReports(
    beside.filter(t => t.kind === 'failure-report'),
    paced,
  );
  const handle = runner.begin(causeOf(turn, store));
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
