/**
 * One stream event → the `BeatBatch` the canvas replays: the A2UI messages, the agent prose,
 * the composition stamp and — on the one event that paints the merged view — the synthesis
 * payload beside it (task 5.7 decision 11). An event carrying neither messages nor prose is
 * not a batch.
 */
import type {BeatBatch} from '../../src/beats/beatFixtures';
import {
  extractA2uiMessagesFromEvent,
  extractAgentTextFromEvent,
  extractStampFromEvent,
  extractSynthesisFromEvent,
  type A2AStreamEventData,
} from '../../src/a2a/messages';

export function batchOf(event: A2AStreamEventData, atMs: number): BeatBatch | undefined {
  const messages = extractA2uiMessagesFromEvent(event);
  const texts = extractAgentTextFromEvent(event);
  if (!messages.length && !texts.length) return undefined;
  // The stamp is what makes a recorded composition replay as one: which slot each fragment
  // fills lives on the event, not in the A2UI it carries. The synthesis payload rides the
  // same envelope.
  const stamp = extractStampFromEvent(event);
  const synthesis = extractSynthesisFromEvent(event);
  return {
    offsetMs: atMs,
    messages,
    texts,
    ...(stamp ? {stamp} : {}),
    ...(synthesis ? {synthesis} : {}),
  };
}
