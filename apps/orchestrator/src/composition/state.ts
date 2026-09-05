import type {Synthesis, SynthesisPayload} from '@a2uiverse/sdk';
import type {DispatchOutcome} from '../agentsPool/types.js';
import type {SurfaceTouches} from '../journal/surfaces.js';
import type {SlotArchetype} from '../planner/archetypes.js';
import type {Plan} from '../planner/planSchema.js';
import type {Registry} from '../registry/registry.js';
import {SHELL_SOURCE_ID} from '../registry/types.js';
import {slotNameFor, SYNTHESIS_DISPLAY_NAME} from './constants.js';
import {Partitions} from './partitions.js';

/**
 * The orchestrator-side slot states. `filled` is deliberately absent — a slot
 * renders its fragment when a surface claims it, which is inherently the
 * client's (phase decision 12).
 */
export type SlotState = 'pending' | 'failed' | 'collapsed';

export interface SlotPlan {
  slotName: string;
  appId: string;
  displayName: string;
  archetype: SlotArchetype;
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
  plan: Plan;
  /** Keyed by slot name, in plan order. */
  slots: Map<string, {plan: SlotPlan; state: SlotState}>;
  /** Every surface's data model, snapshots and generations (task-4.4 decision 3). */
  partitions: Partitions;
  /** Sources whose dispatch completed having painted — what synthesis runs over. */
  arrived: Set<string>;
  /** The live synthesis, once painted: the document as accepted and the payload the client holds; what the IntegrityChecker guards. */
  synthesis?: LiveSynthesis;
  /** When the last source settled — the start of the dead-air interval. */
  lastSettledAt?: number;
}

export function compositionFrom(plan: Plan, registry: Registry): CompositionState {
  const slots = new Map<string, {plan: SlotPlan; state: SlotState}>();
  for (const group of plan.groups) {
    for (const slot of group.slots) {
      const slotName = slotNameFor(slot.appId);
      slots.set(slotName, {
        plan: {
          slotName,
          appId: slot.appId,
          displayName:
            slot.appId === SHELL_SOURCE_ID
              ? SYNTHESIS_DISPLAY_NAME
              : registry.get(slot.appId).displayName,
          archetype: slot.archetype,
          request: slot.request,
        },
        state: 'pending',
      });
    }
  }
  return {plan, slots, partitions: new Partitions(), arrived: new Set()};
}

/** The synthesis slot, when the plan reserved one. */
export function synthesisSlot(
  state: CompositionState,
): {plan: SlotPlan; state: SlotState} | undefined {
  return state.slots.get(slotNameFor(SHELL_SOURCE_ID));
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
