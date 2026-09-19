/**
 * Intake of the synthesis payload (task-5.5 decision 6): the shape by the sdk's validator —
 * the same contract the orchestrator validated against, never a private mirror (phase decision
 * 23) — and, since the sdk knows no catalog, the operators by the client, each in its place: a
 * match claim is written in the relations, and a relation nowhere else (task-7.5 decision 5).
 * Either failure is a `VALIDATION_FAILED` report; whether a ref resolves is a runtime state,
 * never validation.
 */
import {validateSynthesisPayload, walkModel, type SynthesisPayload} from '@a2uiverse/sdk';

export type PayloadValidation =
  {ok: true; payload: SynthesisPayload} | {ok: false; path: string; message: string};

/** The sdk's error lines are `<path>: <message>`; the report carries the two apart. */
function split(line: string): {path: string; message: string} {
  const match = /^(\/[^\s:]*|):\s*(.*)$/.exec(line);
  return match ? {path: match[1] || '/', message: match[2]} : {path: '/', message: line};
}

/** Why an operator is out of place, or undefined when it is where it belongs. */
function misplaced(
  op: string,
  claimed: boolean,
  operators: ReadonlySet<string>,
  relations: ReadonlySet<string>,
): string | undefined {
  if (claimed) return relations.has(op) ? undefined : `not a relation: ${op}`;
  if (relations.has(op)) return `a relation outside match: ${op}`;
  return operators.has(op) ? undefined : `unknown operator: ${op}`;
}

/** Shape, then the operators; the first failure is the report. */
export function validatePayload(
  raw: unknown,
  operators: readonly string[],
  relations: readonly string[],
): PayloadValidation {
  const result = validateSynthesisPayload(raw);
  if (!result.ok) return {ok: false, ...split(result.errors[0] ?? 'invalid')};
  const walk = walkModel(result.value.dataModel);
  const claimed = new Set(walk.claims.flatMap(claim => claim.relations.map(r => r.path)));
  const [known, relational] = [new Set(operators), new Set(relations)];
  for (const leaf of walk.leaves) {
    const message = misplaced(leaf.formula.op, claimed.has(leaf.path), known, relational);
    if (message) return {ok: false, path: `/dataModel${leaf.path}/op`, message};
  }
  return {ok: true, payload: result.value};
}
