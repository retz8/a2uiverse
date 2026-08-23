/**
 * Drives a recorded beat (task 8.1 fixture) through the canvas turn runner — the zero-LLM
 * verification path of phase-8 spec decision 17. Each recorded turn runs as a real canvas
 * turn (begin → apply per batch → end), so the replay rehearses the same hold-and-swap gate,
 * paced by the recorded `offsetMs` by default; instant mode collapses the waits for tests and
 * the `&instant` query param.
 *
 * Unlike `beats/replay.ts` (the 8.1 gate's bare apply-loop), this rehearses the full shell:
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
      // Recorded texts are stream fragments (a sentence can split mid-word across events), so
      // the notice carries the turn's accumulated prose — the same grouping the chat transcript
      // uses — rather than one flickering notice per fragment.
      let prose = '';
      for (const batch of turn.batches) {
        if (paced && batch.offsetMs > elapsed) {
          await sleep(batch.offsetMs - elapsed);
          elapsed = batch.offsetMs;
        }
        if (batch.messages.length) handle.apply(batch.messages);
        for (const text of batch.texts) {
          prose += text;
          if (prose.trim()) store.showNotice(prose);
        }
      }
    } finally {
      handle.end();
    }
  }
}
