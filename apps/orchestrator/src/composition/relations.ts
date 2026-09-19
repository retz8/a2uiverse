import type {DataContext} from '@a2ui/web_core/v0_9';
import type {Formula, Ref, Resolution} from '@a2uiverse/sdk';
import {relationFunctions, relationKind, type RelationOp} from '@a2uiverse/shell-catalog/schema';

const RELATION_FUNCTIONS = new Map(relationFunctions.map(fn => [fn.name, fn]));

/** What a fact of a match claim says against the partitions now, with the values it read. */
export type FactState = {state: 'holds' | 'fails'; values: unknown[]} | {state: 'absent'};

/**
 * Runs a match claim's fact — `equal`, `contains` — on the shell catalog's own relation function
 * over what its refs resolve to (task-7.6 decision 10), so the orchestrator and the client cannot
 * disagree on whether it holds. Undefined for anything that is not a fact: `judged` holds while
 * its values resolve and is never checked against what they say.
 */
export function runFact(
  formula: Formula,
  partitions: {resolve(ref: Ref): Resolution},
): FactState | undefined {
  const fn = RELATION_FUNCTIONS.get(formula.op);
  if (!fn || relationKind(formula.op as RelationOp) !== 'fact') return undefined;
  const resolved = formula.args.map(ref => partitions.resolve(ref));
  if (!resolved.every(r => r.found)) return {state: 'absent'};
  const values = resolved.map(r => (r as {value: unknown}).value);
  const holds = fn.execute({values}, undefined as unknown as DataContext) === true;
  return {state: holds ? 'holds' : 'fails', values};
}
