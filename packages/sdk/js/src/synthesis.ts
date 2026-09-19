/**
 * The synthesis half of the composition extension (SPEC §5.2, §14): the payload the orchestrator
 * sends the client beside a painted synthesis surface — the derived data model whose every leaf is
 * a formula over refs into partitions, its match claims, and the sort declarations — and the pieces
 * both sides agree on. Normative definition: `../contracts/composition.v0.6.json`
 * (`shapes.synthesizeDataModel`); `synthesis.contract.test.ts` asserts this projection against it.
 * What the Synthesizer writes, and how it is told to, belongs to the orchestrator; the tree it
 * writes is painted as ordinary A2UI and never rides this payload.
 *
 * The schema is plain JSON Schema 2020-12, recursive where the model is free-form; its `$defs` are
 * exported for an author's own output schema to build on, and the sdk's validator (`validate.ts`)
 * compiles it.
 */

/** Metadata key the client-facing payload rides under, beside the composition stamp. */
export const SYNTHESIS_KEY = 'a2uiverseSynthesis';

/** The reserved key of an object of the derived model that holds its match claim. */
export const MATCH_KEY = 'match';

const refSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['surface', 'pointer'],
  description:
    "A cross-partition qualified ref: a pointer that resolves in another surface's data model.",
  properties: {
    surface: {
      type: 'string',
      description: 'The namespaced surfaceId (<appId>:<surfaceId>) the pointer resolves in.',
    },
    pointer: {
      type: 'string',
      pattern: '^(|/.*)$',
      description:
        'RFC 6901 JSON Pointer into that surface\'s data model, where a segment may carry a predicate: `items[sku="x"]` selects the element of `items` whose field `sku` equals the JSON literal "x", and `items[a="x",b=2]` conjoins several field tests until exactly one element matches. Elements are selected by key, never by position: a positional segment into an array does not resolve. A ref is valid while its keys resolve; none matching and several matching are both absent. The value is a JSON literal compared by JSON equality.',
    },
  },
} as const;

const formulaSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['op', 'args'],
  description:
    'A leaf of the derived model: one operator over N refs, N ≥ 0. A plain vendor value is a one-argument pass-through. A formula with no refs is a value no source contributes to — absent by construction. Operators are names the shell catalog declares as functions; the contract does not enumerate them. Recognized by shape: an object with exactly `op` and `args` is a formula.',
  properties: {
    op: {type: 'string', description: 'A function name declared by the shell catalog.'},
    args: {type: 'array', minItems: 0, items: {$ref: '#/$defs/ref'}},
  },
} as const;

const relationSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['op', 'args'],
  description:
    "One named relation of a match claim: a formula like any other leaf, its operator a relation the shell catalog declares, over exactly two refs in two different apps — the appId of each ref's namespaced surface. The contract does not enumerate relations; the consumer checks the operator against the shell catalog.",
  properties: {
    op: {type: 'string', description: 'A relation the shell catalog declares as a function.'},
    args: {type: 'array', minItems: 2, maxItems: 2, items: {$ref: '#/$defs/ref'}},
  },
} as const;

const matchSchema = {
  type: 'object',
  minProperties: 1,
  additionalProperties: {$ref: '#/$defs/relation'},
  description:
    "A match claim, under the reserved key `match` of an object of the derived model, the root included: the Synthesizer's word that the entries the object joins from different apps are one thing, with its evidence. Each key is the Synthesizer's own words for what matched, each value a relation. At least one relation; flat. No object is required to carry one. Rendered through the shell's join-disclosure component.",
} as const;

const nodeSchema = {
  description:
    'A node of the free-form derived model: a formula leaf, an object whose values are nodes — its key `match`, when present, is its match claim — or an array of nodes. A scalar anywhere is a violation — every leaf is a formula, never a literal value.',
  oneOf: [
    {$ref: '#/$defs/formula'},
    {
      type: 'object',
      properties: {[MATCH_KEY]: {$ref: '#/$defs/match'}},
      additionalProperties: {$ref: '#/$defs/node'},
    },
    {type: 'array', items: {$ref: '#/$defs/node'}},
  ],
} as const;

const dataModelSchema = {
  type: 'object',
  minProperties: 1,
  propertyNames: {not: {const: 'sorts'}},
  properties: {[MATCH_KEY]: {$ref: '#/$defs/match'}},
  additionalProperties: {$ref: '#/$defs/node'},
  description:
    "The derived data model the tree binds to: a JSON shape of the Synthesizer's choosing whose every leaf is a formula. Evaluated client-side into plain values with contributor state at the same paths. The key `match` on any object, the root included, is that object's match claim. The root key `sorts` is reserved: the runtime writes each sort declaration, with the user's current choice, at `/sorts/N` of the synthesis surface's data model, and the tree binds SortControl there.",
} as const;

const sortSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['path', 'options', 'key', 'direction'],
  description:
    "A sort declaration over one array of the derived model. The model names the array, the sortable keys and their labels, and the initial choice; the runtime sorts and keeps the user's choice of key or direction.",
  properties: {
    path: {
      type: 'string',
      pattern: '^/.*$',
      description: 'JSON Pointer to the sorted array in the derived model.',
    },
    options: {
      type: 'array',
      minItems: 1,
      description: 'The keys the user may sort by, each with its user-facing label.',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['key', 'label'],
        properties: {
          key: {
            type: 'string',
            pattern: '^/.*$',
            description: 'JSON Pointer inside each element of the array, to a formula leaf.',
          },
          label: {type: 'string', minLength: 1},
        },
      },
    },
    key: {type: 'string', description: 'The initial key; one of the options.'},
    direction: {type: 'string', enum: ['asc', 'desc']},
  },
} as const;

/**
 * The shared definitions: a ref, a formula, a relation and a match claim, a node, the derived data
 * model, a sort declaration.
 */
export const SYNTHESIS_DEFS = {
  ref: refSchema,
  formula: formulaSchema,
  relation: relationSchema,
  match: matchSchema,
  node: nodeSchema,
  dataModel: dataModelSchema,
  sort: sortSchema,
} as const;

/** Client-facing: the derived model and the sorts, plus the orchestrator's envelope. */
export const SYNTHESIS_SCHEMA = {
  $schema: 'https://json-schema.org/draft/2020-12/schema',
  title: 'SynthesisPayload',
  description:
    "Client-facing: the synthesis branch minus the tree (painted as A2UI) and the note (journaled). Evaluated client-side into the synthesis surface's data model.",
  $defs: SYNTHESIS_DEFS,
  type: 'object',
  additionalProperties: false,
  required: ['dataModel', 'sorts'],
  properties: {
    dataModel: {$ref: '#/$defs/dataModel'},
    sorts: {type: 'array', items: {$ref: '#/$defs/sort'}},
  },
} as const;

/** A pointer that resolves in another surface's data model. */
export interface Ref {
  /** The namespaced surfaceId (`<appId>:<surfaceId>`) the pointer resolves in. */
  surface: string;
  /** JSON Pointer into that surface's data model; a segment may carry a `[key=value]` predicate. */
  pointer: string;
}

/** A leaf of the derived model: one operator over N refs. */
export interface Formula {
  /** A function name declared by the shell catalog. */
  op: string;
  args: Ref[];
}

/** One named relation of a match claim: a formula over two refs in two different apps. */
export interface Relation {
  /** A relation the shell catalog declares as a function. */
  op: string;
  args: [Ref, Ref];
}

/** A match claim: the Synthesizer's words for what matched, each naming a relation. */
export type MatchClaim = {[name: string]: Relation};

/** A node of the free-form derived model; an object's `match` key holds its match claim. */
export type ModelNode = Formula | {[key: string]: ModelNode} | ModelNode[];

/** The derived data model: an object of nodes. */
export type DerivedModel = {[key: string]: ModelNode};

export interface SortOption {
  /** JSON Pointer inside each element, to a formula leaf. */
  key: string;
  label: string;
}

/** A sort declaration over one array of the derived model. */
export interface SortDeclaration {
  /** JSON Pointer to the sorted array in the derived model. */
  path: string;
  options: SortOption[];
  /** The initial key; one of the options. */
  key: string;
  direction: 'asc' | 'desc';
}

/** What rides under {@link SYNTHESIS_KEY}: the derived model and the sorts. */
export interface SynthesisPayload {
  dataModel: DerivedModel;
  sorts: SortDeclaration[];
}

/** The payload on an event's metadata, if present and envelope-complete. */
export function readSynthesis(
  metadata: Record<string, unknown> | undefined,
): SynthesisPayload | undefined {
  const raw = metadata?.[SYNTHESIS_KEY];
  if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) return undefined;
  const candidate = raw as Record<string, unknown>;
  for (const key of SYNTHESIS_SCHEMA.required) {
    if (!(key in candidate)) return undefined;
  }
  return candidate as unknown as SynthesisPayload;
}
