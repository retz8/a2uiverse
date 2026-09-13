/**
 * The three platform readers (phase-6 decision 4, task-6.4 decision 5): bounded deterministic
 * projections of orchestrator state — never a partition's contents, never the synthesis document —
 * behind one interface, adapted to the AI SDK's tools.
 */
import type {AgentCard} from '@a2a-js/sdk';
import {describe, expect, test} from 'vitest';
import {compositionFrom, type CompositionState} from '../src/composition/state.js';
import type {JournalEntry} from '../src/journal/types.js';
import {canvasView, platformReaders, recentTurnLine} from '../src/planner/platformReaders.js';
import {READER_NAMES, readerTools, type PlatformReaders} from '../src/planner/readers.js';
import {Registry} from '../src/registry/registry.js';
import type {AppRecord} from '../src/registry/types.js';
import {FakeEmbedder} from './fakeEmbedder.js';

function record(id: string, displayName: string): AppRecord {
  return {
    id,
    displayName,
    agentUrl: `http://localhost/${id}`,
    authScheme: 'none',
    catalogId: `cat-${id}`,
    catalogPackage: `${id}-catalog`,
  };
}

function cardFor(name: string, description: string, skills: [string, string][]): AgentCard {
  return {
    name,
    description,
    version: '0.0.0',
    protocolVersion: '0.3.0',
    url: 'http://127.0.0.1:0',
    preferredTransport: 'JSONRPC',
    capabilities: {},
    defaultInputModes: ['text'],
    defaultOutputModes: ['text'],
    skills: skills.map(([n, d], i) => ({id: `s${i}`, name: n, description: d, tags: []})),
  };
}

const platformCard = cardFor('A2UIVerse', 'the platform', [['Palette', 'routes utterances']]);

async function registryWith(cards: Record<string, AgentCard | undefined>) {
  const registry = new Registry(
    Object.keys(cards).map(id => record(id, id[0]!.toUpperCase() + id.slice(1))),
    {platformCard},
  );
  await registry.refreshCards({
    resolveCard: async url => {
      const card = cards[url.split('/').pop()!];
      if (!card) throw new Error('down');
      return card;
    },
    embedder: new FakeEmbedder(),
  });
  return registry;
}

const layout = {
  dispatch: [
    {source: 'github', request: 'PRs'},
    {source: 'gmail', request: 'mail'},
    {source: 'shell', request: 'timeline'},
    {gap: 'flight booking'},
  ],
  tree: {
    components: [
      {id: 'root', component: 'Column', children: ['m', 'gh', 'gm', 'f']},
      {id: 'm', component: 'Slot', source: 'shell'},
      {id: 'gh', component: 'Slot', source: 'github'},
      {id: 'gm', component: 'Slot', source: 'gmail'},
      {id: 'f', component: 'Slot', gap: 'flight booking'},
    ],
  },
  dataModel: {},
};

function entry(overrides: Partial<JournalEntry>): JournalEntry {
  return {
    turnId: 't',
    clientContextId: 'c1',
    at: '2026-09-13T06:00:00.000Z',
    kind: 'utterance',
    descriptor: 'what needs my review?',
    dispatch: [],
    surfaces: {created: [], updated: [], deleted: []},
    clientMetadata: {keys: [], dataModelBytes: 0},
    outcome: 'completed',
    embedding: null,
    ...overrides,
  };
}

describe('installed apps', () => {
  test('lists every installed app with its card content and reachability; the platform is not an app', async () => {
    const registry = await registryWith({
      github: cardFor('GitHub', 'repositories and pull requests', [
        ['Pull requests', 'lists and reviews pull requests'],
      ]),
      gmail: undefined,
    });
    const readers = platformReaders({registry, canvas: () => undefined, recent: () => []});
    expect(readers.installedApps()).toEqual([
      {
        id: 'github',
        displayName: 'Github',
        name: 'GitHub',
        description: 'repositories and pull requests',
        skills: [{name: 'Pull requests', description: 'lists and reviews pull requests'}],
        reachable: true,
      },
      {id: 'gmail', displayName: 'Gmail', skills: [], reachable: false},
    ]);
  });
});

describe('this canvas', () => {
  const registry = new Registry([record('github', 'GitHub'), record('gmail', 'Gmail')]);

  test('is the composition’s structure: the utterance, each slot and its state, the merged view, the gaps', () => {
    const state = compositionFrom(layout, registry, 'what needs my attention today?');
    state.arrived.add('github');
    state.slots.get('gmail')!.state = 'failed';
    expect(canvasView(state)).toEqual({
      utterance: 'what needs my attention today?',
      slots: [
        {source: 'github', displayName: 'GitHub', state: 'arrived'},
        {source: 'gmail', displayName: 'Gmail', state: 'failed'},
      ],
      mergedView: {state: 'pending'},
      gaps: ['flight booking'],
    });
  });

  test('says whether the merged view is live, collapsed or declined, and why', () => {
    const state = compositionFrom(layout, registry, 'x');
    state.mergedView = {outcome: 'declined', reason: 'nothing joinable'};
    expect(canvasView(state).mergedView).toEqual({state: 'declined', reason: 'nothing joinable'});
    state.mergedView = {outcome: 'skipped', reason: '1 source(s) arrived'};
    expect(canvasView(state).mergedView).toEqual({
      state: 'collapsed',
      reason: '1 source(s) arrived',
    });
    state.mergedView = {outcome: 'synthesized'};
    expect(canvasView(state).mergedView).toEqual({state: 'live'});
    const plain = compositionFrom({...layout, dispatch: [layout.dispatch[0]!]}, registry, 'x');
    expect(canvasView(plain).mergedView).toBeUndefined();
  });

  test('never carries a partition’s contents or the synthesis document', () => {
    const state = compositionFrom(layout, registry, 'x');
    const paint = (op: Record<string, unknown>) => ({
      kind: 'message' as const,
      messageId: 'm',
      role: 'agent' as const,
      parts: [{kind: 'data' as const, data: {version: 'v0.9', ...op}}],
    });
    state.partitions.apply(paint({createSurface: {surfaceId: 'github:s1', catalogId: 'c'}}));
    state.partitions.apply(
      paint({updateDataModel: {surfaceId: 'github:s1', value: {secret: 'PR #2531 title'}}}),
    );
    const view = JSON.stringify(canvasView(state));
    expect(view).not.toContain('secret');
    expect(view).not.toContain('2531');
  });

  test('the reader answers with nothing when the conversation has no composition', () => {
    const readers = platformReaders({registry, canvas: () => undefined, recent: () => []});
    expect(readers.thisCanvas('c1')).toBeUndefined();
  });
});

describe('recent turns', () => {
  test('one line per turn: when, what was asked, which sources answered, the outcome', () => {
    const line = recentTurnLine(
      entry({
        dispatch: [
          {appId: 'github', outcome: 'completed'} as never,
          {appId: 'gmail', outcome: 'failed'} as never,
        ],
      }),
    );
    expect(line).toBe(
      '2026-09-13T06:00:00.000Z · utterance "what needs my review?" → github (completed), gmail (failed) · completed',
    );
    expect(recentTurnLine(entry({kind: 'action', descriptor: 'action approve on github:s1'}))).toBe(
      '2026-09-13T06:00:00.000Z · action "action approve on github:s1" → no source · completed',
    );
  });
});

describe('readerTools — the AI SDK adapter', () => {
  const readers: PlatformReaders = {
    installedApps: () => [{id: 'gmail', displayName: 'Gmail', skills: [], reachable: true}],
    thisCanvas: id => (id === 'c1' ? {utterance: 'x', slots: [], gaps: []} : undefined),
    recentTurns: id => (id === 'c1' ? ['line one'] : []),
  };

  test('exposes exactly the three readers, bound to the conversation', async () => {
    const tools = readerTools(readers, 'c1');
    expect(Object.keys(tools).sort()).toEqual([...READER_NAMES].sort());
    const run = async (name: string) =>
      (tools[name] as {execute: (input: unknown, options: unknown) => Promise<unknown>}).execute(
        {},
        {toolCallId: 't', messages: []},
      );
    expect(await run('installed_apps')).toEqual([
      {id: 'gmail', displayName: 'Gmail', skills: [], reachable: true},
    ]);
    expect(await run('this_canvas')).toEqual({utterance: 'x', slots: [], gaps: []});
    expect(await run('recent_turns')).toEqual(['line one']);
  });

  test('an empty canvas and no turns answer as such, not as errors', async () => {
    const tools = readerTools(readers, 'other');
    const run = async (name: string) =>
      (tools[name] as {execute: (input: unknown, options: unknown) => Promise<unknown>}).execute(
        {},
        {toolCallId: 't', messages: []},
      );
    expect(await run('this_canvas')).toEqual({empty: true, note: 'Nothing is on the canvas yet.'});
    expect(await run('recent_turns')).toEqual([]);
  });

  test('every tool describes itself for the model and takes no input', () => {
    for (const tool of Object.values(readerTools(readers, 'c1'))) {
      expect(typeof (tool as {description?: string}).description).toBe('string');
    }
  });
});

describe('the composition’s slots are keyed by source (task-6.3 decision 6)', () => {
  test('compositionFrom keys vendor and shell slots by source, in dispatch order, and lists the gaps', () => {
    const registry = new Registry([record('github', 'GitHub'), record('gmail', 'Gmail')]);
    const state: CompositionState = compositionFrom(layout, registry, 'u');
    expect([...state.slots.keys()]).toEqual(['github', 'gmail', 'shell']);
    expect(state.slots.get('shell')!.plan).toEqual({
      source: 'shell',
      displayName: 'Synthesis',
      request: 'timeline',
    });
    expect(state.gaps).toEqual(['flight booking']);
    expect(state.utterance).toBe('u');
  });
});
