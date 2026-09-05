/** The prompt builder (task-5.4 decisions 1–4): assembly order, the turn's slots, the tag's reader. */
import {readFileSync} from 'node:fs';
import {describe, expect, test} from 'vitest';
import {validateSynthesizeDataModel} from '../validate';
import {isDecline} from '../synthesis';
import {refsOf} from '../walk';
import {resolvePointer} from '../pointer';
import {COMPOSITION_DOC} from './composition.doc.generated';
import {CAMERA_COMPARISON, SYNTHESIS_EXAMPLES, TODAY_TIMELINE} from './examples';
import {
  buildSynthesisSystemPrompt,
  buildSynthesisTurn,
  DEFAULT_SYNTHESIS_ROLE,
  extractSynthesisBlock,
  SYNTHESIS_TAG,
} from './prompt';

const system = () =>
  buildSynthesisSystemPrompt({
    catalogSchema: '{"components": {"Text": {}}}',
    uiGuidance: '# Guidance\nBind every formula to DerivedValue.',
  });

describe('the composition doc', () => {
  test('is the checked-in markdown, embedded', () => {
    const markdown = readFileSync(new URL('../../../docs/composition.md', import.meta.url), 'utf8');
    expect(COMPOSITION_DOC).toBe(markdown);
  });

  test('names the tag the extractor reads', () => {
    expect(COMPOSITION_DOC).toContain(`<${SYNTHESIS_TAG}>`);
  });
});

describe('the system prompt', () => {
  test('is five parts in the kit’s order: role · composition · UI description · schemas · examples', () => {
    const prompt = system();
    const at = (s: string) => {
      const i = prompt.indexOf(s);
      expect(i, s).toBeGreaterThanOrEqual(0);
      return i;
    };
    const order = [
      at(DEFAULT_SYNTHESIS_ROLE),
      at('## Composition:'),
      at('## UI Description:'),
      at('### Catalog Schema:'),
      at('### Output Schema:'),
      at('### Examples:'),
    ];
    expect([...order].sort((a, b) => a - b)).toEqual(order);
  });

  test('carries the inputs verbatim and the contract’s output schema', () => {
    const prompt = system();
    expect(prompt).toContain('{"components": {"Text": {}}}');
    expect(prompt).toContain('Bind every formula to DerivedValue.');
    expect(prompt).toContain('"title": "SynthesizeDataModel"');
    expect(prompt).toContain(COMPOSITION_DOC.trim());
  });

  test('the role has a default and is overridable', () => {
    expect(system().startsWith(DEFAULT_SYNTHESIS_ROLE)).toBe(true);
    const custom = buildSynthesisSystemPrompt({
      role: 'You merge.',
      catalogSchema: '{}',
      uiGuidance: '',
    });
    expect(custom.startsWith('You merge.')).toBe(true);
    expect(custom).not.toContain(DEFAULT_SYNTHESIS_ROLE);
  });

  test('renders every example under a BEGIN/END fence with its intent, request, sources and output', () => {
    const prompt = system();
    for (const example of SYNTHESIS_EXAMPLES) {
      expect(prompt).toContain(`---BEGIN ${example.name}---`);
      expect(prompt).toContain(`---END ${example.name}---`);
      expect(prompt).toContain(example.intent);
      expect(prompt).toContain(example.request);
    }
    expect(prompt).toContain('"surface": "shop-a:list"');
    expect(prompt).toContain('"op": "min"');
  });

  test('examples are overridable, and none renders no section', () => {
    const none = buildSynthesisSystemPrompt({catalogSchema: '{}', uiGuidance: '', examples: []});
    expect(none).not.toContain('### Examples:');
  });
});

describe('the worked examples', () => {
  test.each(SYNTHESIS_EXAMPLES)('$name validates against the contract', example => {
    const result = validateSynthesizeDataModel(example.output);
    expect(result).toEqual({ok: true, value: example.output});
  });

  test.each(SYNTHESIS_EXAMPLES)('$name’s every ref resolves in its own sources', example => {
    if (isDecline(example.output)) return;
    const bySurface = new Map(example.sources.map(s => [s.surface, s.data]));
    for (const ref of refsOf(example.output.dataModel)) {
      const data = bySurface.get(ref.surface);
      expect(data, ref.surface).toBeDefined();
      expect(resolvePointer(data, ref.pointer).found, `${ref.surface}${ref.pointer}`).toBe(true);
    }
  });

  test('the comparison joins by key across two shapes; the timeline spans three unrelated models', () => {
    if (isDecline(CAMERA_COMPARISON.output) || isDecline(TODAY_TIMELINE.output)) throw new Error();
    const comparisonRefs = refsOf(CAMERA_COMPARISON.output.dataModel);
    expect(comparisonRefs.every(r => r.pointer.includes('['))).toBe(true);
    expect(new Set(comparisonRefs.map(r => r.surface)).size).toBe(2);
    const timelineRefs = refsOf(TODAY_TIMELINE.output.dataModel);
    expect(new Set(timelineRefs.map(r => r.surface)).size).toBe(3);
    expect(TODAY_TIMELINE.output.sorts[0]!.key).toBe('/when');
  });
});

describe('the turn', () => {
  const base = {
    utterance: 'compare camera prices',
    request: 'compare price per camera; best price first',
    sources: [
      {surface: 'shop-a:list', appId: 'shop-a', displayName: 'Shop A', data: {items: [{id: 'x'}]}},
      {surface: 'shop-b:list', appId: 'shop-b', displayName: 'Shop B', data: {products: []}},
    ],
  };

  test('a fresh call carries the utterance, the request, every source by surface and display name, and the tag', () => {
    const turn = buildSynthesisTurn(base);
    expect(turn).toContain('compare camera prices');
    expect(turn).toContain('compare price per camera; best price first');
    expect(turn).toContain('surface: shop-a:list');
    expect(turn).toContain('Shop B (shop-b)');
    expect(turn).toContain('"id": "x"');
    expect(turn).toContain(`<${SYNTHESIS_TAG}>`);
    expect(turn).not.toContain('previous document');
    expect(turn).not.toContain('What broke');
  });

  test('a retry carries the errors, one per line, and the failed document to fix', () => {
    const turn = buildSynthesisTurn({
      ...base,
      previous: '{"tree": 1}',
      errors: ['/tree: must be object', '/dataModel: a leaf must be a formula'],
    });
    expect(turn).toContain('- /tree: must be object');
    expect(turn).toContain('- /dataModel: a leaf must be a formula');
    expect(turn).toContain('Your previous document:\n{"tree": 1}');
    expect(turn).toContain('do not start over');
  });

  test('a re-synthesis carries the previous document and the change account, stale refs by surface', () => {
    const turn = buildSynthesisTurn({
      ...base,
      previous: {declined: true, reason: 'x'},
      changes: {
        stale: {'shop-a:list': [{surface: 'shop-a:list', pointer: '/items/0/price'}]},
        absent: [{surface: 'shop-b:list', pointer: '/products[sku="gone"]/price'}],
      },
    });
    expect(turn).toContain('The user is looking at your previous view');
    expect(turn).toContain('- shop-a:list changed under these refs');
    expect(turn).toContain('  - /items/0/price');
    expect(turn).toContain('  - shop-b:list/products[sku="gone"]/price');
    expect(turn).toContain('"declined": true');
    expect(turn).not.toContain('rejected');
  });
});

describe('extractSynthesisBlock', () => {
  const doc = '{"declined": true, "reason": "r"}';

  test('reads the one block, trimmed, tolerating prose around it', () => {
    const text = `Here you go.\n<${SYNTHESIS_TAG}>\n${doc}\n</${SYNTHESIS_TAG}>\nDone.`;
    expect(extractSynthesisBlock(text)).toEqual({ok: true, json: doc});
  });

  test('no block, an unclosed block, an empty block and two blocks are each an error', () => {
    expect(extractSynthesisBlock(doc).ok).toBe(false);
    expect(extractSynthesisBlock(`<${SYNTHESIS_TAG}>${doc}`).ok).toBe(false);
    expect(extractSynthesisBlock(`<${SYNTHESIS_TAG}>  </${SYNTHESIS_TAG}>`).ok).toBe(false);
    const twice = `<${SYNTHESIS_TAG}>${doc}</${SYNTHESIS_TAG}><${SYNTHESIS_TAG}>${doc}</${SYNTHESIS_TAG}>`;
    expect(extractSynthesisBlock(twice)).toMatchObject({
      ok: false,
      error: expect.stringContaining('one'),
    });
  });

  test('never takes an a2ui-json block', () => {
    expect(extractSynthesisBlock(`<a2ui-json>[]</a2ui-json>`).ok).toBe(false);
  });
});
