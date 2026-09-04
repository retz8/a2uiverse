/**
 * The BindingEvaluator (SPEC §10, task-4.5): the wiring the Synthesizer emitted, evaluated
 * against the partitions the client holds, into the synthesis surface's ordinary data model.
 * Client-side, deterministic, zero model cost.
 *
 * A pure whole recompute (decision 1): every trigger calls this once with everything it needs,
 * and the output is the whole `{entities, sort}` the derived tree binds to. There is no
 * incremental state; the surface-to-cell lookup stale marking needs is derived here per run.
 *
 * Around each catalog operator (task-4.3 decision 2) the evaluator does the rest: resolves each
 * ref against its partition, drops the absent ones, hands the survivors to the catalog function,
 * records how many contributed and which surfaces did not, and maps a source selector's index
 * back to the app that won. The renderer sees plain values and plain paths.
 */
import type {DataContext, FunctionImplementation} from '@a2ui/web_core/v0_9';
import {parseSurfaceId, type Ref, type Sort, type SynthesisWiring} from '@a2uiverse/sdk';
import type {CellObject, SortObject} from '@a2uiverse/shell-catalog';

/** One evaluated entity: the wiring's field names to the cell objects `DerivedValue` reads. */
export type EvaluatedEntity = Record<string, CellObject>;

/** What the evaluator writes at the synthesis surface's root. */
export interface SynthesisModel {
  entities: EvaluatedEntity[];
  sort: SortObject;
}

export interface EvaluateInput {
  wiring: SynthesisWiring;
  /** The root data model of a partition by namespaced surface id; undefined when not held. */
  models: (surface: string) => unknown;
  /** The latest generation seen per surface, from the stamps. */
  generations: Readonly<Record<string, number>>;
  /** The sort in force, when the user has chosen one; otherwise the wiring's. */
  sort?: Sort;
  /** The shell catalog's functions — the operator vocabulary. */
  functions: ReadonlyMap<string, FunctionImplementation>;
}

/** The source selectors: their result is an index over the surviving inputs. */
const INDEX_OPERATORS = new Set(['argmin', 'argmax']);

/**
 * RFC 6901 resolution over plain data. Undefined for anything that does not resolve: a missing
 * key, an index out of range or non-numeric, a primitive where a container was expected.
 */
export function resolvePointer(root: unknown, pointer: string): unknown {
  if (pointer === '') return root;
  let current = root;
  for (const raw of pointer.split('/').slice(1)) {
    const segment = raw.replace(/~1/g, '/').replace(/~0/g, '~');
    if (current === null || typeof current !== 'object') return undefined;
    if (Array.isArray(current)) {
      if (!/^(0|[1-9]\d*)$/.test(segment)) return undefined;
      const index = Number(segment);
      if (index >= current.length) return undefined;
      current = current[index];
    } else {
      if (!Object.prototype.hasOwnProperty.call(current, segment)) return undefined;
      current = (current as Record<string, unknown>)[segment];
    }
  }
  return current;
}

/** Absent is unresolvable or null (decision 7): both are "no value here". */
function resolveRef(ref: Ref, models: EvaluateInput['models']): unknown {
  const value = resolvePointer(models(ref.surface), ref.pointer);
  return value === null ? undefined : value;
}

/**
 * Stale is compared, never reset (decision 6): a surface whose latest seen generation differs
 * from what the wiring was computed against, in either direction. Never stamped is matched.
 */
function staleSurfaces(wiring: SynthesisWiring, generations: EvaluateInput['generations']) {
  const stale = new Set<string>();
  for (const [surface, computed] of Object.entries(wiring.computedAgainst)) {
    const seen = generations[surface];
    if (seen !== undefined && seen !== computed) stale.add(surface);
  }
  return stale;
}

function evaluateCell(
  cell: SynthesisWiring['entities'][number]['cells'][number],
  input: EvaluateInput,
  stale: ReadonlySet<string>,
): CellObject {
  const survivors: {ref: Ref; value: unknown}[] = [];
  const absent: string[] = [];
  for (const ref of cell.args) {
    const value = resolveRef(ref, input.models);
    if (value === undefined) absent.push(ref.surface);
    else survivors.push({ref, value});
  }
  const isStale = cell.args.some(ref => stale.has(ref.surface));
  const base = {of: cell.args.length, absent, ...(isStale ? {stale: true} : {})};

  const fn = input.functions.get(cell.op);
  if (survivors.length === 0 || !fn) return {value: undefined, contributed: 0, ...base};

  let value: unknown;
  try {
    // Operators are plain catalog functions over positional values; none reads the context.
    value = fn.execute({values: survivors.map(s => s.value)}, undefined as unknown as DataContext);
  } catch {
    return {value: undefined, contributed: 0, ...base};
  }
  if (INDEX_OPERATORS.has(cell.op) && typeof value === 'number') {
    const winner = survivors[value]?.ref.surface;
    // A source selector names a source, and a source is an app (decision 8).
    if (winner !== undefined) value = parseSurfaceId(winner)?.appId ?? winner;
  }
  return {value, contributed: survivors.length, ...base};
}

/** The user's sort sticks while its field still exists (decision 2); otherwise the wiring's. */
function sortInForce(wiring: SynthesisWiring, sort: Sort | undefined): Sort {
  if (sort && wiring.fields.some(f => f.name === sort.field)) return sort;
  return wiring.sort;
}

/** A cell with nothing behind it sorts last whichever way the list runs. */
function isAbsent(cell: CellObject | undefined): boolean {
  return cell === undefined || cell.contributed === 0 || cell.value == null;
}

/** Numbers numerically, strings by locale, a mixed pair by string (decision 9). */
function compareValues(a: unknown, b: unknown): number {
  if (typeof a === 'number' && typeof b === 'number') return a - b;
  return String(a).localeCompare(String(b));
}

function orderEntities(entities: EvaluatedEntity[], sort: Sort): EvaluatedEntity[] {
  const sign = sort.direction === 'desc' ? -1 : 1;
  return entities
    .map((entity, index) => ({entity, index}))
    .sort((x, y) => {
      const a = x.entity[sort.field];
      const b = y.entity[sort.field];
      const aAbsent = isAbsent(a);
      const bAbsent = isAbsent(b);
      if (aAbsent !== bAbsent) return aAbsent ? 1 : -1;
      const byValue = aAbsent ? 0 : sign * compareValues(a!.value, b!.value);
      // Ties keep wiring order: nothing moves when nothing differs.
      return byValue !== 0 ? byValue : x.index - y.index;
    })
    .map(({entity}) => entity);
}

export function evaluate(input: EvaluateInput): SynthesisModel {
  const {wiring} = input;
  const stale = staleSurfaces(wiring, input.generations);
  const entities = wiring.entities.map(entity => {
    const evaluated: EvaluatedEntity = {};
    wiring.fields.forEach((field, i) => {
      const cell = entity.cells[i];
      evaluated[field.name] = cell
        ? evaluateCell(cell, input, stale)
        : {value: undefined, contributed: 0, of: 0, absent: []};
    });
    return evaluated;
  });
  const sort = sortInForce(wiring, input.sort);
  return {
    entities: orderEntities(entities, sort),
    sort: {field: sort.field, direction: sort.direction, fields: wiring.fields},
  };
}
