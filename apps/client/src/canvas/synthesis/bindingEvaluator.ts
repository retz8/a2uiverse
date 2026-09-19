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
 *
 * The entity join (task-7.7): an object's match claim is evaluated beside its cells — each
 * relation resolved and run on the shell catalog's relation functions — and handed to the shell
 * catalog's mark rule for every cell under it, down to the next object that carries its own
 * (decision 8). Nothing is written at `match` (decision 9): the evidence is on each cell's join.
 * Every cell with a ref carries the element a tap on it navigates to (task-7.5 decision 12).
 */
import type {DataContext, FunctionImplementation} from '@a2ui/web_core/v0_9';
import {
  isFormula,
  MATCH_KEY,
  parseSurfaceId,
  reachSortPath,
  resolvePointer,
  type Formula,
  type ModelNode,
  type Ref,
  type SortDeclaration,
  type SynthesisPayload,
} from '@a2uiverse/sdk';
import {cellJoin, parseInstant, relationKind, RELATIONS} from '@a2uiverse/shell-catalog';
import type {
  CellObject,
  CellTarget,
  EvaluatedRelation,
  RelationOp,
  RelationSide,
} from '@a2uiverse/shell-catalog';

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
  /** The user's choices by sorted array path; a declaration without one takes its own. */
  choices?: ReadonlyMap<string, SortChoice>;
  /** The shell catalog's functions — the operator vocabulary. */
  functions: ReadonlyMap<string, FunctionImplementation>;
}

/** The source selectors: their result is an index over the surviving inputs. */
const INDEX_OPERATORS = new Set(['argmin', 'argmax', 'source']);

/** Absent is unresolvable or null (task-4.5 decision 7): the kit answers both as not found. */
function resolveRef(ref: Ref, models: EvaluateInput['models']): {found: boolean; value?: unknown} {
  const model = models(ref.surface);
  if (model === undefined) return {found: false};
  const result = resolvePointer(model, ref.pointer);
  return result.found && result.value !== undefined ? result : {found: false};
}

/** A source is an app (task-4.5 decision 8): the app a namespaced surface belongs to. */
function appOf(surface: string): string {
  return parseSurfaceId(surface)?.appId ?? surface;
}

function targetOf(ref: Ref): CellTarget {
  return {app: appOf(ref.surface), surface: ref.surface, pointer: ref.pointer};
}

/** An object's match claim, evaluated; absent, the claim in force above it stands. */
type Claim = readonly EvaluatedRelation[];

function evaluateFormula(formula: Formula, input: EvaluateInput, claim?: Claim): CellObject {
  const survivors: {ref: Ref; value: unknown}[] = [];
  const absent: string[] = [];
  for (const ref of formula.args) {
    const resolved = resolveRef(ref, input.models);
    if (resolved.found) survivors.push({ref, value: resolved.value});
    else absent.push(ref.surface);
  }
  const apps = formula.args.map(ref => appOf(ref.surface));
  const present = new Set(survivors.map(s => appOf(s.ref.surface)));
  const join =
    claim &&
    cellJoin(
      claim,
      apps,
      apps.filter(app => !present.has(app)),
    );
  // The first contributor, the first declared ref when none resolves; a selector's winner below.
  const first = survivors[0]?.ref ?? formula.args[0];
  const base = {
    of: formula.args.length,
    absent,
    ...(join && {join}),
    ...(first && {target: targetOf(first)}),
  };

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
    const winner = survivors[value]?.ref;
    // A source selector names a source, and the cell navigates to the entry that won.
    if (winner !== undefined) {
      return {
        value: appOf(winner.surface),
        contributed: survivors.length,
        ...base,
        target: targetOf(winner),
      };
    }
  }
  return {value, contributed: survivors.length, ...base};
}

function isRelation(op: string): op is RelationOp {
  return (RELATIONS as readonly string[]).includes(op);
}

/**
 * One relation, now (task-7.5 decision 6): absent when either side does not resolve, else what
 * the shell catalog's relation function answers over the two values.
 */
function evaluateRelation(name: string, formula: Formula, input: EvaluateInput) {
  const [a, b] = formula.args;
  if (!isRelation(formula.op) || !a || !b || formula.args.length !== 2) return undefined;
  const side = (ref: Ref): RelationSide => {
    const resolved = resolveRef(ref, input.models);
    return {app: appOf(ref.surface), ref, ...(resolved.found && {value: resolved.value})};
  };
  const sides: [RelationSide, RelationSide] = [side(a), side(b)];
  let state: EvaluatedRelation['state'] = 'absent';
  if ('value' in sides[0] && 'value' in sides[1]) {
    let holds = false;
    try {
      holds =
        input.functions
          .get(formula.op)
          ?.execute(
            {values: [sides[0].value, sides[1].value]},
            undefined as unknown as DataContext,
          ) === true;
    } catch {
      holds = false;
    }
    state = holds ? 'holds' : 'fails';
  }
  const relation: EvaluatedRelation = {
    name,
    kind: relationKind(formula.op),
    op: formula.op,
    state,
    sides,
  };
  return relation;
}

function evaluateClaim(match: unknown, input: EvaluateInput): Claim | undefined {
  if (typeof match !== 'object' || match === null || Array.isArray(match)) return undefined;
  return Object.entries(match).flatMap(([name, formula]) => {
    const relation = isFormula(formula) ? evaluateRelation(name, formula, input) : undefined;
    return relation ? [relation] : [];
  });
}

/**
 * The derived model, node by node: a formula becomes its cell, a branch keeps its shape, and an
 * object's `match` becomes the claim its cells are joined by — its own and those of every plain
 * object and array under it.
 */
function evaluateNode(node: ModelNode, input: EvaluateInput, claim?: Claim): unknown {
  if (isFormula(node)) return evaluateFormula(node, input, claim);
  if (Array.isArray(node)) return node.map(child => evaluateNode(child, input, claim));
  const record = node as Record<string, ModelNode>;
  const own = MATCH_KEY in record ? (evaluateClaim(record[MATCH_KEY], input) ?? claim) : claim;
  return Object.fromEntries(
    Object.entries(record)
      .filter(([key]) => key !== MATCH_KEY)
      .map(([key, child]) => [key, evaluateNode(child, input, own)]),
  );
}

/** A cell with nothing behind it sorts last whichever way the list runs. */
function isAbsent(cell: CellObject | undefined): boolean {
  return cell === undefined || cell.contributed === 0 || cell.value == null;
}

/**
 * Numbers numerically, two date-times by the instant the shell catalog reads in them — any
 * spelling with a year and a clock — strings by locale, a mixed pair by string (task-4.5
 * decision 9, amended by task-5.7 decision 7 and its run).
 */
function compareValues(a: unknown, b: unknown): number {
  if (typeof a === 'number' && typeof b === 'number') return a - b;
  const [x, y] = [parseInstant(a), parseInstant(b)];
  if (x !== undefined && y !== undefined) return x - y;
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

/**
 * Reorders, in place, every array the path reaches in the evaluated model — the one array of a
 * plain path, the list inside every row of a path through `*` (task-7.12) — by the sdk's walk;
 * where the path reaches none, nothing moves.
 */
function sortInPlace(model: Record<string, unknown>, path: string, choice: SortChoice): void {
  for (const {array} of reachSortPath(model, path).targets) {
    array.splice(0, array.length, ...orderElements(array, choice.key, choice.direction));
  }
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
