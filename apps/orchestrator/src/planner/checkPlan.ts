import {SHELL_SOURCE_ID} from '../registry/types.js';
import type {Plan} from './planSchema.js';

/** A plan that fails the reasonableness checklist. A malformed plan is a broken turn (phase decision 9). */
export class MalformedPlanError extends Error {
  constructor(reason: string) {
    super(`Malformed plan: ${reason}`);
    this.name = 'MalformedPlanError';
  }
}

/**
 * The deterministic checklist run after parse — the schema guarantees shape, this guards sense.
 *
 * The synthesis slot is a slot whose source is the reserved `shell` id (task-4.4 decision 6):
 * not on any shortlist, at most one per screen, and only when at least two sources are
 * planned (SPEC §5.1 — one source, no synthesis).
 */
export function checkPlan(plan: Plan, shortlistAppIds: readonly string[]): void {
  if (plan.groups.length === 0) throw new MalformedPlanError('no groups');
  const seen = new Set<string>();
  let sources = 0;
  for (const group of plan.groups) {
    if (group.slots.length === 0) throw new MalformedPlanError('empty group');
    for (const slot of group.slots) {
      if (slot.appId === SHELL_SOURCE_ID) {
        if (seen.has(SHELL_SOURCE_ID)) throw new MalformedPlanError('more than one synthesis slot');
      } else if (!shortlistAppIds.includes(slot.appId)) {
        throw new MalformedPlanError(`appId '${slot.appId}' is not on the shortlist`);
      } else {
        sources += 1;
      }
      if (seen.has(slot.appId)) throw new MalformedPlanError(`appId '${slot.appId}' appears twice`);
      seen.add(slot.appId);
      if (slot.request.trim() === '') {
        throw new MalformedPlanError(`empty request for '${slot.appId}'`);
      }
    }
  }
  if (seen.has(SHELL_SOURCE_ID) && sources < 2) {
    throw new MalformedPlanError('a synthesis slot needs at least two sources');
  }
}
