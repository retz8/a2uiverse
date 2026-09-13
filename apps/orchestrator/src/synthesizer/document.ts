/**
 * What the Synthesizer writes (SPEC §5.2): the synthesize data model — a synthesis, or a decline.
 * A synthesis is a shell-catalog tree, a derived data model whose every leaf is a formula, sort
 * declarations and a note; the orchestrator paints the tree and sends the client the payload
 * (`SynthesisPayload`, the sdk's). The output schema builds on the sdk's shared definitions, so a
 * ref, a formula or a sort means the same here as on the wire.
 */
import {
  SYNTHESIS_DEFS,
  type A2uiComponent,
  type DerivedModel,
  type SortDeclaration,
} from '@a2uiverse/sdk';

/** The synthesis tree: an A2UI components list in the shell catalog, one of them `root`. */
export interface SynthesisTree {
  components: A2uiComponent[];
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

const treeSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['components'],
  description:
    'The synthesis tree: the A2UI components list an agent would put in an updateComponents, authored in the catalog you were given. One component has the id `root`. Painted as ordinary A2UI.',
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

/** The Synthesizer's output schema, shown in its prompt and validated first. */
export const SYNTHESIZE_DATA_MODEL_SCHEMA = {
  $schema: 'https://json-schema.org/draft/2020-12/schema',
  title: 'SynthesizeDataModel',
  description:
    'What the Synthesizer emits, written as text and validated after. A synthesis carries the tree, the derived data model, the sort declarations and a note; a decline carries declined: true and a reason.',
  $defs: {...SYNTHESIS_DEFS, tree: treeSchema},
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
