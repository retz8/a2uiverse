import type {Plan} from '../src/planner/planSchema.js';
import type {PlanInput, Planner} from '../src/planner/planner.js';

/**
 * Scriptable {@link Planner}: a fixed plan, a plan derived from the
 * shortlist (default: one column, one card slot per shortlisted agent), or a
 * thrown error.
 */
export class FakePlanner implements Planner {
  calls: PlanInput[] = [];
  #make: (input: PlanInput) => Plan;

  constructor(make?: Plan | ((input: PlanInput) => Plan)) {
    this.#make =
      typeof make === 'function' ? make : make ? () => make : input => planFromShortlist(input);
  }

  async plan(input: PlanInput): Promise<Plan> {
    this.calls.push(input);
    return this.#make(input);
  }
}

export function planFromShortlist(input: PlanInput): Plan {
  return {
    direction: 'column',
    groups: input.shortlist.map(entry => ({
      slots: [
        {
          appId: entry.record.id,
          archetype: 'card' as const,
          request: `Show a compact card for: ${input.utterance}`,
        },
      ],
    })),
  };
}

export class ThrowingPlanner implements Planner {
  #error: Error;
  constructor(error: Error) {
    this.#error = error;
  }
  async plan(): Promise<Plan> {
    throw this.#error;
  }
}
