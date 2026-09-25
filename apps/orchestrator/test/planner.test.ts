/**
 * The Planner (task-6.4 decisions 5, 6, 8): the prompt's assembly, the worked examples through the
 * whole validator, and the loop — text out, readers as tools, one retry in the same conversation,
 * a four-step budget per attempt — driven by the AI SDK's mock model.
 */
import type {AgentCard} from '@a2a-js/sdk';
import {createA2uiValidator} from '@a2uiverse/sdk';
import {LAYOUT_SURFACE_KEEP_SET} from '@a2uiverse/shell-catalog/schema';
import {MockLanguageModelV3} from 'ai/test';
import {describe, expect, test} from 'vitest';
import type {LayoutSurface} from '../src/planner/document.js';
import {LAYOUT_EXAMPLES} from '../src/planner/examples.js';
import {plannerProviderOptions} from '../src/planner/getModel.js';
import {MAX_ATTEMPTS, MAX_STEPS, ModelPlanner} from '../src/planner/planner.js';
import {
  buildPlannerTurn,
  buildRetryTurn,
  LAYOUT_SURFACE_TAG,
  plannerSystemPrompt,
  readPlannerFiles,
} from '../src/planner/prompt.js';
import type {PlatformReaders} from '../src/planner/readers.js';
import {validateLayoutSurface} from '../src/planner/validate.js';
import type {ShortlistEntry} from '../src/router/router.js';

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

const toolCall = (toolName: string, id = 'call-1'): LanguageModelV3GenerateResult => ({
  finishReason: {unified: 'tool-calls', raw: undefined},
  usage: {
    inputTokens: {total: 1, noCache: 1, cacheRead: undefined, cacheWrite: undefined},
    outputTokens: {total: 1, text: 1, reasoning: undefined},
  },
  content: [{type: 'tool-call', toolCallId: id, toolName, input: '{}'}],
  warnings: [],
});

/** A scripted model: one result per call, the last repeated; every call's options kept. */
function scripted(results: LanguageModelV3GenerateResult[]) {
  const calls: LanguageModelV3CallOptions[] = [];
  const model = new MockLanguageModelV3({
    doGenerate: async options => {
      calls.push(options);
      return results[Math.min(calls.length - 1, results.length - 1)]!;
    },
  });
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
    expect(Object.keys(files.catalog.functions!).sort()).toEqual(['openAppLibrary', 'openStore']);
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

  test.each(LAYOUT_EXAMPLES)('the worked example $name passes the whole validator', example => {
    const result = validateLayoutSurface(example.output, {
      tree,
      shortlist: example.agents.map(a => a.appId),
    });
    expect(result.ok ? [] : result.errors).toEqual([]);
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

describe('plannerProviderOptions', () => {
  test('low effort spends no thinking budget; default leaves the provider alone', () => {
    expect(plannerProviderOptions({effort: 'low'})).toEqual({
      google: {thinkingConfig: {thinkingBudget: 0}},
    });
    expect(plannerProviderOptions({effort: 'default'})).toBeUndefined();
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
});
