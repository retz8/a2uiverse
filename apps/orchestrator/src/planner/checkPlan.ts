import type {Plan} from './planSchema.js';

/** A plan that fails the reasonableness checklist. A malformed plan is a broken turn (phase decision 9). */
export class MalformedPlanError extends Error {
  constructor(reason: string) {
    super(`Malformed plan: ${reason}`);
    this.name = 'MalformedPlanError';
  }
}

/** The deterministic checklist run after parse — the schema guarantees shape, this guards sense. */
export function checkPlan(plan: Plan, shortlistAppIds: readonly string[]): void {
  if (plan.groups.length === 0) throw new MalformedPlanError('no groups');
  const seen = new Set<string>();
  for (const group of plan.groups) {
    if (group.slots.length === 0) throw new MalformedPlanError('empty group');
    for (const slot of group.slots) {
      if (!shortlistAppIds.includes(slot.appId)) {
        throw new MalformedPlanError(`appId '${slot.appId}' is not on the shortlist`);
      }
      if (seen.has(slot.appId)) throw new MalformedPlanError(`appId '${slot.appId}' appears twice`);
      seen.add(slot.appId);
      if (slot.request.trim() === '') {
        throw new MalformedPlanError(`empty request for '${slot.appId}'`);
      }
    }
  }
}
