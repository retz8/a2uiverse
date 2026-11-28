/**
 * A recorded file converted to v1.0 (phase-21 decision 13, task-21.11 decisions 3 to 7 and 15):
 * only the positions the v1.0 evolution guide names, and the component ids the identifier rule
 * refuses, each with every reference to it.
 *
 * - The stamp `v0.9` or `v0.9.1` becomes `1.0`.
 * - `createSurface.catalogId` becomes the new catalog's id, from its map; `theme` goes.
 * - A component's name and its properties' names as its catalog's map renames them; `accessibility`
 *   and `checks`, the v0.9.1 mixins, become `@accessibility` and `@checks`.
 * - At a dynamic position, a binding `{path}` becomes `{"@path"}` and a call `{call, args}` becomes
 *   `{"@call", args}`, its `returnType` dropped, its arguments read by the function's own definition.
 * - The heading rule on the map's component: `variant` `h1` to `h5` becomes Markdown heading markers.
 * - An `updateDataModel` with no `value` takes `value: null`, the delete it always meant.
 * - A component id the identifier rule refuses has its hyphens become underscores, at its
 *   definition and wherever a position refers to it, a recorded press's `sourceComponentId` among
 *   them.
 *
 * Everything else is left as written: a `ChildList` template's `path`, `updateDataModel.path`, a
 * `call` that is data, app ids, surface ids, action names, data model contents. A value that does not
 * fit its position is left as written and reported. What the converter cannot place — a value at a
 * position its schema does not settle, two ids of a surface renamed onto one, an id the rewrite does
 * not make conform, a catalog it holds no map for — is a stop, and a file with a stop is not written.
 */
import type {CatalogMap} from './catalogMap.js';
import {isIdentifier, renamedId} from './identifier.js';
import type {CatalogShape, ComponentShape, Position} from './positions.js';
import {
  isObject,
  operationOf,
  placedMessages,
  shapeOf,
  surfaceIdOf,
  type Json,
} from './recorded.js';

/** A catalog as the converter knows it: its v0.9.1 shape, and its map when one is written. */
export interface KnownCatalog {
  shape: CatalogShape;
  map?: CatalogMap;
}

export interface ConvertOptions {
  /** The catalog an old catalog id names, or undefined when its document is unknown. */
  catalogOf(catalogId: string): KnownCatalog | undefined;
  /** The catalog of a surface the file updates without creating it. */
  defaultCatalogId?: string;
}

/** What one kind of change did, counted. */
export type ChangeKind =
  | 'stamp'
  | 'catalogId'
  | 'theme'
  | 'component'
  | 'property'
  | 'envelope'
  | 'binding'
  | 'call'
  | 'returnType'
  | 'heading'
  | 'value'
  | 'escape'
  | 'id'
  | 'sourceComponentId'
  | 'convertedFrom';

export interface Conversion {
  /** The converted file; meaningful only when there is no stop. */
  value: unknown;
  /** Every change made, counted by kind. */
  changes: Partial<Record<ChangeKind, number>>;
  /** The ids renamed, old to new. */
  renamed: Record<string, string>;
  /** What could not be placed: the file is not written. */
  stops: string[];
  /** Values left as written that do not fit their position. */
  misfits: string[];
  /** Data model strings equal to an id renamed on their surface, never rewritten. */
  dataStrings: string[];
  /** The versions the file's messages were stamped. */
  versions: string[];
}

const VERSIONS = new Set(['v0.9', 'v0.9.1']);
const HEADINGS: Readonly<Record<string, number>> = {h1: 1, h2: 2, h3: 3, h4: 4, h5: 5};
const LITERAL: Position = {kind: 'literal'};

const clone = <T>(value: T): T => structuredClone(value);

/** A binding as v0.9.1 writes it: an object holding `path` alone. */
const isBinding = (value: unknown): value is {path: string} =>
  isObject(value) && typeof value.path === 'string' && Object.keys(value).length === 1;

/** A call as v0.9.1 writes it: `call`, with `args` and `returnType` beside it at most. */
const isCall = (value: unknown): value is Json =>
  isObject(value) &&
  typeof value.call === 'string' &&
  Object.keys(value).every(key => key === 'call' || key === 'args' || key === 'returnType');

/** An object with each key replaced as `rename` says, the order kept. */
function renameKeys(object: Json, rename: (key: string) => string): Json {
  return Object.fromEntries(Object.entries(object).map(([key, value]) => [rename(key), value]));
}

class FileConversion {
  readonly changes: Partial<Record<ChangeKind, number>> = {};
  readonly renamed: Record<string, string> = {};
  readonly stops: string[] = [];
  readonly misfits: string[] = [];
  readonly dataStrings: string[] = [];
  readonly versions = new Set<string>();

  constructor(private readonly options: ConvertOptions) {}

  count(kind: ChangeKind, n = 1) {
    this.changes[kind] = (this.changes[kind] ?? 0) + n;
  }

  stop(message: string) {
    if (!this.stops.includes(message)) this.stops.push(message);
  }

  misfit(message: string) {
    if (!this.misfits.includes(message)) this.misfits.push(message);
  }

  /** A component id as v1.0 has it, the rename recorded. */
  id(id: string): string {
    const next = renamedId(id);
    if (next !== id) this.renamed[id] = next;
    if (!isIdentifier(next))
      this.stop(`component id "${id}" is not an identifier even as "${next}"`);
    return next;
  }

  catalog(catalogId: string | undefined, where: string): KnownCatalog | undefined {
    const id = catalogId ?? this.options.defaultCatalogId;
    if (id === undefined) {
      this.stop(`${where}: a surface the file does not create, and no catalog given for it`);
      return undefined;
    }
    const known = this.options.catalogOf(id);
    if (!known) this.stop(`${where}: no catalog document known for ${id}`);
    else if (!known.map) this.stop(`no map for catalog ${id}`);
    return known;
  }

  // The values at each kind of position.

  value(position: Position, value: unknown, known: KnownCatalog, where: string): unknown {
    switch (position.kind) {
      case 'literal':
        return value;
      case 'id':
        if (typeof value === 'string') return this.reference(value);
        this.misfit(`${where}: a component id that is not a string`);
        return value;
      case 'childList':
        return this.childList(value, where);
      case 'dynamic':
        return this.dynamic(value, known, where, position.objects);
      case 'argument':
        return this.argument(value, known, where);
      case 'action':
        return this.action(value, known, where);
      case 'checks':
        return this.checks(value, known, where);
      case 'object':
        return this.object(position, value, known, where);
      case 'array':
        if (!Array.isArray(value)) {
          this.misfit(`${where}: not an array`);
          return value;
        }
        return value.map((item, i) => this.value(position.items, item, known, `${where}/${i}`));
      case 'unsettled':
        this.stop(`${where}: the catalog does not settle what this holds (${position.why})`);
        return value;
    }
  }

  reference(id: string): string {
    const next = renamedId(id);
    if (next !== id) this.count('id');
    return next;
  }

  childList(value: unknown, where: string): unknown {
    if (Array.isArray(value)) {
      return value.map((child, i) => {
        if (typeof child === 'string') return this.reference(child);
        this.misfit(`${where}/${i}: a child that is not an id`);
        return child;
      });
    }
    if (isObject(value) && typeof value.componentId === 'string') {
      return {...value, componentId: this.reference(value.componentId)};
    }
    this.misfit(`${where}: neither a list of ids nor a template`);
    return value;
  }

  dynamic(value: unknown, known: KnownCatalog, where: string, objects = false): unknown {
    if (isBinding(value)) {
      this.count('binding');
      return {'@path': value.path};
    }
    if (isCall(value)) return this.call(value, known, where);
    if (isObject(value) && !objects) {
      this.misfit(`${where}: an object that is neither a binding nor a call`);
    }
    return value;
  }

  call(value: Json, known: KnownCatalog, where: string): Json {
    this.count('call');
    const fn = known.shape.functions[value.call as string];
    const out: Json = {};
    for (const [key, item] of Object.entries(value)) {
      if (key === 'call') out['@call'] = item;
      else if (key === 'returnType') this.count('returnType');
      else if (key === 'args') {
        if (!isObject(item)) {
          this.misfit(`${where}/args: not an object`);
          out.args = item;
          continue;
        }
        out.args = Object.fromEntries(
          Object.entries(item).map(([name, arg]) => [
            name,
            this.value(fn?.args[name] ?? {kind: 'argument'}, arg, known, `${where}/args/${name}`),
          ]),
        );
      }
    }
    return out;
  }

  /** `FunctionCall.args`' own: a DynamicValue, else a literal object, its `@` keys escaped. */
  argument(value: unknown, known: KnownCatalog, where: string): unknown {
    if (isBinding(value) || isCall(value)) return this.dynamic(value, known, where);
    if (!isObject(value)) return value;
    return renameKeys(value, key => {
      if (!key.startsWith('@')) return key;
      this.count('escape');
      return `@${key}`;
    });
  }

  action(value: unknown, known: KnownCatalog, where: string): unknown {
    if (isObject(value) && isObject(value.event)) {
      const event = {...value.event};
      if (isObject(event.context)) {
        event.context = Object.fromEntries(
          Object.entries(event.context).map(([key, item]) => [
            key,
            this.dynamic(item, known, `${where}/event/context/${key}`),
          ]),
        );
      }
      return {...value, event};
    }
    if (isObject(value) && isCall(value.functionCall)) {
      return {
        ...value,
        functionCall: this.call(value.functionCall, known, `${where}/functionCall`),
      };
    }
    this.misfit(`${where}: neither an event nor a function call`);
    return value;
  }

  checks(value: unknown, known: KnownCatalog, where: string): unknown {
    if (!Array.isArray(value)) {
      this.misfit(`${where}: not a list of checks`);
      return value;
    }
    return value.map((rule, i) => {
      if (!isObject(rule)) {
        this.misfit(`${where}/${i}: a check that is not an object`);
        return rule;
      }
      return 'condition' in rule
        ? {...rule, condition: this.dynamic(rule.condition, known, `${where}/${i}/condition`)}
        : rule;
    });
  }

  object(
    position: Extract<Position, {kind: 'object'}>,
    value: unknown,
    known: KnownCatalog,
    where: string,
  ): unknown {
    if (!isObject(value)) {
      this.misfit(`${where}: not an object`);
      return value;
    }
    return Object.fromEntries(
      Object.entries(value).map(([key, item]) => [
        key,
        this.value(
          position.properties[key] ?? position.rest ?? LITERAL,
          item,
          known,
          `${where}/${key}`,
        ),
      ]),
    );
  }

  // The component and the messages.

  component(component: Json, known: KnownCatalog, where: string): Json {
    const name = typeof component.component === 'string' ? component.component : undefined;
    const shape: ComponentShape | undefined = name ? known.shape.components[name] : undefined;
    const map = known.map;
    if (name && !shape)
      this.misfit(`${where}: component type ${name} is not in the catalog; left as written`);
    const renames = (name && map?.properties?.[name]) || {};
    const out: Json = {};
    for (const [key, item] of Object.entries(component)) {
      if (key === 'id') {
        out.id = typeof item === 'string' ? this.id(item) : item;
        continue;
      }
      if (key === 'component') {
        const next = (name && map?.components?.[name]) || name;
        if (next !== name) this.count('component');
        if (next !== undefined && !isIdentifier(next)) {
          this.stop(
            `component name "${next}" is not an identifier; its catalog's map must rename it`,
          );
        }
        out.component = next ?? item;
        continue;
      }
      const position = shape?.properties[key] ?? shape?.properties['*'] ?? LITERAL;
      let next = renames[key] ?? shape?.envelope[key] ?? key;
      if (renames[key]) this.count('property');
      else if (next !== key) this.count('envelope');
      if (!next.startsWith('@') && !isIdentifier(next)) {
        this.stop(
          `property name "${next}" of ${name} is not an identifier; its catalog's map must rename it`,
        );
        next = key;
      }
      out[next] = shape ? this.value(position, item, known, `${where}/${key}`) : item;
    }
    if (name && map?.heading === name) this.heading(out, where);
    return out;
  }

  /**
   * `variant` `h1` to `h5` as Markdown heading markers at the start of `text`: before a literal
   * text, or, for text from the data model or a function, as the guide has it, through a
   * `formatString` call whose expression holds the binding or the call.
   */
  heading(component: Json, where: string) {
    const level = typeof component.variant === 'string' ? HEADINGS[component.variant] : undefined;
    if (level === undefined) return;
    const marks = '#'.repeat(level);
    const text = component.text;
    if (typeof text === 'string') component.text = `${marks} ${text}`;
    else if (
      isObject(text) &&
      text['@call'] === 'formatString' &&
      isObject(text.args) &&
      typeof text.args.value === 'string'
    ) {
      component.text = {...text, args: {...text.args, value: `${marks} ${text.args.value}`}};
    } else {
      const expression = interpolation(text);
      if (expression === undefined) {
        this.stop(`${where}/text: a heading over text the rule cannot mark`);
        return;
      }
      component.text = {'@call': 'formatString', args: {value: `${marks} ${expression}`}};
    }
    delete component.variant;
    this.count('heading');
  }

  message(message: Json, op: string, known: KnownCatalog | undefined, where: string): Json {
    const out: Json = {};
    for (const [key, item] of Object.entries(message)) {
      if (key === 'version') {
        if (typeof item === 'string' && VERSIONS.has(item)) {
          this.versions.add(item);
          this.count('stamp');
          out.version = '1.0';
        } else {
          this.stop(`${where}/version: ${JSON.stringify(item)} is not a v0.9 or v0.9.1 stamp`);
          out.version = item;
        }
        continue;
      }
      if (key !== op) {
        out[key] = item;
        continue;
      }
      out[key] = this.body(item as Json, op, known, `${where}/${op}`);
    }
    return out;
  }

  body(body: Json, op: string, known: KnownCatalog | undefined, where: string): Json {
    if (op === 'createSurface') {
      const out: Json = {};
      for (const [key, item] of Object.entries(body)) {
        if (key === 'theme') {
          this.count('theme');
          continue;
        }
        if (key === 'catalogId' && known?.map) {
          this.count('catalogId');
          out.catalogId = known.map.to.catalogId;
          continue;
        }
        out[key] = item;
      }
      return out;
    }
    if (op === 'updateComponents') {
      if (!Array.isArray(body.components) || !known) return body;
      return {
        ...body,
        components: body.components.map((component, i) =>
          isObject(component)
            ? this.component(component, known, `${where}/components/${i}`)
            : component,
        ),
      };
    }
    if (op === 'updateDataModel' && !('value' in body)) {
      this.count('value');
      return {...body, value: null};
    }
    return body;
  }
}

/**
 * A v1.0 binding or call as a `formatString` interpolation — `${/path}`, `${name(arg:value)}` — or
 * undefined when an argument is something the expression syntax has no form for here.
 */
function interpolation(value: unknown): string | undefined {
  if (isObject(value) && typeof value['@path'] === 'string' && Object.keys(value).length === 1) {
    return `\${${value['@path']}}`;
  }
  if (!isObject(value) || typeof value['@call'] !== 'string') return undefined;
  const args = value.args === undefined ? {} : value.args;
  if (!isObject(args) || Object.keys(value).some(key => key !== '@call' && key !== 'args'))
    return undefined;
  const parts: string[] = [];
  for (const [name, arg] of Object.entries(args)) {
    if (typeof arg === 'number' || typeof arg === 'boolean') parts.push(`${name}:${arg}`);
    else if (typeof arg === 'string' && !/['{}$\\]/.test(arg)) parts.push(`${name}:'${arg}'`);
    else {
      const inner = interpolation(arg);
      if (inner === undefined) return undefined;
      parts.push(`${name}:${inner}`);
    }
  }
  return `\${${value['@call']}(${parts.join(', ')})}`;
}

/** Strings in a data model value equal to one of `ids`, by where they sit. */
function dataStringsIn(value: unknown, ids: ReadonlySet<string>, where: string, out: string[]) {
  if (typeof value === 'string') {
    if (ids.has(value)) out.push(`${where}: "${value}" is a renamed component id; left as written`);
  } else if (Array.isArray(value)) {
    value.forEach((item, i) => dataStringsIn(item, ids, `${where}/${i}`, out));
  } else if (isObject(value)) {
    for (const [key, item] of Object.entries(value))
      dataStringsIn(item, ids, `${where}/${key}`, out);
  }
}

/** A recorded file converted, with everything the conversion changed, stopped at and noticed. */
export function convertRecorded(file: unknown, options: ConvertOptions): Conversion {
  const shape = shapeOf(file);
  const conversion = new FileConversion(options);
  const value = clone(file);
  if (!shape) {
    conversion.stop('neither a beat file nor a list of messages');
    return result(conversion, value);
  }
  const placed = placedMessages(value);

  // The surfaces' ids, so a rename landing two of a surface's components on one id stops the run.
  const defined = new Map<string, Set<string>>();
  for (const {message, canvas} of placed) {
    const op = operationOf(message);
    if (op !== 'updateComponents') continue;
    const key = `${canvas}|${surfaceIdOf(message as Json, op)}`;
    const ids = defined.get(key) ?? new Set<string>();
    for (const component of (((message as Json).updateComponents as Json)
      .components as unknown[]) ?? []) {
      if (isObject(component) && typeof component.id === 'string') ids.add(component.id);
    }
    defined.set(key, ids);
  }
  const renamedBySurface = new Map<string, Set<string>>();
  for (const [key, ids] of defined) {
    const onto = new Map<string, string>();
    const renamed = new Set<string>();
    for (const id of ids) {
      const next = renamedId(id);
      if (next !== id) renamed.add(id);
      const held = onto.get(next);
      if (held !== undefined && held !== id) {
        conversion.stop(
          `surface ${key.split('|')[1]}: "${held}" and "${id}" both become "${next}"`,
        );
      }
      onto.set(next, id);
    }
    renamedBySurface.set(key, renamed);
  }

  // Each surface's catalog, as its `createSurface` names it, within its canvas.
  const catalogs = new Map<string, KnownCatalog | undefined>();
  placed.forEach(({message, canvas, replace}, index) => {
    const op = operationOf(message);
    if (!op) return;
    const json = message as Json;
    const surface = surfaceIdOf(json, op);
    const key = `${canvas}|${surface}`;
    const where = `message ${index} (${surface})`;
    if (op === 'createSurface') {
      catalogs.set(
        key,
        conversion.catalog((json.createSurface as Json).catalogId as string, where),
      );
    } else if (!catalogs.has(key)) {
      catalogs.set(key, conversion.catalog(undefined, where));
    }
    replace(conversion.message(json, op, catalogs.get(key), where));
    if (op === 'updateDataModel') {
      const renamed = renamedBySurface.get(key);
      if (renamed?.size) {
        dataStringsIn(
          (json.updateDataModel as Json).value,
          renamed,
          `${where} value`,
          conversion.dataStrings,
        );
      }
    }
  });

  if (shape === 'beat') {
    for (const turn of (value as Json).turns as Json[]) {
      const action = turn.action;
      if (isObject(action) && typeof action.sourceComponentId === 'string') {
        const next = renamedId(action.sourceComponentId);
        if (next !== action.sourceComponentId) {
          conversion.count('sourceComponentId');
          action.sourceComponentId = next;
        }
      }
    }
  }
  if (shape === 'beat' && conversion.versions.size > 0) {
    conversion.count('convertedFrom');
    (value as Json).convertedFrom = [...conversion.versions].sort();
  }
  return result(conversion, value);
}

function result(conversion: FileConversion, value: unknown): Conversion {
  return {
    value,
    changes: conversion.changes,
    renamed: conversion.renamed,
    stops: conversion.stops,
    misfits: conversion.misfits,
    dataStrings: conversion.dataStrings,
    versions: [...conversion.versions].sort(),
  };
}
