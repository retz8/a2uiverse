/**
 * The Synthesizer (task-5.4 decisions 3–5): the text loop — extract, validate, one retry —
 * and the catalog-dependent checklist over the accepted document.
 */
import {
  CAMERA_COMPARISON,
  SYNTHESIS_EXAMPLES,
  SYNTHESIS_TAG,
  isDecline,
  type Synthesis,
} from '@a2uiverse/sdk';
import {OPERATORS, SCHEMA_CATALOG} from '@a2uiverse/shell-catalog/schema';
import {describe, expect, test} from 'vitest';
import {Partitions} from '../src/composition/partitions.js';
import {checkSynthesis} from '../src/synthesizer/checkSynthesis.js';
import {readShellCatalogFiles, synthesizerSystemPrompt} from '../src/synthesizer/prompt.js';
import {Synthesizer, type SynthesisInput} from '../src/synthesizer/synthesizer.js';
import {bestPriceView, decline, FakeSynthesizer, tagged} from './fakeSynthesizer.js';

const A = 'shop-a:list';
const B = 'shop-b:list';
const files = readShellCatalogFiles();
const operators = OPERATORS;

function partitionsOf(surfaces: Record<string, unknown>): Partitions {
  const p = new Partitions();
  const paint = (op: Record<string, unknown>) => ({
    kind: 'message' as const,
    messageId: 'm',
    role: 'agent' as const,
    parts: [{kind: 'data' as const, data: {version: 'v0.9', ...op}}],
  });
  for (const [surface, value] of Object.entries(surfaces)) {
    p.apply(paint({createSurface: {surfaceId: surface, catalogId: 'c'}}));
    p.apply(paint({updateDataModel: {surfaceId: surface, value}}));
  }
  return p;
}

const input: SynthesisInput = {
  utterance: 'compare camera prices',
  request: 'compare price per camera; best price first',
  sources: [
    {surface: A, appId: 'shop-a', displayName: 'Shop A', data: {items: [{id: 'x100', price: 899}]}},
    {surface: B, appId: 'shop-b', displayName: 'Shop B', data: {items: [{id: 'x100', price: 949}]}},
  ],
};
const partitions = () =>
  partitionsOf({
    [A]: {items: [{id: 'x100', price: 899}]},
    [B]: {items: [{id: 'x100', price: 949}]},
  });

const good = (): Synthesis => bestPriceView({system: '', prompt: '', input}) as Synthesis;

const checks = (p = partitions()) => ({catalog: SCHEMA_CATALOG, operators, partitions: p});

describe('the prompt module', () => {
  test('the catalog schema names every operator the check admits', () => {
    const declared = Object.keys((JSON.parse(files.schema) as {functions: object}).functions);
    for (const op of operators) expect(declared).toContain(op);
  });

  test('the system prompt is the sdk’s builder over the catalog schema and the guidance doc', () => {
    const prompt = synthesizerSystemPrompt(files);
    expect(prompt).toContain('## Composition:');
    expect(prompt).toContain('## UI Description:');
    expect(prompt).toContain('"DerivedValue"');
    expect(prompt).toContain(files.guidance.trim());
    expect(prompt).toContain('---BEGIN camera-comparison---');
  });
});

describe('checkSynthesis (task-5.4 decision 5)', () => {
  test('a well-formed synthesis passes', () => {
    expect(checkSynthesis(good(), checks())).toEqual([]);
  });

  test.each(SYNTHESIS_EXAMPLES)('the sdk’s example $name passes the whole checklist', example => {
    if (isDecline(example.output)) throw new Error('example is a decline');
    const p = partitionsOf(Object.fromEntries(example.sources.map(s => [s.surface, s.data])));
    expect(checkSynthesis(example.output, checks(p))).toEqual([]);
  });

  test('a component outside the shell catalog, and a prop its schema refuses, are found by the headless runtime', () => {
    const unknown = good();
    unknown.tree.components[1] = {id: 'sort', component: 'Sorter', sort: {path: '/sorts/0'}};
    expect(checkSynthesis(unknown, checks())).toEqual([
      expect.stringContaining("component 'Sorter' is not in the shell catalog"),
    ]);
    const badProp = good();
    badProp.tree.components[4] = {id: 'c-id', component: 'DerivedValue', cell: 'literal'};
    expect(checkSynthesis(badProp, checks()).join('\n')).toMatch(/\/tree: .*DerivedValue.*c-id/);
  });

  test('a child that is not declared, and a shell layout primitive, are refused', () => {
    const dangling = good();
    dangling.tree.components[3] = {
      id: 'row',
      component: 'Row',
      children: ['c-id', 'ghost', 'c-best'],
    };
    expect(checkSynthesis(dangling, checks())).toEqual([
      expect.stringContaining("names a child 'ghost'"),
    ]);
    const slot = good();
    slot.tree.components.push({id: 'x', component: 'Slot', name: 'slot-gmail'});
    slot.tree.components[0] = {id: 'root', component: 'Column', children: ['sort', 'rows', 'x']};
    expect(checkSynthesis(slot, checks()).join('\n')).toContain("'Slot' is the shell's own");
  });

  test('the derived-value rule: only DerivedValue binds a formula, through its template', () => {
    const text = good();
    text.tree.components[4] = {id: 'c-id', component: 'Text', text: {path: 'id'}};
    expect(checkSynthesis(text, checks())).toEqual([
      expect.stringContaining('Text.text binds the formula at /rows/*/id'),
    ]);
    const absolute = good();
    absolute.tree.components.push({id: 'n', component: 'Text', text: {path: '/rows/0/best'}});
    absolute.tree.components[0] = {
      id: 'root',
      component: 'Column',
      children: ['sort', 'rows', 'n'],
    };
    expect(checkSynthesis(absolute, checks())).toEqual([
      expect.stringContaining('binds the formula at /rows/0/best'),
    ]);
  });

  test('DerivedValue must bind a formula leaf, not a branch or a path outside the model', () => {
    const branch = good();
    branch.tree.components.push({id: 'b', component: 'DerivedValue', cell: {path: '/rows'}});
    branch.tree.components[0] = {id: 'root', component: 'Column', children: ['sort', 'rows', 'b']};
    expect(checkSynthesis(branch, checks())).toEqual([
      expect.stringContaining('DerivedValue.cell must bind a formula leaf; /rows is a branch'),
    ]);
    const missing = good();
    missing.tree.components[5] = {
      id: 'c-best',
      component: 'DerivedValue',
      cell: {path: 'cheapest'},
    };
    expect(checkSynthesis(missing, checks())).toEqual([
      expect.stringContaining('/rows/*/cheapest is not in the derived model'),
    ]);
  });

  test('a template must name an array; SortControl must bind a declared sort', () => {
    const notArray = good();
    notArray.tree.components[2] = {
      id: 'rows',
      component: 'Column',
      children: {path: '/rows/0', componentId: 'row'},
    };
    expect(checkSynthesis(notArray, checks()).join('\n')).toContain('must name an array');
    const noSort = {...good(), sorts: []};
    expect(checkSynthesis(noSort, checks())).toEqual([
      expect.stringContaining('SortControl must bind /sorts/N for a declared sort; 0 declared'),
    ]);
    const wrongIndex = good();
    wrongIndex.tree.components[1] = {
      id: 'sort',
      component: 'SortControl',
      sort: {path: '/sorts/3'},
    };
    expect(checkSynthesis(wrongIndex, checks()).join('\n')).toContain('1 declared');
  });

  test('an operator the shell catalog does not declare is refused, by path', () => {
    const bad = good();
    (bad.dataModel.rows as Array<{best: {op: string}}>)[0]!.best.op = 'median';
    expect(checkSynthesis(bad, checks())).toEqual([
      "/dataModel/rows/0/best: operator 'median' is not one the shell catalog declares",
    ]);
  });

  test('a ref into an unknown surface, or one that does not resolve now, is malformed — not absent', () => {
    const unknown = good();
    (unknown.dataModel.rows as Array<{id: {args: {surface: string}[]}}>)[0]!.id.args[0]!.surface =
      'shop-c:list';
    expect(checkSynthesis(unknown, checks())).toEqual([
      "/dataModel/rows/0/id/args/0: surface 'shop-c:list' is not a source of this composition",
    ]);
    const dangling = good();
    (dangling.dataModel.rows as Array<{id: {args: {pointer: string}[]}}>)[0]!.id.args[0]!.pointer =
      '/items/7/id';
    expect(checkSynthesis(dangling, checks())).toEqual([
      expect.stringContaining('shop-a:list/items/7/id does not resolve'),
    ]);
  });

  test('a predicate ref resolves through the partition', () => {
    const keyed = good();
    (keyed.dataModel.rows as Array<{id: {args: {pointer: string}[]}}>)[0]!.id.args[0]!.pointer =
      '/items[id="x100"]/id';
    expect(checkSynthesis(keyed, checks())).toEqual([]);
  });
});

describe('Synthesizer (the loop)', () => {
  const synthesizer = (model: FakeSynthesizer) =>
    new Synthesizer({model, systemPrompt: 'SYSTEM', catalog: SCHEMA_CATALOG, operators});

  test('a good first answer is accepted in one attempt; the call carried the system prompt and the turn', async () => {
    const model = new FakeSynthesizer();
    const outcome = await synthesizer(model).synthesize(input, partitions());
    expect(outcome.kind).toBe('synthesized');
    expect(outcome.attempts).toHaveLength(1);
    expect(outcome.attempts[0]!.errors).toEqual([]);
    expect(model.calls[0]!.system).toBe('SYSTEM');
    expect(model.calls[0]!.prompt).toContain('compare price per camera; best price first');
    expect(model.calls[0]!.prompt).toContain('surface: shop-b:list');
    expect(model.calls[0]!.prompt).toContain(`<${SYNTHESIS_TAG}>`);
    expect(model.calls[0]!.prompt).not.toContain('rejected');
  });

  test('a decline is accepted as its own outcome', async () => {
    const model = new FakeSynthesizer(decline('nothing joinable'));
    const outcome = await synthesizer(model).synthesize(input, partitions());
    expect(outcome).toMatchObject({kind: 'declined', reason: 'nothing joinable'});
  });

  test('a refused answer is retried once with the errors and the failed document; the fix is accepted', async () => {
    const bad = good();
    (bad.dataModel.rows as Array<{best: {op: string}}>)[0]!.best.op = 'median';
    const model = new FakeSynthesizer([bad, good()]);
    const outcome = await synthesizer(model).synthesize(input, partitions());
    expect(outcome.kind).toBe('synthesized');
    expect(outcome.attempts).toHaveLength(2);
    expect(outcome.attempts[0]!.errors).toEqual([expect.stringContaining("operator 'median'")]);
    expect(outcome.attempts[1]!.errors).toEqual([]);
    const retry = model.calls[1]!.prompt;
    expect(retry).toContain('Your previous document was rejected');
    expect(retry).toContain("- /dataModel/rows/0/best: operator 'median'");
    expect(retry).toContain('"op": "median"');
  });

  test('no tagged block, or a block that is not JSON, is an attempt with its error; two failures are malformed', async () => {
    const model = new FakeSynthesizer(['I cannot do that.', tagged('{not json')]);
    const outcome = await synthesizer(model).synthesize(input, partitions());
    expect(outcome.kind).toBe('malformed');
    expect(outcome.attempts.map(a => a.errors[0])).toEqual([
      expect.stringContaining(`no <${SYNTHESIS_TAG}> block`),
      expect.stringContaining('not valid JSON'),
    ]);
    // The retry handed back the raw text, having no document to hand.
    expect(model.calls[1]!.prompt).toContain('Your previous document:\nI cannot do that.');
    expect(model.calls).toHaveLength(2);
  });

  test('a contract violation is found by the sdk validator before the catalog checks', async () => {
    const scalar = good();
    (scalar.dataModel.rows as unknown[])[0] = {id: 'x100', best: 899};
    const model = new FakeSynthesizer([scalar, good()]);
    const outcome = await synthesizer(model).synthesize(input, partitions());
    expect(outcome.kind).toBe('synthesized');
    expect(outcome.attempts[0]!.errors.join('\n')).toMatch(/rows\/0/);
  });

  test('a re-synthesis carries the previous document and the change account, and no retry framing', async () => {
    const model = new FakeSynthesizer();
    const previous = good();
    await synthesizer(model).synthesize(
      {
        ...input,
        previous,
        changes: {stale: {[A]: [{surface: A, pointer: '/items/0/price'}]}, absent: []},
      },
      partitions(),
    );
    const prompt = model.calls[0]!.prompt;
    expect(prompt).toContain('The user is looking at your previous view');
    expect(prompt).toContain('- shop-a:list changed under these refs');
    expect(prompt).toContain('"path": "/rows"');
    expect(prompt).not.toContain('rejected');
    expect(model.calls[0]!.input.previous).toBe(previous);
  });

  test('the sdk’s worked example is accepted verbatim over sources of its shapes', async () => {
    const example = CAMERA_COMPARISON;
    const model = new FakeSynthesizer(example.output);
    const p = partitionsOf(Object.fromEntries(example.sources.map(s => [s.surface, s.data])));
    const outcome = await synthesizer(model).synthesize(
      {utterance: example.intent, request: example.request, sources: example.sources},
      p,
    );
    expect(outcome.kind).toBe('synthesized');
  });
});
