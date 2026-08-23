import type {A2uiMessage} from '@a2ui/web_core/v0_9';
import {applyA2uiMessages} from '../a2ui/applyMessages';
import type {A2uiMessageTarget} from '../a2ui/applyMessages';
import type {BeatTurn} from './beatFixtures';

export interface ReplayResult {
  /** Every message that failed to apply, paired with the error it raised. */
  failures: Array<{error: unknown; message: A2uiMessage}>;
  /** Agent prose the turn carried, in arrival order. */
  texts: string[];
}

/**
 * Replays a recorded turn into a processor, one batch at a time, in recorded order.
 *
 * Batch-at-a-time rather than one flattened array: a recorded batch is one A2A stream event,
 * and applying them separately is what the live client does — so a fixture exercises the same
 * incremental path (partially-streamed components included) that the agent produced it through.
 * Timing is not honoured here; a consumer that needs the pacing reads `offsetMs` itself.
 */
export function replayTurn(target: A2uiMessageTarget, turn: BeatTurn): ReplayResult {
  const failures: ReplayResult['failures'] = [];
  const texts: string[] = [];
  for (const batch of turn.batches) {
    texts.push(...batch.texts);
    if (batch.messages.length) {
      applyA2uiMessages(target, batch.messages, {
        onMessageError: (error, message) => failures.push({error, message}),
      });
    }
  }
  return {failures, texts};
}
