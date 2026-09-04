/**
 * The synthesis half of the composition extension (SPEC §5.2, §14): the
 * wiring the Synthesizer emits and the client evaluates — a derived data model
 * over cross-partition refs, riding A2A metadata on the event that paints the
 * synthesis surface. Normative definition: `../contracts/composition.v0.2.json`
 * (`shapes.synthesisWiring`); `synthesis.contract.test.ts` asserts this
 * projection against it.
 *
 * Two authors: the Synthesizer emits {@link SynthesizerOutput}; the
 * orchestrator wraps a non-declined one with `computedAgainst` into
 * {@link SynthesisWiring}. Both schemas are union-free and non-recursive — the
 * structured-output constraint the plan schema already lives with.
 */
import type {FromSchema} from 'json-schema-to-ts';

/** Metadata key the wiring rides under, beside the composition stamp. */
export const WIRING_KEY = 'a2uiverseWiring';

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
        "RFC 6901 JSON Pointer into that surface's data model. Index-addressed in this version.",
    },
  },
} as const;

const cellSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['op', 'args'],
  description:
    'One operator over N refs. A plain vendor value is a one-argument pass-through. Operators are names the shell catalog declares as functions; the contract does not enumerate them.',
  properties: {
    op: {type: 'string', description: 'A function name declared by the shell catalog.'},
    args: {type: 'array', minItems: 1, items: refSchema},
  },
} as const;

const fieldsSchema = {
  type: 'array',
  minItems: 1,
  items: {
    type: 'object',
    additionalProperties: false,
    required: ['name', 'label'],
    properties: {
      name: {
        type: 'string',
        pattern: '^[^/~]+$',
        description: 'Data-model key every entity carries; a valid JSON Pointer segment.',
      },
      label: {
        type: 'string',
        description:
          'The user-facing name. Every name the user reads on the merged surface that is not a value is a field label.',
      },
    },
  },
  description: "Declared once; every entity's cells align to this list by position.",
} as const;

/** The same field list without `minItems`: the model-facing form, where a decline sends none. */
const {minItems: _fieldsMin, ...fieldsSchemaNoMin} = fieldsSchema;
void _fieldsMin;

const entitiesSchema = {
  type: 'array',
  items: {
    type: 'object',
    additionalProperties: false,
    required: ['cells'],
    properties: {
      cells: {
        type: 'array',
        items: cellSchema,
        description:
          'Positional, aligned to fields. Membership in one entity is the entity-resolution assertion.',
      },
    },
  },
} as const;

const sortSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['field', 'direction'],
  description:
    "The model names the criterion (via the field's label); the runtime sorts. User-changeable.",
  properties: {
    field: {type: 'string', description: 'A declared field name.'},
    direction: {type: 'string', enum: ['asc', 'desc']},
  },
} as const;

/** Model-facing: what the Synthesizer emits. A synthesis, or a decline — every key required. */
export const SYNTHESIZER_OUTPUT_SCHEMA = {
  $schema: 'https://json-schema.org/draft/2020-12/schema',
  title: 'SynthesizerOutput',
  description:
    'Model-facing: what the Synthesizer emits. Union-free and non-recursive (structured-output constraint). Every key is required — a provider drops optional nested arrays — so a decline carries declined: true, a reason, and empty fields and entities (sort is then ignored); a synthesis carries declined: false with at least one field. The orchestrator adds computedAgainst.',
  type: 'object',
  additionalProperties: false,
  required: ['declined', 'reason', 'fields', 'entities', 'sort'],
  properties: {
    declined: {
      type: 'boolean',
      description:
        'True when nothing is joinable; the reserved slot collapses and no wiring is sent.',
    },
    reason: {
      type: 'string',
      description:
        'Why nothing was joinable when declined; empty otherwise. Journaled, never painted.',
    },
    fields: {
      ...fieldsSchemaNoMin,
      description:
        "Declared once; every entity's cells align to this list by position. At least one unless declined.",
    },
    entities: entitiesSchema,
    sort: sortSchema,
  },
} as const;

/** Client-facing: the Synthesizer's inner output plus the orchestrator's envelope. */
export const WIRING_SCHEMA = {
  $schema: 'https://json-schema.org/draft/2020-12/schema',
  title: 'SynthesisWiring',
  description:
    "Client-facing: the Synthesizer's inner output plus the orchestrator's envelope. Evaluated client-side into an ordinary data model keyed `entities`.",
  type: 'object',
  additionalProperties: false,
  required: ['fields', 'entities', 'sort', 'computedAgainst'],
  properties: {
    fields: fieldsSchema,
    entities: entitiesSchema,
    sort: sortSchema,
    computedAgainst: {
      type: 'object',
      additionalProperties: {type: 'integer', minimum: 0},
      description:
        "The partition generations this wiring was derived from, keyed by namespaced surfaceId. What the IntegrityChecker and the client compare against the stamp's generations.",
    },
  },
} as const;

/** A pointer that resolves in another surface's data model. */
export interface Ref {
  /** The namespaced surfaceId (`<appId>:<surfaceId>`) the pointer resolves in. */
  surface: string;
  /** RFC 6901 JSON Pointer into that surface's data model. */
  pointer: string;
}

/** One operator over N refs. A plain vendor value is a one-argument pass-through. */
export interface Cell {
  /** A function name declared by the shell catalog. */
  op: string;
  args: Ref[];
}

export interface Field {
  /** Data-model key every entity carries; a valid JSON Pointer segment. */
  name: string;
  /** The user-facing name. */
  label: string;
}

/** Cells aligned to the wiring's fields by position. Membership is the entity-resolution assertion. */
export interface Entity {
  cells: Cell[];
}

export interface Sort {
  /** A declared field name. */
  field: string;
  direction: 'asc' | 'desc';
}

/** What the Synthesizer emits: a synthesis, or a decline (empty fields and entities). */
export interface SynthesizerOutput {
  declined: boolean;
  /** Why nothing was joinable when declined; empty otherwise. Journaled, never painted. */
  reason: string;
  fields: Field[];
  entities: Entity[];
  sort: Sort;
}

/** What rides under {@link WIRING_KEY}: the inner output plus the generations it was computed against. */
export interface SynthesisWiring {
  fields: Field[];
  entities: Entity[];
  sort: Sort;
  /** Partition generations this wiring was derived from, keyed by namespaced surfaceId. */
  computedAgainst: Record<string, number>;
}

// The interfaces above are the consumer-facing types; the schemas are the norm. These pins make
// a divergence between them a type error (mutual assignability, checked at build), so the types
// cannot drift from the contract — the same guarantee the field-list check gives the stamp.
type Pin<A, B> = [A] extends [B] ? ([B] extends [A] ? true : never) : never;
const _outputPinned: Pin<SynthesizerOutput, FromSchema<typeof SYNTHESIZER_OUTPUT_SCHEMA>> = true;
const _wiringPinned: Pin<SynthesisWiring, FromSchema<typeof WIRING_SCHEMA>> = true;
void _outputPinned;
void _wiringPinned;

/** The wiring on an event's metadata, if present and envelope-complete. */
export function readWiring(
  metadata: Record<string, unknown> | undefined,
): SynthesisWiring | undefined {
  const raw = metadata?.[WIRING_KEY];
  if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) return undefined;
  const candidate = raw as Record<string, unknown>;
  for (const key of WIRING_SCHEMA.required) {
    if (!(key in candidate)) return undefined;
  }
  return candidate as unknown as SynthesisWiring;
}
