import type {SynthesisWiring} from '@a2uiverse/sdk';
import type {DispatchOutcome, DispatchRecord} from '../agentsPool/types.js';
import type {Plan} from '../planner/planSchema.js';
import type {TurnKind} from './descriptor.js';
import type {SurfaceTouches} from './surfaces.js';

/**
 * What became of the turn's synthesis (task-4.4 spec): the wiring, or why there is none.
 * `deadAirMs` is the interval from the last source settling to the outcome — phase decision 16's
 * measurement, read from here.
 */
export interface SynthesisRecord {
  outcome: 'synthesized' | 'declined' | 'malformed' | 'skipped' | 'failed';
  reason?: string;
  wiring?: SynthesisWiring;
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
  /** The Planner's plan, on utterance turns. */
  plan?: Plan;
  /** The Synthesizer's outcome, on turns that reached it. */
  synthesis?: SynthesisRecord;
  dispatch: DispatchRecord[];
  surfaces: SurfaceTouches;
  /** Keys only, plus the data model's size — never its contents. */
  clientMetadata: {keys: string[]; dataModelBytes: number};
  /** Turn-level outcome; one agent failing never fails a fan-out turn. */
  outcome: DispatchOutcome;
  /** The descriptor, embedded at write time with the Router's model; null when embedding failed. */
  embedding: number[] | null;
}
