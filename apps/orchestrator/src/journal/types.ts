import type {DispatchOutcome, DispatchRecord} from '../agentsPool/types.js';
import type {TurnKind} from './descriptor.js';
import type {SurfaceTouches} from './surfaces.js';

/** One line of the intent journal (SPEC §10): per turn, free-form descriptor + (later) embedding. */
export interface JournalEntry {
  turnId: string;
  clientContextId: string;
  at: string;
  kind: TurnKind;
  descriptor: string;
  payload?: unknown;
  dispatch: DispatchRecord[];
  surfaces: SurfaceTouches;
  /** Keys only, plus the data model's size — never its contents. */
  clientMetadata: {keys: string[]; dataModelBytes: number};
  outcome: DispatchOutcome;
  /** Filled when the Router's embedding model arrives (Phase 2). */
  embedding: null;
}
