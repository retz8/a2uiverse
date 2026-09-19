/**
 * The model walk: enumerates every formula leaf of a derived model with its
 * JSON Pointer path, every match claim, and every ref. The validator uses it for
 * "every leaf is a formula" and the match claim's shape; the client for
 * subscriptions; the orchestrator for the integrity check. A match claim's
 * relations are formulas, so they are leaves like any other and their refs are
 * the model's refs.
 */
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
