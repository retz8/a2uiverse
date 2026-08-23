import type {Message} from '@a2a-js/sdk';
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
  /** Whether the vendor terminated its stream (final status-update or message). */
  sawFinal: boolean;
  /** Per-source deadline (SPEC §5.3). Recorded; not enforced until M6. */
  deadlineMs: number;
}

export interface DispatchTurn {
  clientContextId: string;
  clientTaskId: string;
  /** The client's message as received (orchestrator ids present; stripped on the way out). */
  message: Message;
  signal?: AbortSignal;
}

export interface DispatchHandle {
  /** Relayed events, single consumer. */
  events: AsyncIterable<VendorEvent>;
  /** Resolves with the record in every case; never rejects. */
  done: Promise<DispatchRecord>;
  cancel(): void;
}
