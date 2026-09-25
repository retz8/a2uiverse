import type {A2uiMessage} from '@a2ui/web_core/v0_9';
import type {CompositionOperation, CompositionStamp, SynthesisPayload} from '@a2uiverse/sdk';

/**
 * One streamed batch as the client received it: the A2UI messages and the agent prose carried
 * by a single A2A stream event. Replaying a batch is the same as receiving that event.
 */
export interface BeatBatch {
  /** Milliseconds from the start of the turn — what makes a replay a stream and not a dump. */
  offsetMs: number;
  messages: A2uiMessage[];
  texts: string[];
  /**
   * The event's composition stamp, when it came through a composing hub — without it a recorded
   * composition would replay as a pile of unrelated stage paints. Absent in pre-composition
   * fixtures, which replay as shell paints exactly as they always did.
   */
  stamp?: CompositionStamp;
  /** The synthesis payload beside the stamp, on the one batch that paints the merged view. */
  synthesis?: SynthesisPayload;
}

/**
 * What one prompt produced. `outcome` is `completed` for a paint, `apology`/`unavailable` otherwise.
 *
 * A `press` or a `failure-report` is a stream beside the turn (task-8.6 decision 1): the reader's
 * Retry, Include, Try again or step, or the hub's answer to the client's report of a fragment it
 * could not draw. It belongs to the utterance or action before it, and `atMs` says when it was
 * sent, measured from the start of that turn; its batches' offsets are measured from its own send.
 *
 * A beat spans several canvases (task-9.8 decision 2). A `view` or a `close` is the user viewing or
 * closing a canvas, beside the turn at `atMs`, nothing streamed; an utterance with an `atMs` was
 * asked while the turn before it was still streaming, and runs beside it on that turn's clock.
 */
export interface BeatTurn {
  taskId: string | null;
  kind: 'utterance' | 'surface-action' | 'press' | 'failure-report' | 'view' | 'close';
  prompt: string;
  action: Record<string, unknown> | null;
  /** A press's composition operation. */
  operation?: CompositionOperation;
  /** A stream beside the turn: when it was sent, from the start of the turn it runs beside. */
  atMs?: number;
  /**
   * An utterance asked from a past canvas (task-9.6 decision 14): the ordinal, among the beat's
   * utterance turns, of the canvas on screen when it was asked. Absent, it was asked from live.
   */
  askedFrom?: number;
  /**
   * The canvas an action, a press, a view or a close acts on (task-9.8 decision 2): the ordinal,
   * among the beat's utterance turns, of the canvas it opened. Absent, a stream beside a turn acts
   * on that turn's canvas, and an action on the canvas last opened.
   */
  canvas?: number;
  batches: BeatBatch[];
  outcome: string;
  durationMs: number;
}

/**
 * What runs beside the turn before it: a press, a failure report's answer, a view, a close, and an
 * utterance asked while that turn was still streaming.
 */
export const isBesideTurn = (turn: BeatTurn) =>
  turn.kind === 'press' ||
  turn.kind === 'failure-report' ||
  turn.kind === 'view' ||
  turn.kind === 'close' ||
  (turn.kind === 'utterance' && turn.atMs !== undefined);

/**
 * The orchestrator's deadlines a beat was recorded under (task-8.6 decision 4), from its
 * environment: a beat that reaches the hard cap is recorded under a short one.
 */
export interface BeatDeadlines {
  softDeadlineSeconds: number;
  hardCapSeconds: number;
}

/**
 * A recorded beat: one live agent turn, kept as the stream it arrived as.
 *
 * Recorded so the canvas shell's verification runs deterministically with zero LLM calls.
 * These are message logs, deliberately NOT the materialized snapshots the timeline stores —
 * the two artifacts have different jobs and are never conflated.
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
  /** Set when the recorder started the orchestrator itself, so it knows them. */
  deadlines?: BeatDeadlines;
  /** The AgentsPool's fault map the beat was recorded under (`A2UIVERSE_FAULTS`), when any. */
  faults?: Record<string, unknown>;
  turns: BeatTurn[];
}

// The recordings live in `apps/client/recordings/beats/` and are bundled through the glob, so
// there is no copy or sync step and a re-recorded beat is picked up automatically.
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
