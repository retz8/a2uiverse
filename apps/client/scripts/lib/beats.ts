/**
 * The beats the recorder drives. Beats 1–3 come from
 * `a2ui-github/agent/scripts/record_beats.py`, with one change: beat 2 opens #233 — the head of
 * the stub backend's PR list — where the source opens live GitHub's #2123, which the stub does
 * not carry. Every beat is recorded through the composing hub, so 1–3 are one-slot composed
 * turns rather than the bare relays their pre-composition recordings captured.
 *
 * Beats 10–18 are Phase 8's cases over the deterministic roster (task-8.6 decisions 3, 5): beat 5's
 * utterance where every source is a peer, beat 9's where the join has a home source — Linear.
 *
 * Beats 19–25 are Phase 9's cases (task-9.8 decisions 3–5): sessions of several canvases over the
 * deterministic roster, each checked against the orchestrator's journal as well as its streams.
 */
import type {CompositionOperation} from '@a2uiverse/sdk';
import type {BeatBatch, BeatTurn} from '../../src/beats/beatFixtures';
import {sleep, type Session, type SessionCanvas} from './session';

export interface BeatSpec {
  beat: number;
  slug: string;
  title: string;
  prompt: string;
  /** Sent inside the previous beat's conversation. */
  chains?: boolean;
  /** Recorded under the fault map, through an orchestrator the recorder starts for it. */
  fault?: FaultCase;
  /** A session of several canvases, through an orchestrator the recorder starts for it. */
  session?: SessionCase;
}

/**
 * A Phase 9 case (task-9.8 decisions 2–5): the session as the user drives it, under the fault map
 * and deadlines it needs, and what the recording must show — from its streams and the journal.
 */
export interface SessionCase {
  faults?: FaultCase['faults'];
  /** Raised for a case that must merge over a source the fault map holds back. */
  softDeadlineSeconds?: number;
  run(session: Session): Promise<void>;
  shows(recorded: RecordedSession): string | undefined;
}

/** A session as recorded: its turns, its canvases, and the journal lines it wrote. */
export interface RecordedSession {
  turns: BeatTurn[];
  canvases: SessionCanvas[];
  journal: JournalLine[];
}

/** What a check reads of a journal line (the orchestrator's `JournalEntry`). */
export interface JournalLine {
  clientContextId: string;
  kind: string;
  plan?: {parent?: string};
  synthesis?: {attempts?: unknown[]};
  step?: {seen: boolean; walk: string};
  closed?: true;
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
const SIDE_BY_SIDE = 'Put my inbox and my calendar side by side.';

/** Whether the canvas's layout surface has arrived: its plan landed, its dispatches out. */
const planned = (turn: BeatTurn) =>
  turn.batches.some(b => b.stamp?.role === 'shell' && b.messages.some(m => 'createSurface' in m));

/** Every vendor slot the shell painted on `batches`. */
const slotSources = (batches: readonly BeatBatch[]) =>
  new Set(slotsPainted(batches).map(s => s.source as string));

async function until(test: () => boolean, what: string, timeoutMs = 60_000) {
  const deadline = Date.now() + timeoutMs;
  while (!test()) {
    if (Date.now() > deadline) throw new Error(`timed out waiting for ${what}`);
    await sleep(100);
  }
}

/** The recorded utterance of the `n`th canvas. */
const questionOf = (turns: readonly BeatTurn[], n: number) =>
  turns.filter(t => t.kind === 'utterance')[n]!;

/** The journal lines of a canvas. */
const linesOf = (recorded: RecordedSession, canvas: number) =>
  recorded.journal.filter(l => l.clientContextId === recorded.canvases[canvas]!.context());

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
  {
    beat: 19,
    slug: 'background-tab',
    title: 'A tab finishing in the background',
    prompt: WORKING_ON,
    session: {
      // CircleCI held back, and a soft deadline past it, so the merge waits and lands on its own.
      faults: {circleci: {fault: 'delay', seconds: 20}},
      softDeadlineSeconds: 60,
      run: async s => {
        const join = s.ask(WORKING_ON);
        await until(() => planned(questionOf(s.turns, 0)), 'the entity join’s plan');
        const today = s.ask(TODAY, {beside: true});
        await Promise.all([join.done, today.done]);
        s.view(join);
      },
      shows: ({turns}) => {
        const join = questionOf(turns, 0);
        const today = questionOf(turns, 1);
        const mergedAt = join.batches.find(
          b => b.stamp?.source === 'shell' && b.stamp.role === 'fragment' && b.synthesis,
        )?.offsetMs;
        return need(
          [paints(today.batches, 'github'), 'the second question never painted'],
          [mergedAt !== undefined, 'the entity join never merged'],
          [
            mergedAt !== undefined && mergedAt > (today.atMs ?? 0),
            'the entity join merged before the second question was asked',
          ],
        );
      },
    },
  },
  {
    beat: 20,
    slug: 'past-canvas-action',
    title: 'An action and a press in a past canvas',
    prompt: TODAY,
    session: {
      faults: {gmail: {fault: 'fail', message: 'Gmail is not responding right now.'}},
      run: async s => {
        const today = s.ask(TODAY);
        await today.done;
        const join = s.ask(WORKING_ON);
        await join.done;
        s.view(today);
        await s.act(today, 'calendar', 'open-event');
        await s.press(today, {kind: 'retry', sources: ['gmail']});
      },
      shows: recorded => {
        const today = questionOf(recorded.turns, 0);
        const action = recorded.turns.find(t => t.kind === 'surface-action');
        const retry = recorded.turns.find(t => t.kind === 'press');
        return need(
          [failedWith(today.batches, 'gmail', 'vendor'), 'Gmail never failed with its words'],
          [paints(action?.batches ?? [], 'calendar'), 'the event never opened'],
          [paints(retry?.batches ?? [], 'gmail'), 'Retry never painted Gmail'],
          [
            linesOf(recorded, 0).filter(l => l.kind !== 'utterance').length >= 2,
            'the action and the press were not journaled on the first canvas',
          ],
        );
      },
    },
  },
  {
    beat: 21,
    slug: 'ask-again',
    title: '“Ask this again now”, and a question asked from a view',
    prompt: TODAY,
    session: {
      run: async s => {
        const today = s.ask(TODAY);
        await today.done;
        await s.ask(WORKING_ON).done;
        await s.ask(TODAY, {from: today}).done;
        await s.ask('Only the calendar part', {from: today}).done;
      },
      shows: recorded => {
        const parent = recorded.canvases[0]!.context();
        const parentOf = (n: number) => linesOf(recorded, n).find(l => l.plan)?.plan?.parent;
        const calendar = questionOf(recorded.turns, 3).batches;
        return need(
          [parentOf(2) === parent, '“Ask this again now” was not planned from the first canvas'],
          [parentOf(3) === parent, 'the question from the view was not planned from it'],
          [merges(questionOf(recorded.turns, 2).batches), 'the question asked again never merged'],
          [
            paints(calendar, 'calendar') && !slotSources(calendar).has('github'),
            'the calendar part painted more than Calendar',
          ],
        );
      },
    },
  },
  {
    beat: 22,
    slug: 'add-drop-compare',
    title: 'Add a source, drop one, and compare these',
    prompt: SIDE_BY_SIDE,
    session: {
      run: async s => {
        const side = s.ask(SIDE_BY_SIDE);
        await side.done;
        await s.ask('Add GitHub to this', {from: side}).done;
        await s.ask('without Gmail', {from: side}).done;
        await s.ask('compare these', {from: side}).done;
      },
      shows: recorded => {
        const [side, add, drop, compare] = [0, 1, 2, 3].map(
          n => questionOf(recorded.turns, n).batches,
        );
        const parent = recorded.canvases[0]!.context();
        return need(
          [!merges(side!), 'side by side merged'],
          [
            ['github', 'gmail', 'calendar'].every(source => slotSources(add!).has(source)),
            'Add GitHub did not keep both and add GitHub',
          ],
          [
            !slotSources(drop!).has('gmail') && slotSources(drop!).has('calendar'),
            'without Gmail did not drop Gmail alone',
          ],
          [merges(compare!), 'compare these never merged'],
          [
            [1, 2, 3].every(n => linesOf(recorded, n).find(l => l.plan)?.plan?.parent === parent),
            'a child was not planned from the side-by-side canvas',
          ],
        );
      },
    },
  },
  {
    beat: 23,
    slug: 'step-seen',
    title: 'A step back with the wiring restored',
    prompt: WORKING_ON,
    session: {
      run: async s => {
        const join = s.ask(WORKING_ON);
        await join.done;
        await s.act(join, 'circleci', 'open-run');
        await s.step(join, 'circleci', 0);
      },
      shows: recorded => {
        const action = recorded.turns.find(t => t.kind === 'surface-action');
        const step = linesOf(recorded, 0).find(l => l.step);
        return need(
          [paints(action?.batches ?? [], 'circleci'), 'the run never opened'],
          [merges(action?.batches ?? []), 'opening the run was not re-synthesized'],
          [step?.step?.seen === true, 'the step’s combination was not seen'],
          [
            step?.step?.walk === 'silent' && !step.synthesis?.attempts?.length,
            'the step made a synthesis call',
          ],
        );
      },
    },
  },
  {
    beat: 24,
    slug: 'step-unseen',
    title: 'An unseen combination falling to the walk',
    prompt: WORKING_ON,
    session: {
      run: async s => {
        const join = s.ask(WORKING_ON);
        await join.done;
        await s.act(join, 'circleci', 'open-run');
        await s.act(join, 'linear', 'open-issue');
        await s.step(join, 'circleci', 0);
      },
      shows: recorded => {
        const step = linesOf(recorded, 0).find(l => l.step);
        return need(
          [step !== undefined, 'the step was not journaled'],
          [step?.step?.seen === false, 'the step’s combination was seen'],
          [(step?.synthesis?.attempts?.length ?? 0) > 0, 'the walk made no synthesis call'],
        );
      },
    },
  },
  {
    beat: 25,
    slug: 'close-loading',
    title: 'Closing a loading canvas',
    prompt: TODAY,
    session: {
      faults: {github: {fault: 'delay', seconds: 30}},
      run: async s => {
        const today = s.ask(TODAY);
        await until(
          () => paints(questionOf(s.turns, 0).batches, 'calendar'),
          'a fragment on the canvas',
        );
        await sleep(1_500);
        await s.close(today);
        await today.done;
      },
      shows: recorded => {
        const today = questionOf(recorded.turns, 0).batches;
        return need(
          [!paints(today, 'github'), 'GitHub painted before the close'],
          [
            linesOf(recorded, 0).some(l => l.kind === 'utterance' && l.closed),
            'the journal did not record the turn cancelled by the close',
          ],
        );
      },
    },
  },
];
