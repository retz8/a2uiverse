/**
 * The painter on the model-authored tree (task-6.4 decisions 1, 3, 11): the tree and its ids kept,
 * each vendor `Slot` wrapped in an `Attribution` carrying its weight, the synthesis slot and gap
 * slots bare, the painter-owned props written, the literal data model sent, repaints by source.
 */
import {clipPaintMetaTitle, PAINT_META_MIME_TYPE} from '@a2uiverse/sdk';
import {CATALOG_ID as SHELL_CATALOG_ID} from '@a2uiverse/shell-catalog/id';
import {describe, expect, test} from 'vitest';
import {Sources} from '../src/accounts/accounts.js';
import {compositionFrom} from '../src/composition/state.js';
import {
  paintLayout,
  shellCreateParts,
  shellEnvelope,
  shellRepaintParts,
} from '../src/composition/shellPainter.js';
import type {LayoutSurface} from '../src/planner/document.js';
import {cardFor, testRegistry} from './registryFixture.js';

/** The three sources, installed through the registry: their display names are their cards' names. */
const {registry} = await testRegistry([
  {id: 'github', card: cardFor('http://127.0.0.1/github', {name: 'GitHub'})},
  {id: 'gmail', card: cardFor('http://127.0.0.1/gmail', {name: 'Gmail'})},
  {id: 'calendar', card: cardFor('http://127.0.0.1/calendar', {name: 'Google Calendar'})},
]);

/** A merged view over three sources, a gap beside them, a heading, a card holding one slot as its child. */
const layout: LayoutSurface = {
  dispatch: [
    {source: 'github', request: 'a'},
    {source: 'gmail', request: 'b'},
    {source: 'calendar', request: 'c'},
    {source: 'shell', request: 'merge'},
    {gap: 'flight booking'},
  ],
  tree: {
    components: [
      {id: 'root', component: 'Column', children: ['heading', 'merged', 'sources', 'flights']},
      {id: 'heading', component: 'Text', variant: 'h3', text: 'Your day'},
      {id: 'merged', component: 'Slot', source: 'shell'},
      {id: 'sources', component: 'Row', children: ['gh', 'gm', 'cal-card']},
      {id: 'gh', component: 'Slot', source: 'github', weight: 2},
      {id: 'gm', component: 'Slot', source: 'gmail'},
      {id: 'cal-card', component: 'Card', child: 'cal'},
      {id: 'cal', component: 'Slot', source: 'calendar'},
      {id: 'flights', component: 'Slot', gap: 'flight booking'},
    ],
  },
  dataModel: {},
};

type A2uiData = {version: string} & Record<string, unknown>;
const dataOf = (part: {kind: string; data?: unknown}) => part.data as A2uiData;
const componentsOf = (part: {kind: string; data?: unknown}) =>
  (dataOf(part).updateComponents as {components: Array<Record<string, unknown>>}).components;

describe('paintLayout', () => {
  const state = compositionFrom(layout, new Sources(registry), 'my day');
  const painted = paintLayout(state);
  const byId = new Map(painted.map(c => [c.id, c]));

  test('keeps the model’s components and ids, in order, with the wrappers inserted before their slots', () => {
    expect(painted.map(c => c.id)).toEqual([
      'root',
      'heading',
      'merged',
      'sources',
      'attribution-gh',
      'gh',
      'attribution-gm',
      'gm',
      'cal-card',
      'attribution-cal',
      'cal',
      'flights',
    ]);
    expect(byId.get('heading')).toEqual({
      id: 'heading',
      component: 'Text',
      variant: 'h3',
      text: 'Your day',
    });
  });

  test('wraps each vendor Slot in an Attribution that names it, holds it as child, and carries its weight', () => {
    expect(byId.get('attribution-gh')).toEqual({
      id: 'attribution-gh',
      component: 'Attribution',
      displayName: 'GitHub',
      source: 'github',
      child: 'gh',
      weight: 2,
    });
    expect(byId.get('attribution-gm')).toEqual({
      id: 'attribution-gm',
      component: 'Attribution',
      displayName: 'Gmail',
      source: 'gmail',
      child: 'gm',
    });
    // The parent now names the wrapper where it named the slot — in a children list and as a child.
    expect(byId.get('sources')!.children).toEqual(['attribution-gh', 'attribution-gm', 'cal-card']);
    expect(byId.get('cal-card')!.child).toBe('attribution-cal');
  });

  test('writes state and label on a vendor Slot and leaves its weight where the model put it', () => {
    expect(byId.get('gh')).toEqual({
      id: 'gh',
      component: 'Slot',
      source: 'github',
      weight: 2,
      state: 'pending',
      label: 'GitHub',
    });
  });

  test('the synthesis slot is shell content, bare: no wrapper, label Synthesis (task-5.5 decision 1)', () => {
    expect(byId.get('merged')).toEqual({
      id: 'merged',
      component: 'Slot',
      source: 'shell',
      state: 'pending',
      label: 'Synthesis',
      content: 'shell',
    });
    expect(byId.has('attribution-merged')).toBe(false);
    expect(byId.get('root')!.children).toEqual(['heading', 'merged', 'sources', 'flights']);
  });

  test('the merged view’s planned columns and join nouns are written onto its slot (task-7.15)', () => {
    const planned: LayoutSurface = {
      ...layout,
      dispatch: layout.dispatch.map(entry =>
        'source' in entry && entry.source === 'shell'
          ? {
              ...entry,
              columns: ['Item', 'When'],
              join: {home: 'github', nouns: {github: 'PRs', gmail: 'threads', calendar: 'events'}},
            }
          : entry,
      ),
    };
    const merged = paintLayout(compositionFrom(planned, new Sources(registry), 'what now?')).find(
      c => c.id === 'merged',
    );
    expect(merged).toEqual({
      id: 'merged',
      component: 'Slot',
      source: 'shell',
      state: 'pending',
      label: 'Synthesis',
      content: 'shell',
      columns: ['Item', 'When'],
      join: {home: 'github', nouns: {github: 'PRs', gmail: 'threads', calendar: 'events'}},
    });
  });

  test('the facts a state carries are painted with it (task-8.3 decisions 6, 9, 10, 12)', () => {
    const planned: LayoutSurface = {
      ...layout,
      dispatch: layout.dispatch.map(entry =>
        'source' in entry && entry.source === 'shell'
          ? {
              ...entry,
              columns: ['PR', 'Latest mail'],
              columnSources: ['github', 'gmail'],
              join: {home: 'github', nouns: {github: 'PRs', gmail: 'threads', calendar: 'events'}},
            }
          : entry,
      ),
    };
    const state = compositionFrom(planned, new Sources(registry), 'what now?');
    const slot = (source: string) =>
      paintLayout(state).find(c => c.component === 'Slot' && c.source === source)!;
    // From plan time: the column marks on the merge slot, each vendor slot's noun.
    expect(slot('shell')).toMatchObject({columnSources: ['github', 'gmail']});
    expect(slot('gmail')).toMatchObject({noun: 'Gmail threads'});
    expect(slot('gmail')).not.toHaveProperty('failure');
    // A failure's cause and words ride on the failed slot.
    state.slots.get('gmail')!.state = 'failed';
    state.slots.get('gmail')!.failure = {cause: 'vendor', message: 'Rate limited'};
    expect(slot('gmail')).toMatchObject({
      state: 'failed',
      failure: {cause: 'vendor', message: 'Rate limited'},
    });
    // A collapsed merge carries its decline's reason, or its cause.
    const merge = state.slots.get('shell')!;
    merge.state = 'collapsed';
    merge.declined = 'Nothing lines up.';
    expect(slot('shell')).toMatchObject({declined: {reason: 'Nothing lines up.'}});
    expect(slot('shell')).not.toHaveProperty('collapse');
    delete merge.declined;
    merge.collapse = {cause: 'home', home: 'GitHub PRs'};
    expect(slot('shell')).toMatchObject({collapse: {cause: 'home', home: 'GitHub PRs'}});
  });

  test('the facts the presses’ lines are drawn from are painted on the merge slot (task-8.4 decision 13)', () => {
    const state = compositionFrom(layout, new Sources(registry), 'my day');
    const merge = () =>
      paintLayout(state).find(c => c.component === 'Slot' && c.source === 'shell')!;
    for (const prop of ['merged', 'late', 'working', 'callFailed', 'retrying']) {
      expect(merge()).not.toHaveProperty(prop);
    }
    // A landed view: its own set, in slot order; a source arrived after it, waiting for Include.
    state.mergeDecided = true;
    state.mergedView = {outcome: 'synthesized'};
    state.synthesis = {} as NonNullable<typeof state.synthesis>;
    state.merged = new Set(['gmail', 'github']);
    state.arrived = new Set(['github', 'gmail', 'calendar']);
    expect(merge()).toMatchObject({merged: ['github', 'gmail'], late: ['calendar']});
    // Being folded in, it is no longer late: the working sentence names it.
    state.folding.add('calendar');
    state.pressWork = 1;
    expect(merge()).toMatchObject({working: {sources: ['calendar']}});
    expect(merge()).not.toHaveProperty('late');
    // The fold-in failed with the view kept: late again, the failure said.
    state.folding.clear();
    state.pressWork = 0;
    state.callFailed = {kind: 'include', sources: ['calendar']};
    expect(merge()).toMatchObject({late: ['calendar'], callFailed: {kind: 'include'}});
    expect(merge()).not.toHaveProperty('working');
    // A merge collapsed for its home source offers no Include; a retry that brings it back is named.
    state.synthesis = undefined;
    state.mergedView = {outcome: 'home'};
    state.slots.get('shell')!.state = 'collapsed';
    state.slots.get('shell')!.collapse = {cause: 'home', home: 'GitHub PRs'};
    state.retrying.add('github');
    expect(merge()).toMatchObject({retrying: ['github']});
    for (const prop of ['merged', 'late', 'callFailed']) expect(merge()).not.toHaveProperty(prop);
  });

  test('a gap slot is painted as authored: the catalog’s tile, no wrapper, no state', () => {
    expect(byId.get('flights')).toEqual({id: 'flights', component: 'Slot', gap: 'flight booking'});
    expect(byId.has('attribution-flights')).toBe(false);
  });
});

describe('two accounts of one app (task 12.4)', () => {
  const accounts = {
    accountsOf: (appId: string) =>
      appId === 'gmail'
        ? [
            {n: 1, label: 'alice@example.com'},
            {n: 2, label: 'bob@example.com'},
          ]
        : [],
    nextAccount: () => 3,
  };
  const twoAccounts: LayoutSurface = {
    dispatch: [
      {source: 'gmail.1', request: 'a'},
      {source: 'gmail.2', request: 'b'},
      {source: 'github', request: 'c'},
    ],
    tree: {
      components: [
        {id: 'root', component: 'Column', children: ['work', 'home', 'gh']},
        {id: 'work', component: 'Slot', source: 'gmail.1'},
        {id: 'home', component: 'Slot', source: 'gmail.2'},
        {id: 'gh', component: 'Slot', source: 'github'},
      ],
    },
    dataModel: {},
  };
  const state = compositionFrom(twoAccounts, new Sources(registry, accounts), 'my mail');
  const byId = new Map(paintLayout(state).map(c => [c.id, c]));

  test('each account is its own slot, keyed by its source', () => {
    expect([...state.slots.keys()]).toEqual(['gmail.1', 'gmail.2', 'github']);
  });

  test('attribution names the account by its label beside the app’s name; an app with one account names none (phase-12 decision 22)', () => {
    expect(byId.get('attribution-work')).toEqual({
      id: 'attribution-work',
      component: 'Attribution',
      displayName: 'Gmail',
      source: 'gmail.1',
      account: 'alice@example.com',
      child: 'work',
    });
    expect(byId.get('attribution-home')).toMatchObject({
      source: 'gmail.2',
      account: 'bob@example.com',
    });
    expect(byId.get('attribution-gh')).not.toHaveProperty('account');
  });

  test('each slot’s label is the source’s one name (task-12.4 decision 5)', () => {
    expect(byId.get('work')).toMatchObject({label: 'Gmail · alice@example.com'});
    expect(byId.get('home')).toMatchObject({label: 'Gmail · bob@example.com'});
    expect(byId.get('gh')).toMatchObject({label: 'GitHub'});
  });
});

describe('shellCreateParts', () => {
  test('a titled composition leads with the shell’s own paintMeta, clipped to the cap (task-9.3 decision 4)', () => {
    const long = 'Pull requests, issues and runs waiting on you across every tool';
    const parts = shellCreateParts(
      compositionFrom({...layout, title: long}, new Sources(registry), 'x'),
    );
    expect(parts).toHaveLength(3);
    expect(parts[0]).toEqual({
      kind: 'data',
      data: {paintMeta: {surfaceId: 'shell:main', title: clipPaintMetaTitle(long)}},
      metadata: {mimeType: PAINT_META_MIME_TYPE},
    });
    expect(dataOf(parts[1]!).createSurface).toBeDefined();
    expect(
      shellCreateParts(compositionFrom({...layout, title: '  '}, new Sources(registry), 'x')),
    ).toHaveLength(2);
  });

  test('paints createSurface for shell:main in the shell catalog, then the components; no data part for an empty model', () => {
    const parts = shellCreateParts(compositionFrom(layout, new Sources(registry), 'x'));
    expect(parts).toHaveLength(2);
    expect(dataOf(parts[0]!)).toEqual({
      version: 'v0.9',
      createSurface: {surfaceId: 'shell:main', catalogId: SHELL_CATALOG_ID},
    });
    expect((dataOf(parts[1]!).updateComponents as {surfaceId: string}).surfaceId).toBe(
      'shell:main',
    );
    expect(componentsOf(parts[1]!).map(c => c.id)).toContain('attribution-gh');
  });

  test('sends the literal data model on shell:main before the components, when the tree binds one', () => {
    const answer: LayoutSurface = {
      dispatch: [],
      tree: {
        components: [
          {id: 'root', component: 'Column', children: ['line']},
          {id: 'line', component: 'Text', text: {path: '/answer'}},
        ],
      },
      dataModel: {answer: 'Two apps are installed.'},
    };
    const parts = shellCreateParts(
      compositionFrom(answer, new Sources(registry), 'what apps do I have?'),
    );
    expect(parts.map(p => Object.keys(dataOf(p))[1])).toEqual([
      'createSurface',
      'updateDataModel',
      'updateComponents',
    ]);
    expect(dataOf(parts[1]!).updateDataModel).toEqual({
      surfaceId: 'shell:main',
      value: {answer: 'Two apps are installed.'},
    });
  });
});

describe('shellRepaintParts', () => {
  test('repaints the same surface with the flipped slot state, found by source, ids stable', () => {
    const state = compositionFrom(layout, new Sources(registry), 'x');
    state.slots.get('gmail')!.state = 'failed';
    state.slots.get('shell')!.state = 'collapsed';
    const parts = shellRepaintParts(state);
    expect(parts).toHaveLength(1);
    const components = componentsOf(parts[0]!);
    expect(components.find(c => c.id === 'gm')!.state).toBe('failed');
    expect(components.find(c => c.id === 'merged')!.state).toBe('collapsed');
    expect(components.find(c => c.id === 'gh')!.state).toBe('pending');
    expect(components.map(c => c.id)).toEqual(
      paintLayout(compositionFrom(layout, new Sources(registry), 'x')).map(c => c.id),
    );
  });
});

describe('shellEnvelope', () => {
  test('is a non-final working status-update stamped as the shell', () => {
    const state = compositionFrom(layout, new Sources(registry), 'x');
    const event = shellEnvelope({taskId: 't1', contextId: 'c1'}, shellCreateParts(state));
    expect(event.kind).toBe('status-update');
    expect(event.final).toBe(false);
    expect(event.status.state).toBe('working');
    expect(event.taskId).toBe('t1');
    expect(event.status.message?.parts).toHaveLength(2);
    expect(event.metadata?.a2uiverse).toEqual({source: 'shell', role: 'shell'});
  });
});
