/**
 * The credential bar (SPEC §8, phase-12 decision 23, task 12.7): no credential input is painted on
 * the canvas. The hub checks every paint before it relays it — a paint's component types, its
 * property names, and the property values its painter's catalog declares as fixed options, matched
 * as whole words against the terms — and refuses a paint carrying one, whatever it is for. Free
 * text and the data model are not read. The normative terms are `../contracts/catalog.json`'s
 * `credentialBar`; `catalog.contract.test.ts` asserts this projection against it.
 */
import {BASIC_CATALOG_SCHEMA} from './a2ui/spec.generated.js';
import type {A2uiCatalogSchema} from './a2ui/types.js';

/** Terms no painted component type, property name or declared option value may carry as whole words. */
export const CREDENTIAL_TERMS: readonly string[] = [
  'password',
  'passcode',
  'passphrase',
  'otp',
  'pin code',
  'pin input',
  'pin field',
  'pin number',
  'cvv',
  'cvc',
  'card number',
  'security code',
  'obscured',
];

/** `cardNumber` → `card number`, `OTP_field` → `otp field`, `security-code` → `security code`. */
export function wordsOf(name: string): string {
  return name
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .replace(/([A-Z]+)([A-Z][a-z])/g, '$1 $2')
    .split(/[^A-Za-z0-9]+/)
    .filter(Boolean)
    .join(' ')
    .toLowerCase();
}

/** The credential term `name` carries as whole words, if any. */
export function credentialTermIn(name: string): string | undefined {
  const words = ` ${wordsOf(name)} `;
  return CREDENTIAL_TERMS.find(term => words.includes(` ${term} `));
}

/**
 * Per component name, the string values its definition declares as fixed options — every `enum`
 * and `const` string inside it, through the references into the catalog's own `$defs`, never a
 * description or a title.
 */
export type CatalogOptions = ReadonlyMap<string, ReadonlySet<string>>;

const isObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const LOCAL_DEF = '#/$defs/';

/** The options each component of a catalog schema declares. */
export function catalogOptions(schema: A2uiCatalogSchema): CatalogOptions {
  const defs = isObject(schema.$defs) ? schema.$defs : {};
  const options = new Map<string, Set<string>>();
  for (const [name, component] of Object.entries(schema.components ?? {})) {
    const found = new Set<string>();
    collectOptions(component, defs, found, new Set());
    options.set(name, found);
  }
  return options;
}

function collectOptions(
  node: unknown,
  defs: Record<string, unknown>,
  found: Set<string>,
  visited: Set<string>,
): void {
  if (Array.isArray(node)) {
    for (const item of node) collectOptions(item, defs, found, visited);
    return;
  }
  if (!isObject(node)) return;
  if (Array.isArray(node.enum)) {
    for (const value of node.enum) if (typeof value === 'string') found.add(value);
  }
  if (typeof node.const === 'string') found.add(node.const);
  if (typeof node.$ref === 'string' && node.$ref.startsWith(LOCAL_DEF)) {
    const name = node.$ref.slice(LOCAL_DEF.length);
    if (!visited.has(name)) {
      visited.add(name);
      collectOptions(defs[name], defs, found, visited);
    }
  }
  for (const [key, value] of Object.entries(node)) {
    if (key === 'enum' || key === 'const' || key === 'description' || key === 'title') continue;
    collectOptions(value, defs, found, visited);
  }
}

let basic: CatalogOptions | undefined;

/** The options the standard basic catalog's components declare — every app is entitled to it. */
export function basicCatalogOptions(): CatalogOptions {
  return (basic ??= catalogOptions(BASIC_CATALOG_SCHEMA as A2uiCatalogSchema));
}

/** Several catalogs' options as one: a component's options are those any of them declares for it. */
export function mergeCatalogOptions(all: readonly CatalogOptions[]): CatalogOptions {
  const merged = new Map<string, Set<string>>();
  for (const options of all) {
    for (const [name, values] of options) {
      const into = merged.get(name) ?? new Set<string>();
      for (const value of values) into.add(value);
      merged.set(name, into);
    }
  }
  return merged;
}

/** A credential input found in a paint: where, and the term it matched. */
export interface CredentialFinding {
  /** The component's type, as painted. */
  component: string;
  /** The component's id in its surface. */
  id?: string;
  /** The property whose name — or, with `value`, whose declared option — matched; absent when the type did. */
  prop?: string;
  /** The declared option value that matched. */
  value?: string;
  term: string;
}

/**
 * The first credential input among painted components (A2UI v0.9's flat component objects): its
 * type, a property name, or a literal string property value its catalog declares as an option of
 * that component. Undefined when there is none.
 */
export function credentialInputIn(
  components: readonly unknown[],
  options: CatalogOptions,
): CredentialFinding | undefined {
  for (const component of components) {
    if (!isObject(component) || typeof component.component !== 'string') continue;
    const type = component.component;
    const id = typeof component.id === 'string' ? {id: component.id} : {};
    const typeTerm = credentialTermIn(type);
    if (typeTerm) return {component: type, ...id, term: typeTerm};
    const declared = options.get(type);
    for (const [prop, value] of Object.entries(component)) {
      if (prop === 'id' || prop === 'component') continue;
      const propTerm = credentialTermIn(prop);
      if (propTerm) return {component: type, ...id, prop, term: propTerm};
      if (typeof value !== 'string' || !declared?.has(value)) continue;
      const valueTerm = credentialTermIn(value);
      if (valueTerm) return {component: type, ...id, prop, value, term: valueTerm};
    }
  }
  return undefined;
}

/** The finding in words, for the agent's repair: the component and the matched value. */
export function describeCredentialFinding(finding: CredentialFinding): string {
  const component = `the ${finding.component} component`;
  if (finding.value !== undefined) {
    return `${component}'s ${finding.prop} ${JSON.stringify(finding.value)}`;
  }
  if (finding.prop !== undefined) return `${component}'s ${finding.prop} property`;
  return component;
}
