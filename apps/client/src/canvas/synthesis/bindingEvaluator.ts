/**
 * The BindingEvaluator (SPEC §10, task-5.5): the synthesis payload the orchestrator sent — the
 * Synthesizer's free-form derived model and its sort declarations — evaluated against the
 * partitions the client holds, into the synthesis surface's ordinary data model. Client-side,
 * deterministic, zero model cost.
 *
 * A pure whole recompute (task-4.5 decision 1, carried): every trigger calls this once with
 * everything it needs, and the output is the whole model the model-authored tree binds to. The
 * evaluated model mirrors the derived model: a cell object at every formula path, branches
 * keeping their shape, each declared array reordered in place, and each declaration with the
 * current choice at `/sorts/N` — the reserved root key the tree binds `SortControl` to.
 *
 * Refs resolve through the sdk kit (phase decision 23), and resolution is validity: a ref is
 * good while its keys resolve, so a partition that reorders under it changes nothing
 * (task-5.10 decision 1). Around each catalog operator the evaluator does the rest: resolves
 * each ref, drops the absent ones, hands the survivors to the catalog function, records how
 * many contributed and which surfaces did not, and maps a source selector's index back to the
 * app that won.
 */
import type {DataContext, FunctionImplementation} from '@a2ui/web_core/v0_9';
import {
  isFormula,
  parseSurfaceId,
  parsePointer,
  resolvePointer,
  type Formula,
  type ModelNode,
  type Ref,
  type SortDeclaration,
  type SynthesisPayload,
} from '@a2uiverse/sdk';
import type {CellObject} from '@a2uiverse/shell-catalog';

/** The user's choice on one sorted array, kept by the array's path (task-5.5 decision 5). */
export interface SortChoice {
  key: string;
  direction: 'asc' | 'desc';
}

/** What the evaluator writes at the synthesis surface's root. */
export type EvaluatedModel = Record<string, unknown> & {sorts: SortDeclaration[]};

export interface EvaluateInput {
  payload: SynthesisPayload;
  /** The root data model of a partition by namespaced surface id; undefined when not held. */
  models: (surface: string) => unknown;
  /** The latest generation seen per surface, from the stamps. */
  /** The user's choices by sorted array path; a declaration without one takes its own. */
  choices?: ReadonlyMap<string, SortChoice>;
  /** The shell catalog's functions — the operator vocabulary. */
  functions: ReadonlyMap<string, FunctionImplementation>;
}

/** The source selectors: their result is an index over the surviving inputs. */
const INDEX_OPERATORS = new Set(['argmin', 'argmax']);

/** Absent is unresolvable or null (task-4.5 decision 7): the kit answers both as not found. */
function resolveRef(ref: Ref, models: EvaluateInput['models']): {found: boolean; value?: unknown} {
  const model = models(ref.surface);
  if (model === undefined) return {found: false};
  const result = resolvePointer(model, ref.pointer);
  return result.found && result.value !== undefined ? result : {found: false};
}

function evaluateFormula(formula: Formula, input: EvaluateInput): CellObject {
  const survivors: {ref: Ref; value: unknown}[] = [];
  const absent: string[] = [];
  for (const ref of formula.args) {
    const resolved = resolveRef(ref, input.models);
    if (resolved.found) survivors.push({ref, value: resolved.value});
    else absent.push(ref.surface);
  }
  const base = {of: formula.args.length, absent};

  const fn = input.functions.get(formula.op);
  if (survivors.length === 0 || !fn) return {value: undefined, contributed: 0, ...base};

  let value: unknown;
  try {
    // Operators are plain catalog functions over positional values; none reads the context.
    value = fn.execute({values: survivors.map(s => s.value)}, undefined as unknown as DataContext);
  } catch {
    return {value: undefined, contributed: 0, ...base};
  }
  if (INDEX_OPERATORS.has(formula.op) && typeof value === 'number') {
    const winner = survivors[value]?.ref.surface;
    // A source selector names a source, and a source is an app (task-4.5 decision 8).
    if (winner !== undefined) value = parseSurfaceId(winner)?.appId ?? winner;
  }
  return {value, contributed: survivors.length, ...base};
}

/** The derived model, node by node: a formula becomes its cell, a branch keeps its shape. */
function evaluateNode(node: ModelNode, input: EvaluateInput): unknown {
  if (isFormula(node)) return evaluateFormula(node, input);
  if (Array.isArray(node)) return node.map(child => evaluateNode(child, input));
  return Object.fromEntries(
    Object.entries(node).map(([key, child]) => [key, evaluateNode(child, input)]),
  );
}

/** A cell with nothing behind it sorts last whichever way the list runs. */
function isAbsent(cell: CellObject | undefined): boolean {
  return cell === undefined || cell.contributed === 0 || cell.value == null;
}

/** Numbers numerically, strings by locale, a mixed pair by string (task-4.5 decision 9). */
function compareValues(a: unknown, b: unknown): number {
  if (typeof a === 'number' && typeof b === 'number') return a - b;
  return String(a).localeCompare(String(b));
}

function cellAt(element: unknown, key: string): CellObject | undefined {
  const result = resolvePointer(element, key);
  if (!result.found) return undefined;
  const cell = result.value as CellObject;
  return typeof cell === 'object' && cell !== null && 'contributed' in cell ? cell : undefined;
}

function orderElements(elements: unknown[], key: string, direction: 'asc' | 'desc'): unknown[] {
  const sign = direction === 'desc' ? -1 : 1;
  return elements
    .map((element, index) => ({element, index}))
    .sort((x, y) => {
      const a = cellAt(x.element, key);
      const b = cellAt(y.element, key);
      const aAbsent = isAbsent(a);
      const bAbsent = isAbsent(b);
      if (aAbsent !== bAbsent) return aAbsent ? 1 : -1;
      const byValue = aAbsent ? 0 : sign * compareValues(a!.value, b!.value);
      // Ties keep model order: nothing moves when nothing differs.
      return byValue !== 0 ? byValue : x.index - y.index;
    })
    .map(({element}) => element);
}

/**
 * The choice in force for a declaration: the user's, kept by path, while its key is still one
 * of the options; otherwise the declaration's own (task-5.5 decision 5).
 */
export function choiceInForce(
  declaration: SortDeclaration,
  choices: EvaluateInput['choices'],
): SortChoice {
  const chosen = choices?.get(declaration.path);
  if (chosen && declaration.options.some(option => option.key === chosen.key)) return chosen;
  return {key: declaration.key, direction: declaration.direction};
}

/** Replaces the array at `path` of the evaluated model with its sorted copy; a non-array is left. */
function sortInPlace(model: Record<string, unknown>, path: string, choice: SortChoice): void {
  const steps = parsePointer(path);
  let parent: unknown = model;
  for (const step of steps.slice(0, -1)) {
    if (step.kind !== 'key' || typeof parent !== 'object' || parent === null) return;
    parent = (parent as Record<string, unknown>)[step.key];
  }
  const last = steps.at(-1);
  if (!last || last.kind !== 'key' || typeof parent !== 'object' || parent === null) return;
  const container = parent as Record<string, unknown>;
  const elements = container[last.key];
  if (!Array.isArray(elements)) return;
  container[last.key] = orderElements(elements, choice.key, choice.direction);
}

export function evaluate(input: EvaluateInput): EvaluatedModel {
  const {payload} = input;
  const model = evaluateNode(payload.dataModel, input) as Record<string, unknown>;
  const sorts = payload.sorts.map(declaration => {
    const choice = choiceInForce(declaration, input.choices);
    sortInPlace(model, declaration.path, choice);
    return {...declaration, key: choice.key, direction: choice.direction};
  });
  return {...model, sorts};
}

/** The user's choices as the sort controls wrote them back at `/sorts`, keyed by array path. */
export function choicesOf(sorts: unknown): Map<string, SortChoice> {
  const choices = new Map<string, SortChoice>();
  if (!Array.isArray(sorts)) return choices;
  for (const raw of sorts) {
    const candidate = raw as {path?: unknown; key?: unknown; direction?: unknown} | null;
    if (typeof candidate?.path !== 'string' || typeof candidate.key !== 'string') continue;
    if (candidate.direction !== 'asc' && candidate.direction !== 'desc') continue;
    choices.set(candidate.path, {key: candidate.key, direction: candidate.direction});
  }
  return choices;
}
