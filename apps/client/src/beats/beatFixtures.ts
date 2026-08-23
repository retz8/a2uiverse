import type {A2uiMessage} from '@a2ui/web_core/v0_9';

/**
 * One streamed batch as the client received it: the A2UI messages and the agent prose carried
 * by a single A2A stream event. Replaying a batch is the same as receiving that event.
 */
export interface BeatBatch {
  /** Milliseconds from the start of the turn — what makes a replay a stream and not a dump. */
  offsetMs: number;
  messages: A2uiMessage[];
  texts: string[];
}

/** What one prompt produced. `outcome` is `completed` for a paint, `apology`/`unavailable` otherwise. */
export interface BeatTurn {
  taskId: string | null;
  kind: 'utterance' | 'surface-action';
  prompt: string;
  action: Record<string, unknown> | null;
  batches: BeatBatch[];
  outcome: string;
  durationMs: number;
}

/**
 * A recorded beat: one live agent turn, kept as the stream it arrived as.
 *
 * Recorded by task 8.1 (`agent/scripts/record_beats.py`) so the canvas shell's verification
 * runs deterministically with zero LLM calls, per phase-8 spec decision 17. These are message
 * logs, deliberately NOT the materialized snapshots the timeline stores (decision 12) — the
 * two artifacts have different jobs and are never conflated.
 */
export interface BeatFixture {
  name: string;
  beat: number;
  title: string;
  prompt: string;
  model: string;
  recordedAt: string;
  contextId: string;
  /** Set when the beat was recorded as a follow-up inside another beat's conversation. */
  chainedFrom: string | null;
  turns: BeatTurn[];
}

// Same mechanism the examples page uses for the agent's curated corpus: the recordings live in
// the sibling `agent/` subproject (outside the yarn workspace) and are bundled through the glob,
// so there is no copy or sync step and a re-recorded beat is picked up automatically.
const modules = import.meta.glob<{default: BeatFixture}>('../../recordings/beats/*.json', {
  eager: true,
});

/** Every recorded beat, in beat order. */
export const BEAT_FIXTURES: BeatFixture[] = Object.values(modules)
  .map(m => m.default)
  .sort((a, b) => a.beat - b.beat);

/** Resolve a beat number to its fixture. */
export function getBeatFixture(beat: number): BeatFixture | undefined {
  return BEAT_FIXTURES.find(f => f.beat === beat);
}

/** Every A2UI message of a turn, flattened in arrival order — the turn as one batch. */
export function messagesOf(turn: BeatTurn): A2uiMessage[] {
  return turn.batches.flatMap(b => b.messages);
}
