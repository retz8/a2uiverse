/**
 * The beats the recorder drives. Beats 1–3 come from
 * `a2ui-github/agent/scripts/record_beats.py`, with one change: beat 2 opens #233 — the head of
 * the stub backend's PR list — where the source opens live GitHub's #2123, which the stub does
 * not carry. Every beat is recorded through the composing hub, so 1–3 are one-slot composed
 * turns rather than the bare relays their pre-composition recordings captured.
 *
 * Beats 10–18 are Phase 8's cases over the deterministic roster (task-8.6 decisions 3, 5): beat 5's
 * utterance where every source is a peer, beat 9's where the join has a home source — Linear.
 */
import type {CompositionOperation} from '@a2uiverse/sdk';
import type {BeatBatch} from '../../src/beats/beatFixtures';

export interface BeatSpec {
  beat: number;
  slug: string;
  title: string;
  prompt: string;
  /** Sent inside the previous beat's conversation. */
  chains?: boolean;
  /** Recorded under the fault map, through an orchestrator the recorder starts for it. */
  fault?: FaultCase;
}

/**
 * A Phase 8 case (task-8.6 decisions 3–5): the AgentsPool's fault map the turn runs under, the
 * deadlines, the reader's presses and the client's report — and what the recording must show,
 * since the Planner and the Synthesizer are live models and a turn may take another path.
 */
export interface FaultCase {
  /** `A2UIVERSE_FAULTS`: app id → fault. A fault on a source the plan leaves out does nothing. */
  faults: Record<string, {fault: string; seconds?: number; message?: string; every?: boolean}>;
  /** Shortened for a beat that reaches the hard cap; the orchestrator's default otherwise. */
  hardCapSeconds?: number;
  /** Each sent on a stream of its own once the turn's final came and `atLeastMs` passed since its send. */
  presses?: Array<{operation: CompositionOperation; atLeastMs?: number}>;
  /** The source whose paint the fault map made one the client cannot draw: reported as the canvas does. */
  report?: string;
  /** What the recording must show, as words for the log; `undefined` when it does. */
  shows(recorded: RecordedCase): string | undefined;
}

/** A case as recorded: the turn's batches, then each stream beside it. */
export interface RecordedCase {
  turn: BeatBatch[];
  presses: BeatBatch[][];
  report: BeatBatch[] | undefined;
}

/** Every `Slot` the shell painted in `batches`, with the props it was painted with, in order. */
export function slotsPainted(batches: readonly BeatBatch[]): Array<Record<string, unknown>> {
  return batches.flatMap(batch =>
    batch.stamp?.role !== 'shell'
      ? []
      : batch.messages.flatMap(message => {
          const update = (message as {updateComponents?: {components?: unknown[]}})
            .updateComponents;
          return (update?.components ?? []).filter(
            (c): c is Record<string, unknown> => (c as {component?: unknown}).component === 'Slot',
          );
        }),
  );
}

/** Whether a source's fragment paints in `batches`. */
const paints = (batches: readonly BeatBatch[], source: string) =>
  batches.some(
    b =>
      b.stamp?.role === 'fragment' &&
      b.stamp.source === source &&
      b.messages.some(m => 'createSurface' in m || 'updateComponents' in m),
  );

/** Whether a merged view is painted in `batches`. */
const merges = (batches: readonly BeatBatch[]) =>
  batches.some(b => b.stamp?.source === 'shell' && b.stamp.role === 'fragment' && b.synthesis);

/** Whether `source`'s slot is painted failed with `cause`. */
const failedWith = (batches: readonly BeatBatch[], source: string, cause: string) =>
  slotsPainted(batches).some(
    s =>
      s.source === source &&
      s.state === 'failed' &&
      (s.failure as {cause?: unknown} | undefined)?.cause === cause,
  );

/** Whether the merged view collapsed with `cause`. */
const collapsedWith = (batches: readonly BeatBatch[], cause: string) =>
  slotsPainted(batches).some(
    s =>
      s.source === 'shell' &&
      s.state === 'collapsed' &&
      (s.collapse as {cause?: unknown} | undefined)?.cause === cause,
  );

const need = (...checks: Array<[boolean, string]>) => checks.find(([ok]) => !ok)?.[1];

const TODAY = 'What needs my attention today?';
const WORKING_ON = "what's the status of what I'm working on?";

export const BEATS: BeatSpec[] = [
  {
    beat: 1,
    slug: 'pr-list',
    title: 'PR list',
    prompt: 'Show me the open pull requests on a2ui-project/a2ui that need review.',
  },
  {beat: 2, slug: 'pr-detail', title: 'PR detail', prompt: 'Open a2ui-project/a2ui#233.'},
  {
    beat: 3,
    slug: 'review-compose',
    title: 'Compose-and-confirm review',
    prompt: 'Draft an approving review saying the spec doc looks reasonable.',
    chains: true,
  },
  {
    // The layout-only fan-out (task 6.6 decision 7): 5.7's control prompt, on which the Planner
    // reserves no merged view and lays the two slots on one row.
    beat: 4,
    slug: 'side-by-side',
    title: 'Side by side',
    prompt: 'Put my inbox and my calendar side by side.',
  },
  {
    // The temporal merge (task 5.7 decision 11): the utterance 5.6 recorded, on which the
    // Planner reserves the merged view unprompted. The synthesis payload rides the batch.
    beat: 5,
    slug: 'temporal-merge',
    title: 'Temporal merge',
    prompt: 'What needs my attention today?',
  },
  {
    // A platform answer (phase-6 decisions 2, 8): the platform's card wins the shortlist, the
    // Planner calls the installed-apps reader and answers in `shell:main` from a data model of
    // literals. No vendor is dispatched.
    beat: 6,
    slug: 'platform-answer',
    title: 'Platform answer',
    prompt: 'What apps do I have?',
  },
  {
    // A capability gap (phase-6 decision 6): nothing installed serves it, so the Planner names
    // the gap and places its slot; the catalog draws the tile.
    beat: 7,
    slug: 'capability-gap',
    title: 'Capability gap',
    prompt: 'Book me a flight to Tokyo next Friday.',
  },
  {
    // A mixed utterance (task 6.6 decision 8): one vendor dispatched and the shell's own words
    // in the same layout.
    beat: 8,
    slug: 'mixed-calendar',
    title: 'Mixed utterance',
    prompt: 'What can I do with my calendar?',
  },
  {
    // The entity join (task 7.9 decision 7): the phase's pinned utterance over Linear, GitHub and
    // CircleCI, the merged view with its match claims riding the batch that paints it.
    beat: 9,
    slug: 'entity-join',
    title: 'Entity join',
    prompt: WORKING_ON,
  },
  {
    beat: 10,
    slug: 'fast-failure-retry',
    title: 'A fast failure, then Retry',
    prompt: TODAY,
    fault: {
      faults: {calendar: {fault: 'fail', message: 'Google Calendar is not responding right now.'}},
      presses: [{operation: {kind: 'retry', sources: ['calendar']}}],
      shows: ({turn, presses}) =>
        need(
          [failedWith(turn, 'calendar', 'vendor'), 'Calendar’s slot never failed with its words'],
          [merges(turn), 'no merge over the sources that arrived'],
          [paints(presses[0] ?? [], 'calendar'), 'Retry’s stream never painted Calendar'],
          [merges(presses[0] ?? []), 'Retry’s arrival was not folded in'],
        ),
    },
  },
  {
    beat: 11,
    slug: 'late-include',
    title: 'A late arrival, then Include',
    prompt: TODAY,
    fault: {
      faults: {gmail: {fault: 'delay', seconds: 25}},
      presses: [{operation: {kind: 'include', sources: ['gmail']}}],
      shows: ({turn, presses}) =>
        need(
          [
            slotsPainted(turn).some(
              s => s.source === 'shell' && (s.late as unknown[])?.includes('gmail'),
            ),
            'Gmail was never painted late',
          ],
          [merges(presses[0] ?? []), 'Include folded nothing in'],
        ),
    },
  },
  {
    beat: 12,
    slug: 'home-straggling',
    title: 'The home source straggling',
    prompt: WORKING_ON,
    fault: {
      faults: {linear: {fault: 'delay', seconds: 20}},
      shows: ({turn}) => {
        const home = turn.findIndex(
          b => b.stamp?.role === 'fragment' && b.stamp.source === 'linear' && b.messages.length > 0,
        );
        const merge = turn.findIndex(
          b => b.stamp?.source === 'shell' && b.stamp.role === 'fragment' && b.synthesis,
        );
        return need(
          [
            slotsPainted(turn).some(
              s => s.source === 'shell' && (s.join as {home?: unknown})?.home === 'linear',
            ),
            'no join with Linear home',
          ],
          [home >= 0 && merge > home, 'the merge did not wait for Linear'],
        );
      },
    },
  },
  {
    beat: 13,
    slug: 'held-past-cap-retry',
    title: 'An answer held past the cap, drawn by Retry',
    prompt: TODAY,
    fault: {
      faults: {gmail: {fault: 'delay', seconds: 20}},
      hardCapSeconds: 15,
      presses: [{operation: {kind: 'retry', sources: ['gmail']}, atLeastMs: 26_000}],
      shows: ({turn, presses}) =>
        need(
          [failedWith(turn, 'gmail', 'timeout'), 'Gmail never reached the cap'],
          [!paints(turn, 'gmail'), 'Gmail’s held answer was drawn before Retry'],
          [paints(presses[0] ?? [], 'gmail'), 'Retry did not draw the held answer'],
        ),
    },
  },
  {
    beat: 14,
    slug: 'retry-race',
    title: 'Retry racing a capped dispatch',
    prompt: TODAY,
    fault: {
      faults: {gmail: {fault: 'delay', seconds: 90}},
      hardCapSeconds: 15,
      presses: [{operation: {kind: 'retry', sources: ['gmail']}}],
      shows: ({turn, presses}) =>
        need(
          [failedWith(turn, 'gmail', 'timeout'), 'Gmail never reached the cap'],
          [paints(presses[0] ?? [], 'gmail'), 'the re-dispatch never filled Gmail’s slot'],
        ),
    },
  },
  {
    beat: 15,
    slug: 'half-drawn',
    title: 'A half-drawn fragment failing',
    prompt: TODAY,
    fault: {
      faults: {github: {fault: 'break'}},
      shows: ({turn}) =>
        need(
          [paints(turn, 'github'), 'GitHub never drew'],
          [
            failedWith(turn, 'github', 'unreachable'),
            'GitHub’s broken stream never failed its slot',
          ],
        ),
    },
  },
  {
    beat: 16,
    slug: 'invalid-paint',
    title: 'A paint the client cannot draw',
    prompt: TODAY,
    fault: {
      faults: {github: {fault: 'invalid'}},
      report: 'github',
      shows: ({report}) =>
        need(
          [report !== undefined, 'nothing to report'],
          [failedWith(report ?? [], 'github', 'invalid'), 'the report did not fail GitHub’s slot'],
        ),
    },
  },
  {
    beat: 17,
    slug: 'home-failed-retry',
    title: 'The home source failing, then Retry bringing the merge back',
    prompt: WORKING_ON,
    fault: {
      faults: {linear: {fault: 'fail', message: 'Linear could not load your issues.'}},
      presses: [{operation: {kind: 'retry', sources: ['linear']}}],
      shows: ({turn, presses}) =>
        need(
          [collapsedWith(turn, 'home'), 'the merge did not collapse on the home source'],
          [!merges(turn), 'a merge was made without the home source'],
          [paints(presses[0] ?? [], 'linear'), 'Retry never painted Linear'],
          [merges(presses[0] ?? []), 'the merge was not brought back'],
        ),
    },
  },
  {
    beat: 18,
    slug: 'too-few',
    title: 'Fewer than two sources arriving',
    prompt: TODAY,
    fault: {
      // Every source but GitHub, whichever the plan dispatches.
      faults: {
        gmail: {fault: 'fail', message: 'Gmail is not responding right now.'},
        calendar: {fault: 'refuse'},
        linear: {fault: 'refuse'},
        circleci: {fault: 'refuse'},
      },
      shows: ({turn}) =>
        need(
          [collapsedWith(turn, 'few'), 'the merge did not collapse for too few sources'],
          [!merges(turn), 'a merge was made'],
        ),
    },
  },
];
