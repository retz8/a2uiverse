/**
 * Intake of the synthesis payload (task-5.5 decision 6): the shape by the sdk's validator —
 * the same contract the orchestrator validated against, never a private mirror (phase decision
 * 23) — and, since the sdk knows no catalog, the operators by the client. Either failure is a
 * `VALIDATION_FAILED` report; whether a ref resolves is a runtime state, never validation.
 */
import {validateSynthesisPayload, walkModel, type SynthesisPayload} from '@a2uiverse/sdk';

export type PayloadValidation =
  {ok: true; payload: SynthesisPayload} | {ok: false; path: string; message: string};

/** The sdk's error lines are `<path>: <message>`; the report carries the two apart. */
function split(line: string): {path: string; message: string} {
  const match = /^(\/[^\s:]*|):\s*(.*)$/.exec(line);
  return match ? {path: match[1] || '/', message: match[2]} : {path: '/', message: line};
}

/** Shape, then the operators; the first failure is the report. */
export function validatePayload(raw: unknown, operators: readonly string[]): PayloadValidation {
  const result = validateSynthesisPayload(raw);
  if (!result.ok) return {ok: false, ...split(result.errors[0] ?? 'invalid')};
  const known = new Set(operators);
  for (const leaf of walkModel(result.value.dataModel).leaves) {
    if (!known.has(leaf.formula.op)) {
      return {
        ok: false,
        path: `/dataModel${leaf.path}/op`,
        message: `unknown operator: ${leaf.formula.op}`,
      };
    }
  }
  return {ok: true, payload: result.value};
}
