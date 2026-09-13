/**
 * What the Planner writes (SPEC §5.6, task-6.4): the layout surface — the dispatch list, the
 * `shell:main` tree in the shell catalog, and a data model of literals the tree binds to. Text out,
 * validated after, like the Synthesizer's document; the output schema is shown in the prompt and
 * validated first.
 */
import type {A2uiComponent} from '@a2uiverse/sdk';

/** A source to dispatch — an app id, or `shell` for the merged view — with the prose request it receives. */
export interface SourceDispatch {
  source: string;
  request: string;
}

/** A capability no installed app serves, in words: the Store query of the tile that fills its Slot. */
export interface GapDispatch {
  gap: string;
}

export type DispatchEntry = SourceDispatch | GapDispatch;

export function isGap(entry: DispatchEntry): entry is GapDispatch {
  return 'gap' in entry;
}

/** The layout tree: an A2UI components list in the shell catalog, one of them `root`. */
export interface LayoutTree {
  components: A2uiComponent[];
}

export interface LayoutSurface {
  dispatch: DispatchEntry[];
  tree: LayoutTree;
  /** Literal values only — never a formula, never a ref (phase decision 8). */
  dataModel: Record<string, unknown>;
}

const treeSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['components'],
  description:
    'The layout surface: the A2UI components list an agent would put in an updateComponents, authored in the catalog you were given. One component has the id `root`. A `Slot` stands for each dispatch entry, matched by its source or its gap.',
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

/** The Planner's output schema, shown in its prompt and validated first. */
export const LAYOUT_SURFACE_SCHEMA = {
  $schema: 'https://json-schema.org/draft/2020-12/schema',
  title: 'LayoutSurface',
  description:
    'What the Planner emits, written as text and validated after: the dispatch list, the layout tree, and the data model of literals the tree binds to.',
  type: 'object',
  additionalProperties: false,
  required: ['dispatch', 'tree', 'dataModel'],
  properties: {
    dispatch: {
      type: 'array',
      description:
        'Who answers this turn. One entry per source to dispatch, each with the prose request it receives; `shell` is the merged view over two or more of the others, its request the brief for that view. One entry per capability gap, naming the capability in words. Empty when the shell answers alone.',
      items: {
        oneOf: [
          {
            type: 'object',
            additionalProperties: false,
            required: ['source', 'request'],
            properties: {
              source: {
                type: 'string',
                minLength: 1,
                description:
                  'The app id of the agent to dispatch, from the available agents — or `shell` for the merged view the shell itself authors over the other sources on the screen.',
              },
              request: {
                type: 'string',
                minLength: 1,
                description:
                  'For an agent: the message it receives and the only thing it sees, in plain language. For `shell`: the brief for the merged view — what it shows, what it compares or orders by, what matters to the user.',
              },
            },
          },
          {
            type: 'object',
            additionalProperties: false,
            required: ['gap'],
            properties: {
              gap: {
                type: 'string',
                minLength: 1,
                description:
                  'A capability the utterance needs that no installed app serves, in words — the query the Store will be searched for.',
              },
            },
          },
        ],
      },
    },
    tree: treeSchema,
    dataModel: {
      type: 'object',
      description:
        'The values the tree binds to: literals only — strings, numbers, booleans, arrays, objects. Never a formula, never a ref. Empty when the tree binds nothing.',
    },
  },
} as const;
