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
  /** `shell` only: the merged view's column headers, in order, shown in its reserved slot from plan time. */
  columns?: string[];
  /**
   * `shell` only, required beside `columns` (task-8.3 decision 12): per column, the dispatched
   * source whose values it shows, or null for a column of no single source.
   */
  columnSources?: (string | null)[];
  /** `shell` only, when the merge is over an entity: the join hypothesis's nouns, for the progress line. */
  join?: JoinNouns;
}

/**
 * The entity as each source calls it. Anchored: `home` is the source whose instances are the rows.
 * Union (task-8.7 decision 30): `home` is null and `entity` names the thing — the rows are every
 * instance any source lists, entries of the same thing merged into one row.
 */
export interface JoinNouns {
  home: string | null;
  entity?: string;
  nouns: Record<string, string>;
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
              columns: {
                type: 'array',
                minItems: 1,
                items: {type: 'string', minLength: 1},
                description:
                  '`shell` only, when the merged view is a table of one row per thing: its column headers in order, short, as the user reads them. Shown in the reserved slot until the view lands, and handed to the merge as its starting point.',
              },
              columnSources: {
                type: 'array',
                minItems: 1,
                items: {type: ['string', 'null']},
                description:
                  '`shell` only, required whenever `columns` is written, one entry per column in the same order: the app id of the dispatched agent whose values the column shows, or null for a column that shows no single agent’s values. A column marked to an agent that has not answered stays in the view, marked as waiting for it.',
              },
              join: {
                type: 'object',
                additionalProperties: false,
                required: ['home', 'nouns'],
                description:
                  '`shell` only, when the brief states a join hypothesis: its kind and the entity as each source calls it, for the line that says what is being joined.',
                properties: {
                  home: {
                    type: ['string', 'null'],
                    minLength: 1,
                    description:
                      'Anchored: the home source, the app id whose instances are the rows. Union: null — the rows are every instance any agent lists, the same thing across agents merged into one row.',
                  },
                  entity: {
                    type: 'string',
                    minLength: 1,
                    description:
                      'Union only, required when `home` is null: the plural noun for the thing the rows are, as the user says it — e.g. `cameras`.',
                  },
                  nouns: {
                    type: 'object',
                    additionalProperties: {type: 'string', minLength: 1},
                    description:
                      'Per dispatched agent, by app id, the plural noun for its entries as the user says it — e.g. `issues`, `PRs`, `runs`.',
                  },
                },
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
