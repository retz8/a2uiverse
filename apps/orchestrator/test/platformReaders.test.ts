/**
 * The three platform readers (phase-6 decision 4, task-6.4 decision 5): bounded deterministic
 * projections of orchestrator state — never a partition's contents, never the synthesis document —
 * behind one interface, adapted to the AI SDK's tools.
 */
import type {AgentCard} from '@a2a-js/sdk';
import {beforeAll, describe, expect, test} from 'vitest';
import {Compositions} from '../src/composition/compositions.js';
import {Sources} from '../src/accounts/accounts.js';
import {compositionFrom, type CompositionState} from '../src/composition/state.js';
import {compositionLine, compositionView, platformReaders} from '../src/planner/platformReaders.js';
import {READER_NAMES, readerTools, type PlatformReaders} from '../src/planner/readers.js';
import type {Registry} from '../src/registry/registry.js';
import {cardUrlOf, fixtureArtifact, testRegistry} from './registryFixture.js';
import {FakeEmbedder} from '@a2uiverse/embedder';

function cardFor(
  id: string,
  name: string,
  description: string,
  skills: [string, string][],
  catalogs?: string[],
): AgentCard {
  return {
    name,
    description,
    version: '0.0.0',
    protocolVersion: '0.3.0',
    url: `http://127.0.0.1/${id}`,
    preferredTransport: 'JSONRPC',
    capabilities: catalogs
      ? {
          extensions: [
            {
              uri: 'https://a2ui.org/a2a-extension/a2ui/v0.9.1',
              params: {supportedCatalogIds: catalogs},
            },
          ],
        }
      : {},
    defaultInputModes: ['text'],
    defaultOutputModes: ['text'],
    skills: skills.map(([n, d], i) => ({id: `s${i}`, name: n, description: d, tags: []})),
  };
}

const platformCard = cardFor('shell', 'A2UIVerse', 'the platform', [
  ['Palette', 'routes utterances'],
]);

/** A registry with each card installed through the operation; `down` ones unreachable at startup. */
async function registryWith(
  cards: Record<string, AgentCard>,
  options: {down?: string[]; handed?: Record<string, string>} = {},
): Promise<Registry> {
  const apps = await Promise.all(
    Object.entries(cards).map(async ([id, card]) => ({
      id,
      card,
      catalogs: options.handed?.[id] ? [await fixtureArtifact(options.handed[id])] : [],
    })),
  );
  const made = await testRegistry(apps, {platformCard, embedder: new FakeEmbedder()});
  for (const id of options.down ?? []) made.cards.cards.delete(cardUrlOf(cards[id].url));
  await made.registry.refreshCards();
  return made.registry;
}

const named = (id: string, name: string) => cardFor(id, name, `${name} agent`, []);

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
  test('lists every installed app with its card content, its catalogs and reachability; the platform is not an app', async () => {
    const registry = await registryWith(
      {
        github: cardFor('github', 'GitHub', 'repositories and pull requests', [
          ['Pull requests', 'lists and reviews pull requests'],
        ]),
        gmail: cardFor('gmail', 'Gmail', 'mail', [['Threads', 'reads threads']], ['urn:gmail']),
      },
      {down: ['gmail'], handed: {gmail: 'urn:gmail'}},
    );
    const readers = platformReaders({registry, composition: () => undefined, ancestry: () => []});
    expect(readers.installedApps()).toEqual([
      {
        id: 'github',
        displayName: 'GitHub',
        name: 'GitHub',
        description: 'repositories and pull requests',
        skills: [{name: 'Pull requests', description: 'lists and reviews pull requests'}],
        catalogs: ['basic catalog'],
        reachable: true,
        signIn: false,
        accounts: [],
      },
      {
        id: 'gmail',
        displayName: 'Gmail',
        name: 'Gmail',
        description: 'mail',
        skills: [{name: 'Threads', description: 'reads threads'}],
        catalogs: ['urn:gmail'],
        reachable: false,
        signIn: false,
        accounts: [],
      },
    ]);
  });
});

describe('this composition', () => {
  let registry: Registry;
  beforeAll(async () => {
    registry = await registryWith({
      github: named('github', 'GitHub'),
      gmail: named('gmail', 'Gmail'),
    });
  });

  test('is the composition’s structure: the utterance, each slot and its state, the merged view, the gaps', () => {
    const state = compositionFrom(layout, new Sources(registry), 'what needs my attention today?');
    state.arrived.add('github');
    state.slots.get('gmail')!.state = 'failed';
    expect(compositionView(state)).toEqual({
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
    const state = compositionFrom(layout, new Sources(registry), 'x');
    state.mergedView = {outcome: 'declined', reason: 'nothing joinable'};
    expect(compositionView(state).mergedView).toEqual({
      state: 'declined',
      reason: 'nothing joinable',
    });
    state.mergedView = {outcome: 'skipped', reason: '1 source(s) arrived'};
    expect(compositionView(state).mergedView).toEqual({
      state: 'collapsed',
      reason: '1 source(s) arrived',
    });
    state.mergedView = {outcome: 'synthesized'};
    expect(compositionView(state).mergedView).toEqual({state: 'live'});
    const plain = compositionFrom(
      {...layout, dispatch: [layout.dispatch[0]!]},
      new Sources(registry),
      'x',
    );
    expect(compositionView(plain).mergedView).toBeUndefined();
  });

  test('never carries a partition’s contents or the synthesis document', () => {
    const state = compositionFrom(layout, new Sources(registry), 'x');
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
    const view = JSON.stringify(compositionView(state));
    expect(view).not.toContain('secret');
    expect(view).not.toContain('2531');
  });

  test('the reader answers with nothing on a root composition, or when the composition asked from is gone', () => {
    const readers = platformReaders({registry, composition: () => undefined, ancestry: () => []});
    expect(readers.thisComposition(undefined)).toBeUndefined();
    expect(readers.thisComposition('c1')).toBeUndefined();
  });
});

describe('recent turns — the ancestry (task-9.3 decision 2)', () => {
  let registry: Registry;
  beforeAll(async () => {
    registry = await registryWith({
      github: named('github', 'GitHub'),
      gmail: named('gmail', 'Gmail'),
    });
  });
  const opened = Date.parse('2026-09-13T06:00:00.000Z');

  test('one line per context: when it was opened, what was asked, which sources answered, the merged view, whether it still loads', () => {
    const state = compositionFrom(layout, new Sources(registry), 'what needs my review?', {
      turnId: 't',
      openedAt: opened,
    });
    state.arrived.add('github');
    state.slots.get('gmail')!.state = 'failed';
    expect(compositionLine({kind: 'open', state})).toBe(
      '2026-09-13T06:00:00.000Z · "what needs my review?" → GitHub (answered), Gmail (failed) · still loading',
    );
    state.answeredAt = opened + 5_000;
    state.mergedView = {outcome: 'declined', reason: 'nothing joinable'};
    expect(compositionLine({kind: 'open', state})).toBe(
      '2026-09-13T06:00:00.000Z · "what needs my review?" → GitHub (answered), Gmail (failed) · merged view declined: nothing joinable · answered',
    );
    state.mergedView = {outcome: 'synthesized'};
    expect(compositionLine({kind: 'open', state})).toContain('· merged view live · answered');
  });

  test('a closed composition keeps its line; the chain runs oldest first through it, at most five deep', () => {
    const askedIn = (line: string) => /"[^"]*"/.exec(line)?.[0];
    const compositions = new Compositions();
    const open = (id: string, utterance: string, parent?: string) => {
      const state = compositionFrom(layout, new Sources(registry), utterance, {
        turnId: id,
        openedAt: opened,
        ...(parent ? {parent} : {}),
      });
      state.answeredAt = opened + 1;
      compositions.open(id, state);
      return state;
    };
    open('c1', 'one');
    open('c2', 'two', 'c1').arrived.add('gmail');
    open('c3', 'three', 'c2');
    open('c4', 'four', 'c3');
    open('c5', 'five', 'c4');
    open('c6', 'six', 'c5');
    open('c7', 'seven', 'c6');
    expect(compositions.close('c2')).toMatchObject({
      utterance: 'two',
      parent: 'c1',
      answered: ['Gmail'],
    });
    expect(compositions.get('c2')).toBeUndefined();
    expect(compositions.isClosed('c2')).toBe(true);
    expect(compositions.has('c2')).toBe(true);

    const readers = platformReaders({
      registry,
      composition: id => compositions.get(id),
      ancestry: id => compositions.ancestry(id),
    });
    const lines = readers.recentTurns('c7');
    expect(lines).toHaveLength(5);
    expect(lines.map(l => askedIn(l))).toEqual(['"three"', '"four"', '"five"', '"six"', '"seven"']);
    expect(readers.recentTurns('c3').map(l => askedIn(l))).toEqual(['"one"', '"two"', '"three"']);
    expect(readers.recentTurns('c3')[1]).toBe('2026-09-13T06:00:00.000Z · "two" → Gmail · closed');
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
    thisComposition: id => (id === 'c1' ? {utterance: 'x', slots: [], gaps: []} : undefined),
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

  test('an empty composition and no turns answer as such, not as errors', async () => {
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
  test('compositionFrom keys vendor and shell slots by source, in dispatch order, and lists the gaps', async () => {
    const registry = await registryWith({
      github: named('github', 'GitHub'),
      gmail: named('gmail', 'Gmail'),
    });
    const state: CompositionState = compositionFrom(layout, new Sources(registry), 'u');
    expect([...state.slots.keys()]).toEqual(['github', 'gmail', 'shell']);
    expect(state.slots.get('shell')!.plan).toEqual({
      source: 'shell',
      displayName: 'Synthesis',
      name: 'Synthesis',
      request: 'timeline',
    });
    expect(state.gaps).toEqual(['flight booking']);
    expect(state.utterance).toBe('u');
  });
});

describe('accounts (task-12.6 decision 9)', () => {
  /** Gmail with two accounts held, GitHub asking sign-in with none, Calendar asking none. */
  const signInCard = (id: string, name: string): AgentCard => ({
    ...named(id, name),
    securitySchemes: {signIn: {type: 'http', scheme: 'bearer'}},
    security: [{signIn: []}],
  });
  const accounts = {
    accountsOf: (appId: string) =>
      appId === 'gmail'
        ? [
            {n: 1, label: 'alice@example.com'},
            {n: 2, label: 'bob@example.com'},
          ]
        : [],
    nextAccount: () => 1,
  };
  let registry: Registry;
  let sources: Sources;
  beforeAll(async () => {
    registry = await registryWith({
      github: signInCard('github', 'GitHub'),
      gmail: signInCard('gmail', 'Gmail'),
      calendar: named('calendar', 'Calendar'),
    });
    sources = new Sources(registry, accounts);
  });

  test('installed apps say whether each asks sign-in, and list its accounts by source and label', () => {
    const readers = platformReaders({
      registry,
      sources,
      composition: () => undefined,
      ancestry: () => [],
    });
    const byId = new Map(readers.installedApps().map(app => [app.id, app]));
    expect(byId.get('gmail')).toMatchObject({
      signIn: true,
      accounts: [
        {source: 'gmail.1', label: 'alice@example.com'},
        {source: 'gmail.2', label: 'bob@example.com'},
      ],
    });
    expect(byId.get('github')).toMatchObject({signIn: true, accounts: []});
    expect(byId.get('calendar')).toMatchObject({signIn: false, accounts: []});
  });

  const asking = {
    dispatch: [
      {source: 'gmail.2', request: 'mail'},
      {chooseAccount: 'gmail', request: 'Draft a reply.'},
      {source: 'calendar', request: 'meetings'},
    ],
    tree: {
      components: [
        {id: 'root', component: 'Column', children: ['gm', 'ask', 'cal']},
        {id: 'gm', component: 'Slot', source: 'gmail.2'},
        {id: 'ask', component: 'Slot', chooseAccount: 'gmail'},
        {id: 'cal', component: 'Slot', source: 'calendar'},
      ],
    },
    dataModel: {},
  };

  test('this canvas gives each account’s slot its label, and an account choice still waiting its own state', () => {
    const state = compositionFrom(asking, sources, 'x');
    expect(compositionView(state, sources).slots).toEqual([
      {source: 'gmail.2', displayName: 'Gmail', label: 'bob@example.com', state: 'pending'},
      {source: 'calendar', displayName: 'Calendar', state: 'pending'},
      {source: 'gmail', displayName: 'Gmail', state: 'choosing-account'},
    ]);
  });

  test('recent turns name an account’s source by its one name', () => {
    const state = compositionFrom(asking, sources, 'x', {turnId: 't', openedAt: 0});
    state.arrived.add('gmail.2');
    expect(compositionLine({kind: 'open', state})).toContain(
      '→ Gmail · bob@example.com (answered), Calendar (loading)',
    );
  });
});
