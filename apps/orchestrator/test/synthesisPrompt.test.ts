/** The Synthesizer's prompt (task-5.4 decisions 1–4, task-6.3 decision 8): assembly, the worked examples, the turn. */
import {readFileSync} from 'node:fs';
import {refsOf} from '@a2uiverse/sdk';
import {SYNTHESIS_SURFACE_KEEP_SET} from '@a2uiverse/shell-catalog/schema';
import {describe, expect, test} from 'vitest';
import {isDecline} from '../src/synthesizer/document.js';
import {
  CAMERA_COMPARISON,
  SYNTHESIS_EXAMPLES,
  TODAY_TIMELINE,
} from '../src/synthesizer/examples.js';
import {
  buildSynthesisTurn,
  readSynthesizerFiles,
  SYNTHESIS_TAG,
  SYNTHESIZER_ROLE,
  synthesizerSystemPrompt,
} from '../src/synthesizer/prompt.js';

const files = readSynthesizerFiles();

describe('the files read at boot', () => {
  test('the rules doc is synthesis.md, beside the Synthesizer, and names the tag the extractor reads', () => {
    const markdown = readFileSync(
      new URL('../src/synthesizer/synthesis.md', import.meta.url),
      'utf8',
    );
    expect(files.rules).toBe(markdown);
    expect(files.rules).toContain(`<${SYNTHESIS_TAG}>`);
  });

  test('the catalog is the shell catalog pruned to the synthesis surface’s keep-set', () => {
    expect(Object.keys(files.catalog.components!).sort()).toEqual(
      [...SYNTHESIS_SURFACE_KEEP_SET.components].sort(),
    );
    expect(Object.keys(files.catalog.functions!).sort()).toEqual(
      [...SYNTHESIS_SURFACE_KEEP_SET.functions].sort(),
    );
  });
});

describe('the system prompt', () => {
  const prompt = synthesizerSystemPrompt(files);

  test('is five parts in the kit’s order: role · composition · UI description · schemas · examples', () => {
    const at = (s: string) => {
      const i = prompt.indexOf(s);
      expect(i, s).toBeGreaterThanOrEqual(0);
      return i;
    };
    const order = [
      at(SYNTHESIZER_ROLE),
      at('## Composition:'),
      at('## UI Description:'),
      at('### Catalog Schema:'),
      at('### Output Schema:'),
      at('### Examples:'),
    ];
    expect([...order].sort((a, b) => a - b)).toEqual(order);
    expect(prompt.startsWith(SYNTHESIZER_ROLE)).toBe(true);
  });

  test('carries the rules and the guidance verbatim, the pruned catalog, and the output schema', () => {
    expect(prompt).toContain(files.rules.trim());
    expect(prompt).toContain(files.guidance.trim());
    expect(prompt).toContain(JSON.stringify(files.catalog, null, 2));
    expect(prompt).toContain('"title": "SynthesizeDataModel"');
  });

  test('shows no component or function outside the keep-set', () => {
    const catalog = prompt.slice(
      prompt.indexOf('### Catalog Schema:'),
      prompt.indexOf('### Output Schema:'),
    );
    for (const name of ['Slot', 'Attribution', 'Frame', 'Button', 'TextField']) {
      expect(catalog).not.toContain(`"${name}": {`);
    }
    expect(catalog).not.toContain('"openStore"');
    expect(catalog).toContain('"DerivedValue": {');
  });

  test('renders every example under a BEGIN/END fence with its intent, request, sources and output', () => {
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
    expect(synthesizerSystemPrompt(files, [])).not.toContain('### Examples:');
  });
});

describe('the worked examples', () => {
  test('the comparison joins by key across two shapes', () => {
    if (isDecline(CAMERA_COMPARISON.output)) throw new Error();
    const comparisonRefs = refsOf(CAMERA_COMPARISON.output.dataModel);
    expect(comparisonRefs.every(r => r.pointer.includes('['))).toBe(true);
    expect(new Set(comparisonRefs.map(r => r.surface)).size).toBe(2);
  });

  test('the timeline spans three unrelated models, orders the two that share the axis, and groups the one that cannot (task-5.11 decision 5)', () => {
    if (isDecline(TODAY_TIMELINE.output)) throw new Error();
    const {dataModel, sorts} = TODAY_TIMELINE.output;
    expect(new Set(refsOf(dataModel).map(r => r.surface)).size).toBe(3);
    const ordered = refsOf({timeline: dataModel.timeline!});
    const grouped = refsOf({calendar: dataModel.calendar!});
    expect(new Set(ordered.map(r => r.surface))).toEqual(
      new Set(['gmail:needs-attention', 'github:prs-needing-attention']),
    );
    expect(new Set(grouped.map(r => r.surface))).toEqual(
      new Set(['calendar:needs-attention-today']),
    );
    expect(sorts).toHaveLength(1);
    expect(sorts[0]).toMatchObject({path: '/timeline', key: '/when'});
  });

  test('the timeline’s GitHub refs conjoin repository and number: the source paints no single id', () => {
    if (isDecline(TODAY_TIMELINE.output)) throw new Error();
    const github = refsOf(TODAY_TIMELINE.output.dataModel).filter(r =>
      r.surface.startsWith('github:'),
    );
    expect(github.length).toBeGreaterThan(0);
    for (const r of github) expect(r.pointer).toMatch(/^\/prs\[repository="[^"]+",number=\d+\]\//);
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

  test('a re-synthesis carries the previous document and the refs that stopped resolving', () => {
    const turn = buildSynthesisTurn({
      ...base,
      previous: {declined: true, reason: 'x'},
      changes: {
        absent: [
          {surface: 'shop-a:list', pointer: '/items[id="gone"]/price'},
          {surface: 'shop-b:list', pointer: '/products[sku="gone"]/price'},
        ],
      },
    });
    expect(turn).toContain('The user is looking at your previous view');
    expect(turn).toContain('- these refs no longer resolve:');
    expect(turn).toContain('  - shop-a:list/items[id="gone"]/price');
    expect(turn).toContain('  - shop-b:list/products[sku="gone"]/price');
    expect(turn).toContain('"declined": true');
    expect(turn).not.toContain('rejected');
  });

  test('a re-synthesis with nothing named says the sources were repainted', () => {
    const turn = buildSynthesisTurn({
      ...base,
      previous: {declined: true, reason: 'x'},
      changes: {absent: []},
    });
    expect(turn).toContain('- nothing named; the sources were repainted');
  });
});
