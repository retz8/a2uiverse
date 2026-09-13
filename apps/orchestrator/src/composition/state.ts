import type {SynthesisPayload} from '@a2uiverse/sdk';
import type {Synthesis} from '../synthesizer/document.js';
import type {DispatchOutcome} from '../agentsPool/types.js';
import type {SurfaceTouches} from '../journal/surfaces.js';
import type {SynthesisRecord} from '../journal/types.js';
import {isGap, type LayoutSurface} from '../planner/document.js';
import type {Registry} from '../registry/registry.js';
import {SHELL_SOURCE_ID} from '../registry/types.js';
import {SYNTHESIS_DISPLAY_NAME} from './constants.js';
import {Partitions} from './partitions.js';

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
}

export interface LiveSynthesis {
  document: Synthesis;
  payload: SynthesisPayload;
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
  slots: Map<string, {plan: SlotPlan; state: SlotState}>;
  /** The capability gaps the Planner named, in dispatch order; each has a `Slot` in the tree. */
  gaps: string[];
  /** Every surface's data model, snapshots and generations (task-4.4 decision 3). */
  partitions: Partitions;
  /** Sources whose dispatch completed having painted — what synthesis runs over. */
  arrived: Set<string>;
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
  const slots = new Map<string, {plan: SlotPlan; state: SlotState}>();
  const gaps: string[] = [];
  for (const entry of layout.dispatch) {
    if (isGap(entry)) {
      gaps.push(entry.gap);
      continue;
    }
    slots.set(entry.source, {
      plan: {
        source: entry.source,
        displayName:
          entry.source === SHELL_SOURCE_ID
            ? SYNTHESIS_DISPLAY_NAME
            : registry.get(entry.source).displayName,
        request: entry.request,
      },
      state: 'pending',
    });
  }
  return {layout, utterance, slots, gaps, partitions: new Partitions(), arrived: new Set()};
}

/** The synthesis slot, when the plan reserved one. */
export function synthesisSlot(
  state: CompositionState,
): {plan: SlotPlan; state: SlotState} | undefined {
  return state.slots.get(SHELL_SOURCE_ID);
}

/**
 * Maps a settled dispatch to the slot state it ends in — or undefined when
 * the slot is left to the client (a clean completion that painted surfaces).
 * Collapsed needs no vendor cooperation: a clean completion that never
 * touched a surface simply folds away, and a cancellation folds with it.
 */
export function outcomeToSlotState(
  outcome: DispatchOutcome,
  touches: SurfaceTouches,
): SlotState | undefined {
  if (outcome === 'failed' || outcome === 'timeout') return 'failed';
  if (outcome === 'cancelled') return 'collapsed';
  const touched = touches.created.length + touches.updated.length + touches.deleted.length;
  return touched === 0 ? 'collapsed' : undefined;
}
