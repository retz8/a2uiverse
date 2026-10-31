import type {Synthesis, SynthesizeDataModel} from '../src/synthesizer/document.js';
import {isDecline} from '../src/synthesizer/document.js';
import {SYNTHESIS_TAG} from '../src/synthesizer/prompt.js';
import type {
  SynthesisAnswer,
  SynthesisCall,
  SynthesisModel,
} from '../src/synthesizer/synthesizer.js';

/** Wraps a document — or raw text — the way the model is asked to answer. */
export function tagged(document: SynthesizeDataModel | string): string {
  const body = typeof document === 'string' ? document : JSON.stringify(document);
  return `<${SYNTHESIS_TAG}>\n${body}\n</${SYNTHESIS_TAG}>`;
}

type Answer = SynthesizeDataModel | string;

/**
 * Scriptable {@link SynthesisModel}, the text seam: emits a synthesize data model (tagged for
 * the loop to extract) per call — a fixed one, one derived from the call, a sequence of them,
 * or raw text for the malformed cases. The loop around it is the real one. It writes nothing as
 * it goes: the answer arrives whole, as a model that tells nothing does.
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

  /** The call recorded, its scripted answer. */
  protected answer(call: SynthesisCall): Answer {
    this.calls.push(call);
    const make = this.#answers[Math.min(this.calls.length - 1, this.#answers.length - 1)]!;
    return make(call);
  }

  async generate(call: SynthesisCall): Promise<SynthesisAnswer> {
    return {text: textOf(this.answer(call))};
  }
}

/** The answer as the model's text: raw text as it is, a document tagged. */
function textOf(answer: Answer): string {
  return typeof answer === 'string' && !answer.trimStart().startsWith('{')
    ? answer
    : tagged(answer);
}

/** A synthesis's members, in the order the model is asked to write them (task-17.10 decision 2). */
export type SynthesisMember = 'tree' | 'sorts' | 'dataModel' | 'note';

export const ANSWER_ORDER: readonly SynthesisMember[] = ['tree', 'sorts', 'dataModel', 'note'];

/**
 * A synthesis's block in the pieces a model streams it in: the members in `order`, the data
 * model's lists — `lists`, every array at its root by default — one row per piece, the close.
 */
export function synthesisPieces(
  document: Synthesis,
  options: {order?: readonly SynthesisMember[]; lists?: readonly string[]} = {},
): string[] {
  const order = options.order ?? ANSWER_ORDER;
  const lists =
    options.lists ??
    Object.keys(document.dataModel).filter(key => Array.isArray(document.dataModel[key]));
  const pieces: string[] = [];
  order.forEach((key, i) => {
    const lead = i === 0 ? `<${SYNTHESIS_TAG}>\n{` : ', ';
    if (key !== 'dataModel') {
      pieces.push(`${lead}${JSON.stringify(key)}: ${JSON.stringify(document[key])}`);
      return;
    }
    pieces.push(`${lead}"dataModel": {`);
    Object.entries(document.dataModel).forEach(([member, value], m) => {
      const sep = m === 0 ? '' : ', ';
      if (!lists.includes(member) || !Array.isArray(value)) {
        pieces.push(`${sep}${JSON.stringify(member)}: ${JSON.stringify(value)}`);
        return;
      }
      pieces.push(`${sep}${JSON.stringify(member)}: [`);
      value.forEach((row, r) => pieces.push(`${r === 0 ? '' : ', '}${JSON.stringify(row)}`));
      pieces.push(']');
    });
    pieces.push('}');
  });
  pieces.push(`}\n</${SYNTHESIS_TAG}>`);
  return pieces;
}

export interface StreamingOptions {
  order?: readonly SynthesisMember[];
  lists?: readonly string[];
  /** Awaited before the piece is written, when given: where a test looks at the half-drawn view. */
  hold?: (piece: number, text: string) => Promise<void> | undefined;
  /** The call ends with this error once the piece is written. */
  throwAfter?: {piece: number; error: Error};
}

/**
 * A {@link FakeSynthesizer} writing its answer as a model streams it (task 17.10): a synthesis in
 * {@link synthesisPieces} through the call's `onText`, a decline or raw text in one piece, `hold`
 * awaited before each piece when the test gives one; the whole text returned at the end as the
 * seam has it. `throwAfter` ends the call with that error once the piece is written.
 */
export class StreamingSynthesizer extends FakeSynthesizer {
  readonly #options: StreamingOptions;

  constructor(
    make?: ConstructorParameters<typeof FakeSynthesizer>[0],
    options: StreamingOptions = {},
  ) {
    super(make);
    this.#options = options;
  }

  override async generate(call: SynthesisCall): Promise<SynthesisAnswer> {
    const answer = this.answer(call);
    const text = textOf(answer);
    if (call.onText) {
      const pieces =
        typeof answer === 'string' || isDecline(answer)
          ? [text]
          : synthesisPieces(answer, this.#options);
      for (const [i, piece] of pieces.entries()) {
        call.signal?.throwIfAborted();
        // A held call aborted meanwhile rejects at once, the way the model's does.
        const held = this.#options.hold?.(i, piece);
        if (held) await Promise.race([held, abortion(call.signal)]);
        call.onText(piece);
        if (this.#options.throwAfter?.piece === i) throw this.#options.throwAfter.error;
      }
    }
    return {text};
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

/**
 * A {@link FakeSynthesizer} whose Nth call answers only once the Nth gate opens — a call with no
 * gate answers at once. An aborted call rejects the way the model's does.
 */
export class HeldSynthesizer extends FakeSynthesizer {
  #gates: Array<Promise<void> | undefined>;

  constructor(
    gates: Array<Promise<void> | undefined>,
    make?: ConstructorParameters<typeof FakeSynthesizer>[0],
  ) {
    super(make);
    this.#gates = gates;
  }

  override async generate(call: SynthesisCall): Promise<SynthesisAnswer> {
    const gate = this.#gates[this.calls.length];
    const answer = super.generate(call);
    if (gate) await Promise.race([gate, abortion(call.signal)]);
    return answer;
  }
}

function abortion(signal: AbortSignal | undefined): Promise<never> {
  return new Promise((_, reject) => {
    if (signal?.aborted) return reject(signal.reason);
    signal?.addEventListener('abort', () => reject(signal.reason), {once: true});
  });
}

export class ThrowingSynthesizer implements SynthesisModel {
  #error: Error;
  constructor(error: Error) {
    this.#error = error;
  }
  async generate(): Promise<SynthesisAnswer> {
    throw this.#error;
  }
}

export function decline(reason: string): SynthesizeDataModel {
  return {declined: true, reason};
}
