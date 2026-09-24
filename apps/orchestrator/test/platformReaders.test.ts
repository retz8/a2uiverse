/**
 * The three platform readers (phase-6 decision 4, task-6.4 decision 5): bounded deterministic
 * projections of orchestrator state — never a partition's contents, never the synthesis document —
 * behind one interface, adapted to the AI SDK's tools.
 */
import type {AgentCard} from '@a2a-js/sdk';
import {describe, expect, test} from 'vitest';
import {Canvases} from '../src/composition/canvases.js';
import {compositionFrom, type CompositionState} from '../src/composition/state.js';
import {canvasLine, canvasView, platformReaders} from '../src/planner/platformReaders.js';
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

describe('installed apps', () => {
  test('lists every installed app with its card content and reachability; the platform is not an app', async () => {
    const registry = await registryWith({
      github: cardFor('GitHub', 'repositories and pull requests', [
        ['Pull requests', 'lists and reviews pull requests'],
      ]),
      gmail: undefined,
    });
    const readers = platformReaders({registry, canvas: () => undefined, ancestry: () => []});
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

  test('the reader answers with nothing on a root canvas, or when the canvas asked from is gone', () => {
    const readers = platformReaders({registry, canvas: () => undefined, ancestry: () => []});
    expect(readers.thisCanvas(undefined)).toBeUndefined();
    expect(readers.thisCanvas('c1')).toBeUndefined();
  });
});

describe('recent turns — the ancestry (task-9.3 decision 2)', () => {
  const registry = new Registry([record('github', 'GitHub'), record('gmail', 'Gmail')]);
  const opened = Date.parse('2026-09-13T06:00:00.000Z');

  test('one line per canvas: when it was opened, what was asked, which sources answered, the merged view, whether it still loads', () => {
    const state = compositionFrom(layout, registry, 'what needs my review?', {
      turnId: 't',
      openedAt: opened,
    });
    state.arrived.add('github');
    state.slots.get('gmail')!.state = 'failed';
    expect(canvasLine({kind: 'open', state})).toBe(
      '2026-09-13T06:00:00.000Z · "what needs my review?" → github (answered), gmail (failed) · still loading',
    );
    state.answeredAt = opened + 5_000;
    state.mergedView = {outcome: 'declined', reason: 'nothing joinable'};
    expect(canvasLine({kind: 'open', state})).toBe(
      '2026-09-13T06:00:00.000Z · "what needs my review?" → github (answered), gmail (failed) · merged view declined: nothing joinable · answered',
    );
    state.mergedView = {outcome: 'synthesized'};
    expect(canvasLine({kind: 'open', state})).toContain('· merged view live · answered');
  });

  test('a closed canvas keeps its line; the chain runs oldest first through it, at most five deep', () => {
    const askedIn = (line: string) => /"[^"]*"/.exec(line)?.[0];
    const canvases = new Canvases();
    const open = (id: string, utterance: string, parent?: string) => {
      const state = compositionFrom(layout, registry, utterance, {
        turnId: id,
        openedAt: opened,
        ...(parent ? {parent} : {}),
      });
      state.answeredAt = opened + 1;
      canvases.open(id, state);
      return state;
    };
    open('c1', 'one');
    open('c2', 'two', 'c1').arrived.add('gmail');
    open('c3', 'three', 'c2');
    open('c4', 'four', 'c3');
    open('c5', 'five', 'c4');
    open('c6', 'six', 'c5');
    open('c7', 'seven', 'c6');
    expect(canvases.close('c2')).toMatchObject({
      utterance: 'two',
      parent: 'c1',
      answered: ['gmail'],
    });
    expect(canvases.get('c2')).toBeUndefined();
    expect(canvases.isClosed('c2')).toBe(true);
    expect(canvases.has('c2')).toBe(true);

    const readers = platformReaders({
      registry,
      canvas: id => canvases.get(id),
      ancestry: id => canvases.ancestry(id),
    });
    const lines = readers.recentTurns('c7');
    expect(lines).toHaveLength(5);
    expect(lines.map(l => askedIn(l))).toEqual(['"three"', '"four"', '"five"', '"six"', '"seven"']);
    expect(readers.recentTurns('c3').map(l => askedIn(l))).toEqual(['"one"', '"two"', '"three"']);
    expect(readers.recentTurns('c3')[1]).toBe('2026-09-13T06:00:00.000Z · "two" → gmail · closed');
    expect(readers.recentTurns(undefined)).toEqual([]);
    expect(readers.recentTurns('nowhere')).toEqual([]);
    // A parent the session does not hold ends the chain.
    open('c9', 'nine', 'gone');
    expect(readers.recentTurns('c9').map(l => askedIn(l))).toEqual(['"nine"']);
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
