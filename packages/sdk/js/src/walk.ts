/**
 * The model walk: enumerates every formula leaf of a derived model with its
 * JSON Pointer path, and every ref. The validator uses it for "every leaf is a
 * formula"; the client for subscriptions; the orchestrator for
 * `computedAgainst`.
 */
import type {DerivedModel, Formula, Ref} from './synthesis.js';

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

export interface Walk {
  leaves: Leaf[];
  /** Paths of scalars found where a node was expected — each one a contract violation. */
  violations: string[];
}

function escape(segment: string): string {
  return segment.replace(/~/g, '~0').replace(/\//g, '~1');
}

export function walkModel(model: DerivedModel): Walk {
  const leaves: Leaf[] = [];
  const violations: string[] = [];
  const visit = (node: unknown, path: string) => {
    if (isFormula(node)) {
      leaves.push({path, formula: node});
    } else if (Array.isArray(node)) {
      node.forEach((child, index) => visit(child, `${path}/${index}`));
    } else if (typeof node === 'object' && node !== null) {
      for (const [key, child] of Object.entries(node)) visit(child, `${path}/${escape(key)}`);
    } else {
      violations.push(path);
    }
  };
  for (const [key, child] of Object.entries(model)) visit(child, `/${escape(key)}`);
  return {leaves, violations};
}

/** Every ref in the model, in leaf order. */
export function refsOf(model: DerivedModel): Ref[] {
  return walkModel(model).leaves.flatMap(leaf => leaf.formula.args);
}
