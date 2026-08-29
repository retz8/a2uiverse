import type {DispatchOutcome, DispatchRecord} from '../agentsPool/types.js';
import type {Plan} from '../planner/planSchema.js';
import type {TurnKind} from './descriptor.js';
import type {SurfaceTouches} from './surfaces.js';

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
  dispatch: DispatchRecord[];
  surfaces: SurfaceTouches;
  /** Keys only, plus the data model's size — never its contents. */
  clientMetadata: {keys: string[]; dataModelBytes: number};
  /** Turn-level outcome; one agent failing never fails a fan-out turn. */
  outcome: DispatchOutcome;
  /** The descriptor, embedded at write time with the Router's model; null when embedding failed. */
  embedding: number[] | null;
}
