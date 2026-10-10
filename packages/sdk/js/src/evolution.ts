/**
 * The additive-evolution check within a catalog id (SPEC §9.1, §14; task-13.2 decision 9): a new
 * artifact for a held id is accepted when its schema removes nothing and changes no type — a
 * breaking change is a new catalog id. Run where an artifact enters, at publish and at install.
 *
 * A fixed structural walk of the held schema against the new one, never a semantic subsumption of
 * two JSON Schemas: the files as the gate reads them, a `$ref` compared as a string and never
 * resolved. Refused: a component, a function or a `$defs` entry removed; a property removed; a
 * property becoming required; an enum value removed; `type`, `$ref` or `const` differing at any
 * node; a constraint tightened — added where the held node had none, or made stricter. Accepted:
 * a constraint loosened or dropped; annotations changing freely. Any other keyword is ignored, so
 * a harmless keyword never blocks a publish. Each finding names the component or function and
 * the path.
 */
import type {A2uiCatalogSchema} from './a2ui/types.js';

type Json = Record<string, unknown>;

const isObject = (value: unknown): value is Json =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const same = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);

/** Keywords whose value is the node's identity: differing anywhere is a type change. */
const IDENTITY = ['type', '$ref', 'const'] as const;

/** Keywords whose larger value is stricter. */
const LOWER_BOUNDS = ['minLength', 'minimum', 'exclusiveMinimum', 'minItems', 'minProperties'];
/** Keywords whose smaller value is stricter. */
const UPPER_BOUNDS = ['maxLength', 'maximum', 'exclusiveMaximum', 'maxItems', 'maxProperties'];
/** Keywords any change of which is a different constraint. */
const EXACT = ['pattern', 'multipleOf'];

/** Empty when `next` is an additive evolution of `held`; else each refusal with its path. */
export function checkAdditiveEvolution(held: A2uiCatalogSchema, next: A2uiCatalogSchema): string[] {
  const findings: string[] = [];
  if (held.catalogId !== next.catalogId) {
    findings.push(
      `catalogId: ${JSON.stringify(next.catalogId)} is not the held ${JSON.stringify(held.catalogId)}`,
    );
  }
  for (const map of ['components', 'functions', '$defs'] as const) {
    const before = isObject(held[map]) ? held[map] : {};
    const after = isObject(next[map]) ? next[map] : {};
    for (const [name, node] of Object.entries(before)) {
      const at = `${map}/${name}`;
      if (!(name in after)) findings.push(`${at}: removed`);
      else walk(node, after[name], at, findings);
    }
  }
  return findings;
}

function walk(h: unknown, n: unknown, at: string, findings: string[]): void {
  if (!isObject(h) || !isObject(n)) return;

  for (const key of IDENTITY) {
    if (key in h) {
      if (!(key in n)) findings.push(`${at}/${key}: removed`);
      else if (!same(h[key], n[key])) {
        findings.push(
          `${at}/${key}: changed from ${JSON.stringify(h[key])} to ${JSON.stringify(n[key])}`,
        );
      }
    } else if (key in n) findings.push(`${at}/${key}: added`);
  }

  if (Array.isArray(h.enum)) {
    if (Array.isArray(n.enum)) {
      const kept = n.enum;
      for (const value of h.enum) {
        if (!kept.some(v => same(v, value))) {
          findings.push(`${at}/enum: ${JSON.stringify(value)} removed`);
        }
      }
    }
  } else if (Array.isArray(n.enum)) findings.push(`${at}/enum: added`);

  for (const key of ['allOf', 'anyOf', 'oneOf'] as const) {
    const before = Array.isArray(h[key]) ? h[key] : undefined;
    const after = Array.isArray(n[key]) ? n[key] : undefined;
    if (!before && !after) continue;
    if (!before && after && key !== 'allOf') {
      findings.push(`${at}/${key}: added`);
      continue;
    }
    const hs = before ?? [];
    const ns = after ?? [];
    if (key === 'allOf' && ns.length > hs.length) findings.push(`${at}/allOf: gained an entry`);
    if (ns.length < hs.length) findings.push(`${at}/${key}: lost an entry`);
    for (let i = 0; i < Math.min(hs.length, ns.length); i++) {
      walk(hs[i], ns[i], `${at}/${key}/${i}`, findings);
    }
  }

  if (isObject(h.properties)) {
    const after = isObject(n.properties) ? n.properties : {};
    for (const [name, sub] of Object.entries(h.properties)) {
      const where = `${at}/properties/${name}`;
      if (!(name in after)) findings.push(`${where}: removed`);
      else walk(sub, after[name], where, findings);
    }
  }

  const required = Array.isArray(h.required) ? h.required : [];
  for (const name of Array.isArray(n.required) ? n.required : []) {
    if (!required.includes(name)) {
      findings.push(`${at}/required: ${JSON.stringify(name)} became required`);
    }
  }

  if (isObject(h.items)) {
    if (isObject(n.items)) walk(h.items, n.items, `${at}/items`, findings);
  } else if (h.items === undefined && isObject(n.items)) findings.push(`${at}/items: added`);

  for (const key of ['additionalProperties', 'unevaluatedProperties'] as const) {
    const before = h[key];
    const after = n[key];
    if (after === false && before !== false) findings.push(`${at}/${key}: closed`);
    else if (isObject(before) && isObject(after)) walk(before, after, `${at}/${key}`, findings);
    else if ((before === undefined || before === true) && isObject(after)) {
      findings.push(`${at}/${key}: added`);
    }
  }

  for (const key of EXACT) {
    if (n[key] === undefined) continue;
    if (h[key] === undefined) findings.push(`${at}/${key}: added`);
    else if (!same(h[key], n[key])) {
      findings.push(
        `${at}/${key}: changed from ${JSON.stringify(h[key])} to ${JSON.stringify(n[key])}`,
      );
    }
  }
  for (const key of [...LOWER_BOUNDS, ...UPPER_BOUNDS]) {
    const before = h[key];
    const after = n[key];
    if (typeof after !== 'number') continue;
    if (typeof before !== 'number') findings.push(`${at}/${key}: added`);
    else if (LOWER_BOUNDS.includes(key) ? after > before : after < before) {
      findings.push(`${at}/${key}: tightened from ${before} to ${after}`);
    }
  }
  if (n.uniqueItems === true && h.uniqueItems !== true) findings.push(`${at}/uniqueItems: added`);
}
