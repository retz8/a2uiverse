import type {SynthesizerOutput} from '@a2uiverse/sdk';
import type {SynthesisInput, Synthesizer} from '../src/synthesizer/synthesizer.js';

/** Scriptable {@link Synthesizer}: a fixed output, one derived from the input, or a thrown error. */
export class FakeSynthesizer implements Synthesizer {
  calls: SynthesisInput[] = [];
  #make: (input: SynthesisInput) => SynthesizerOutput;

  constructor(make?: SynthesizerOutput | ((input: SynthesisInput) => SynthesizerOutput)) {
    this.#make =
      typeof make === 'function' ? make : make ? () => make : input => bestPriceWiring(input);
  }

  async synthesize(input: SynthesisInput): Promise<SynthesizerOutput> {
    this.calls.push(input);
    return this.#make(input);
  }
}

/** One entity per index of the first source's `/items`, best price across every source at that index. */
export function bestPriceWiring(input: SynthesisInput): SynthesizerOutput {
  const first = input.sources[0];
  const items = ((first?.data as {items?: unknown[]} | undefined)?.items ?? []) as unknown[];
  return {
    declined: false,
    fields: [
      {name: 'product', label: 'Product'},
      {name: 'best', label: 'Best price'},
    ],
    entities: items.map((_, i) => ({
      cells: [
        {op: 'value', args: [{surface: first!.surface, pointer: `/items/${i}/id`}]},
        {
          op: 'min',
          args: input.sources.map(s => ({surface: s.surface, pointer: `/items/${i}/price`})),
        },
      ],
    })),
    sort: {field: 'best', direction: 'asc'},
  };
}

export class ThrowingSynthesizer implements Synthesizer {
  #error: Error;
  constructor(error: Error) {
    this.#error = error;
  }
  async synthesize(): Promise<SynthesizerOutput> {
    throw this.#error;
  }
}
