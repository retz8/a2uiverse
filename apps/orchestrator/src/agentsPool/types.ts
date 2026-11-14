import type {Message} from '@a2a-js/sdk';
import type {NotReachedCase} from '@a2uiverse/smoke-transport';
import type {FailureCause} from '@a2uiverse/shell-catalog/schema';
import type {Refetched, UpdateFinding} from '../registry/updateTile.js';
import type {AuthorityNeed} from '../vault/vault.js';
import type {FaultKind} from './faults.js';
import type {VendorEvent} from './relay.js';

export type DispatchOutcome = 'completed' | 'failed' | 'cancelled' | 'timeout';

/** One dispatch of one turn to one source. Journaled; the quiescence unit from Phase 2. */
export interface DispatchRecord {
  source: string;
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
  /** The catalog a paint was refused in, with the `catalog` cause (task-11.4 decision 12). */
  catalogId?: string;
  /**
   * The app's own page, with the `credential` cause (task-12.7 decision 5): the card's
   * `provider.url`, otherwise its `documentationUrl`, when one is https or local.
   */
  continueUrl?: string;
  /** The vendor's own words on its failed final, when it gave any. */
  vendorMessage?: string;
  /**
   * The state the agent's answer ended on, in A2A 1.0's name (task-20.1 decisions 2, 5):
   * `TASK_STATE_COMPLETED` for an answer that ended on a message. Absent when the stream broke,
   * and when the agent was not called.
   */
  endState?: string;
  /** The A2A version of the interface the dispatch used; absent when the agent was not called. */
  a2aVersion?: string;
  /** The binding of the interface the dispatch used; absent when the agent was not called. */
  binding?: string;
  /**
   * The dispatch walked its account's own card, the extended card the agent served that account
   * (task-20.8 decision 4); absent when it walked the app's card.
   */
  accountCard?: true;
  /** The URL of the interface used, when the dispatch walked its account's own card. */
  url?: string;
  /**
   * Each interface the walk tried before the one used and did not reach, in the order tried
   * (task-20.5 decision 6); when it reached none, every one it tried, and no version or binding
   * above.
   */
  notReached?: NotReachedEntry[];
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
  /** When a Retry drew the held answer (task-8.4 decision 4). */
  drawnAt?: string;
  /** In a Retry race, whether this dispatch arrived first or was cancelled (task-8.4 decision 5). */
  race?: 'won' | 'lost';
  /** The fault the dev-only fault map applied, when it hit this dispatch. */
  fault?: FaultKind;
  /**
   * The dispatch needs authority (task 12.5): the card checked before dispatch, a 401 the vault
   * could not answer, or the agent's in-task request for more access — `escalation` then. Set with
   * a failed outcome and no cause; the slot takes the authority, or the fragment the request.
   */
  authority?: AuthorityNeed & {escalation?: boolean};
  /**
   * The dispatch needs an update (task 15.5): the update check before dispatch stopped it, the agent
   * not called — set with a failed outcome and no cause — or the catch after the call found the
   * live card changed: after a refused paint, beside the `catalog` cause; after a call that ended
   * with no UI, with no cause (task-15.11 decision 5). The slot takes the update tile.
   */
  update?: UpdateFinding;
  /**
   * After a paint refused outside the entitlement, or a call that ended with no UI: what fetching
   * the live card again found.
   */
  refetched?: Refetched;
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

/** An interface a dispatch's walk tried and did not reach, as the journal records it. */
export interface NotReachedEntry {
  /** Its binding, as the card spells it. */
  binding: string;
  /** Its A2A version, as the card names it; 0.3 when it names none. */
  a2aVersion: string;
  /**
   * Why: no connection could be opened, what answered there does not serve it, or it cannot carry
   * the account's credential (task-20.5 decision 3).
   */
  why: NotReachedCase;
}
