/**
 * The Synthesizer (task-5.4 decisions 3–5, task-6.3 decision 9): the text loop — extract,
 * validate, one retry — and the one validator over the document.
 */
import {createA2uiValidator} from '@a2uiverse/sdk';
import {OPERATORS, RELATIONS} from '@a2uiverse/shell-catalog/schema';
import {describe, expect, test} from 'vitest';
import {Partitions} from '../src/composition/partitions.js';
import {isDecline, type Synthesis} from '../src/synthesizer/document.js';
import {CAMERA_COMPARISON, SYNTHESIS_EXAMPLES} from '../src/synthesizer/examples.js';
import {readSynthesizerFiles, SYNTHESIS_TAG} from '../src/synthesizer/prompt.js';
import {Synthesizer, type SynthesisInput} from '../src/synthesizer/synthesizer.js';
import {validateSynthesis} from '../src/synthesizer/validate.js';
import {bestPriceView, decline, FakeSynthesizer, tagged} from './fakeSynthesizer.js';

const A = 'shop-a:list';
const B = 'shop-b:list';
const files = readSynthesizerFiles();
const functions = Object.keys(files.catalog.functions!);
const relations = functions.filter(name => (RELATIONS as readonly string[]).includes(name));
const operators = functions.filter(name => !relations.includes(name));
const tree = createA2uiValidator({catalog: files.catalog});

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

const checks = (p = partitions()) => ({tree, operators, relations, partitions: p});

/** The validator's findings on a document; empty when it is accepted. */
const checkSynthesis = (document: unknown, c = checks()): string[] => {
  const result = validateSynthesis(document, c);
  return result.ok ? [] : result.errors;
};

const clone = <T>(value: T): T => structuredClone(value);

describe('the Synthesizer’s catalog', () => {
  test('its functions are exactly the formula operators and the relations', () => {
    expect([...operators].sort()).toEqual([...OPERATORS].sort());
    expect([...relations].sort()).toEqual([...RELATIONS].sort());
  });
});

describe('validateSynthesis (task-6.3 decision 9)', () => {
  test('a well-formed synthesis passes', () => {
    expect(checkSynthesis(good())).toEqual([]);
  });

  test.each(SYNTHESIS_EXAMPLES)('the worked example $name passes the whole validator', example => {
    if (isDecline(example.output)) throw new Error('example is a decline');
    const p = partitionsOf(Object.fromEntries(example.sources.map(s => [s.surface, s.data])));
    expect(checkSynthesis(example.output, checks(p))).toEqual([]);
  });

  test('a decline is accepted; one without a reason, or carrying anything else, is refused', () => {
    expect(validateSynthesis({declined: true, reason: 'nothing joinable'}, checks())).toEqual({
      ok: true,
      document: {declined: true, reason: 'nothing joinable'},
    });
    expect(checkSynthesis({declined: true, reason: ''})).not.toEqual([]);
    expect(checkSynthesis({declined: true, reason: 'x', note: ''})).not.toEqual([]);
  });

  test('the output schema comes first: a synthesis missing a part or carrying an extra key', () => {
    const {note: _note, ...noNote} = good();
    void _note;
    expect(checkSynthesis(noNote)).not.toEqual([]);
    expect(checkSynthesis({...good(), extra: 1})).not.toEqual([]);
  });

  test('a scalar leaf and a malformed pointer are refused, by path', () => {
    const scalar = good();
    (scalar.dataModel.rows as unknown[])[0] = {id: 'x100', best: 899};
    expect(checkSynthesis(scalar).join('\n')).toMatch(/\/dataModel\/rows\/0/);
    const pointer = good();
    (pointer.dataModel.rows as Array<{id: {args: {pointer: string}[]}}>)[0]!.id.args[0]!.pointer =
      '/items[id=x100]/id';
    expect(checkSynthesis(pointer).join('\n')).toContain('/items[id=x100]/id');
  });

  test('a component outside the Synthesizer’s catalog, and a prop its schema refuses, are found by the A2UI validator', () => {
    const unknown = good();
    unknown.tree.components[1] = {id: 'sort', component: 'Sorter', sort: {path: '/sorts/0'}};
    expect(checkSynthesis(unknown)).toEqual([
      '/tree/components/1/component (sort): Unknown component type: "Sorter"',
    ]);
    const badProp = good();
    badProp.tree.components[4] = {id: 'c-id', component: 'DerivedValue', cell: 'literal'};
    expect(checkSynthesis(badProp).join('\n')).toMatch(/^\/tree\/components\/4\/cell \(c-id\): /m);
  });

  test('a child that is not declared, a missing root, and a shell layout primitive are refused', () => {
    const dangling = good();
    dangling.tree.components[3] = {
      id: 'row',
      component: 'Row',
      children: ['c-id', 'ghost', 'c-best'],
    };
    expect(checkSynthesis(dangling)).toEqual([
      "/tree (row): Component 'row' references non-existent component 'ghost' in field 'children'",
    ]);
    const noRoot = good();
    noRoot.tree.components[0] = {...noRoot.tree.components[0]!, id: 'top'};
    expect(checkSynthesis(noRoot).join('\n')).toContain('Missing root component');
    for (const name of ['Slot', 'Attribution', 'Frame']) {
      const primitive = clone(good());
      primitive.tree.components.push({id: 'x', component: name, source: 'gmail'});
      primitive.tree.components[0] = {
        id: 'root',
        component: 'Column',
        children: ['sort', 'rows', 'x'],
      };
      expect(checkSynthesis(primitive)).toContain(
        `/tree/components/6/component (x): Unknown component type: "${name}"`,
      );
    }
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

  describe('relations live only in match (task-7.5 decision 5)', () => {
    const ref = (surface: string) => ({surface, pointer: '/items[id="x100"]/id'});
    const claimed = (op: string) => {
      const doc = good();
      (doc.dataModel.rows as Array<Record<string, unknown>>)[0]!.match = {
        'same camera': {op, args: [ref(A), ref(B)]},
      };
      return doc;
    };

    test('a match claim written in relations passes', () => {
      for (const relation of RELATIONS) expect(checkSynthesis(claimed(relation))).toEqual([]);
    });

    test('an operator inside a match claim is refused, by path', () => {
      expect(checkSynthesis(claimed('min'))).toEqual([
        "/dataModel/rows/0/match/same camera: 'min' is not a relation; a match claim is written in the relations equal, contains and judged",
      ]);
    });

    test('a relation outside a match claim is refused, by path', () => {
      const bad = good();
      (bad.dataModel.rows as Array<{best: {op: string}}>)[0]!.best.op = 'equal';
      expect(checkSynthesis(bad)).toEqual([
        "/dataModel/rows/0/best: 'equal' is a relation; a relation is written only inside match",
      ]);
    });
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
      '/items[id="gone"]/id';
    expect(checkSynthesis(dangling, checks())).toEqual([
      expect.stringContaining('shop-a:list/items[id="gone"]/id does not resolve'),
    ]);
  });

  test('a positional ref is refused by the rule it broke, not as missing data', () => {
    // The data is at that position; saying "does not resolve" would send the retry hunting for
    // a data problem instead of rewriting the pointer (task-5.10 decision 8).
    const positional = good();
    (
      positional.dataModel.rows as Array<{id: {args: {pointer: string}[]}}>
    )[0]!.id.args[0]!.pointer = '/items/0/id';
    const errors = checkSynthesis(positional, checks());
    expect(errors).toEqual([expect.stringContaining('selects an array element by position')]);
    expect(errors[0]).toContain('elements are selected by key');
  });

  test('a predicate matching several elements asks for more fields', () => {
    const p = partitionsOf({
      [A]: {
        items: [
          {id: 'dup', price: 1},
          {id: 'dup', price: 2},
        ],
      },
      [B]: {items: [{id: 'dup', price: 3}]},
    });
    const ambiguous = good();
    for (const row of ambiguous.dataModel.rows as Array<
      Record<string, {args: {surface: string; pointer: string}[]}>
    >) {
      for (const formula of Object.values(row)) {
        for (const ref of formula.args) ref.pointer = '/items[id="dup"]/price';
      }
    }
    expect(checkSynthesis(ambiguous, checks(p))[0]).toContain('matches more than one element');
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
    new Synthesizer({model, systemPrompt: 'SYSTEM', catalog: files.catalog});

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

  test('a contract violation is found and handed back like any other finding', async () => {
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
        changes: {absent: [{surface: A, pointer: '/items[id="x100"]/price'}]},
      },
      partitions(),
    );
    const prompt = model.calls[0]!.prompt;
    expect(prompt).toContain('The user is looking at your previous view');
    expect(prompt).toContain('- these refs no longer resolve:');
    expect(prompt).toContain('shop-a:list/items[id="x100"]/price');
    expect(prompt).toContain('"path": "/rows"');
    expect(prompt).not.toContain('rejected');
    expect(model.calls[0]!.input.previous).toBe(previous);
  });

  test('the worked example is accepted verbatim over sources of its shapes', async () => {
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
