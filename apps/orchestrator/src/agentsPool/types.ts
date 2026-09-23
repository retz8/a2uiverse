import type {Message} from '@a2a-js/sdk';
import type {FailureCause} from '@a2uiverse/shell-catalog/schema';
import type {FaultKind} from './faults.js';
import type {VendorEvent} from './relay.js';

export type DispatchOutcome = 'completed' | 'failed' | 'cancelled' | 'timeout';

/** One dispatch of one turn to one app. Journaled; the quiescence unit from Phase 2. */
export interface DispatchRecord {
  appId: string;
  clientContextId: string;
  clientTaskId: string;
  vendorContextId?: string;
  vendorTaskId?: string;
  startedAt: string;
  endedAt?: string;
  outcome: DispatchOutcome;
  error?: string;
  /** Why it failed, as the slot is painted (task-8.3 decision 5); set with a failed outcome. */
  cause?: FailureCause;
  /** The vendor's own words on its failed final, when it gave any. */
  vendorMessage?: string;
  /** Whether the vendor terminated its stream (final status-update or message). */
  sawFinal: boolean;
  /** The hard cap (SPEC §5.3): from dispatch to the slot failing with `timeout`. */
  deadlineMs: number;
  /** When its first paint arrived. */
  firstPaintAt?: string;
  /** When it settled for its turn: arrived, failed, or reached the hard cap. */
  settledAt?: string;
  /** When it reached the hard cap, when it did; the dispatch runs on past it. */
  cappedAt?: string;
  /** When an answer arrived past the hard cap and was held (task-8.3 decision 2). */
  heldAt?: string;
  /** The fault the dev-only fault map applied, when it hit this dispatch. */
  fault?: FaultKind;
}

export interface DispatchTurn {
  clientContextId: string;
  clientTaskId: string;
  /** The client's message as received (orchestrator ids present; stripped on the way out). */
  message: Message;
  signal?: AbortSignal;
  /** The plan's dispatch of its source: what a fault hits unless marked for every dispatch. */
  fromPlan?: boolean;
}

export interface DispatchHandle {
  /** Relayed events, single consumer. */
  events: AsyncIterable<VendorEvent>;
  /** Resolves with the record in every case; never rejects. */
  done: Promise<DispatchRecord>;
  /** The record as the dispatch runs: the consumer may annotate it (the first paint). */
  record: DispatchRecord;
  /** Resolves when the hard cap fires before the dispatch ended; never otherwise. */
  capped: Promise<void>;
  /** Aborts the dispatch and asks the vendor, over A2A, to cancel its task. */
  cancel(): void;
}
