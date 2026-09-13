/**
 * An A2UI v0.9.1 validator following upstream's `A2uiValidator` (`a2ui/validation/validator.py`
 * and the `a2ui_core` validating modules it dispatches to): the messages against the spec's
 * `server_to_client.json` and `common_types.json` with a given `catalog.json` — the four message
 * shapes, known components and their props, functions through the catalog's declared ones — and
 * the component graph: duplicate ids, the root, dangling references, self-references, cycles,
 * depth, orphans, path syntax. The spec schemas default to the pinned v0.9.1 copy
 * (`spec.generated.ts`); upstream's validator conformance cases run against this module.
 *
 * Findings are collected, not thrown, and focused where upstream reports a union's every branch:
 * the envelope is checked with components left open, then each component against its own schema,
 * so a bad prop reads as one line about that prop.
 */
import {Ajv2020, type ErrorObject, type ValidateFunction} from 'ajv/dist/2020.js';
import {
  extractRefFields,
  integrityFindings,
  recursionAndPathFindings,
  topologyFindings,
} from './graph.js';
import {COMMON_TYPES_SCHEMA, SERVER_TO_CLIENT_SCHEMA} from './spec.generated.js';
import type {A2uiCatalogSchema, A2uiFinding} from './types.js';

export interface A2uiValidatorOptions {
  /** The catalog the payload's surfaces use. */
  catalog: A2uiCatalogSchema;
  /** Defaults to the pinned A2UI v0.9.1 `server_to_client.json`. */
  serverToClient?: Record<string, unknown>;
  /** Defaults to the pinned A2UI v0.9.1 `common_types.json`. */
  commonTypes?: Record<string, unknown>;
}

export interface A2uiValidator {
  /** Every finding over a message, or a list of messages; empty when the payload is valid. */
  validate(payload: unknown): A2uiFinding[];
}

const MESSAGE_TYPES = ['createSurface', 'updateComponents', 'updateDataModel', 'deleteSurface'];

type Json = Record<string, unknown>;

const isObject = (value: unknown): value is Json =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

/** Replaces every ref to the catalog's `anyComponent` with an open object: the envelope alone. */
function openComponents(schema: unknown): unknown {
  if (Array.isArray(schema)) return schema.map(openComponents);
  if (!isObject(schema)) return schema;
  if (typeof schema.$ref === 'string' && schema.$ref.endsWith('#/$defs/anyComponent')) {
    return {type: 'object'};
  }
  return Object.fromEntries(Object.entries(schema).map(([k, v]) => [k, openComponents(v)]));
}

/** Whether a component schema names a prop, directly or through its branches (upstream `defines_property`). */
function definesProperty(schema: unknown, prop: string): boolean {
  if (!isObject(schema)) return false;
  if (isObject(schema.properties) && prop in schema.properties) return true;
  for (const key of ['allOf', 'oneOf', 'anyOf']) {
    const branches = schema[key];
    if (Array.isArray(branches) && branches.some(sub => definesProperty(sub, prop))) return true;
  }
  return (
    prop === 'id' && typeof schema.$ref === 'string' && schema.$ref.includes('ComponentCommon')
  );
}

const AGGREGATES = new Set(['oneOf', 'anyOf', 'if']);

/** One line per instance path: the distinct messages there, the union aggregate dropped when a branch said more. */
function schemaFindings(
  errors: readonly ErrorObject[],
  base: string,
  componentId?: string,
): A2uiFinding[] {
  const byPath = new Map<string, {specific: Set<string>; aggregate: Set<string>}>();
  for (const error of errors) {
    const params = error.params as {
      additionalProperty?: string;
      unevaluatedProperty?: string;
      allowedValue?: unknown;
      allowedValues?: unknown[];
    };
    let message = error.message ?? 'invalid';
    const extra = params.additionalProperty ?? params.unevaluatedProperty;
    if (extra !== undefined) message += ` (${JSON.stringify(extra)})`;
    if (params.allowedValue !== undefined) message += ` ${JSON.stringify(params.allowedValue)}`;
    if (params.allowedValues !== undefined) message += ` ${JSON.stringify(params.allowedValues)}`;
    const entry = byPath.get(error.instancePath) ?? {specific: new Set(), aggregate: new Set()};
    (AGGREGATES.has(error.keyword) ? entry.aggregate : entry.specific).add(message);
    byPath.set(error.instancePath, entry);
  }
  const findings: A2uiFinding[] = [];
  for (const [instancePath, {specific, aggregate}] of byPath) {
    const shown = specific.size > 0 ? [...specific] : [...aggregate];
    findings.push({
      category: 'ValidationError',
      path: `${base}${instancePath}`,
      ...(componentId !== undefined ? {componentId} : {}),
      message: shown.join('; '),
    });
  }
  return findings;
}

/** Every function call among a component's props: `{call, …}` objects, at their paths. */
function functionCalls(value: unknown, at: string, found: Array<{name: string; path: string}>) {
  if (Array.isArray(value)) {
    value.forEach((item, i) => functionCalls(item, `${at}/${i}`, found));
    return;
  }
  if (!isObject(value)) return;
  if (typeof value.call === 'string') found.push({name: value.call, path: at});
  for (const [key, child] of Object.entries(value)) functionCalls(child, `${at}/${key}`, found);
}

export function createA2uiValidator(options: A2uiValidatorOptions): A2uiValidator {
  const serverToClient = options.serverToClient ?? SERVER_TO_CLIENT_SCHEMA;
  const commonTypes = options.commonTypes ?? COMMON_TYPES_SCHEMA;
  const specId = String(serverToClient.$id);
  const catalogUri = new URL('catalog.json', specId).href;
  const envelopeUri = new URL('server_to_client.envelope.json', specId).href;

  const defs = {...(options.catalog.$defs ?? {})};
  // A catalog declaring no theme or functions still compiles: the spec refs both.
  defs.theme ??= {type: 'object'};
  defs.anyFunction ??= false;
  const catalog = {...options.catalog, $defs: defs, $id: catalogUri};
  delete (catalog as Json).$schema;

  const ajv = new Ajv2020({allErrors: true, strict: false, validateFormats: false});
  ajv.addSchema(commonTypes);
  ajv.addSchema(catalog);
  ajv.addSchema(serverToClient);
  ajv.addSchema({...(openComponents(serverToClient) as Json), $id: envelopeUri});

  const envelopes = new Map<string, ValidateFunction>();
  const envelopeFor = (type: string | undefined): ValidateFunction => {
    const def = type ? `${type[0]!.toUpperCase()}${type.slice(1)}Message` : undefined;
    const hasDef =
      def !== undefined && isObject(serverToClient.$defs) && def in serverToClient.$defs;
    const key = hasDef ? def! : '';
    let validate = envelopes.get(key);
    if (!validate) {
      validate = ajv.compile({$ref: hasDef ? `${envelopeUri}#/$defs/${def}` : envelopeUri});
      envelopes.set(key, validate);
    }
    return validate;
  };

  const components = new Map<string, ValidateFunction>();
  const componentSchemaFor = (name: string): ValidateFunction => {
    let validate = components.get(name);
    if (!validate) {
      validate = ajv.compile({$ref: `${catalogUri}#/components/${name}`});
      components.set(name, validate);
    }
    return validate;
  };

  const declared = options.catalog.components ?? {};
  const functions = options.catalog.functions ?? {};
  const refFields = extractRefFields(options.catalog);

  const componentFindings = (component: unknown, base: string): A2uiFinding[] => {
    if (!isObject(component)) {
      return [{category: 'ValidationError', path: base, message: 'a component must be an object'}];
    }
    const id = typeof component.id === 'string' ? component.id : undefined;
    const tag = id !== undefined ? {componentId: id} : {};
    const name = component.component;
    if (typeof name !== 'string' || !Object.hasOwn(declared, name)) {
      return [
        {
          category: 'ValidationError',
          path: `${base}/component`,
          ...tag,
          message: `Unknown component type: ${JSON.stringify(name)}`,
        },
      ];
    }
    const schema = declared[name];
    const props: Json = {...component};
    if (!definesProperty(schema, 'id')) delete props.id;
    if (!definesProperty(schema, 'component')) delete props.component;

    const findings: A2uiFinding[] = [];
    const calls: Array<{name: string; path: string}> = [];
    functionCalls(component, '', calls);
    const unknownCalls = calls.filter(call => !Object.hasOwn(functions, call.name));
    for (const call of unknownCalls) {
      findings.push({
        category: 'ValidationError',
        path: `${base}${call.path}/call`,
        ...tag,
        message: `Unknown function: ${JSON.stringify(call.name)}`,
      });
    }
    const validate = componentSchemaFor(name);
    if (!validate(props)) {
      // An unknown call fails every union above it; its one finding already says why.
      const within = (path: string, of: string) => path === of || path.startsWith(`${of}/`);
      const hidden = (path: string) =>
        unknownCalls.some(
          call => within(path, call.path) || (path !== '' && within(call.path, path)),
        );
      const errors = (validate.errors ?? []).filter(error => !hidden(error.instancePath));
      findings.push(...schemaFindings(errors, base, id));
    }
    return findings;
  };

  return {
    validate(payload) {
      const messages = Array.isArray(payload) ? payload : [payload];
      const findings: A2uiFinding[] = [];
      const all: Json[] = [];
      let creates = false;

      messages.forEach((message, index) => {
        const base = `/${index}`;
        if (!isObject(message)) {
          findings.push({
            category: 'ValidationError',
            path: base,
            message: 'a message must be an object',
          });
          return;
        }
        const types = MESSAGE_TYPES.filter(type => type in message);
        const envelope = envelopeFor(types.length === 1 ? types[0] : undefined);
        if (!envelope(message)) findings.push(...schemaFindings(envelope.errors ?? [], base));
        if ('createSurface' in message) creates = true;
        const update = message.updateComponents;
        if (isObject(update) && Array.isArray(update.components)) {
          update.components.forEach((component, i) => {
            findings.push(
              ...componentFindings(component, `${base}/updateComponents/components/${i}`),
            );
            if (isObject(component)) all.push(component);
          });
        }
      });

      if (all.length > 0) {
        // A payload with no createSurface is an incremental update: its root is already on the client.
        const integrity = integrityFindings(all, refFields, creates);
        findings.push(...integrity);
        if (integrity.length === 0) findings.push(...topologyFindings(all, refFields, creates));
      }
      findings.push(...recursionAndPathFindings(messages));
      return findings;
    },
  };
}

/** One finding as a line: its path or component first, then the message. */
export function formatA2uiFinding(finding: A2uiFinding): string {
  const where = [finding.path, finding.componentId && `(${finding.componentId})`]
    .filter(Boolean)
    .join(' ');
  return where ? `${where}: ${finding.message}` : finding.message;
}
