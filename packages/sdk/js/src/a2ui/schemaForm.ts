/**
 * The schema-form check (task-21.10 decision 10): what the platform itself authors, held to the
 * pinned v1.0 JSON schemas — `agent_to_renderer.json` and `renderer_to_agent.json` over
 * `common_types.json` — compiled with the surface's catalog document. It stands beside the
 * validator, whose verdicts are `@a2ui/web_core`'s, and refuses what the release accepts and the
 * v1.0 schema does not: a binding written `path`, a call written `call`, an `updateDataModel` with
 * no `value`. It judges a surface in one catalog. Which paints go through it is each caller's own
 * decision.
 */
import {Ajv2020, type ErrorObject, type ValidateFunction} from 'ajv/dist/2020.js';
import {
  AGENT_TO_RENDERER_SCHEMA,
  COMMON_TYPES_SCHEMA,
  RENDERER_TO_AGENT_SCHEMA,
} from './spec.generated.js';
import type {A2uiCatalogSchema, A2uiFinding} from './types.js';

export interface SchemaFormCheck {
  /** Every finding over an agent-to-renderer message, or a list of them; empty when each holds. */
  agentToRenderer(payload: unknown): A2uiFinding[];
  /** Every finding over a renderer-to-agent message, or a list of them; empty when each holds. */
  rendererToAgent(payload: unknown): A2uiFinding[];
}

export interface SchemaFormCheckOptions {
  /** The catalog document the surface is in. */
  catalog: A2uiCatalogSchema;
}

/** The agent-to-renderer messages by the key each carries, as the schema's `$defs` name them. */
const AGENT_MESSAGES: Readonly<Record<string, string>> = {
  createSurface: 'CreateSurfaceMessage',
  updateComponents: 'UpdateComponentsMessage',
  updateDataModel: 'UpdateDataModelMessage',
  deleteSurface: 'DeleteSurfaceMessage',
  callRendererFunction: 'CallRendererFunctionMessage',
  agentFunctionResponse: 'AgentFunctionResponseMessage',
};

const isObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

/** A catalog's components or functions as a union, the shape the message schemas reference. */
const unionOf = (section: 'components' | 'functions', catalog: A2uiCatalogSchema) => {
  const names = Object.keys(isObject(catalog[section]) ? catalog[section] : {});
  return names.length > 0 ? {oneOf: names.map(name => ({$ref: `#/${section}/${name}`}))} : false;
};

/**
 * Ajv's errors as findings, one per place. A union that fails is said at its own place: what each
 * branch said there, and nothing a branch said deeper under it, nor the union's own "must match
 * exactly one schema". Each place's words are said once.
 */
function findingsOf(errors: readonly ErrorObject[], at: string): A2uiFinding[] {
  const isUnion = (e: ErrorObject) => e.keyword === 'oneOf' || e.keyword === 'anyOf';
  const unions = errors.filter(isUnion).map(e => e.instancePath);
  const under = (path: string) => unions.some(union => path.startsWith(`${union}/`));
  const said = errors.filter(e => !under(e.instancePath));
  const branches = said.filter(e => !isUnion(e));
  const byPath = new Map<string, string[]>();
  for (const error of said) {
    if (isUnion(error) && branches.some(e => e.instancePath === error.instancePath)) continue;
    const params = error.params as {additionalProperty?: string; missingProperty?: string};
    const subject = params.additionalProperty ?? params.missingProperty;
    const words = `${error.message ?? 'invalid'}${subject === undefined ? '' : ` (${JSON.stringify(subject)})`}`;
    const path = `${at}${error.instancePath}`;
    const texts = byPath.get(path) ?? [];
    if (!texts.includes(words)) texts.push(words);
    byPath.set(path, texts);
  }
  return [...byPath].map(([path, words]) => ({
    category: 'ValidationError',
    path,
    message: words.join('; '),
  }));
}

export function createSchemaFormCheck(options: SchemaFormCheckOptions): SchemaFormCheck {
  const ajv = new Ajv2020({allErrors: true, strict: false, validateFormats: false});
  ajv.addSchema(COMMON_TYPES_SCHEMA);
  // The message schemas reference the catalog as `catalog.json` beside them.
  const catalogUri = new URL('catalog.json', String(AGENT_TO_RENDERER_SCHEMA.$id)).href;
  const {catalog} = options;
  const defs = {...(catalog.$defs ?? {})};
  defs.anyComponent ??= unionOf('components', catalog);
  defs.anyFunction ??= unionOf('functions', catalog);
  const own: Record<string, unknown> = {...catalog, $defs: defs, $id: catalogUri};
  delete own.$schema;
  ajv.addSchema(own);
  ajv.addSchema(AGENT_TO_RENDERER_SCHEMA);
  const agentMessages = new Map<string, ValidateFunction>();
  const agentMessage = (key: string) => {
    let validate = agentMessages.get(key);
    if (!validate) {
      validate = ajv.compile({
        $ref: `${String(AGENT_TO_RENDERER_SCHEMA.$id)}#/$defs/${AGENT_MESSAGES[key]}`,
      });
      agentMessages.set(key, validate);
    }
    return validate;
  };
  const rendererMessage = ajv.compile(RENDERER_TO_AGENT_SCHEMA);
  // One component against its own type, composed as the schema's `Component` composes the union.
  const componentTypes = new Map<string, ValidateFunction>();
  const componentType = (type: string) => {
    let validate = componentTypes.get(type);
    if (!validate) {
      validate = ajv.compile({
        allOf: [
          {$ref: `${String(COMMON_TYPES_SCHEMA.$id)}#/$defs/ComponentCommon`},
          {$ref: `${catalogUri}#/components/${encodeURIComponent(type)}`},
          {type: 'object', properties: {component: {not: {const: 'Surface'}}}},
        ],
        unevaluatedProperties: false,
      });
      componentTypes.set(type, validate);
    }
    return validate;
  };
  const types = new Set(Object.keys(isObject(catalog.components) ? catalog.components : {}));

  /**
   * A message's findings: a component that fails is said against its own type, not the union of
   * every type the catalog holds; the rest of the message as Ajv said it.
   */
  const agentFindings = (message: unknown, errors: readonly ErrorObject[], at: string) => {
    const key = isObject(message)
      ? ['createSurface', 'updateComponents'].find(k => k in message)
      : undefined;
    const body = key && isObject(message) ? message[key] : undefined;
    const components = isObject(body) && Array.isArray(body.components) ? body.components : [];
    const under = key ? new RegExp(`^/${key}/components/(\\d+)(?:/|$)`) : undefined;
    const rest: ErrorObject[] = [];
    const failing = new Set<number>();
    for (const error of errors) {
      const index = under?.exec(error.instancePath)?.[1];
      if (index !== undefined && isObject(components[Number(index)])) failing.add(Number(index));
      else rest.push(error);
    }
    const found = findingsOf(rest, at);
    for (const index of [...failing].sort((a, b) => a - b)) {
      const component = components[index] as Record<string, unknown>;
      const base = `${at}/${key}/components/${index}`;
      const type = component.component;
      if (typeof type !== 'string' || !types.has(type)) {
        found.push({
          category: 'ValidationError',
          path: `${base}/component`,
          message: `no component ${JSON.stringify(type)} in the catalog`,
        });
        continue;
      }
      const validate = componentType(type);
      if (!validate(component)) found.push(...findingsOf(validate.errors ?? [], base));
    }
    return found;
  };

  const judge = (
    payload: unknown,
    pick: (message: unknown) => ValidateFunction | string,
    said: (message: unknown, errors: readonly ErrorObject[], at: string) => A2uiFinding[],
  ) => {
    const messages = Array.isArray(payload) ? payload : [payload];
    return messages.flatMap((message, index): A2uiFinding[] => {
      const at = `/${index}`;
      const validate = pick(message);
      if (typeof validate === 'string')
        return [{category: 'ValidationError', path: at, message: validate}];
      return validate(message) ? [] : said(message, validate.errors ?? [], at);
    });
  };

  return {
    agentToRenderer: payload =>
      judge(
        payload,
        message => {
          const keys = isObject(message)
            ? Object.keys(AGENT_MESSAGES).filter(key => key in message)
            : [];
          if (keys.length !== 1) {
            return `a message carries exactly one of ${Object.keys(AGENT_MESSAGES).join(', ')}`;
          }
          return agentMessage(keys[0]!);
        },
        agentFindings,
      ),
    rendererToAgent: payload =>
      judge(
        payload,
        () => rendererMessage,
        (_message, errors, at) => findingsOf(errors, at),
      ),
  };
}
