/**
 * The model walk: enumerates every formula leaf of a derived model with its
 * JSON Pointer path, every match claim, and every ref. The validator uses it for
 * "every leaf is a formula" and the match claim's shape; the client for
 * subscriptions; the orchestrator for the integrity check. A match claim's
 * relations are formulas, so they are leaves like any other and their refs are
 * the model's refs. And the sort walk: every array a sort path reaches, the one
 * expansion of `*` the validator and the client's sort share (task-7.12).
 */
import {parsePointer, PointerSyntaxError, type Step} from './pointer.js';
import {MATCH_KEY, type DerivedModel, type Formula, type Ref} from './synthesis.js';

/** A leaf is recognized by shape: an object with exactly `op` (string) and `args` (array). */
export function isFormula(node: unknown): node is Formula {
  if (typeof node !== 'object' || node === null || Array.isArray(node)) return false;
  const keys = Object.keys(node);
  if (keys.length !== 2 || !('op' in node) || !('args' in node)) return false;
  const {op, args} = node as {op: unknown; args: unknown};
  return typeof op === 'string' && Array.isArray(args);
}

export interface Leaf {
  /** JSON Pointer to the leaf in the derived model. */
  path: string;
  formula: Formula;
}

export interface Claim {
  /** JSON Pointer to the object carrying the match claim; `''` for the root. */
  path: string;
  /** Its named relations, in key order: each value that is a formula, with its name and path. */
  relations: Array<{name: string; path: string; formula: Formula}>;
}

export interface Walk {
  leaves: Leaf[];
  /** Every object's match claim, in walk order. */
  claims: Claim[];
  /** Paths of scalars found where a node was expected — each one a contract violation. */
  violations: string[];
}

function escape(segment: string): string {
  return segment.replace(/~/g, '~0').replace(/\//g, '~1');
}

function claimOf(node: object, path: string): Claim | undefined {
  const match = (node as Record<string, unknown>)[MATCH_KEY];
  if (typeof match !== 'object' || match === null || Array.isArray(match)) return undefined;
  const relations = Object.entries(match).flatMap(([name, formula]) =>
    isFormula(formula) ? [{name, path: `${path}/${MATCH_KEY}/${escape(name)}`, formula}] : [],
  );
  return {path, relations};
}

export function walkModel(model: DerivedModel): Walk {
  const leaves: Leaf[] = [];
  const claims: Claim[] = [];
  const violations: string[] = [];
  const visitObject = (node: object, path: string) => {
    const claim = claimOf(node, path);
    if (claim) claims.push(claim);
    for (const [key, child] of Object.entries(node)) visit(child, `${path}/${escape(key)}`);
  };
  const visit = (node: unknown, path: string) => {
    if (isFormula(node)) {
      leaves.push({path, formula: node});
    } else if (Array.isArray(node)) {
      node.forEach((child, index) => visit(child, `${path}/${index}`));
    } else if (typeof node === 'object' && node !== null) {
      visitObject(node, path);
    } else {
      violations.push(path);
    }
  };
  visitObject(model, '');
  return {leaves, claims, violations};
}

/** Every ref in the model, in leaf order. */
export function refsOf(model: DerivedModel): Ref[] {
  return walkModel(model).leaves.flatMap(leaf => leaf.formula.args);
}

/** One array a sort path reaches. */
export interface SortTarget {
  /** Where the array sits: the path with each `*` replaced by the element's position. */
  location: string;
  /** The model's own array, so a consumer can reorder it in place. */
  array: unknown[];
}

export interface SortReach {
  targets: SortTarget[];
  /** Why the path does not reach an array somewhere, each naming where; empty when it does. */
  faults: string[];
}

/** A sort path's step through every element of an array (task-7.12 decision 1). */
const EVERY = '*';

function grammarFault(path: string, steps: Step[]): string | undefined {
  if (steps.some(step => step.kind === 'predicate')) {
    return `path ${path} selects an element by key; a sort path steps through an array with *`;
  }
  const last = steps.at(-1);
  if (last?.kind === 'key' && last.key === EVERY) {
    return `path ${path} ends in *; its last step names the sorted array`;
  }
  return undefined;
}

/**
 * Every array a sort path reaches in a model (task-7.12 decisions 1–3, 7). A path's steps are
 * object keys and `*`, at any depth; `*` passes through every element of an array, and the last
 * step names the sorted array. Every element the path passes through carries the list — `[]`
 * when it has none — and one that does not is a fault naming where. An array is never stepped
 * into by name or position, and no step selects an element by key.
 */
export function reachSortPath(model: unknown, path: string): SortReach {
  let steps: Step[];
  try {
    steps = parsePointer(path);
  } catch (error) {
    if (!(error instanceof PointerSyntaxError)) throw error;
    return {targets: [], faults: [error.message]};
  }
  const grammar = grammarFault(path, steps);
  if (grammar) return {targets: [], faults: [grammar]};
  const nested = steps.some(step => step.kind === 'key' && step.key === EVERY);
  const unreached = (location: string) =>
    nested
      ? `path ${path} reaches no array at ${location} — every element it passes through carries the list, [] when it has none`
      : `path ${path} is not an array of the derived model`;

  const targets: SortTarget[] = [];
  const faults: string[] = [];
  const visit = (node: unknown, index: number, location: string) => {
    if (index === steps.length) {
      if (Array.isArray(node)) targets.push({location, array: node});
      else faults.push(unreached(location));
      return;
    }
    const {key} = steps[index] as Step & {kind: 'key'};
    if (key === EVERY) {
      if (!Array.isArray(node)) {
        faults.push(`path ${path} steps with * through ${location}, which is not an array`);
        return;
      }
      node.forEach((element, position) => visit(element, index + 1, `${location}/${position}`));
      return;
    }
    if (Array.isArray(node)) {
      faults.push(
        `path ${path} steps into the array at ${location} by name or position; a sort path steps through an array with *`,
      );
      return;
    }
    const next = `${location}/${escape(key)}`;
    const record = typeof node === 'object' && node !== null ? node : undefined;
    if (!record || !Object.prototype.hasOwnProperty.call(record, key)) {
      faults.push(unreached(next));
      return;
    }
    visit((record as Record<string, unknown>)[key], index + 1, next);
  };
  visit(model, 0, '');
  return {targets, faults};
}
