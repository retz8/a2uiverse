import type {LayoutSurface} from '../planner/document.js';
import type {Synthesis} from '../synthesizer/document.js';
import type {ChangeAccount} from '../synthesizer/prompt.js';
import type {DispatchOutcome, DispatchRecord} from '../agentsPool/types.js';
import type {TurnKind} from './descriptor.js';
import type {SurfaceTouches} from './surfaces.js';

/** One reader call the Planner made: which, with what, and what it read (task-6.4 decision 13). */
export interface ToolCallRecord {
  name: string;
  args: unknown;
  result: unknown;
}

/**
 * What became of the turn's plan (task-6.4 decision 13): the layout surface as accepted, every
 * attempt — the raw text the model returned and the validator's findings when it was refused —
 * and the reader calls it made along the way. `planMs` is the interval from the utterance
 * arriving to the tree accepted or refused — the shell's first paint follows it directly, so
 * it is the first-paint measurement of task-6.6 decisions 2–3, read from here.
 */
export interface PlanRecord {
  outcome: 'planned' | 'malformed';
  /** The accepted document, on `planned`. */
  layoutSurface?: LayoutSurface;
  attempts: {text: string; errors: string[]}[];
  toolCalls: ToolCallRecord[];
  planMs: number;
}

/**
 * What became of the turn's synthesis (task-5.4 decision 7): the whole conversation. The
 * synthesize data model as accepted and its note, the outcome, every attempt — the raw text the
 * model returned and the validator's findings when it was refused — and, on a re-synthesis, the
 * change account that was sent. `deadAirMs` is the interval from the last source settling to
 * the outcome — phase decision 15's measurement, read from here.
 */
export interface SynthesisRecord {
  /** `home`: the home source failed and the merge collapsed with no call (task-8.3 decision 8). */
  outcome: 'synthesized' | 'declined' | 'malformed' | 'skipped' | 'failed' | 'home';
  reason?: string;
  /** A collapsed merge's cause as painted (task-8.3 decision 9). */
  collapse?: 'declined' | 'home' | 'few' | 'unmade';
  /** What released the turn's automatic synthesis, and when (task-8.3 decision 15). */
  release?: {by: 'settled' | 'soft-deadline' | 'home'; at: string};
  /** The sources the synthesis ran over. */
  sources?: string[];
  /** The dispatched sources it ran without, each still loading, failed, or arrived after the merge. */
  missing?: {appId: string; state: 'loading' | 'failed' | 'arrived'}[];
  /** The accepted document, on `synthesized`. */
  synthesizeDataModel?: Synthesis;
  /** The document's note, on `synthesized`: the deviation from the brief, when any. */
  note?: string;
  /** Each model call of this synthesis, in order; empty when no call was made. */
  attempts?: {text: string; errors: string[]}[];
  /** What was sent on a re-synthesis. */
  changes?: ChangeAccount;
  /** From the synthesis's release — or, on a re-synthesis, the last settle — to its outcome. */
  deadAirMs?: number;
}

/** One line of the intent journal (SPEC §10): per turn, free-form descriptor + embedding. */
export interface JournalEntry {
  turnId: string;
  clientContextId: string;
  at: string;
  kind: TurnKind;
  descriptor: string;
  payload?: unknown;
  /** The Planner's outcome, on utterance turns. */
  plan?: PlanRecord;
  /** The Synthesizer's outcome, on turns that reached it. */
  synthesis?: SynthesisRecord;
  dispatch: DispatchRecord[];
  surfaces: SurfaceTouches;
  /** Keys only, plus the data model's size — never its contents. */
  clientMetadata: {keys: string[]; dataModelBytes: number};
  /** Turn-level outcome; one agent failing never fails a fan-out turn. */
  outcome: DispatchOutcome;
  /** The soft deadline and the hard cap in force for the turn's dispatches (task-8.3 decision 15). */
  deadlines?: {softMs: number; capMs: number};
  /** A new utterance ended this turn while it ran (task-8.3 decision 4). */
  superseded?: true;
  /** The descriptor, embedded at write time with the Router's model; null when embedding failed. */
  embedding: number[] | null;
}
