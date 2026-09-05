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
 */
import type {A2uiClientAction} from '@a2ui/web_core/v0_9';
import type {BeatFixture, BeatTurn} from '../beats/beatFixtures';
import type {CanvasStore} from './canvasStore';
import {currentPaintId} from './canvasStore';
import type {TurnHandle} from './turn/canvasTurn';
import type {PaintCause} from './timeline/paint';

export interface ReplayBeatOptions {
  /** The canvas turn runner; one turn per recorded turn, exactly as the live client runs. */
  runner: {begin(cause: PaintCause): TurnHandle};
  store: CanvasStore;
  /** Honour the recorded offsets (default); false applies everything immediately. */
  paced?: boolean;
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

export async function replayBeatOnCanvas(
  fixture: BeatFixture,
  {runner, store, paced = true}: ReplayBeatOptions,
): Promise<void> {
  for (const turn of fixture.turns) {
    const handle = runner.begin(causeOf(turn, store));
    try {
      let elapsed = 0;
      for (const batch of turn.batches) {
        if (paced && batch.offsetMs > elapsed) {
          await sleep(batch.offsetMs - elapsed);
          elapsed = batch.offsetMs;
        }
        // Fresh objects per batch, as a real stream delivers them: the processor stores a
        // data-model value by reference, so replaying a fixture's own objects would let a
        // two-way edit or a later evaluation write back into the module-level fixture.
        if (batch.messages.length)
          handle.apply(structuredClone(batch.messages), batch.stamp, batch.synthesis);
        // Same buffering as the live path: the batch's stamp says whose line the chunk joins.
        const source = batch.stamp?.role === 'fragment' ? batch.stamp.source : null;
        for (const text of batch.texts) store.appendProse(source, text);
      }
    } finally {
      handle.end();
    }
  }
}
