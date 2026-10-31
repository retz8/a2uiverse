/**
 * The Planner (task-6.4 decisions 5, 6, 8): the prompt's assembly, the worked examples through the
 * whole validator, and the loop — text out, readers as tools, one retry in the same conversation,
 * a five-step budget per attempt, the Store's search beside the readers (task 15.4) — driven by
 * the AI SDK's mock model.
 */
import type {AgentCard} from '@a2a-js/sdk';
import {createA2uiValidator} from '@a2uiverse/sdk';
import {LAYOUT_SURFACE_KEEP_SET} from '@a2uiverse/shell-catalog/schema';
import {MockLanguageModelV3} from 'ai/test';
import {describe, expect, test, vi} from 'vitest';
import {
  LAYOUT_SURFACE_SCHEMA,
  type DispatchEntry,
  type LayoutSurface,
} from '../src/planner/document.js';
import {LAYOUT_EXAMPLES} from '../src/planner/examples.js';
import {
  MAX_ATTEMPTS,
  MAX_STEPS,
  ModelPlanner,
  type CommittedPlan,
  type LayoutPiece,
} from '../src/planner/planner.js';
import {
  buildPlannerTurn,
  buildRetryTurn,
  LAYOUT_SURFACE_TAG,
  plannerSystemPrompt,
  readPlannerFiles,
} from '../src/planner/prompt.js';
import type {PlatformReaders} from '../src/planner/readers.js';
import {searchesOf, type StoreAnswer, type StoreSearch} from '../src/planner/storeSearch.js';
import {validateLayoutSurface} from '../src/planner/validate.js';
import type {ShortlistEntry} from '../src/router/router.js';
import {blockPieces, liveStream, streamOf, streaming} from './streamingModel.js';

// The provider's V3 shapes, reached through the mock so the test needs no provider package.
type MockOptions = NonNullable<ConstructorParameters<typeof MockLanguageModelV3>[0]>;
type DoGenerate = Extract<MockOptions['doGenerate'], (...args: never[]) => unknown>;
type LanguageModelV3CallOptions = Parameters<DoGenerate>[0];
type LanguageModelV3GenerateResult = Awaited<ReturnType<DoGenerate>>;

function entry(appId: string, name: string, description: string): ShortlistEntry {
  const card: AgentCard = {
    name,
    description,
    version: '0.0.0',
    protocolVersion: '0.3.0',
    url: 'http://127.0.0.1:0',
    preferredTransport: 'JSONRPC',
    capabilities: {},
    defaultInputModes: ['text'],
    defaultOutputModes: ['text'],
    skills: [{id: 's', name: `${name} skill`, description, tags: [], examples: [`ask ${name}`]}],
  };
  return {
    record: {
      id: appId,
      displayName: name,
      agentUrl: `http://localhost/${appId}`,
      authScheme: 'none',
      catalogId: `cat-${appId}`,
      catalogPackage: `${appId}-catalog`,
    },
    card,
    score: 1,
  };
}

const shortlist = [
  entry('github', 'GitHub', 'code'),
  entry('gmail', 'Gmail', 'mail'),
  entry('shell', 'A2UIVerse', 'the platform'),
];

const files = readPlannerFiles();
const tree = createA2uiValidator({catalog: files.catalog});

const good: LayoutSurface = {
  dispatch: [
    {source: 'github', request: 'Open PRs awaiting my review, with the time of each.'},
    {source: 'gmail', request: 'Unread mail needing a reply, with the time of each.'},
  ],
  tree: {
    components: [
      {id: 'root', component: 'Column', children: ['heading', 'sources']},
      {id: 'heading', component: 'Text', variant: 'h3', text: 'Catching you up'},
      {id: 'sources', component: 'Row', children: ['gh', 'gm']},
      {id: 'gh', component: 'Slot', source: 'github'},
      {id: 'gm', component: 'Slot', source: 'gmail'},
    ],
  },
  dataModel: {},
};

const tagged = (document: LayoutSurface | string) =>
  `<${LAYOUT_SURFACE_TAG}>\n${typeof document === 'string' ? document : JSON.stringify(document)}\n</${LAYOUT_SURFACE_TAG}>`;

const text = (t: string): LanguageModelV3GenerateResult => ({
  finishReason: {unified: 'stop', raw: undefined},
  usage: {
    inputTokens: {total: 1, noCache: 1, cacheRead: undefined, cacheWrite: undefined},
    outputTokens: {total: 1, text: 1, reasoning: undefined},
  },
  content: [{type: 'text', text: t}],
  warnings: [],
});

const toolCall = (
  toolName: string,
  id = 'call-1',
  input: object = {},
): LanguageModelV3GenerateResult => ({
  finishReason: {unified: 'tool-calls', raw: undefined},
  usage: {
    inputTokens: {total: 1, noCache: 1, cacheRead: undefined, cacheWrite: undefined},
    outputTokens: {total: 1, text: 1, reasoning: undefined},
  },
  content: [{type: 'tool-call', toolCallId: id, toolName, input: JSON.stringify(input)}],
  warnings: [],
});

/** A scripted model: one result per call, streamed, the last repeated; every call's options kept. */
function scripted(results: LanguageModelV3GenerateResult[]) {
  const calls: LanguageModelV3CallOptions[] = [];
  const model = new MockLanguageModelV3(
    streaming({
      doGenerate: async options => {
        calls.push(options);
        return results[Math.min(calls.length - 1, results.length - 1)]!;
      },
    }),
  );
  return {model, calls};
}

const readers: PlatformReaders = {
  installedApps: () => [{id: 'gmail', displayName: 'Gmail', skills: [], reachable: true}],
  thisComposition: () => undefined,
  recentTurns: () => ['2026-09-13T06:00:00.000Z · utterance "x" → gmail (completed) · completed'],
};

const planner = (model: MockLanguageModelV3) =>
  new ModelPlanner({model, systemPrompt: 'SYSTEM', catalog: files.catalog, readers});

const input = {utterance: 'catch me up', shortlist, askedFrom: 'c1'};

/** The text of every message of a role in a call's prompt, flattened. */
function messagesOf(call: LanguageModelV3CallOptions, role: string): string[] {
  return call.prompt
    .filter(m => m.role === role)
    .map(m =>
      typeof m.content === 'string'
        ? m.content
        : m.content.map(part => ('text' in part ? part.text : JSON.stringify(part))).join(''),
    );
}

describe('the Planner’s files and prompt', () => {
  test('the catalog is pruned to the layout surface’s keep-set; the guidance is the platform-UI one', () => {
    expect(Object.keys(files.catalog.components!).sort()).toEqual(
      [...LAYOUT_SURFACE_KEEP_SET.components].sort(),
    );
    expect(Object.keys(files.catalog.functions!).sort()).toEqual([
      'openAppLibrary',
      'openPublish',
      'openStore',
    ]);
    expect(files.guidance).toContain('# Platform UI guidance');
    expect(files.rules).toContain('# The layout surface');
  });

  test('the system prompt carries role, rules, guidance, the pruned catalog, the output schema and the examples', () => {
    const system = plannerSystemPrompt(files);
    expect(system).toContain('designer');
    expect(system).toContain('## Rules:');
    expect(system).toContain('## UI Description:');
    expect(system).toContain('### Catalog Schema:');
    expect(system).toContain('"Slot"');
    expect(system).not.toContain('"Attribution"');
    expect(system).toContain('### Output Schema:');
    expect(system).toContain('"LayoutSurface"');
    for (const example of LAYOUT_EXAMPLES) expect(system).toContain(`---BEGIN ${example.name}---`);
  });

  test('the answer is asked for title first, then the dispatch list, the data model and the tree — the schema, the rules and every example alike (task-17.9 decision 4)', () => {
    const order = ['title', 'dispatch', 'dataModel', 'tree'];
    expect(Object.keys(LAYOUT_SURFACE_SCHEMA.properties)).toEqual(order);
    expect(files.rules).toMatch(/`title`, then `dispatch`, then\s+`dataModel`, then `tree`/);
    const system = plannerSystemPrompt(files);
    for (const example of LAYOUT_EXAMPLES) {
      const shown = system.split(`---BEGIN ${example.name}---\n`)[1]!.split('\n---END')[0]!;
      const output = (JSON.parse(shown) as {output: Record<string, unknown>}).output;
      expect(Object.keys(output)).toEqual(order.filter(key => key in output));
    }
  });

  test.each(LAYOUT_EXAMPLES)('the worked example $name passes the whole validator', example => {
    const shown = example.readers?.find(r => r.reader === 'installed_apps')?.result;
    const result = validateLayoutSurface(example.output, {
      tree,
      shortlist: example.agents.flatMap(a => a.sources?.map(({source}) => source) ?? [a.appId]),
      installed: [
        ...example.agents.map(a => a.appId),
        ...((shown as {id: string}[] | undefined) ?? []).map(app => app.id),
      ],
      searches: searchesOf(
        (example.readers ?? []).map(r => ({name: r.reader, args: r.args, result: r.result})),
      ),
    });
    expect(result.ok ? [] : result.errors).toEqual([]);
  });

  test('three slots to a row at most: the rules say so, no example puts more side by side, and one splits four sources into rows under the merged view (Material Design 3, Breakpoints: up to three panes side by side)', () => {
    expect(files.rules).toMatch(/at most three slots side by side/);
    const slotsIn = (example: (typeof LAYOUT_EXAMPLES)[number], id: string) =>
      example.output.tree.components.find(c => c.id === id) as {
        component: string;
        children?: string[];
      };
    for (const example of LAYOUT_EXAMPLES) {
      for (const row of example.output.tree.components.filter(c => c.component === 'Row')) {
        const slots = ((row as {children?: string[]}).children ?? []).filter(
          id => slotsIn(example, id)?.component === 'Slot',
        );
        expect(slots.length, `${example.name}: ${row.id}`).toBeLessThanOrEqual(3);
      }
    }
    const split = LAYOUT_EXAMPLES.find(
      e => e.output.dispatch.filter(d => 'source' in d && d.source !== 'shell').length >= 4,
    )!;
    expect(split).toBeDefined();
    const root = slotsIn(split, 'root');
    expect(root.component).toBe('Column');
    expect(slotsIn(split, root.children![0]!)).toMatchObject({component: 'Slot', source: 'shell'});
    expect(root.children!.slice(1).map(id => slotsIn(split, id).component)).toEqual(['Row', 'Row']);
  });

  test('the out-of-date answer is shown: the reader’s words, how long ago, and a button naming its app (task-14.5 decision 13)', () => {
    const example = LAYOUT_EXAMPLES.find(e => e.name === 'out-of-date-answer')!;
    expect(example.readers?.map(r => r.reader)).toEqual(['installed_apps']);
    const calls = example.output.tree.components.flatMap(c => {
      const action = (c as {action?: {functionCall?: {call: string; args: object}}}).action;
      return action?.functionCall ? [action.functionCall] : [];
    });
    expect(calls).toEqual([
      {call: 'openAppLibrary', args: {}},
      {call: 'openAppLibrary', args: {app: 'linear'}},
    ]);
    expect(JSON.stringify(example.output)).toContain('checked 12 minutes ago');
    // Every state woven into the sentence, none quoted after a colon (task-14.11 decision 41).
    const shown = example.readers![0]!.result as {update: string}[];
    expect(new Set(shown.map(app => app.update))).toEqual(
      new Set([
        'A new version is available',
        'A newer version is on its way from the publisher',
        'Up to date',
        'An update that asks for more',
        'Needs an update to keep working',
      ]),
    );
    const answer = example.output.tree.components.find(c => c.id === 'answer') as {text: string};
    expect(answer.text).toContain('Gmail has one that asks for more access');
    expect(answer.text).toContain('A newer version of CircleCI is on its way from its publisher');
    for (const {update} of shown) expect(answer.text).not.toContain(`: ${update}`);
  });

  test('the account choice is shown: a command over an app with two accounts naming neither (task-12.6 decision 3)', () => {
    const example = LAYOUT_EXAMPLES.find(e => e.output.dispatch.some(d => 'chooseAccount' in d))!;
    expect(example.agents.find(a => a.appId === 'gmail')!.sources).toHaveLength(2);
    expect(example.output.dispatch).toEqual([
      {chooseAccount: 'gmail', request: expect.stringMatching(/Bob/)},
    ]);
    expect(plannerSystemPrompt(files)).toContain('"chooseAccount":"gmail"');
  });

  test('the three kinds of turn are each shown: a fan-out with a merged view, a platform answer from a reader, a gap', () => {
    const kinds = LAYOUT_EXAMPLES.map(e => ({
      merged: e.output.dispatch.some(d => 'source' in d && d.source === 'shell'),
      gap: e.output.dispatch.some(d => 'gap' in d),
      reader: (e.readers ?? []).length > 0,
      vendors: e.output.dispatch.filter(d => 'source' in d && d.source !== 'shell').length,
    }));
    expect(kinds.some(k => k.merged && k.vendors >= 2)).toBe(true);
    expect(kinds.some(k => k.reader && k.vendors === 0 && !k.gap)).toBe(true);
    expect(kinds.some(k => k.gap && k.vendors === 0)).toBe(true);
  });

  test('the join hypothesis: a merged view over one kind of thing, shown over fixture cards of another kind (task-7.6 decisions 1–2)', () => {
    expect(files.rules).toContain('join hypothesis');
    for (const phrase of ['home source', 'cue']) expect(files.rules, phrase).toContain(phrase);
    const join = LAYOUT_EXAMPLES.find(e => e.name === 'orders-join')!;
    expect(join.intent).toBe('Where are my orders?');
    const requests = new Map(
      join.output.dispatch.flatMap(d => ('source' in d ? [[d.source, d.request]] : [])),
    );
    expect([...requests.keys()].sort()).toEqual(['carrier', 'mailbox', 'shell', 'store']);
    expect(requests.get('shell')).toMatch(/home source/i);
    expect(requests.get('carrier')).toMatch(/tracking number/);
    expect(requests.get('mailbox')).toMatch(/order number/);
    for (const [source, request] of requests) {
      if (source !== 'shell') expect(request, source).not.toMatch(/merge|shell|other agent|join/i);
    }
    const system = plannerSystemPrompt(files);
    expect(system).toContain('a merged view over one kind of thing');
  });

  test('what waits on the person gathers from every app holding a part, one not signed in yet among them (task-12.13 decision 49)', () => {
    const rules = files.rules.replace(/\s+/g, ' ');
    for (const phrase of [
      'what is waiting on the person',
      'an issue assigned to them',
      'not signed in yet is dispatched all the same',
    ])
      expect(rules, phrase).toContain(phrase);
  });

  test('“my” names no account: a question about state gathers every account, beside a merged view too (task-12.13 decision 54)', () => {
    const rules = files.rules.replace(/\s+/g, ' ');
    for (const phrase of ['names no account', 'every account is theirs', 'a merged view included'])
      expect(rules, phrase).toContain(phrase);
  });

  test('the turn carries the utterance, each agent’s card, the platform’s card apart, and the tag', () => {
    const turn = buildPlannerTurn({utterance: 'my day at a glance', shortlist});
    expect(turn).toContain('my day at a glance');
    expect(turn).toContain('appId: github');
    expect(turn).toContain('GitHub skill');
    expect(turn).toContain('ask Gmail');
    expect(turn).toContain("The platform's card");
    expect(turn.indexOf("The platform's card")).toBeGreaterThan(turn.indexOf('appId: gmail'));
    expect(turn).toContain(`<${LAYOUT_SURFACE_TAG}>`);
    expect(turn).not.toContain('slot-');
  });

  test('each agent carries its sources: an account by its label, the next sign-in’s as not signed in yet (task-12.6 decision 1)', () => {
    const sourcesOf = (appId: string) =>
      appId === 'gmail'
        ? [
            {source: 'gmail.1', label: 'jioh@gmail.com'},
            {source: 'gmail.2', label: 'jioh@umich.edu'},
          ]
        : appId === 'github'
          ? [{source: 'github.1', notSignedIn: true as const}]
          : [{source: appId}];
    const turn = buildPlannerTurn({utterance: 'x', shortlist}, sourcesOf);
    expect(turn).toContain(
      '- appId: gmail\n  sources:\n    - gmail.1 · jioh@gmail.com\n    - gmail.2 · jioh@umich.edu\n  name: Gmail',
    );
    expect(turn).toContain('- appId: github\n  sources:\n    - github.1 · not signed in yet\n');
    expect(turn).not.toContain('sources:\n    - shell');
  });

  test('without sources each agent is its bare app id', () => {
    expect(buildPlannerTurn({utterance: 'x', shortlist})).toContain(
      '- appId: github\n  sources:\n    - github\n',
    );
  });

  test('a shortlist without the platform’s card says so, so the model does not invent one', () => {
    const turn = buildPlannerTurn({utterance: 'x', shortlist: shortlist.slice(0, 2)});
    expect(turn).not.toContain("The platform's card");
  });

  test('the retry turn asks for a fix, not a fresh answer', () => {
    const retry = buildRetryTurn(['/tree: no Slot holds source gmail']);
    expect(retry).toContain('rejected');
    expect(retry).toContain('- /tree: no Slot holds source gmail');
    expect(retry).toContain('do not start over');
  });
});

describe('ModelPlanner — the loop', () => {
  test('a good first answer is planned in one attempt; the call carried the system prompt, the turn and the three readers', async () => {
    const {model, calls} = scripted([text(tagged(good))]);
    const outcome = await planner(model).plan(input);
    expect(outcome.kind).toBe('planned');
    if (outcome.kind !== 'planned') throw new Error('unreachable');
    expect(outcome.document).toEqual(good);
    expect(outcome.attempts).toEqual([{text: tagged(good), errors: []}]);
    expect(outcome.toolCalls).toEqual([]);
    expect(calls).toHaveLength(1);
    expect(messagesOf(calls[0]!, 'system')).toEqual(['SYSTEM']);
    expect(messagesOf(calls[0]!, 'user')[0]).toContain('catch me up');
    expect(calls[0]!.tools?.map(t => t.name).sort()).toEqual([
      'installed_apps',
      'recent_turns',
      'this_canvas',
    ]);
  });

  test('a reader call is a step inside the one call: its result reaches the model and is recorded', async () => {
    const {model, calls} = scripted([toolCall('installed_apps'), text(tagged(good))]);
    const outcome = await planner(model).plan(input);
    expect(outcome.kind).toBe('planned');
    expect(outcome.toolCalls).toEqual([
      {
        name: 'installed_apps',
        args: {},
        result: [{id: 'gmail', displayName: 'Gmail', skills: [], reachable: true}],
        ms: expect.any(Number),
      },
    ]);
    expect(calls).toHaveLength(2);
    const toolMessages = messagesOf(calls[1]!, 'tool');
    expect(toolMessages.join('\n')).toContain('"displayName":"Gmail"');
    expect(outcome.attempts).toHaveLength(1);
  });

  test('a refused answer is retried in the same conversation: the failed answer, the reader results and the findings all stay', async () => {
    const bad: LayoutSurface = {...good, dispatch: good.dispatch.slice(0, 1)};
    const {model, calls} = scripted([
      toolCall('recent_turns'),
      text(tagged(bad)),
      text(tagged(good)),
    ]);
    const outcome = await planner(model).plan(input);
    expect(outcome.kind).toBe('planned');
    expect(outcome.attempts).toHaveLength(2);
    expect(outcome.attempts[0]!.errors).toEqual([
      "/tree (gm): Slot holds source 'gmail', which the dispatch does not name",
    ]);
    expect(outcome.attempts[1]!.errors).toEqual([]);
    expect(calls).toHaveLength(3);
    const retry = calls[2]!;
    expect(messagesOf(retry, 'assistant').join('\n')).toContain(tagged(bad));
    expect(messagesOf(retry, 'tool').join('\n')).toContain('gmail (completed)');
    const users = messagesOf(retry, 'user');
    expect(users.at(-1)).toContain("Slot holds source 'gmail'");
    expect(users.at(-1)).toContain('do not start over');
    // The readers stay callable on the retry.
    expect(retry.tools?.length).toBe(3);
    expect(outcome.toolCalls).toHaveLength(1);
  });

  test('a step budget spent on readers is a failed attempt; two are malformed', async () => {
    const {model, calls} = scripted([toolCall('this_canvas')]);
    const outcome = await planner(model).plan(input);
    expect(outcome.kind).toBe('malformed');
    expect(outcome.attempts).toHaveLength(MAX_ATTEMPTS);
    expect(outcome.attempts[0]!.errors).toEqual([
      expect.stringContaining(`no <${LAYOUT_SURFACE_TAG}> block`),
    ]);
    expect(calls).toHaveLength(MAX_ATTEMPTS * MAX_STEPS);
    expect(outcome.toolCalls).toHaveLength(MAX_ATTEMPTS * MAX_STEPS);
  });

  test('no tagged block, then a block that is not JSON: malformed with both findings', async () => {
    const {model} = scripted([text('I cannot do that.'), text(tagged('{not json'))]);
    const outcome = await planner(model).plan(input);
    expect(outcome.kind).toBe('malformed');
    expect(outcome.attempts.map(a => a.errors[0])).toEqual([
      expect.stringContaining(`no <${LAYOUT_SURFACE_TAG}> block`),
      expect.stringContaining('not valid JSON'),
    ]);
  });

  test('a source off the shortlist is a finding like any other', async () => {
    const off: LayoutSurface = {
      dispatch: [{source: 'reddit', request: 'x'}],
      tree: {
        components: [
          {id: 'root', component: 'Column', children: ['r']},
          {id: 'r', component: 'Slot', source: 'reddit'},
        ],
      },
      dataModel: {},
    };
    const {model} = scripted([text(tagged(off))]);
    const outcome = await planner(model).plan(input);
    expect(outcome.kind).toBe('malformed');
    expect(outcome.attempts[0]!.errors).toEqual([
      "/dispatch/0/source: 'reddit' is not on this turn's shortlist",
    ]);
  });

  test('the shortlist is every source of each shortlisted app: two accounts of one app plan as two sources (task-12.4 decision 2)', async () => {
    const accounts: LayoutSurface = {
      dispatch: [
        {source: 'gmail.1', request: 'work mail'},
        {source: 'gmail.2', request: 'home mail'},
      ],
      tree: {
        components: [
          {id: 'root', component: 'Column', children: ['a', 'b']},
          {id: 'a', component: 'Slot', source: 'gmail.1'},
          {id: 'b', component: 'Slot', source: 'gmail.2'},
        ],
      },
      dataModel: {},
    };
    const sourcesOf = (appId: string) =>
      appId === 'gmail' ? [{source: 'gmail.1'}, {source: 'gmail.2'}] : [{source: appId}];
    const {model} = scripted([text(tagged(accounts))]);
    const outcome = await new ModelPlanner({
      model,
      systemPrompt: 'SYSTEM',
      catalog: files.catalog,
      readers,
      sourcesOf,
    }).plan(input);
    expect(outcome.kind).toBe('planned');
  });
});

describe('ModelPlanner — the Store’s search (task 15.4)', () => {
  const skyway = {
    appId: 'skyway',
    name: 'Skyway',
    publisher: 'skyway-travel',
    description: 'Books flights.',
    skills: [{name: 'Find flights', description: 'Finds flights.', examples: ['To Tokyo']}],
  };
  const flights: LayoutSurface = {
    dispatch: [
      {gap: 'flight booking', offers: [{app: 'skyway', request: 'Flights to Seoul next Friday.'}]},
    ],
    tree: {
      components: [
        {id: 'root', component: 'Column', children: ['f']},
        {id: 'f', component: 'Slot', gap: 'flight booking'},
      ],
    },
    dataModel: {},
  };
  const store = (answer: StoreAnswer): StoreSearch & {asked: string[]} => {
    const asked: string[] = [];
    return {
      asked,
      search: async words => {
        asked.push(words);
        return answer;
      },
    };
  };
  const withStore = (model: MockLanguageModelV3, search: StoreSearch) =>
    new ModelPlanner({
      model,
      systemPrompt: 'SYSTEM',
      catalog: files.catalog,
      readers,
      store: search,
    });

  test('the search is a tool beside the readers; its answer reaches the model and is recorded, and a gap named by its words is planned (decisions 1, 3, 15)', async () => {
    const search = store({apps: [skyway]});
    const {model, calls} = scripted([
      toolCall('search_store', 'call-1', {words: 'flight booking'}),
      text(tagged(flights)),
    ]);
    const outcome = await withStore(model, search).plan(input);
    expect(outcome.kind).toBe('planned');
    expect(calls[0]!.tools?.map(t => t.name).sort()).toEqual([
      'installed_apps',
      'recent_turns',
      'search_store',
      'this_canvas',
    ]);
    expect(search.asked).toEqual(['flight booking']);
    expect(outcome.toolCalls).toEqual([
      {
        name: 'search_store',
        args: {words: 'flight booking'},
        result: {apps: [skyway]},
        ms: expect.any(Number),
      },
    ]);
    expect(messagesOf(calls[1]!, 'tool').join('\n')).toContain('"publisher":"skyway-travel"');
  });

  test('without the Store wired there is no search to call', async () => {
    const {model, calls} = scripted([text(tagged(good))]);
    await planner(model).plan(input);
    expect(calls[0]!.tools?.map(t => t.name)).not.toContain('search_store');
  });

  test('a gap never searched for is refused, and the retry may search (decision 3)', async () => {
    const {model} = scripted([
      text(tagged(flights)),
      toolCall('search_store', 'call-1', {words: 'flight booking'}),
      text(tagged(flights)),
    ]);
    const outcome = await withStore(model, store({apps: [skyway]})).plan(input);
    expect(outcome.kind).toBe('planned');
    expect(outcome.attempts[0]!.errors).toEqual([
      "/dispatch/0/gap: 'flight booking' was never searched for; call search_store with the words a gap names",
      "/dispatch/0/offers/0/app: 'skyway' was not returned by a search this turn made",
    ]);
    expect(outcome.attempts[1]!.errors).toEqual([]);
  });

  test('a search in the first attempt still counts on the retry: this plan’s searches are both attempts’ (decision 3)', async () => {
    const wrongSlot: LayoutSurface = {
      ...flights,
      tree: {
        components: [
          {id: 'root', component: 'Column', children: ['f']},
          {id: 'f', component: 'Slot', gap: 'Flight booking'},
        ],
      },
    };
    const search = store({apps: [skyway]});
    const {model} = scripted([
      toolCall('search_store', 'call-1', {words: 'flight booking'}),
      text(tagged(wrongSlot)),
      text(tagged(flights)),
    ]);
    const outcome = await withStore(model, search).plan(input);
    expect(outcome.kind).toBe('planned');
    expect(outcome.attempts).toHaveLength(2);
    expect(search.asked).toEqual(['flight booking']);
  });

  test('an unreached search is recorded with its cause; its gap offers nothing (decision 3)', async () => {
    const none: LayoutSurface = {...flights, dispatch: [{gap: 'flight booking', offers: []}]};
    const {model} = scripted([
      toolCall('search_store', 'call-1', {words: 'flight booking'}),
      text(tagged(none)),
    ]);
    const outcome = await withStore(model, store({unreached: 'fetch failed'})).plan(input);
    expect(outcome.kind).toBe('planned');
    expect(outcome.toolCalls).toEqual([
      {
        name: 'search_store',
        args: {words: 'flight booking'},
        result: {unreached: 'fetch failed'},
        ms: expect.any(Number),
      },
    ]);
    expect(searchesOf(outcome.toolCalls)).toEqual([
      {words: 'flight booking', reached: false, apps: []},
    ]);
  });

  test('the step budget is one per tool and one for the answer (decision 5)', () => {
    expect(MAX_STEPS).toBe(5);
  });
});

describe('ModelPlanner — the measurement (task 17.5)', () => {
  /** A step whose usage carries every count the record reads. */
  const counted = (result: LanguageModelV3GenerateResult): LanguageModelV3GenerateResult => ({
    ...result,
    usage: {
      inputTokens: {total: 40000, noCache: 4000, cacheRead: 36000, cacheWrite: undefined},
      outputTokens: {total: 900, text: 700, reasoning: 200},
    },
  });
  /** A step whose provider reported no usage at all. */
  const uncounted = (result: LanguageModelV3GenerateResult): LanguageModelV3GenerateResult => ({
    ...result,
    usage: {
      inputTokens: {
        total: undefined,
        noCache: undefined,
        cacheRead: undefined,
        cacheWrite: undefined,
      },
      outputTokens: {total: undefined, text: undefined, reasoning: undefined},
    },
  });
  const logged = () => {
    const lines: string[] = [];
    const spy = vi.spyOn(console, 'log').mockImplementation((line: unknown) => {
      lines.push(String(line));
    });
    return {lines, restore: () => spy.mockRestore()};
  };

  test('a plan that calls a reader and answers: one record per request, in order on the turn’s clock, the tool named and timed (decisions 1–3)', async () => {
    const {model} = scripted([counted(toolCall('installed_apps')), uncounted(text(tagged(good)))]);
    const log = logged();
    const origin = Date.now() - 250;
    const outcome = await new ModelPlanner({
      model,
      effort: 'low',
      systemPrompt: 'SYSTEM',
      catalog: files.catalog,
      readers,
    }).plan({...input, clock: {origin, task: 't1'}});
    log.restore();
    expect(outcome.kind).toBe('planned');
    expect(outcome.effort).toBe('low');
    const [first, second] = outcome.requests!;
    expect(outcome.requests).toHaveLength(2);
    expect(first).toMatchObject({
      attempt: 1,
      step: 1,
      model: {provider: 'mock-provider', modelId: 'mock-model-id'},
      ended: 'toolCall',
      finish: 'tool-calls',
      tools: ['installed_apps'],
      usage: {promptTokens: 40000, outputTokens: 900, reasoningTokens: 200, cachedTokens: 36000},
    });
    expect(second).toMatchObject({attempt: 1, step: 2, ended: 'text', finish: 'stop'});
    expect(second).not.toHaveProperty('usage');
    expect(second).not.toHaveProperty('tools');
    // Placed on the clock the turn's origin starts: the attempt began after it, each step after the last.
    expect(first!.startMs).toBeGreaterThanOrEqual(250);
    expect(first!.endMs).toBe(first!.startMs + first!.modelMs);
    expect(second!.startMs).toBeGreaterThanOrEqual(first!.endMs);
    expect(outcome.toolCalls[0]!.ms).toEqual(expect.any(Number));
    // One line per request, as each ends (decision 4).
    const lines = log.lines.filter(line => line.includes('Planner request'));
    expect(lines).toHaveLength(2);
    expect(lines[0]).toMatch(
      /Planner request task=t1 1\.1 on mock-model-id: model \d+ ms at \d+ ms, first token \d+ ms, ended in toolCall \(installed_apps \d+ ms\), 40000 prompt \/ 900 output \/ 200 reasoning \/ 36000 cached tokens$/,
    );
    expect(lines[1]).toMatch(/1\.2 on mock-model-id: .*ended in text, no usage reported$/);
  });

  test('every request carries its time to first token, the retry’s included, and its instant on the turn’s clock (task-17.9 decision 8)', async () => {
    const {model} = scripted([text('no block'), toolCall('installed_apps'), text(tagged(good))]);
    const log = logged();
    const outcome = await planner(model).plan({...input, clock: {origin: Date.now(), task: 't1'}});
    log.restore();
    expect(outcome.requests).toHaveLength(3);
    for (const request of outcome.requests!) {
      expect(request.timeToFirstTokenMs).toEqual(expect.any(Number));
      expect(request.firstTokenMs).toBe(request.startMs + request.timeToFirstTokenMs!);
    }
  });

  test('a plan that searches the Store: the search’s own time on its tool-call record', async () => {
    const {model} = scripted([
      toolCall('search_store', 'call-1', {words: 'flight booking'}),
      text(tagged(good)),
    ]);
    const slow: StoreSearch = {
      async search() {
        await new Promise(resolve => setTimeout(resolve, 40));
        return {apps: []};
      },
    };
    const log = logged();
    const outcome = await new ModelPlanner({
      model,
      systemPrompt: 'SYSTEM',
      catalog: files.catalog,
      readers,
      store: slow,
    }).plan(input);
    log.restore();
    expect(outcome.requests?.[0]?.tools).toEqual(['search_store']);
    expect(outcome.toolCalls[0]!.ms).toBeGreaterThanOrEqual(35);
    expect(outcome.requests?.[1]?.startMs).toBeGreaterThanOrEqual(outcome.requests![0]!.endMs + 35);
  });

  test('a plan refused once and accepted on the retry: both attempts’ requests, each numbered from 1', async () => {
    const {model} = scripted([text('no block'), text(tagged(good))]);
    const log = logged();
    const outcome = await planner(model).plan(input);
    log.restore();
    expect(outcome.kind).toBe('planned');
    expect(outcome.requests?.map(r => [r.attempt, r.step])).toEqual([
      [1, 1],
      [2, 1],
    ]);
    expect(outcome).not.toHaveProperty('effort');
  });

  test('a request that throws leaves its line and the throw', async () => {
    const model = new MockLanguageModelV3({
      doStream: async () => {
        throw new Error('quota exceeded');
      },
    });
    const log = logged();
    await expect(
      planner(model).plan({...input, clock: {origin: Date.now(), task: 't2'}}),
    ).rejects.toThrow();
    log.restore();
    expect(
      log.lines.some(line => /Planner request task=t2 1\.1: error after \d+ ms/.test(line)),
    ).toBe(true);
  });
});

describe('ModelPlanner — the answer followed as it is written (task 17.9)', () => {
  /** In the order the Planner is asked to write it (decision 4). */
  const ordered = (document: LayoutSurface): LayoutSurface => ({
    ...(document.title !== undefined ? {title: document.title} : {}),
    dispatch: document.dispatch,
    dataModel: document.dataModel,
    tree: document.tree,
  });
  const titled = ordered({...good, title: 'Catching you up'});
  type Told = {committed: CommittedPlan} | {piece: LayoutPiece};

  /** A model answering each attempt from the next stream handed to it; every call's options kept. */
  function streamed(attempts: ({result: ReturnType<typeof liveStream>['result']} | string)[]) {
    const calls: LanguageModelV3CallOptions[] = [];
    const model = new MockLanguageModelV3({
      doStream: async options => {
        calls.push(options);
        const next = attempts[Math.min(calls.length - 1, attempts.length - 1)]!;
        return typeof next === 'string' ? streamOf(text(next)) : next.result;
      },
    });
    return {model, calls};
  }

  /** The plan run with the stream told, and what it was told, in order. */
  function follow(model: MockLanguageModelV3) {
    const told: Told[] = [];
    const outcome = planner(model).plan({
      ...input,
      stream: {
        committed: plan => told.push({committed: plan}),
        piece: piece => told.push({piece}),
      },
    });
    return {told, outcome};
  }

  /** Writes each piece, letting the Planner read it before the next. */
  async function writeAll(live: ReturnType<typeof liveStream>, pieces: readonly string[]) {
    for (const piece of pieces) {
      live.write(piece);
      await new Promise(resolve => setTimeout(resolve, 0));
    }
  }

  test('the dispatch list is committed as soon as it is written and passes its own checks, with the title before it, before any layout is written (decision 1)', async () => {
    const live = liveStream();
    const {model} = streamed([live]);
    const {told, outcome} = follow(model);
    const [head, ...rest] = blockPieces(LAYOUT_SURFACE_TAG, titled);
    await writeAll(live, [head!, rest[0]!]);
    await vi.waitFor(() => expect(told).toHaveLength(1));
    expect(told[0]).toEqual({
      committed: {dispatch: titled.dispatch, title: 'Catching you up', toolCalls: []},
    });
    await writeAll(live, rest.slice(1));
    live.end();
    const planned = await outcome;
    expect(planned.kind).toBe('planned');
  });

  test('each piece of the layout is told as it is written: the data model, then each component in order (decision 3)', async () => {
    const live = liveStream();
    const {model} = streamed([live]);
    const {told, outcome} = follow(model);
    const pieces = blockPieces(LAYOUT_SURFACE_TAG, {...titled, dataModel: {greeting: 'hi'}});
    await writeAll(live, pieces.slice(0, 4));
    expect(told.slice(1)).toEqual([{piece: {dataModel: {greeting: 'hi'}}}]);
    await writeAll(live, pieces.slice(4, 6));
    expect(told.slice(2)).toEqual([
      {piece: {component: good.tree.components[0]}},
      {piece: {component: good.tree.components[1]}},
    ]);
    await writeAll(live, pieces.slice(6));
    live.end();
    await outcome;
    expect(told.slice(1).map(t => ('piece' in t ? t.piece : undefined))).toEqual([
      {dataModel: {greeting: 'hi'}},
      ...good.tree.components.map(component => ({component})),
    ]);
  });

  test('an answer in another order is accepted: what is written before the list waits for it (decision 4)', async () => {
    const {model} = streamed([
      blockPieces(LAYOUT_SURFACE_TAG, titled, ['tree', 'dataModel', 'dispatch', 'title']).join(''),
    ]);
    const {told, outcome} = follow(model);
    const planned = await outcome;
    expect(planned.kind).toBe('planned');
    expect(told[0]).toEqual({committed: {dispatch: titled.dispatch, toolCalls: []}});
    expect(told.slice(1)).toEqual([
      ...good.tree.components.map(component => ({piece: {component}})),
      {piece: {dataModel: {}}},
    ]);
  });

  test('a list that fails its own checks commits nothing; the retry is the whole answer, told as it is written (decision 2)', async () => {
    const off = ordered({
      ...titled,
      dispatch: [{source: 'reddit', request: 'x'}, ...titled.dispatch],
    });
    const {model, calls} = streamed([tagged(off), tagged(titled)]);
    const {told, outcome} = follow(model);
    const planned = await outcome;
    expect(planned.kind).toBe('planned');
    expect(planned.attempts[0]!.errors).toEqual(
      expect.arrayContaining([expect.stringContaining("'reddit' is not on this turn's shortlist")]),
    );
    expect(messagesOf(calls[1]!, 'user').at(-1)).not.toContain('already sent');
    expect(told[0]).toEqual({
      committed: {dispatch: titled.dispatch, title: titled.title, toolCalls: []},
    });
    expect(told.filter(t => 'committed' in t)).toHaveLength(1);
    expect(told.filter(t => 'piece' in t)).toHaveLength(good.tree.components.length + 1);
  });

  test('a component failing its own check stops the telling there; the answer is read to its end and every finding goes back (decision 6)', async () => {
    const bad = ordered({
      ...titled,
      tree: {
        components: [
          good.tree.components[0]!,
          {id: 'heading', component: 'Text', variant: 'h3', text: 'Hi', colour: 'red'},
          ...good.tree.components.slice(2, 4),
        ],
      },
    });
    const {model, calls} = streamed([tagged(bad), tagged(titled)]);
    const {told, outcome} = follow(model);
    const planned = await outcome;
    expect(planned.kind).toBe('planned');
    const pieces = told.filter(t => 'piece' in t);
    expect(pieces).toEqual([
      {piece: {dataModel: {}}},
      {piece: {component: good.tree.components[0]}},
    ]);
    // Every check ran over the whole first answer: the bad prop and the slot no component holds.
    expect(planned.attempts[0]!.errors).toEqual(
      expect.arrayContaining([
        expect.stringContaining('colour'),
        expect.stringContaining("no Slot holds source 'gmail'"),
      ]),
    );
    expect(messagesOf(calls[1]!, 'user').at(-1)).toContain('colour');
  });

  test('once the list is committed, the retry is on the layout, the data model and the title alone: the list it writes is ignored, nothing of it is told (decision 2)', async () => {
    const missing = {...titled, tree: {components: good.tree.components.slice(0, 4)}};
    const rewritten: LayoutSurface = {
      ...titled,
      title: 'Your morning',
      dispatch: [{source: 'github', request: 'Something else entirely.'}],
    };
    const {model, calls} = streamed([tagged(missing), tagged(rewritten)]);
    const {told, outcome} = follow(model);
    const planned = await outcome;
    if (planned.kind !== 'planned') throw new Error('unreachable');
    expect(planned.document).toEqual({...titled, title: 'Your morning'});
    expect(planned.attempts[1]!.text).toBe(tagged(rewritten));
    expect(told.filter(t => 'committed' in t)).toHaveLength(1);
    expect(told.filter(t => 'piece' in t)).toHaveLength(1 + missing.tree.components.length);
    const retry = messagesOf(calls[1]!, 'user').at(-1)!;
    expect(retry).toContain('already sent');
    expect(retry).toContain("no Slot holds source 'gmail'");
  });

  test('a second failure once the list is committed is malformed (decision 2)', async () => {
    const missing = {...titled, tree: {components: good.tree.components.slice(0, 4)}};
    const {model} = streamed([tagged(missing), tagged(missing)]);
    const {told, outcome} = follow(model);
    expect((await outcome).kind).toBe('malformed');
    expect(told.filter(t => 'committed' in t)).toHaveLength(1);
  });

  test('the list is committed with this plan’s tool calls so far, a search among them for a gap', async () => {
    const withGap: LayoutSurface = {
      title: 'Flights',
      dispatch: [{gap: 'flight booking', offers: [{app: 'skyway', request: 'Flights to Tokyo.'}]}],
      tree: {
        components: [
          {id: 'root', component: 'Column', children: ['g']},
          {id: 'g', component: 'Slot', gap: 'flight booking'},
        ],
      },
      dataModel: {},
    };
    const store: StoreSearch = {
      async search() {
        return {
          apps: [{appId: 'skyway', name: 'Skyway', publisher: 'p', description: 'd', skills: []}],
        };
      },
    };
    let calls = 0;
    const model = new MockLanguageModelV3({
      doStream: async () =>
        streamOf(
          ++calls === 1
            ? toolCall('search_store', 'call-1', {words: 'flight booking'})
            : text(tagged(withGap)),
        ),
    });
    const told: CommittedPlan[] = [];
    const outcome = await new ModelPlanner({
      model,
      systemPrompt: 'SYSTEM',
      catalog: files.catalog,
      readers,
      store,
    }).plan({...input, stream: {committed: plan => told.push(plan), piece: () => {}}});
    expect(outcome.kind).toBe('planned');
    expect(told).toHaveLength(1);
    expect(told[0]!.dispatch).toEqual(withGap.dispatch as DispatchEntry[]);
    expect(told[0]!.toolCalls.map(call => call.name)).toEqual(['search_store']);
  });

  test('without a stream to tell, nothing is committed and a retry is the whole answer', async () => {
    const missing = {...titled, tree: {components: good.tree.components.slice(0, 4)}};
    const {model, calls} = streamed([tagged(missing), tagged(titled)]);
    expect((await planner(model).plan(input)).kind).toBe('planned');
    expect(messagesOf(calls[1]!, 'user').at(-1)).not.toContain('already sent');
  });
});
