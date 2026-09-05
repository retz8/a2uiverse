/**
 * The synthesis half of the composition extension (SPEC §5.2, §14): the
 * **synthesize data model** — the data model for a2ui composition — that the
 * Synthesizer authors and the client evaluates. Normative definition:
 * `../contracts/composition.v0.4.json` (`shapes.synthesizeDataModel`);
 * `synthesis.contract.test.ts` asserts this projection against it.
 *
 * Two authors, two schemas. The Synthesizer emits {@link SynthesizeDataModel}:
 * a synthesis — a shell-catalog tree, a free-form derived data model whose
 * every leaf is a formula, sort declarations, a note — or a decline. The
 * orchestrator paints the tree as ordinary A2UI and sends the client the
 * {@link SynthesisPayload}: the derived model and the sorts, under
 * {@link SYNTHESIS_KEY}.
 *
 * The schemas are plain JSON Schema 2020-12, recursive where the model is
 * free-form; the sdk's validator (`validate.ts`) compiles them.
 */

/** Metadata key the client-facing payload rides under, beside the composition stamp. */
export const SYNTHESIS_KEY = 'a2uiverseSynthesis';

/** The A2UI version whose components the tree carries. */
export const TREE_A2UI_VERSION = 'v0.9';

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

const nodeSchema = {
  description:
    'A node of the free-form derived model: a formula leaf, an object whose values are nodes, or an array of nodes. A scalar anywhere is a violation — every leaf is a formula, never a literal value.',
  oneOf: [
    {$ref: '#/$defs/formula'},
    {type: 'object', additionalProperties: {$ref: '#/$defs/node'}},
    {type: 'array', items: {$ref: '#/$defs/node'}},
  ],
} as const;

const dataModelSchema = {
  type: 'object',
  minProperties: 1,
  propertyNames: {not: {const: 'sorts'}},
  additionalProperties: {$ref: '#/$defs/node'},
  description:
    "The derived data model the tree binds to: a JSON shape of the Synthesizer's choosing whose every leaf is a formula. Evaluated client-side into plain values with contributor state at the same paths. The root key `sorts` is reserved: the runtime writes each sort declaration, with the user's current choice, at `/sorts/N` of the synthesis surface's data model, and the tree binds SortControl there.",
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

const treeSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['components'],
  description:
    'The synthesis tree: the A2UI components list an agent would put in an updateComponents, authored in the shell catalog. One component has the id `root`. Validated against the shell catalog by the consumer; the contract does not restate a component. Painted as ordinary A2UI; never rides metadata.',
  properties: {
    components: {
      type: 'array',
      minItems: 1,
      items: {
        type: 'object',
        required: ['id', 'component'],
        properties: {id: {type: 'string'}, component: {type: 'string'}},
      },
    },
  },
} as const;

const defs = {
  ref: refSchema,
  formula: formulaSchema,
  node: nodeSchema,
  dataModel: dataModelSchema,
  sort: sortSchema,
} as const;

/** Model-facing: what the Synthesizer emits — a synthesis, or a decline. */
export const SYNTHESIZE_DATA_MODEL_SCHEMA = {
  $schema: 'https://json-schema.org/draft/2020-12/schema',
  title: 'SynthesizeDataModel',
  description:
    'Model-facing: what the Synthesizer emits, written as text and validated after. A synthesis carries the tree, the derived data model, the sort declarations and a note; a decline carries declined: true and a reason.',
  $defs: {...defs, tree: treeSchema},
  oneOf: [
    {
      type: 'object',
      additionalProperties: false,
      required: ['tree', 'dataModel', 'sorts', 'note'],
      properties: {
        tree: {$ref: '#/$defs/tree'},
        dataModel: {$ref: '#/$defs/dataModel'},
        sorts: {type: 'array', items: {$ref: '#/$defs/sort'}},
        note: {
          type: 'string',
          description:
            "What was delivered and why it differs from the Planner's brief, when it differs; empty otherwise. Journaled, never painted.",
        },
      },
    },
    {
      type: 'object',
      additionalProperties: false,
      required: ['declined', 'reason'],
      properties: {
        declined: {
          const: true,
          description: 'Nothing is joinable; the reserved slot collapses and no payload is sent.',
        },
        reason: {
          type: 'string',
          minLength: 1,
          description: "Why nothing was joinable — spoken into the slot as the shell's words.",
        },
      },
    },
  ],
} as const;

/** Client-facing: the derived model and the sorts, plus the orchestrator's envelope. */
export const SYNTHESIS_SCHEMA = {
  $schema: 'https://json-schema.org/draft/2020-12/schema',
  title: 'SynthesisPayload',
  description:
    "Client-facing: the synthesis branch minus the tree (painted as A2UI) and the note (journaled). Evaluated client-side into the synthesis surface's data model.",
  $defs: defs,
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

/** A node of the free-form derived model. */
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

/** An A2UI v0.9 component as the shell catalog's consumer sees it. */
export interface TreeComponent {
  id: string;
  component: string;
  [prop: string]: unknown;
}

/** The synthesis tree: an A2UI components list in the shell catalog, one of them `root`. */
export interface SynthesisTree {
  components: TreeComponent[];
}

export interface Synthesis {
  tree: SynthesisTree;
  dataModel: DerivedModel;
  sorts: SortDeclaration[];
  /** Deviation from the Planner's brief, when any; journaled, never painted. */
  note: string;
}

export interface Decline {
  declined: true;
  /** Spoken into the slot as the shell's words. */
  reason: string;
}

/** What the Synthesizer emits: a synthesis, or a decline. */
export type SynthesizeDataModel = Synthesis | Decline;

export function isDecline(output: SynthesizeDataModel): output is Decline {
  return 'declined' in output && output.declined === true;
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
