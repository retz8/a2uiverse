/**
 * The sdk's A2UI v0.9.1 validator: `@a2ui/web_core`'s checks behind the sdk's own findings
 * (task-16.4 decisions 1 and 2). Each component is judged on its own by web_core's
 * `PayloadValidator`, a line for each prop it fails; a components update's envelope by web_core's
 * `UpdateComponentsMessageSchema` and every other message by web_core's `MessageProcessor`; each
 * surface's component graph by web_core's
 * `SurfaceComponentsModel`; the payload's depth and paths by web_core's `validateRecursionAndPaths`.
 * The processor, each graph and the payload-wide check each add the first failure they report. Upstream's v0.9 validator conformance cases
 * run against this module.
 *
 * The catalog's compile check is the sdk's own (task-16.4 decision 1): each component's schema
 * compiled against the pinned v0.9.1 `common_types.json` — the catalog gate at pack, publish and
 * install.
 */
import {Ajv2020} from 'ajv/dist/2020.js';
import {Catalog, type CatalogApi} from '@a2ui/web_core/catalog';
import {A2uiIntegrityError, A2uiRecursionError} from '@a2ui/web_core/errors';
import {formatZodIssue, MessageProcessor} from '@a2ui/web_core/processing';
import {ComponentModel, SurfaceComponentsModel} from '@a2ui/web_core/state';
import {
  PayloadValidator,
  STRICT_VALIDATION,
  validateRecursionAndPaths,
} from '@a2ui/web_core/validation';
import {UpdateComponentsMessageSchema} from '@a2ui/web_core/v0_9';
import type {ZodIssue} from 'zod';
import {COMMON_TYPES_SCHEMA} from './spec.generated.js';
import type {A2uiCatalogSchema, A2uiFinding, A2uiFindingCategory} from './types.js';

export interface A2uiValidatorOptions {
  /** The catalog the payload's surfaces use, whatever catalog id they name. */
  catalog: A2uiCatalogSchema;
}

export interface A2uiValidator {
  /** Every finding over a message, or a list of messages; empty when the payload is valid. */
  validate(payload: unknown): A2uiFinding[];
  /**
   * Compiles every declared component's schema against the pinned common types, and returns one
   * error per component that cannot compile, as `components/<name>: <reason>`. Empty when the
   * whole catalog compiles.
   */
  compileErrors(): string[];
}

/** The protocol version the catalog is read at, and the wire tag of its messages. */
const CATALOG_VERSION = '0.9';
const MESSAGE_VERSION = 'v0.9';

/** The surfaces' operations whose surface must exist when they arrive. */
const SURFACE_OPERATIONS = ['updateComponents', 'updateDataModel'];
const MESSAGE_TYPES = ['createSurface', 'updateComponents', 'updateDataModel', 'deleteSurface'];

type Json = Record<string, unknown>;

const isObject = (value: unknown): value is Json =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const categoryOf = (error: unknown): A2uiFindingCategory =>
  error instanceof A2uiRecursionError
    ? 'RecursionError'
    : error instanceof A2uiIntegrityError
      ? 'IntegrityError'
      : 'ValidationError';

const messageOf = (error: unknown): string =>
  error instanceof Error ? error.message : String(error);

const isZodIssue = (value: unknown): value is ZodIssue =>
  isObject(value) && Array.isArray(value.path) && typeof value.message === 'string';

/**
 * A Zod issue in web_core's wording, without the dotted path each of its parts leads with — the
 * finding carries it — and a union's branches said once each.
 */
function issueText(issue: ZodIssue): string {
  const label = `${issue.path.length > 0 ? issue.path.join('.') : 'root'}: `;
  const parts = formatZodIssue(issue)
    .split('; ')
    .map(part => (part.startsWith(label) ? part.slice(label.length) : part));
  return [...new Set(parts)].join('; ');
}

/** Where a component calls the named function: the pointer to its `call`, when it calls it. */
function callPath(value: unknown, name: string, at = ''): string | undefined {
  if (Array.isArray(value)) {
    for (const [i, item] of value.entries()) {
      const found = callPath(item, name, `${at}/${i}`);
      if (found !== undefined) return found;
    }
    return undefined;
  }
  if (!isObject(value)) return undefined;
  if (value.call === name) return `${at}/call`;
  for (const [key, child] of Object.entries(value)) {
    const found = callPath(child, name, `${at}/${key}`);
    if (found !== undefined) return found;
  }
  return undefined;
}

/** What web_core said about one component, as findings: one per prop it names, else one. */
function componentFindings(
  error: unknown,
  component: Json,
  base: string,
  componentId: string | undefined,
): A2uiFinding[] {
  const tag = componentId !== undefined ? {componentId} : {};
  const message = messageOf(error);
  const fn = /^(?:Validation failed for function|Unrecognized function) '([^']+)'/.exec(message);
  if (fn) {
    const at = callPath(component, fn[1]!) ?? '';
    return [{category: 'ValidationError', path: `${base}${at}`, ...tag, message}];
  }
  if (message.startsWith('Unknown component type')) {
    return [{category: 'ValidationError', path: `${base}/component`, ...tag, message}];
  }
  const details = (error as {details?: unknown}).details;
  const issues = Array.isArray(details) ? details.filter(isZodIssue) : [];
  if (issues.length === 0) {
    return [{category: categoryOf(error), path: base, ...tag, message}];
  }
  const byPath = new Map<string, string[]>();
  for (const issue of issues) {
    const path = `${base}${issue.path.map(part => `/${part}`).join('')}`;
    byPath.set(path, [...(byPath.get(path) ?? []), issueText(issue)]);
  }
  return [...byPath].map(([path, texts]) => ({
    category: 'ValidationError',
    path,
    ...tag,
    message: texts.join('; '),
  }));
}

/** Each component's schema compiled against the pinned common types; one error per failure. */
function compileErrorsOf(catalog: A2uiCatalogSchema): string[] {
  const catalogUri = new URL('catalog.json', String(COMMON_TYPES_SCHEMA.$id)).href;
  const defs = {...(catalog.$defs ?? {})};
  // The common types reference the catalog's functions and theme; a catalog declaring neither still compiles.
  defs.theme ??= {type: 'object'};
  defs.anyFunction ??= false;
  const own: Json = {...catalog, $defs: defs, $id: catalogUri};
  delete own.$schema;
  const ajv = new Ajv2020({allErrors: true, strict: false, validateFormats: false});
  ajv.addSchema(COMMON_TYPES_SCHEMA);
  ajv.addSchema(own);
  const errors: string[] = [];
  for (const name of Object.keys(catalog.components ?? {})) {
    try {
      ajv.compile({$ref: `${catalogUri}#/components/${name}`});
    } catch (error) {
      errors.push(`components/${name}: ${messageOf(error)}`);
    }
  }
  return errors;
}

export function createA2uiValidator(options: A2uiValidatorOptions): A2uiValidator {
  const schema = options.catalog;
  const ownId =
    typeof schema.catalogId === 'string'
      ? schema.catalogId
      : typeof schema.$id === 'string'
        ? schema.$id
        : 'catalog';

  // The catalog under every id the payload names, so a surface in any catalog id reads this one.
  const catalogs = new Map<string, CatalogApi>();
  const catalogFor = (id: string): CatalogApi => {
    let catalog = catalogs.get(id);
    if (!catalog) {
      catalog = Catalog.fromJson(schema, CATALOG_VERSION, id);
      catalogs.set(id, catalog);
    }
    return catalog;
  };

  const validate = (payload: unknown): A2uiFinding[] => {
    const messages = Array.isArray(payload) ? payload : [payload];
    let own: CatalogApi;
    try {
      own = catalogFor(ownId);
    } catch (error) {
      return [
        {category: 'ValidationError', message: `the catalog does not load: ${messageOf(error)}`},
      ];
    }
    const findings: A2uiFinding[] = [];

    // The surfaces the payload creates, and the components each one receives, in order.
    const created = new Map<string, string>();
    const surfaces = new Map<string, {components: Json[]; duplicate: boolean}>();
    const surfaceOf = (id: string) => {
      let surface = surfaces.get(id);
      if (!surface) {
        surface = {components: [], duplicate: false};
        surfaces.set(id, surface);
      }
      return surface;
    };
    const touched: string[] = [];

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
      const create = message.createSurface;
      if (isObject(create) && typeof create.surfaceId === 'string') {
        created.set(
          create.surfaceId,
          typeof create.catalogId === 'string' ? create.catalogId : ownId,
        );
      }
      for (const operation of SURFACE_OPERATIONS) {
        const op = message[operation];
        if (isObject(op) && typeof op.surfaceId === 'string') touched.push(op.surfaceId);
      }
      const update = message.updateComponents;
      if (!isObject(update) || !Array.isArray(update.components)) return;
      const surface =
        typeof update.surfaceId === 'string' ? surfaceOf(update.surfaceId) : undefined;
      const seen = new Set<string>();
      update.components.forEach((component, i) => {
        const at = `${base}/updateComponents/components/${i}`;
        if (!isObject(component)) {
          findings.push({
            category: 'ValidationError',
            path: at,
            message: 'a component must be an object',
          });
          return;
        }
        const id = typeof component.id === 'string' ? component.id : undefined;
        if (id !== undefined && seen.has(id)) {
          findings.push({
            category: 'IntegrityError',
            componentId: id,
            message: `Duplicate component ID: '${id}'`,
          });
          if (surface) surface.duplicate = true;
        }
        if (id !== undefined) seen.add(id);
        surface?.components.push(component);
        const {catalogId: _catalogId, ...judged} = component;
        try {
          new PayloadValidator(own, STRICT_VALIDATION).validateComponent(judged);
        } catch (error) {
          findings.push(...componentFindings(error, component, at, id));
        }
      });
    });

    // The envelopes. A components update's is upstream's schema, its components judged above; every
    // other message goes through the processor, and a surface the payload updates without creating it
    // is already on the client, created here so the update reads as the incremental one it is.
    const envelope: unknown[] = [];
    messages.forEach((message, index) => {
      const types = isObject(message) ? MESSAGE_TYPES.filter(type => type in message) : [];
      if (types.length !== 1 || types[0] !== 'updateComponents') {
        if (isObject(message)) envelope.push(message);
        return;
      }
      const parsed = UpdateComponentsMessageSchema.safeParse(message);
      if (parsed.success) return;
      for (const issue of parsed.error.issues) {
        findings.push({
          category: 'ValidationError',
          path: `/${index}${issue.path.map(part => `/${part}`).join('')}`,
          message: issueText(issue),
        });
      }
    });
    const missing = [...new Set(touched)].filter(id => !created.has(id));
    const lead = missing.map(surfaceId => ({
      version: MESSAGE_VERSION,
      createSurface: {surfaceId, catalogId: ownId},
    }));
    const ids = new Set([ownId, ...created.values()]);
    // A catalog read from JSON carries no function implementations; processing messages runs none.
    const processed = [...ids].map(catalogFor) as unknown as ConstructorParameters<
      typeof MessageProcessor
    >[0];
    try {
      new MessageProcessor(processed, undefined, {
        version: MESSAGE_VERSION,
        validationConfig: STRICT_VALIDATION,
      }).processMessages(
        // The processor judges the messages' shape itself: that is what this pass asks of it.
        [...lead, ...envelope] as Parameters<MessageProcessor['processMessages']>[0],
      );
    } catch (error) {
      findings.push({category: categoryOf(error), message: messageOf(error)});
    }

    // Each surface's graph: a surface the payload does not create is an incremental update, its
    // root already on the client.
    for (const [surfaceId, {components, duplicate}] of surfaces) {
      if (duplicate || components.length === 0) continue;
      const model = new SurfaceComponentsModel(own);
      for (const component of components) {
        const {id, component: type, catalogId: _catalogId, ...properties} = component;
        if (typeof id !== 'string' || !id) continue;
        const existing = model.get(id);
        const componentType = typeof type === 'string' ? type : existing?.type;
        if (!componentType) continue;
        if (existing && existing.type === componentType) {
          existing.properties = properties;
          continue;
        }
        if (existing) model.removeComponent(id);
        model.addComponent(new ComponentModel(id, componentType, properties, own));
      }
      try {
        model.validateTopology({...STRICT_VALIDATION, allowMissingRoot: !created.has(surfaceId)});
      } catch (error) {
        findings.push({category: categoryOf(error), message: messageOf(error)});
      }
    }

    try {
      validateRecursionAndPaths(messages);
    } catch (error) {
      findings.push({category: categoryOf(error), message: messageOf(error)});
    }

    // The envelope's processor runs the payload-wide checks too; a failure said twice is said once.
    const said = new Set<string>();
    return findings.filter(finding => {
      const key = `${finding.category}|${finding.path ?? ''}|${finding.message}`;
      if (said.has(key)) return false;
      said.add(key);
      return true;
    });
  };

  return {validate, compileErrors: () => compileErrorsOf(schema)};
}

/** One finding as a line: its path or component first, then the message. */
export function formatA2uiFinding(finding: A2uiFinding): string {
  const where = [finding.path, finding.componentId && `(${finding.componentId})`]
    .filter(Boolean)
    .join(' ');
  return where ? `${where}: ${finding.message}` : finding.message;
}
