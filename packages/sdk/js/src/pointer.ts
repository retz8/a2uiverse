/**
 * Pointer and predicate resolution (SPEC §6.2, §14 path predicates): the one
 * parser and resolver both processes use, so the orchestrator's checklist and
 * the client's evaluator cannot disagree on what a ref points at.
 *
 * A pointer is RFC 6901 with one extension: a segment may carry a predicate,
 * `items[sku="x"]`, selecting the element of the array `items` whose field
 * `sku` equals the JSON literal `"x"`. A predicate may conjoin several tests,
 * `items[repository="a/b",number=11]`, for elements no single field names.
 * Exactly one element must match — none is `missing`, several is `ambiguous`;
 * both are absent to a formula.
 *
 * Elements are selected by key, never by position (task-5.10 decision 1). A
 * positional segment into an array resolves to nothing and says so by name:
 * `positional`, so the caller can report the rule rather than a data fault.
 * Integer segments into an *object* stay legal — `/0` is an ordinary property
 * name — so the distinction is drawn at the step, not at parse time.
 */

export type Step =
  | {kind: 'key'; key: string}
  | {kind: 'predicate'; tests: readonly {field: string; value: unknown}[]};

export class PointerSyntaxError extends Error {
  constructor(pointer: string, detail: string) {
    super(`malformed pointer ${JSON.stringify(pointer)}: ${detail}`);
    this.name = 'PointerSyntaxError';
  }
}

const PREDICATE = /^([^[\]]*)\[(.+)\]$/;

function unescape(segment: string): string {
  return segment.replace(/~1/g, '/').replace(/~0/g, '~');
}

/**
 * Splits `field=<literal>,field=<literal>` on the commas that separate tests.
 * Literal-aware: a comma inside a JSON string is content, not a separator.
 */
function splitTests(body: string): string[] {
  const parts: string[] = [];
  let start = 0;
  let inString = false;
  let escaped = false;
  for (let i = 0; i < body.length; i++) {
    const ch = body[i];
    if (escaped) {
      escaped = false;
    } else if (ch === '\\') {
      escaped = true;
    } else if (ch === '"') {
      inString = !inString;
    } else if (ch === ',' && !inString) {
      parts.push(body.slice(start, i));
      start = i + 1;
    }
  }
  parts.push(body.slice(start));
  return parts;
}

/**
 * Splits a pointer body on the slashes that separate segments. Predicate-aware: a slash inside
 * `[…]` is content — a repository name, a path-like id — not a separator, so
 * `prs[repository="a/b",number=11]/title` is two segments, not three.
 */
function splitSegments(body: string): string[] {
  const segments: string[] = [];
  let start = 0;
  let depth = 0;
  for (let i = 0; i < body.length; i++) {
    const ch = body[i];
    if (ch === '[') depth++;
    else if (ch === ']' && depth > 0) depth--;
    else if (ch === '/' && depth === 0) {
      segments.push(body.slice(start, i));
      start = i + 1;
    }
  }
  segments.push(body.slice(start));
  return segments;
}

/** Splits a pointer into steps; throws {@link PointerSyntaxError} on malformed input. */
export function parsePointer(pointer: string): Step[] {
  if (pointer === '') return [];
  if (!pointer.startsWith('/')) throw new PointerSyntaxError(pointer, 'must start with "/"');
  const steps: Step[] = [];
  for (const raw of splitSegments(pointer.slice(1))) {
    if (!raw.includes('[') && !raw.includes(']')) {
      steps.push({kind: 'key', key: unescape(raw)});
      continue;
    }
    const match = PREDICATE.exec(raw);
    if (!match)
      throw new PointerSyntaxError(pointer, `bad predicate segment ${JSON.stringify(raw)}`);
    const [, base, body] = match;
    const tests = splitTests(body).map(part => {
      const eq = part.indexOf('=');
      if (eq <= 0)
        throw new PointerSyntaxError(pointer, `bad predicate test ${JSON.stringify(part)}`);
      const field = part.slice(0, eq);
      if (/[[\]/]/.test(field))
        throw new PointerSyntaxError(pointer, `bad predicate field ${JSON.stringify(field)}`);
      const literal = part.slice(eq + 1);
      let value: unknown;
      try {
        value = JSON.parse(literal);
      } catch {
        throw new PointerSyntaxError(pointer, `predicate value is not a JSON literal: ${literal}`);
      }
      return {field: unescape(field), value};
    });
    steps.push({kind: 'key', key: unescape(base)});
    steps.push({kind: 'predicate', tests});
  }
  return steps;
}

export type Resolution =
  | {found: true; value: unknown}
  | {found: false; reason: 'missing' | 'ambiguous' | 'null' | 'positional'};

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
        step.tests.every(test =>
          jsonEqual((element as Record<string, unknown>)[test.field], test.value),
        ),
    );
    if (hits.length === 1) return {found: true, value: hits[0]};
    return {found: false, reason: hits.length === 0 ? 'missing' : 'ambiguous'};
  }
  if (Array.isArray(current)) {
    // An array is addressed by key alone. A positional segment names the rule it broke so the
    // Synthesizer's retry is told to use a predicate, not sent hunting for missing data.
    return {found: false, reason: CANONICAL_INDEX.test(step.key) ? 'positional' : 'missing'};
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
