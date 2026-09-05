import {SYNTHESIS_TAG, type Synthesis, type SynthesizeDataModel} from '@a2uiverse/sdk';
import type {SynthesisCall, SynthesisModel} from '../src/synthesizer/synthesizer.js';

/** Wraps a document — or raw text — the way the model is asked to answer. */
export function tagged(document: SynthesizeDataModel | string): string {
  const body = typeof document === 'string' ? document : JSON.stringify(document);
  return `<${SYNTHESIS_TAG}>\n${body}\n</${SYNTHESIS_TAG}>`;
}

type Answer = SynthesizeDataModel | string;

/**
 * Scriptable {@link SynthesisModel}, the text seam: emits a synthesize data model (tagged for
 * the loop to extract) per call — a fixed one, one derived from the call, a sequence of them,
 * or raw text for the malformed cases. The loop around it is the real one.
 */
export class FakeSynthesizer implements SynthesisModel {
  calls: SynthesisCall[] = [];
  #answers: Array<(call: SynthesisCall) => Answer>;

  constructor(
    make?:
      | Answer
      | ((call: SynthesisCall) => Answer)
      | Array<Answer | ((call: SynthesisCall) => Answer)>,
  ) {
    const list = make === undefined ? [bestPriceView] : Array.isArray(make) ? make : [make];
    this.#answers = list.map(item => (typeof item === 'function' ? item : () => item));
  }

  async generate(call: SynthesisCall): Promise<string> {
    this.calls.push(call);
    const make = this.#answers[Math.min(this.calls.length - 1, this.#answers.length - 1)]!;
    const answer = make(call);
    return typeof answer === 'string' && !answer.trimStart().startsWith('{')
      ? answer
      : tagged(answer);
  }
}

/**
 * The merged view a good model writes over storefronts: one row per item of the first source's
 * `/items`, keyed by the item's id, with the best price across every source for that id; sorted
 * by best price. Refs are keyed, never positional (task-5.10 decision 1).
 */
export function bestPriceView(call: SynthesisCall): Synthesis {
  const {sources} = call.input;
  const first = sources[0]!;
  const items = ((first.data as {items?: unknown[]} | undefined)?.items ?? []) as unknown[];
  return {
    tree: {
      components: [
        {id: 'root', component: 'Column', children: ['sort', 'rows']},
        {id: 'sort', component: 'SortControl', sort: {path: '/sorts/0'}},
        {id: 'rows', component: 'Column', children: {path: '/rows', componentId: 'row'}},
        {id: 'row', component: 'Row', children: ['c-id', 'c-best']},
        {id: 'c-id', component: 'DerivedValue', cell: {path: 'id'}},
        {id: 'c-best', component: 'DerivedValue', cell: {path: 'best'}, format: {kind: 'number'}},
      ],
    },
    dataModel: {
      rows: items.map(item => {
        const id = (item as {id: string}).id;
        const at = `/items[id=${JSON.stringify(id)}]`;
        return {
          id: {op: 'value', args: [{surface: first.surface, pointer: `${at}/id`}]},
          best: {
            op: 'min',
            args: sources.map(s => ({surface: s.surface, pointer: `${at}/price`})),
          },
        };
      }),
    },
    sorts: [
      {
        path: '/rows',
        options: [
          {key: '/best', label: 'Best price'},
          {key: '/id', label: 'Product'},
        ],
        key: '/best',
        direction: 'asc',
      },
    ],
    note: '',
  };
}

export class ThrowingSynthesizer implements SynthesisModel {
  #error: Error;
  constructor(error: Error) {
    this.#error = error;
  }
  async generate(): Promise<string> {
    throw this.#error;
  }
}

export function decline(reason: string): SynthesizeDataModel {
  return {declined: true, reason};
}
