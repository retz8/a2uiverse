/**
 * The Planner's one validator (task-6.4 decision 10), in order: the output schema; the tree
 * through the sdk's A2UI validator against the layout surface's pruned catalog; slot accounting;
 * the painter-owned props; the literal-only data model.
 */
import {readFileSync} from 'node:fs';
import {createRequire} from 'node:module';
import {createA2uiValidator, pruneCatalog, type A2uiCatalogSchema} from '@a2uiverse/sdk';
import {LAYOUT_SURFACE_KEEP_SET} from '@a2uiverse/shell-catalog/schema';
import {describe, expect, test} from 'vitest';
import type {LayoutSurface} from '../src/planner/document.js';
import {validateLayoutSurface} from '../src/planner/validate.js';

const require = createRequire(import.meta.url);
const catalog = pruneCatalog(
  JSON.parse(
    readFileSync(require.resolve('@a2uiverse/shell-catalog/catalog.json'), 'utf8'),
  ) as A2uiCatalogSchema,
  LAYOUT_SURFACE_KEEP_SET,
);
const tree = createA2uiValidator({catalog});
const shortlist = ['github', 'gmail', 'shell'];

const check = (document: unknown, ids: readonly string[] = shortlist): string[] => {
  const result = validateLayoutSurface(document, {tree, shortlist: ids});
  return result.ok ? [] : result.errors;
};

/** Two vendors and a merged view, the shell's heading over them. */
const fanOut = (): LayoutSurface => ({
  dispatch: [
    {source: 'github', request: 'Pull requests awaiting my review, with the time of each.'},
    {source: 'gmail', request: 'Unread mail needing a reply, with the time of each.'},
    {source: 'shell', request: 'One timeline of both, latest first.'},
  ],
  tree: {
    components: [
      {id: 'root', component: 'Column', children: ['heading', 'merged', 'sources']},
      {id: 'heading', component: 'Text', variant: 'h3', text: 'Your morning'},
      {id: 'merged', component: 'Slot', source: 'shell'},
      {id: 'sources', component: 'Row', children: ['gh', 'gm']},
      {id: 'gh', component: 'Slot', source: 'github', weight: 2},
      {id: 'gm', component: 'Slot', source: 'gmail'},
    ],
  },
  dataModel: {},
});

/** A platform answer: no dispatch, literal data bound through a template. */
const platformAnswer = (): LayoutSurface => ({
  dispatch: [],
  tree: {
    components: [
      {id: 'root', component: 'Column', children: ['heading', 'apps', 'library']},
      {id: 'heading', component: 'Text', variant: 'h3', text: 'Installed apps'},
      {
        id: 'apps',
        component: 'Table',
        columns: ['App', 'What it does'],
        children: {path: '/apps', componentId: 'app'},
      },
      {id: 'app', component: 'TableRow', children: ['app-name', 'app-does']},
      {id: 'app-name', component: 'Text', text: {path: 'name'}},
      {id: 'app-does', component: 'Text', text: {path: 'does'}},
      {
        id: 'library',
        component: 'Button',
        child: 'library-label',
        action: {functionCall: {call: 'openAppLibrary', args: {}}},
      },
      {id: 'library-label', component: 'Text', text: 'Manage apps'},
    ],
  },
  dataModel: {
    apps: [
      {name: 'GitHub', does: 'pull requests and issues'},
      {name: 'Gmail', does: 'mail'},
    ],
  },
});

const gap = (): LayoutSurface => ({
  dispatch: [{gap: 'flight booking'}],
  tree: {
    components: [
      {id: 'root', component: 'Column', children: ['flights']},
      {id: 'flights', component: 'Slot', gap: 'flight booking'},
    ],
  },
  dataModel: {},
});

describe('validateLayoutSurface — the three kinds of turn', () => {
  test('a fan-out with a merged view passes', () => {
    expect(check(fanOut())).toEqual([]);
  });
  test('a platform answer with no dispatch and literal data passes', () => {
    expect(check(platformAnswer())).toEqual([]);
  });
  test('a capability gap passes', () => {
    expect(check(gap())).toEqual([]);
  });
});

describe('the output schema comes first', () => {
  test('a missing part, an extra key, a dispatch entry with both source and gap', () => {
    const {dataModel: _d, ...noData} = fanOut();
    void _d;
    expect(check(noData)).not.toEqual([]);
    expect(check({...fanOut(), note: ''})).not.toEqual([]);
    const both = fanOut();
    both.dispatch[0] = {source: 'github', request: 'x', gap: 'y'} as never;
    expect(check(both)).not.toEqual([]);
  });
});

describe('the tree through the A2UI validator', () => {
  test('Attribution, Frame and a formula view are unknown components; openUrl an unknown function', () => {
    for (const name of ['Attribution', 'Frame', 'DerivedValue']) {
      const doc = platformAnswer();
      doc.tree.components.push({id: 'x', component: name, displayName: 'y'});
      doc.tree.components[0] = {
        id: 'root',
        component: 'Column',
        children: ['heading', 'apps', 'library', 'x'],
      };
      expect(check(doc)).toEqual([
        `/tree/components/8/component (x): Unknown component type: "${name}"`,
      ]);
    }
    const doc = platformAnswer();
    doc.tree.components[6] = {
      id: 'library',
      component: 'Button',
      child: 'library-label',
      action: {functionCall: {call: 'openUrl', args: {url: 'https://x'}}},
    };
    expect(check(doc).join('\n')).toContain('Unknown function: "openUrl"');
  });

  test('a missing root and a dangling child are found, by path', () => {
    const noRoot = gap();
    noRoot.tree.components[0] = {id: 'top', component: 'Column', children: ['flights']};
    expect(check(noRoot).join('\n')).toContain('Missing root component');
    const dangling = gap();
    dangling.tree.components[0] = {id: 'root', component: 'Column', children: ['flights', 'ghost']};
    expect(check(dangling).join('\n')).toContain("non-existent component 'ghost'");
  });
});

describe('slot accounting', () => {
  test('every dispatch entry has exactly one Slot, and every Slot a dispatch entry', () => {
    const missing = fanOut();
    missing.tree.components[5] = {id: 'gm', component: 'Text', text: 'no slot for gmail'};
    expect(check(missing)).toEqual([
      "/tree: no Slot holds source 'gmail', which the dispatch names",
    ]);
    const extra = fanOut();
    extra.dispatch = extra.dispatch.slice(0, 2);
    expect(check(extra)).toEqual([
      "/tree (merged): Slot holds source 'shell', which the dispatch does not name",
    ]);
    const twice = fanOut();
    twice.tree.components[5] = {id: 'gm', component: 'Slot', source: 'github'};
    expect(check(twice)).toEqual([
      "/tree (gm): a second Slot holds source 'github'; one Slot per dispatch entry",
      "/tree: no Slot holds source 'gmail', which the dispatch names",
    ]);
  });

  test('a gap Slot matches its dispatch entry by the exact words', () => {
    const doc = gap();
    doc.tree.components[1] = {id: 'flights', component: 'Slot', gap: 'Flight booking'};
    expect(check(doc)).toEqual([
      "/tree (flights): Slot holds gap 'Flight booking', which the dispatch does not name",
      "/tree: no Slot holds gap 'flight booking', which the dispatch names",
    ]);
  });

  test('a merged view needs two or more vendor sources', () => {
    const doc = fanOut();
    doc.dispatch = [doc.dispatch[0]!, doc.dispatch[2]!];
    doc.tree.components[3] = {id: 'sources', component: 'Row', children: ['gh']};
    doc.tree.components.splice(5, 1);
    expect(check(doc)).toEqual([
      '/dispatch: a merged view (source shell) needs two or more vendor sources; 1 dispatched',
    ]);
  });

  test('a source off this turn’s shortlist, a source dispatched twice, a blank request', () => {
    const off = fanOut();
    // An off-shortlist source is not a vendor source, so the merged view loses its second one too.
    expect(check(off, ['github', 'shell'])).toEqual([
      "/dispatch/1/source: 'gmail' is not on this turn's shortlist",
      '/dispatch: a merged view (source shell) needs two or more vendor sources; 1 dispatched',
    ]);
    const twice = fanOut();
    twice.dispatch[1] = {source: 'github', request: 'again'};
    expect(check(twice).join('\n')).toContain("/dispatch/1/source: 'github' is dispatched twice");
    const blank = fanOut();
    blank.dispatch[0] = {source: 'github', request: '   '};
    expect(check(blank)).toEqual(["/dispatch/0/request: the request for 'github' is blank"]);
  });
});

describe('the merged view’s columns and join (task-7.15)', () => {
  const joined = (): LayoutSurface => {
    const doc = fanOut();
    doc.dispatch[2] = {
      source: 'shell',
      request: 'One row per pull request — the home source — with the mail about it.',
      columns: ['Pull request', 'Review', 'Latest mail'],
      columnSources: ['github', 'github', 'gmail'],
      join: {home: 'github', nouns: {github: 'PRs', gmail: 'threads'}},
    };
    return doc;
  };

  test('columns and a join naming every dispatched vendor pass on the merged view', () => {
    expect(check(joined())).toEqual([]);
  });

  test('a vendor entry carries neither', () => {
    const doc = joined();
    doc.dispatch[0] = {
      source: 'github',
      request: 'x',
      columns: ['a'],
      join: {home: 'github', nouns: {}},
    };
    expect(check(doc)).toEqual([
      '/dispatch/0/columns: only the merged view (shell) has columns',
      '/dispatch/0/join: only the merged view (shell) states a join',
    ]);
  });

  test('every column is marked, to a dispatched vendor source or null (task-8.3 decision 12)', () => {
    const unmarked = joined();
    const {columnSources: _marks, ...rest} = unmarked.dispatch[2] as {columnSources?: unknown};
    unmarked.dispatch[2] = rest as LayoutSurface['dispatch'][number];
    expect(check(unmarked)).toEqual([
      '/dispatch/2/columnSources: required beside columns — per column, the dispatched agent whose values it shows, or null',
    ]);
    const short = joined();
    short.dispatch[2] = {
      ...short.dispatch[2]!,
      columnSources: ['github', null],
    } as LayoutSurface['dispatch'][number];
    expect(check(short)).toEqual([
      '/dispatch/2/columnSources: 2 marks for 3 columns; one per column',
    ]);
    const stranger = joined();
    stranger.dispatch[2] = {
      ...stranger.dispatch[2]!,
      columnSources: ['github', null, 'linear'],
    } as LayoutSurface['dispatch'][number];
    expect(check(stranger)).toEqual([
      "/dispatch/2/columnSources/2: 'linear' is not a dispatched agent",
    ]);
    const noColumns = fanOut();
    noColumns.dispatch[2] = {
      source: 'shell',
      request: 'A timeline.',
      columnSources: [null],
    };
    expect(check(noColumns)).toEqual([
      '/dispatch/2/columnSources: marks columns the entry does not have; write columns',
    ]);
    const onVendor = joined();
    onVendor.dispatch[0] = {source: 'github', request: 'x', columnSources: [null]};
    expect(check(onVendor)).toContain(
      '/dispatch/0/columnSources: only the merged view (shell) marks columns',
    );
  });

  test('a blank header is refused', () => {
    const doc = joined();
    doc.dispatch[2] = {
      ...doc.dispatch[2]!,
      columns: ['Pull request', ' '],
      columnSources: ['github', 'github'],
    } as LayoutSurface['dispatch'][number];
    expect(check(doc)).toEqual(['/dispatch/2/columns/1: the header is blank']);
  });

  test('the home and the nouns name exactly the dispatched vendor sources', () => {
    const doc = joined();
    doc.dispatch[2] = {
      ...doc.dispatch[2]!,
      join: {home: 'linear', nouns: {github: 'PRs', circleci: 'runs', gmail: ' '}},
    } as LayoutSurface['dispatch'][number];
    expect(check(doc)).toEqual([
      "/dispatch/2/join/home: 'linear' is not a dispatched source",
      "/dispatch/2/join/nouns/circleci: 'circleci' is not a dispatched source",
      '/dispatch/2/join/nouns/gmail: the noun is blank',
    ]);
    const missing = joined();
    missing.dispatch[2] = {
      ...missing.dispatch[2]!,
      join: {home: 'github', nouns: {github: 'PRs'}},
    } as LayoutSurface['dispatch'][number];
    expect(check(missing)).toEqual([
      "/dispatch/2/join/nouns: no noun for 'gmail', a dispatched source",
    ]);
  });
});

describe('what the Planner may write on a Slot', () => {
  test('state, label, content, columns, column marks, join and the runtime’s facts are the painter’s', () => {
    const doc = fanOut();
    doc.tree.components[4] = {
      id: 'gh',
      component: 'Slot',
      source: 'github',
      state: 'pending',
      label: 'GitHub',
      content: 'fragment',
    };
    expect(check(doc)).toEqual([
      "/tree (gh): Slot.state, Slot.label, Slot.content are written by the shell; write only source or gap, and weight — the merged view's columns, column marks and join go on its dispatch entry",
    ]);
    for (const [prop, value] of [
      ['noun', 'GitHub PRs'],
      ['failure', {cause: 'timeout'}],
      ['declined', {reason: 'x'}],
      ['collapse', {cause: 'unmade'}],
      ['columnSources', ['github']],
    ] as const) {
      const painted = fanOut();
      painted.tree.components[4] = {id: 'gh', component: 'Slot', source: 'github', [prop]: value};
      expect(check(painted)).toEqual([
        `/tree (gh): Slot.${prop} is written by the shell; write only source or gap, and weight — the merged view's columns, column marks and join go on its dispatch entry`,
      ]);
    }
    const onSlot = fanOut();
    onSlot.tree.components[2] = {
      id: 'merged',
      component: 'Slot',
      source: 'shell',
      columns: ['Pull request'],
    };
    expect(check(onSlot)).toHaveLength(1);
  });

  test('weight is a positive number', () => {
    for (const weight of [0, -1]) {
      const doc = fanOut();
      doc.tree.components[4] = {id: 'gh', component: 'Slot', source: 'github', weight};
      expect(check(doc)).toEqual([
        `/tree (gh): Slot.weight must be a positive number; got ${weight}`,
      ]);
    }
  });

  test('ids the painter reserves for its wrappers are refused', () => {
    const doc = gap();
    doc.tree.components[1] = {id: 'attribution-x', component: 'Slot', gap: 'flight booking'};
    doc.tree.components[0] = {id: 'root', component: 'Column', children: ['attribution-x']};
    expect(check(doc)).toEqual([
      "/tree (attribution-x): ids beginning with 'attribution-' are the shell's",
    ]);
  });
});

describe('the data model holds literals', () => {
  test('a formula leaf and a ref, anywhere in the model, are refused by path', () => {
    const formula = platformAnswer();
    formula.dataModel = {count: {op: 'count', args: []}};
    expect(check(formula)).toEqual([
      '/dataModel/count: a formula; the layout surface holds literal values only',
    ]);
    const ref = platformAnswer();
    ref.dataModel = {apps: [{name: {surface: 'gmail:s1', pointer: '/threads'}, does: 'x'}]};
    expect(check(ref)).toEqual([
      '/dataModel/apps/0/name: a ref; the layout surface holds literal values only',
    ]);
  });
});
