import type {SynthesisPayload} from '@a2uiverse/sdk';
import type {FailureCause, SlotCollapse} from '@a2uiverse/shell-catalog/schema';
import type {Seen, Watch} from './integrity.js';
import type {Synthesis} from '../synthesizer/document.js';
import type {VendorEvent} from '../agentsPool/relay.js';
import type {DispatchOutcome, DispatchRecord} from '../agentsPool/types.js';
import type {SynthesisRecord} from '../journal/types.js';
import {isGap, type JoinNouns, type LayoutSurface} from '../planner/document.js';
import type {Registry} from '../registry/registry.js';
import {SHELL_SOURCE_ID} from '../registry/types.js';
import {SYNTHESIS_DISPLAY_NAME} from './constants.js';
import {Partitions} from './partitions.js';
import {Presses} from './presses.js';

/**
 * The orchestrator-side slot states. `filled` is deliberately absent — a slot
 * renders its fragment when a surface claims it, which is inherently the
 * client's (phase decision 12).
 */
export type SlotState = 'pending' | 'failed' | 'collapsed';

export interface SlotPlan {
  /** The dispatched source: an app id, or `shell` for the merged view. The slot's key. */
  source: string;
  displayName: string;
  request: string;
  /** The merged view's planned column headers: painted on its slot, handed to the Synthesizer. */
  columns?: string[];
  /** The merged view's join nouns: painted on its slot for the client's progress line. */
  join?: JoinNouns;
  /** The merged view's column marks, one per column: a source id, or null (task-8.3 decision 12). */
  columnSources?: (string | null)[];
  /** A vendor slot's entries as the join calls them — "CircleCI runs" — for its failure tile. */
  noun?: string;
}

/** Why a vendor slot failed (task-8.3 decision 5): painted on it with `failed`. */
export interface SlotFailure {
  cause: FailureCause;
  /** The vendor's own words, only with `vendor`. */
  message?: string;
}

/** An answer that arrived past the hard cap: held, undrawn, until the reader presses Retry. */
export interface HeldAnswer {
  /** The dispatch's events after the cap, composed as they would have been relayed. */
  events: VendorEvent[];
  record: DispatchRecord;
}

export interface SlotEntry {
  plan: SlotPlan;
  state: SlotState;
  /** A failed vendor slot's cause and words. */
  failure?: SlotFailure;
  /** The merge slot collapsed by a decline: the Synthesizer's reason. */
  declined?: string;
  /** The merge slot collapsed for any other cause (task-8.3 decision 9). */
  collapse?: SlotCollapse;
  /** A vendor slot's answer held past the hard cap (task-8.3 decision 2). */
  held?: HeldAnswer;
}

export interface LiveSynthesis {
  document: Synthesis;
  payload: SynthesisPayload;
  /** The key sets the IntegrityChecker compares against on its walk, recorded at accept. */
  watch: Watch;
  /** What every surface held at this accept (task-7.9): a repaint of an unread source is told by it. */
  seen: Seen;
}

/**
 * Composition state is canonical in the orchestrator; the shell surface is
 * its rendered projection (phase decision 12). One per client conversation,
 * replaced by each new utterance turn.
 */
export interface CompositionState {
  /** The Planner's accepted document: the tree the painter paints, the data model, the dispatch. */
  layout: LayoutSurface;
  /** The utterance the composition came from — the this-canvas reader's first line. */
  utterance: string;
  /** Keyed by source (task-6.3 decision 6), in dispatch order. */
  slots: Map<string, SlotEntry>;
  /** The capability gaps the Planner named, in dispatch order; each has a `Slot` in the tree. */
  gaps: string[];
  /** Every surface's data model. */
  partitions: Partitions;
  /** Sources whose dispatch completed holding a surface, and not failed since — what the first synthesis runs over. */
  arrived: Set<string>;
  /**
   * The merge's own source set (task-8.3 decision 11): the sources the accepted synthesis was
   * built over. The IntegrityChecker's walk and any re-synthesis it fires cover only these; only
   * Include and Retry add to it, and a failure removes a source from it.
   */
  merged: Set<string>;
  /** Whether the turn's one automatic synthesis has been released, or the merge collapsed instead. */
  mergeDecided: boolean;
  /** The reader's presses in flight, per source: what the merge waits on (task-8.10 decision 1). */
  presses: Presses;
  /** The merge in the making, the first or a re-synthesis — one at a time (task-8.10 decision 3). */
  making?: Promise<void>;
  /** While the utterance turn runs: re-weighs the synthesis trigger after a slot changed outside it. */
  reevaluate?: () => void;
  /** The live synthesis, once painted: the document as accepted and the payload the client holds; what the IntegrityChecker guards. */
  synthesis?: LiveSynthesis;
  /** What became of the merged view, once decided — what the this-canvas reader reports. */
  mergedView?: {outcome: SynthesisRecord['outcome']; reason?: string};
  /** When the last source settled — the start of the dead-air interval. */
  lastSettledAt?: number;
}

export function compositionFrom(
  layout: LayoutSurface,
  registry: Registry,
  utterance: string,
): CompositionState {
  const slots = new Map<string, SlotEntry>();
  const gaps: string[] = [];
  const merged = layout.dispatch.find(entry => !isGap(entry) && entry.source === SHELL_SOURCE_ID);
  const join = merged && !isGap(merged) ? merged.join : undefined;
  for (const entry of layout.dispatch) {
    if (isGap(entry)) {
      gaps.push(entry.gap);
      continue;
    }
    const displayName =
      entry.source === SHELL_SOURCE_ID
        ? SYNTHESIS_DISPLAY_NAME
        : registry.get(entry.source).displayName;
    const noun = join?.nouns[entry.source];
    slots.set(entry.source, {
      plan: {
        source: entry.source,
        displayName,
        request: entry.request,
        ...(entry.columns ? {columns: entry.columns} : {}),
        ...(entry.columnSources ? {columnSources: entry.columnSources} : {}),
        ...(entry.join ? {join: entry.join} : {}),
        ...(noun && entry.source !== SHELL_SOURCE_ID ? {noun: `${displayName} ${noun}`} : {}),
      },
      state: 'pending',
    });
  }
  return {
    layout,
    utterance,
    slots,
    gaps,
    partitions: new Partitions(),
    arrived: new Set(),
    merged: new Set(),
    mergeDecided: false,
    presses: new Presses(),
  };
}

/** The synthesis slot, when the plan reserved one. */
export function synthesisSlot(state: CompositionState): SlotEntry | undefined {
  return state.slots.get(SHELL_SOURCE_ID);
}

/**
 * Maps a settled dispatch to the slot state it ends in — or undefined when the slot is left to
 * the client (a clean completion holding a surface). Collapsed needs no vendor cooperation: a
 * clean completion holding no surface — it painted nothing, or took back what it painted —
 * simply folds away, and a cancellation folds with it.
 */
export function outcomeToSlotState(
  outcome: DispatchOutcome,
  holdsSurface: boolean,
): SlotState | undefined {
  if (outcome === 'failed' || outcome === 'timeout') return 'failed';
  if (outcome === 'cancelled') return 'collapsed';
  return holdsSurface ? undefined : 'collapsed';
}
