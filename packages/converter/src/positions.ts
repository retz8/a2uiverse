/**
 * Positions, read from a v0.9.1 catalog document (task-21.11 decision 3): what each property of each
 * component, and each argument of each function, holds — a reference to a component, a dynamic
 * value, an action, checks, a literal — as its declared schema says, through the protocol's common
 * types by name. Nothing is matched by shape. A schema that does not settle what a property holds
 * gives an `unsettled` position, which stops a conversion that meets a value there.
 */

export type Position =
  /** Left as written. */
  | {kind: 'literal'}
  /** A component id: `ComponentId`. */
  | {kind: 'id'}
  /** A `ChildList`: a list of component ids, or a template `{componentId, path}`. */
  | {kind: 'childList'}
  /**
   * A `DynamicValue` and its typed kin, a `DataBinding` or a `FunctionCall`; `objects` when the
   * schema also takes a literal object no binding or call can be mistaken for.
   */
  | {kind: 'dynamic'; objects?: true}
  /** A function's argument with no schema of its own: `FunctionCall.args`' DynamicValue or literal object. */
  | {kind: 'argument'}
  /** An `Action`: an event whose context values are dynamic, or a function call. */
  | {kind: 'action'}
  /** `Checkable.checks`: a list of `CheckRule`. */
  | {kind: 'checks'}
  /** An object whose named properties, and the rest, hold positions of their own. */
  | {kind: 'object'; properties: Readonly<Record<string, Position>>; rest?: Position}
  /** An array whose every item holds the same position. */
  | {kind: 'array'; items: Position}
  /** A schema that does not settle what the value is. */
  | {kind: 'unsettled'; why: string};

/** A component's properties, and the envelope key a v0.9.1 mixin property takes on v1.0. */
export interface ComponentShape {
  properties: Readonly<Record<string, Position>>;
  /** `accessibility` from `ComponentCommon`, `checks` from `Checkable`: renamed `@accessibility`, `@checks`. */
  envelope: Readonly<Record<string, string>>;
}

/** A function's arguments, as its definition declares them. */
export interface FunctionShape {
  args: Readonly<Record<string, Position>>;
}

export interface CatalogShape {
  components: Readonly<Record<string, ComponentShape>>;
  functions: Readonly<Record<string, FunctionShape>>;
}

type Schema = Record<string, unknown>;

const LITERAL: Position = {kind: 'literal'};
const DYNAMIC: Position = {kind: 'dynamic'};
const ACCESSIBILITY: Position = {
  kind: 'object',
  properties: {label: DYNAMIC, description: DYNAMIC},
};
const CHECK_RULE: Position = {kind: 'object', properties: {condition: DYNAMIC, message: LITERAL}};

/** The protocol's common types, by their `$defs` name, as positions. */
export const COMMON_POSITIONS: Readonly<Record<string, Position>> = {
  ComponentId: {kind: 'id'},
  ChildList: {kind: 'childList'},
  DataBinding: DYNAMIC,
  FunctionCall: DYNAMIC,
  DynamicValue: DYNAMIC,
  DynamicString: DYNAMIC,
  DynamicNumber: DYNAMIC,
  DynamicBoolean: DYNAMIC,
  DynamicStringList: DYNAMIC,
  Action: {kind: 'action'},
  CheckRule: CHECK_RULE,
  AccessibilityAttributes: ACCESSIBILITY,
  ComponentCommon: {kind: 'object', properties: {id: {kind: 'id'}, accessibility: ACCESSIBILITY}},
  Checkable: {kind: 'object', properties: {checks: {kind: 'checks'}}},
};

/** The common types whose property becomes an envelope key on v1.0, and the key it becomes. */
const ENVELOPE_OF: Readonly<Record<string, Readonly<Record<string, string>>>> = {
  ComponentCommon: {accessibility: '@accessibility'},
  Checkable: {checks: '@checks'},
};

const COMMON_TYPES = /(?:^|\/)common_types\.json#\/\$defs\/([A-Za-z]+)$/;

const isObject = (value: unknown): value is Schema =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const same = (a: Position, b: Position) => JSON.stringify(a) === JSON.stringify(b);

/** Whether a schema takes an object at all. */
const takesObject = (schema: Schema): boolean =>
  schema.type === 'object' ||
  (Array.isArray(schema.type) && schema.type.includes('object')) ||
  (schema.type === undefined && schema.const === undefined && schema.enum === undefined);

/**
 * Whether an object schema keeps a binding and a call out: it takes no property but those it names,
 * names neither `path` nor `call`, and requires one of its own.
 */
const excludesDirectives = (schema: Schema): boolean => {
  const named = isObject(schema.properties) ? Object.keys(schema.properties) : [];
  const required = Array.isArray(schema.required) ? schema.required : [];
  return (
    schema.additionalProperties === false &&
    !named.includes('path') &&
    !named.includes('call') &&
    required.length > 0
  );
};

class Reader {
  readonly envelope: Record<string, string> = {};
  private readonly resolving = new Set<string>();

  constructor(private readonly catalog: Schema) {}

  /** The position a schema declares, `where` naming it for an unsettled one. */
  read(schema: unknown, where: string, root = false): Position {
    if (schema === true || schema === undefined) return LITERAL;
    if (!isObject(schema)) return {kind: 'unsettled', why: `${where}: not a schema`};
    if (typeof schema.$ref === 'string') return this.ref(schema.$ref, where, root);
    if (Array.isArray(schema.allOf)) return this.all(schema.allOf, where, root);
    const union = schema.oneOf ?? schema.anyOf;
    if (Array.isArray(union)) return this.union(union, where);
    if (schema.type === 'object' || isObject(schema.properties)) return this.object(schema, where);
    if (schema.type === 'array' && schema.items !== undefined) {
      const items = this.read(schema.items, `${where}[]`);
      return items.kind === 'literal' ? LITERAL : {kind: 'array', items};
    }
    return LITERAL;
  }

  private ref(ref: string, where: string, root: boolean): Position {
    const common = COMMON_TYPES.exec(ref);
    if (common) {
      const name = common[1]!;
      const position = COMMON_POSITIONS[name];
      if (!position)
        return {kind: 'unsettled', why: `${where}: common type ${name} has no position`};
      if (root) Object.assign(this.envelope, ENVELOPE_OF[name] ?? {});
      return position;
    }
    const local = /^#\/(\$defs|components)\/(.+)$/.exec(ref);
    if (!local)
      return {kind: 'unsettled', why: `${where}: reference ${ref} is outside the catalog`};
    const section = this.catalog[local[1]!];
    const target = isObject(section) ? section[local[2]!] : undefined;
    if (target === undefined)
      return {kind: 'unsettled', why: `${where}: reference ${ref} not found`};
    if (this.resolving.has(ref))
      return {kind: 'unsettled', why: `${where}: reference ${ref} is recursive`};
    this.resolving.add(ref);
    try {
      return this.read(target, where, root);
    } finally {
      this.resolving.delete(ref);
    }
  }

  private all(parts: unknown[], where: string, root: boolean): Position {
    const properties: Record<string, Position> = {};
    let rest: Position | undefined;
    for (const part of parts) {
      const position = this.read(part, where, root);
      if (position.kind === 'literal') continue;
      if (position.kind !== 'object') return position;
      for (const [key, value] of Object.entries(position.properties)) {
        const held = properties[key];
        properties[key] =
          held === undefined || same(held, value) || value.kind === 'literal'
            ? (held ?? value)
            : held.kind === 'literal'
              ? value
              : {kind: 'unsettled', why: `${where}/${key}: declared twice, differently`};
      }
      if (position.rest) rest = position.rest;
    }
    return {kind: 'object', properties, ...(rest ? {rest} : {})};
  }

  /**
   * A union settles when every branch holds the same position, or when its branches are the
   * literals a dynamic value already admits beside a dynamic branch. Anything else — a component id
   * beside free text, an object beside a binding — does not.
   */
  private union(branches: unknown[], where: string): Position {
    const read = branches.map(branch => ({schema: branch, position: this.read(branch, where)}));
    const kinds = new Set(read.map(b => b.position.kind));
    if (read.every(b => same(b.position, read[0]!.position))) return read[0]!.position;
    if (
      [...kinds].every(kind => kind === 'literal' || kind === 'dynamic') &&
      kinds.has('dynamic')
    ) {
      const objects = read.filter(
        b => b.position.kind === 'literal' && isObject(b.schema) && takesObject(b.schema),
      );
      if (objects.length === 0) return DYNAMIC;
      if (objects.every(b => excludesDirectives(b.schema as Schema)))
        return {kind: 'dynamic', objects: true};
    }
    return {kind: 'unsettled', why: `${where}: a union of ${[...kinds].join(', ')}`};
  }

  private object(schema: Schema, where: string): Position {
    const properties: Record<string, Position> = {};
    if (isObject(schema.properties)) {
      for (const [key, value] of Object.entries(schema.properties)) {
        properties[key] = this.read(value, `${where}/${key}`);
      }
    }
    const extra = schema.additionalProperties ?? schema.unevaluatedProperties;
    const rest = isObject(extra) ? this.read(extra, `${where}/*`) : undefined;
    const meaningful =
      Object.values(properties).some(p => p.kind !== 'literal') ||
      (rest && rest.kind !== 'literal');
    if (!meaningful) return LITERAL;
    return {kind: 'object', properties, ...(rest && rest.kind !== 'literal' ? {rest} : {})};
  }
}

/** The shape of one component, as its schema declares it. */
function componentShape(catalog: Schema, name: string, schema: unknown): ComponentShape {
  const reader = new Reader(catalog);
  const position = reader.read(schema, `components/${name}`, true);
  if (position.kind === 'object')
    return {properties: position.properties, envelope: reader.envelope};
  if (position.kind === 'literal') return {properties: {}, envelope: reader.envelope};
  return {properties: {'*': position}, envelope: reader.envelope};
}

/** The shape of one function: each argument as its definition declares it, else a generic one. */
function functionShape(catalog: Schema, name: string, schema: unknown): FunctionShape {
  const args: Record<string, Position> = {};
  const declared =
    isObject(schema) && isObject(schema.properties) ? schema.properties.args : undefined;
  const reader = new Reader(catalog);
  if (isObject(declared) && isObject(declared.properties)) {
    for (const [key, value] of Object.entries(declared.properties)) {
      const typed =
        isObject(value) &&
        (value.type !== undefined ||
          value.$ref !== undefined ||
          value.oneOf !== undefined ||
          value.anyOf !== undefined ||
          value.allOf !== undefined ||
          value.enum !== undefined ||
          value.const !== undefined);
      args[key] = typed ? reader.read(value, `functions/${name}/args/${key}`) : {kind: 'argument'};
    }
  }
  return {args};
}

/** Every component's and every function's positions in a v0.9.1 catalog document. */
export function readCatalogShape(catalog: Schema): CatalogShape {
  const components: Record<string, ComponentShape> = {};
  const functions: Record<string, FunctionShape> = {};
  const declaredComponents = isObject(catalog.components) ? catalog.components : {};
  const declaredFunctions = isObject(catalog.functions) ? catalog.functions : {};
  for (const [name, schema] of Object.entries(declaredComponents)) {
    components[name] = componentShape(catalog, name, schema);
  }
  for (const [name, schema] of Object.entries(declaredFunctions)) {
    functions[name] = functionShape(catalog, name, schema);
  }
  return {components, functions};
}
