/**
 * The sdk's A2UI v1.0 validator: the verdicts of `@a2ui/web_core`'s `MessageProcessor` behind the
 * sdk's own findings (task-21.10 decisions 8 and 9), over several catalogs, each component judged
 * against its own. Three passes, each under the release's strict rules with its `targetVersion`
 * gate set to v1.0, so a message stamped otherwise is a finding.
 *
 * - **Each component on its own.** A processor holding the surface — created as the payload
 *   creates it — takes each component as an update of its own, on a surface of its own: one
 *   finding per prop the component fails, in the catalog the release resolves it to, its nested
 *   calls among them. The Planner's and the Synthesizer's retry is told every one.
 * - **The payload, message by message.** One processor takes the messages in order, each its own
 *   call, and every message it refuses is a finding: the envelope, the surface's lifecycle, the
 *   batch, the depth and the paths. A surface the payload updates without creating it is already
 *   on the renderer, created first in the first catalog. A component the first pass judged is not
 *   judged again here.
 * - **Each surface's tree, once.** The graph is judged where the payload leaves it, so a tree sent
 *   in several batches, as an agent streams it, is judged whole: every component the payload sent
 *   the surface since its creation, the last copy of each, through the release's topology check.
 *   A surface already on the renderer needs no root here.
 *
 * Upstream's v1.0 validator conformance cases run against this module.
 */
import {Catalog, type CatalogApi} from '@a2ui/web_core/catalog';
import {A2uiIntegrityError, A2uiRecursionError, type A2uiErrorDetail} from '@a2ui/web_core/errors';
import {
  MessageProcessor,
  STRICT_VALIDATION,
  type ValidationConfig,
} from '@a2ui/web_core/processing';
import {ComponentModel, SurfaceComponentsModel} from '@a2ui/web_core/state';
import {getComponentReferences} from '@a2ui/web_core/validation';
import {A2UI_VERSION, readA2uiStamp} from './stamp.js';
import type {A2uiCatalogSchema, A2uiFinding, A2uiFindingCategory} from './types.js';

export interface A2uiValidatorOptions {
  /**
   * The catalogs a payload's surfaces and components may be in, each under its own `catalogId`.
   * The first is the catalog of a surface the payload updates without creating it.
   */
  catalogs: readonly A2uiCatalogSchema[];
}

export interface A2uiValidator {
  /** Every finding over a message, or a list of messages; empty when the payload is valid. */
  validate(payload: unknown): A2uiFinding[];
}

/** The release's strict rules, at the one version the platform speaks. */
const STRICT: ValidationConfig = {...STRICT_VALIDATION, targetVersion: A2UI_VERSION};
/** A surface already on the renderer: the payload need not send its root. */
const ON_THE_RENDERER: ValidationConfig = {...STRICT, allowMissingRoot: true};
/** One component, apart from the tree it sits in. */
const ON_ITS_OWN: ValidationConfig = {
  ...STRICT,
  allowDanglingReferences: true,
  allowOrphanComponents: true,
  allowMissingRoot: true,
};

/** The messages that name a surface, by the key they carry. */
const SURFACE_OPERATIONS = [
  'createSurface',
  'updateComponents',
  'updateDataModel',
  'deleteSurface',
];

type Json = Record<string, unknown>;
type Processed = ConstructorParameters<typeof MessageProcessor>[0];
type Messages = Parameters<MessageProcessor['processMessages']>[0];

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

/** One failure web_core carries on a component's error: a JSON Pointer under the component, and its words. */
const isErrorDetail = (value: unknown): value is A2uiErrorDetail =>
  isObject(value) && typeof value.path === 'string' && typeof value.message === 'string';

/** Where a component calls the named function: the pointer to its `@call`, when it calls it. */
function callPath(value: unknown, name: string, at = ''): string | undefined {
  if (Array.isArray(value)) {
    for (const [i, item] of value.entries()) {
      const found = callPath(item, name, `${at}/${i}`);
      if (found !== undefined) return found;
    }
    return undefined;
  }
  if (!isObject(value)) return undefined;
  if (value['@call'] === name) return `${at}/@call`;
  for (const [key, child] of Object.entries(value)) {
    const found = callPath(child, name, `${at}/${key.replace(/~/g, '~0').replace(/\//g, '~1')}`);
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
  const failures = Array.isArray(details) ? details.filter(isErrorDetail) : [];
  if (failures.length === 0) {
    return [{category: categoryOf(error), path: base, ...tag, message}];
  }
  const byPath = new Map<string, string[]>();
  for (const failure of failures) {
    const path = `${base}${failure.path === '/' ? '' : failure.path}`;
    const texts = byPath.get(path) ?? [];
    if (!texts.includes(failure.message)) texts.push(failure.message);
    byPath.set(path, texts);
  }
  return [...byPath].map(([path, texts]) => ({
    category: 'ValidationError',
    path,
    ...tag,
    message: texts.join('; '),
  }));
}

/** The operation a message carries, when it carries one surface operation. */
function operationOf(message: Json): {key: string; body: Json} | undefined {
  const keys = SURFACE_OPERATIONS.filter(key => key in message);
  if (keys.length !== 1) return undefined;
  const body = message[keys[0]!];
  return isObject(body) ? {key: keys[0]!, body} : undefined;
}

/** A catalog's id: its `catalogId`, else its `$id`. */
const idOf = (schema: A2uiCatalogSchema): string =>
  typeof schema.catalogId === 'string'
    ? schema.catalogId
    : typeof schema.$id === 'string'
      ? schema.$id
      : 'catalog';

/**
 * A surface's tree as the payload leaves it: its catalog, the last copy of each component, and
 * every id a copy the payload sent referenced as a child.
 */
interface Tree {
  catalogId: unknown;
  components: Map<string, Json>;
  referenced: Set<string>;
}

/** The catalog a component is in: its `@catalogId`, else the surface's default. */
const catalogFor = (component: Json, catalogs: readonly CatalogApi[], fallback: CatalogApi) => {
  const named = component['@catalogId'];
  return (typeof named === 'string' ? catalogs.find(c => c.id === named) : undefined) ?? fallback;
};

/** A component's properties, its envelope's `@` keys left out. */
const propertiesOf = (component: Json): Json =>
  Object.fromEntries(
    Object.entries(component).filter(
      ([key]) => key !== 'id' && key !== 'component' && !/^@([^@]|$)/.test(key),
    ),
  );

/** What `getComponentReferences` reads a component's child references by. */
type RefSource = Parameters<typeof getComponentReferences>[1];

/** The ids a component references as children, in its catalog. */
function childrenOf(component: Json, catalog: CatalogApi): string[] {
  if (typeof component.component !== 'string') return [];
  try {
    return [
      ...getComponentReferences(
        {...propertiesOf(component), id: component.id, component: component.component},
        catalog as unknown as RefSource,
      ),
    ].map(([id]) => id);
  } catch {
    return [];
  }
}

/**
 * The release's topology check over a surface's tree. A component names its catalog by
 * `@catalogId`, else takes the surface's default; a catalog the validator was not given is the
 * component's own finding, and the component still stands in the tree. A component a later copy
 * of its parent stopped referencing — a placeholder an agent streamed and then replaced — is what
 * the renderer holds and does not draw, not an orphan: it leaves the tree, and so does what only
 * it reaches. A component nothing the payload sent ever referenced is an orphan.
 */
function topologyOf(
  tree: Tree,
  catalogs: readonly CatalogApi[],
  config: ValidationConfig,
): A2uiFinding | undefined {
  const fallback = catalogs.find(c => c.id === tree.catalogId);
  if (!fallback || tree.components.size === 0) return undefined;
  const reached = new Set<string>();
  const reach = (id: string) => {
    const component = tree.components.get(id);
    if (!component || reached.has(id)) return;
    reached.add(id);
    for (const child of childrenOf(component, catalogFor(component, catalogs, fallback)))
      reach(child);
  };
  reach(config.rootId ?? 'root');
  const model = new SurfaceComponentsModel(fallback);
  for (const [id, component] of tree.components) {
    const type = component.component;
    if (typeof type !== 'string' || !type) continue;
    if (!reached.has(id) && tree.referenced.has(id) && reached.has('root')) continue;
    const catalog = catalogFor(component, catalogs, fallback);
    model.addComponent(new ComponentModel(id, type, propertiesOf(component), catalog));
  }
  try {
    model.validateTopology(config);
    return undefined;
  } catch (error) {
    return {category: categoryOf(error), message: messageOf(error)};
  }
}

type Loaded = {ok: true; catalogs: CatalogApi[]; first: string} | {ok: false; finding: A2uiFinding};

function load(schemas: readonly A2uiCatalogSchema[]): Loaded {
  if (schemas.length === 0) {
    return {ok: false, finding: {category: 'ValidationError', message: 'no catalog to judge by'}};
  }
  const catalogs: CatalogApi[] = [];
  for (const schema of schemas) {
    const id = idOf(schema);
    try {
      catalogs.push(Catalog.fromJson(schema, A2UI_VERSION, id));
    } catch (error) {
      return {
        ok: false,
        finding: {
          category: 'ValidationError',
          message: `catalog ${JSON.stringify(id)} does not load: ${messageOf(error)}`,
        },
      };
    }
  }
  return {ok: true, catalogs, first: idOf(schemas[0]!)};
}

export function createA2uiValidator(options: A2uiValidatorOptions): A2uiValidator {
  let loaded: Loaded | undefined;

  const validate = (payload: unknown): A2uiFinding[] => {
    loaded ??= load(options.catalogs);
    if (!loaded.ok) return [loaded.finding];
    const {catalogs, first} = loaded;
    const processor = (config: ValidationConfig) =>
      new MessageProcessor(catalogs as unknown as Processed, undefined, {
        version: A2UI_VERSION,
        validationConfig: config,
      });
    const messages = Array.isArray(payload) ? payload : [payload];

    // The surfaces the payload creates; the others it names are already on the renderer.
    const createdHere = new Set<string>();
    for (const message of messages) {
      const create = isObject(message) ? message.createSurface : undefined;
      if (isObject(create) && typeof create.surfaceId === 'string')
        createdHere.add(create.surfaceId);
    }
    const onTheRenderer = new Set<string>();
    for (const message of messages) {
      const op = isObject(message) ? operationOf(message) : undefined;
      const id = op?.body.surfaceId;
      if (typeof id === 'string' && !createdHere.has(id)) onTheRenderer.add(id);
    }

    const findings: A2uiFinding[] = [];
    /** Each surface's creation as the payload stands at a message, its components and data left out. */
    const creations = new Map<string, Json>(
      [...onTheRenderer].map(surfaceId => [surfaceId, {surfaceId, catalogId: first}]),
    );
    const trees = new Map<string, Tree>(
      [...onTheRenderer].map(surfaceId => [
        surfaceId,
        {catalogId: first, components: new Map(), referenced: new Set()},
      ]),
    );
    const graphSaid = new Set<string>();
    const whole = processor(ON_ITS_OWN);
    for (const surfaceId of onTheRenderer) {
      whole.processMessages([
        {version: A2UI_VERSION, createSurface: {surfaceId, catalogId: first}},
      ] as Messages);
    }

    messages.forEach((message, index) => {
      const at = `/${index}`;
      if (!isObject(message)) {
        findings.push({
          category: 'ValidationError',
          path: at,
          message: 'a message must be an object',
        });
        return;
      }
      const op = operationOf(message);
      const surfaceId = typeof op?.body.surfaceId === 'string' ? op.body.surfaceId : undefined;
      const current = readA2uiStamp(message)?.current === true;
      if (op?.key === 'createSurface' && surfaceId !== undefined) {
        const {components: _components, dataModel: _dataModel, ...creation} = op.body;
        creations.set(surfaceId, creation);
        trees.set(surfaceId, {
          catalogId: creation.catalogId,
          components: new Map(),
          referenced: new Set(),
        });
      }
      const components = op?.body.components;
      if (
        current &&
        surfaceId !== undefined &&
        (op?.key === 'createSurface' || op?.key === 'updateComponents') &&
        Array.isArray(components)
      ) {
        const tree = trees.get(surfaceId);
        const fallback = catalogs.find(c => c.id === tree?.catalogId);
        for (const component of components) {
          if (!tree || !isObject(component) || typeof component.id !== 'string' || !component.id)
            continue;
          tree.components.set(component.id, component);
          if (fallback) {
            for (const child of childrenOf(component, catalogFor(component, catalogs, fallback)))
              tree.referenced.add(child);
          }
        }
      }

      // Each component on its own, in a message the gate lets through: a processor of its own for
      // each, so no component meets another.
      const judged = new Set<number>();
      const said = new Set<string>();
      const creation = surfaceId !== undefined ? creations.get(surfaceId) : undefined;
      if (
        current &&
        (op?.key === 'createSurface' || op?.key === 'updateComponents') &&
        Array.isArray(components) &&
        creation
      ) {
        components.forEach((component, i) => {
          if (!isObject(component)) return;
          const alone = processor(ON_ITS_OWN);
          try {
            alone.processMessages([{version: A2UI_VERSION, createSurface: creation}] as Messages);
          } catch {
            return; // the creation's own finding is the whole payload's pass's
          }
          try {
            alone.processMessages([
              {version: A2UI_VERSION, updateComponents: {surfaceId, components: [component]}},
            ] as Messages);
          } catch (error) {
            const id = typeof component.id === 'string' ? component.id : undefined;
            const found = componentFindings(
              error,
              component,
              `${at}/${op.key}/components/${i}`,
              id,
            );
            findings.push(...found);
            said.add(messageOf(error));
            for (const finding of found) said.add(finding.message);
            judged.add(i);
          }
        });
      }

      // The message in the payload, its graph left to the end.
      try {
        whole.processMessages([message] as Messages);
      } catch (error) {
        const where = (error as {path?: unknown}).path;
        const component = typeof where === 'string' ? /^\/components\/(\d+)/.exec(where) : null;
        if ((component && judged.has(Number(component[1]))) || said.has(messageOf(error))) return;
        const path = typeof where === 'string' && op ? `${at}/${op.key}${where}` : at;
        const category = categoryOf(error);
        findings.push({category, path, message: messageOf(error)});
        // The graph says its first failure only.
        if (category !== 'ValidationError' && surfaceId !== undefined) graphSaid.add(surfaceId);
      }
      if (op?.key === 'deleteSurface' && surfaceId !== undefined) {
        creations.delete(surfaceId);
        trees.delete(surfaceId);
      }
    });

    // Each surface's tree, where the payload leaves it.
    for (const [surfaceId, tree] of trees) {
      if (graphSaid.has(surfaceId)) continue;
      const graph = topologyOf(
        tree,
        catalogs,
        onTheRenderer.has(surfaceId) ? ON_THE_RENDERER : STRICT,
      );
      if (graph) findings.push(graph);
    }
    return findings;
  };

  return {validate};
}

/** One finding as a line: its path or component first, then the message. */
export function formatA2uiFinding(finding: A2uiFinding): string {
  const where = [finding.path, finding.componentId && `(${finding.componentId})`]
    .filter(Boolean)
    .join(' ');
  return where ? `${where}: ${finding.message}` : finding.message;
}
