import type {JoinNouns, LayoutSurface} from '../src/planner/document.js';
import type {PlanInput, Planner, PlanOutcome} from '../src/planner/planner.js';
import {LAYOUT_SURFACE_TAG} from '../src/planner/prompt.js';
import {SHELL_SOURCE_ID} from '../src/registry/types.js';

/** Wraps a document the way the model is asked to answer. */
export function taggedLayout(document: LayoutSurface): string {
  return `<${LAYOUT_SURFACE_TAG}>\n${JSON.stringify(document)}\n</${LAYOUT_SURFACE_TAG}>`;
}

/**
 * Scriptable {@link Planner}: a fixed layout surface, one derived from the input (default: one
 * column, one slot per shortlisted vendor), or a thrown error. Answers as a planned outcome in one
 * attempt with no reader calls; the loop is not exercised here.
 */
export class FakePlanner implements Planner {
  calls: PlanInput[] = [];
  #make: (input: PlanInput) => LayoutSurface;

  constructor(make?: LayoutSurface | ((input: PlanInput) => LayoutSurface)) {
    this.#make =
      typeof make === 'function' ? make : make ? () => make : input => layoutFromShortlist(input);
  }

  async plan(input: PlanInput): Promise<PlanOutcome> {
    this.calls.push(input);
    const document = this.#make(input);
    return {
      kind: 'planned',
      document,
      attempts: [{text: taggedLayout(document), errors: []}],
      toolCalls: [],
    };
  }
}

/** A column of slots: one per source in order, the merged view first when briefed, a gap slot per gap. */
export function layoutFor(
  sources: readonly string[],
  options: {
    merged?: string;
    columns?: string[];
    columnSources?: (string | null)[];
    join?: JoinNouns;
    gaps?: readonly string[];
    request?: (source: string) => string;
  } = {},
): LayoutSurface {
  const request = options.request ?? ((source: string) => `Paint a compact ${source} card.`);
  const ids = [
    ...(options.merged ? ['merged'] : []),
    ...sources.map(s => `slot-${s}`),
    ...(options.gaps ?? []).map((_, i) => `gap-${i}`),
  ];
  return {
    dispatch: [
      ...sources.map(source => ({source, request: request(source)})),
      ...(options.merged
        ? [
            {
              source: SHELL_SOURCE_ID,
              request: options.merged,
              ...(options.columns ? {columns: options.columns} : {}),
              ...(options.columnSources ? {columnSources: options.columnSources} : {}),
              ...(options.join ? {join: options.join} : {}),
            },
          ]
        : []),
      ...(options.gaps ?? []).map(gap => ({gap})),
    ],
    tree: {
      components: [
        {id: 'root', component: 'Column', children: ids},
        ...(options.merged ? [{id: 'merged', component: 'Slot', source: SHELL_SOURCE_ID}] : []),
        ...sources.map(s => ({id: `slot-${s}`, component: 'Slot', source: s})),
        ...(options.gaps ?? []).map((gap, i) => ({id: `gap-${i}`, component: 'Slot', gap})),
      ],
    },
    dataModel: {},
  };
}

export function layoutFromShortlist(input: PlanInput): LayoutSurface {
  return layoutFor(
    input.shortlist.map(e => e.record.id).filter(id => id !== SHELL_SOURCE_ID),
    {request: () => `Show a compact card for: ${input.utterance}`},
  );
}

export class ThrowingPlanner implements Planner {
  #error: Error;
  constructor(error: Error) {
    this.#error = error;
  }
  async plan(): Promise<PlanOutcome> {
    throw this.#error;
  }
}

/** Both attempts refused: what the executor sees when the model never answers well. */
export class MalformedPlanner implements Planner {
  async plan(): Promise<PlanOutcome> {
    return {
      kind: 'malformed',
      attempts: [
        {text: 'I cannot.', errors: [`no <${LAYOUT_SURFACE_TAG}> block in the answer`]},
        {text: 'Still no.', errors: [`no <${LAYOUT_SURFACE_TAG}> block in the answer`]},
      ],
      toolCalls: [],
    };
  }
}
