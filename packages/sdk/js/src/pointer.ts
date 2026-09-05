/**
 * Pointer and predicate resolution (SPEC §6.2, §14 path predicates): the one
 * parser and resolver both processes use, so the orchestrator's checklist and
 * the client's evaluator cannot disagree on what a ref points at.
 *
 * A pointer is RFC 6901 with one extension: a segment may carry a predicate,
 * `items[sku="x"]`, selecting the element of the array `items` whose field
 * `sku` equals the JSON literal `"x"`. The key is one field name; the value is
 * a JSON literal compared by JSON equality. Exactly one element must match —
 * none is `missing`, several is `ambiguous`; both are absent to a formula.
 */

export type Step = {kind: 'key'; key: string} | {kind: 'predicate'; field: string; value: unknown};

export class PointerSyntaxError extends Error {
  constructor(pointer: string, detail: string) {
    super(`malformed pointer ${JSON.stringify(pointer)}: ${detail}`);
    this.name = 'PointerSyntaxError';
  }
}

const PREDICATE = /^([^[\]]*)\[([^=[\]/]+)=(.+)\]$/;

function unescape(segment: string): string {
  return segment.replace(/~1/g, '/').replace(/~0/g, '~');
}

/** Splits a pointer into steps; throws {@link PointerSyntaxError} on malformed input. */
export function parsePointer(pointer: string): Step[] {
  if (pointer === '') return [];
  if (!pointer.startsWith('/')) throw new PointerSyntaxError(pointer, 'must start with "/"');
  const steps: Step[] = [];
  for (const raw of pointer.slice(1).split('/')) {
    if (!raw.includes('[') && !raw.includes(']')) {
      steps.push({kind: 'key', key: unescape(raw)});
      continue;
    }
    const match = PREDICATE.exec(raw);
    if (!match)
      throw new PointerSyntaxError(pointer, `bad predicate segment ${JSON.stringify(raw)}`);
    const [, base, field, literal] = match;
    let value: unknown;
    try {
      value = JSON.parse(literal);
    } catch {
      throw new PointerSyntaxError(pointer, `predicate value is not a JSON literal: ${literal}`);
    }
    steps.push({kind: 'key', key: unescape(base)});
    steps.push({kind: 'predicate', field: unescape(field), value});
  }
  return steps;
}

export type Resolution =
  {found: true; value: unknown} | {found: false; reason: 'missing' | 'ambiguous' | 'null'};

const CANONICAL_INDEX = /^(0|[1-9][0-9]*)$/;

function jsonEqual(a: unknown, b: unknown): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}

function stepInto(current: unknown, step: Step): Resolution {
  if (step.kind === 'predicate') {
    if (!Array.isArray(current)) return {found: false, reason: 'missing'};
    const hits = current.filter(
      element =>
        typeof element === 'object' &&
        element !== null &&
        !Array.isArray(element) &&
        jsonEqual((element as Record<string, unknown>)[step.field], step.value),
    );
    if (hits.length === 1) return {found: true, value: hits[0]};
    return {found: false, reason: hits.length === 0 ? 'missing' : 'ambiguous'};
  }
  if (Array.isArray(current)) {
    if (!CANONICAL_INDEX.test(step.key)) return {found: false, reason: 'missing'};
    const index = Number(step.key);
    return index < current.length
      ? {found: true, value: current[index]}
      : {found: false, reason: 'missing'};
  }
  if (typeof current === 'object' && current !== null) {
    const record = current as Record<string, unknown>;
    return Object.prototype.hasOwnProperty.call(record, step.key)
      ? {found: true, value: record[step.key]}
      : {found: false, reason: 'missing'};
  }
  return {found: false, reason: 'missing'};
}

/** Resolves a pointer against a data model root. A `null` at the end is absent, not a value. */
export function resolvePointer(root: unknown, pointer: string): Resolution {
  let current: unknown = root;
  for (const step of parsePointer(pointer)) {
    const next = stepInto(current, step);
    if (!next.found) return next;
    current = next.value;
  }
  return current === null ? {found: false, reason: 'null'} : {found: true, value: current};
}
