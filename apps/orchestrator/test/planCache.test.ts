/**
 * The plan cache (task-17.6 decisions 7–12): the key over the whole request, what is stored and
 * thrown out as a turn closes, the cap and the age, the file across a restart, and the Planner
 * answering the very same request from it without a model call.
 */
import {mkdtemp, readFile, rm, writeFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {jsonSchema, tool} from 'ai';
import {MockLanguageModelV4} from 'ai/test';
import type {AgentCard} from '@a2a-js/sdk';
import {afterEach, beforeEach, describe, expect, test, vi} from 'vitest';
import type {DispatchRecord} from '../src/agentsPool/types.js';
import type {JournalEntry, PlanRecord} from '../src/journal/types.js';
import type {LayoutSurface} from '../src/planner/document.js';
import {PlanCache, planKey} from '../src/planner/planCache.js';
import {ModelPlanner} from '../src/planner/planner.js';
import {LAYOUT_SURFACE_TAG, readPlannerFiles} from '../src/planner/prompt.js';
import type {PlatformReaders} from '../src/planner/readers.js';
import type {ShortlistEntry} from '../src/router/router.js';

let dir: string;
let opened: PlanCache[] = [];
beforeEach(async () => {
  dir = await mkdtemp(join(tmpdir(), 'a2uiverse-plan-cache-'));
});
afterEach(async () => {
  await Promise.all(opened.map(cache => cache.flushed()));
  opened = [];
  await rm(dir, {recursive: true, force: true});
});

/** A cache whose writes the test waits on before its folder goes. */
function open(...args: ConstructorParameters<typeof PlanCache>): PlanCache {
  const cache = new PlanCache(...args);
  opened.push(cache);
  return cache;
}

const file = () => join(dir, 'plan-cache.json');

const record = (over: Partial<PlanRecord> = {}): PlanRecord => ({
  outcome: 'planned',
  attempts: [{text: 'PLAN', errors: []}],
  toolCalls: [],
  planMs: 10,
  cache: {key: 'k1'},
  ...over,
});

const dispatch = (over: Partial<DispatchRecord> = {}): DispatchRecord => ({
  source: 'github',
  clientContextId: 'c',
  clientTaskId: 't',
  startedAt: '2026-10-30T00:00:00.000Z',
  outcome: 'completed',
  sawFinal: true,
  deadlineMs: 300000,
  ...over,
});

const closedTurn = (plan: PlanRecord, dispatched: DispatchRecord[], closed = false) =>
  ({
    turnId: 't1',
    plan,
    dispatch: dispatched,
    ...(closed ? {closed: true} : {}),
  }) as JournalEntry;

describe('PlanCache — stored and thrown out as a turn closes (decision 8)', () => {
  test('a clean turn stores its plan: every app answered, or asked the person to sign in', async () => {
    const cache = open(file());
    cache.settle(
      closedTurn(record(), [
        dispatch(),
        dispatch({source: 'gmail.1', outcome: 'failed', authority: {kind: 'signIn'} as never}),
      ]),
    );
    expect(cache.get('k1')).toBe('PLAN');
  });

  test('a turn an app failed on stores nothing; nor does one the person closed, or a malformed one', () => {
    const cache = open(file());
    cache.settle(closedTurn(record(), [dispatch({outcome: 'failed', cause: 'vendor'})]));
    cache.settle(closedTurn(record(), [dispatch({outcome: 'timeout'})]));
    cache.settle(closedTurn(record(), [dispatch()], true));
    cache.settle(closedTurn(record({outcome: 'malformed'}), [dispatch()]));
    expect(cache.get('k1')).toBeUndefined();
  });

  test('an app needing an update is a failure, not a sign-in', () => {
    const cache = open(file());
    cache.settle(
      closedTurn(record(), [
        dispatch({outcome: 'failed', authority: {kind: 'signIn'} as never, update: {} as never}),
      ]),
    );
    expect(cache.get('k1')).toBeUndefined();
  });

  test('a plan that called a tool is never stored, nor one with no mark', () => {
    const cache = open(file());
    cache.settle(
      closedTurn(record({toolCalls: [{name: 'installed_apps', args: {}, result: []}]}), []),
    );
    cache.settle(closedTurn(record({cache: undefined}), [dispatch()]));
    expect(cache.get('k1')).toBeUndefined();
  });

  test('a plan the cache served is thrown out when an app it asked fails, and kept when the turn is clean', () => {
    const cache = open(file());
    cache.store('k1', 'PLAN');
    cache.settle(closedTurn(record({cache: {key: 'k1', hit: true}}), [dispatch()]));
    expect(cache.get('k1')).toBe('PLAN');
    cache.settle(
      closedTurn(record({cache: {key: 'k1', hit: true}}), [dispatch({outcome: 'failed'})]),
    );
    expect(cache.get('k1')).toBeUndefined();
  });
});

describe('PlanCache — the cap, the age and the file (decision 9)', () => {
  test('past the cap the least recently used plan leaves; a read makes a plan the most recent', () => {
    const cache = open(file(), {size: 2});
    cache.store('a', 'A');
    cache.store('b', 'B');
    expect(cache.get('a')).toBe('A');
    cache.store('c', 'C');
    expect(cache.get('b')).toBeUndefined();
    expect(cache.get('a')).toBe('A');
    expect(cache.get('c')).toBe('C');
  });

  test('a plan older than the age is not reused', () => {
    let now = 0;
    const cache = open(file(), {now: () => now, maxAgeMs: 1000});
    cache.store('a', 'A');
    now = 1000;
    expect(cache.get('a')).toBe('A');
    now = 1001;
    expect(cache.get('a')).toBeUndefined();
  });

  test('the cache survives a restart through its file', async () => {
    const first = open(file());
    first.store('a', 'A');
    await first.flushed();
    expect(open(file()).get('a')).toBe('A');
  });

  test('a file that cannot be read starts the cache empty, and the cache still works', async () => {
    await writeFile(file(), '{not json');
    const spy = vi.spyOn(console, 'log').mockImplementation(() => {});
    const cache = open(file());
    spy.mockRestore();
    expect(cache.get('a')).toBeUndefined();
    cache.store('a', 'A');
    await cache.flushed();
    expect(JSON.parse(await readFile(file(), 'utf8')).plans).toHaveLength(1);
  });

  test('a file that cannot be written is a log line, never a thrown error (decision 12)', async () => {
    const lines: string[] = [];
    const spy = vi.spyOn(console, 'log').mockImplementation(line => void lines.push(String(line)));
    const cache = open(join(file(), 'under-a-file', 'plan-cache.json'));
    await writeFile(file(), 'a file, not a folder');
    cache.store('a', 'A');
    await cache.flushed();
    spy.mockRestore();
    expect(cache.get('a')).toBe('A');
    expect(lines.some(line => line.includes('plan cache: not written'))).toBe(true);
  });
});

const NONE = jsonSchema({type: 'object', properties: {}});

describe('planKey — the whole request (decision 7)', () => {
  const model = new MockLanguageModelV4({modelId: 'gemini-3.8-flash'});
  const tools = {
    installed_apps: tool({description: 'The apps.', inputSchema: NONE}),
  };
  const parts = {model, reasoning: 'none', system: 'SYSTEM', tools, turn: 'TURN'};

  test('the same request is the same key', async () => {
    expect(await planKey(parts)).toBe(await planKey({...parts}));
  });

  test('any part changed is another key: the system prompt, the turn, a tool, the model, the effort', async () => {
    const key = await planKey(parts);
    const other = new MockLanguageModelV4({modelId: 'claude-sonnet-5-5'});
    const changed = [
      {...parts, system: 'SYSTEM 2'},
      {...parts, turn: 'TURN 2'},
      {
        ...parts,
        tools: {installed_apps: tool({description: 'Other.', inputSchema: NONE})},
      },
      {
        ...parts,
        tools: {
          installed_apps: tool({
            description: 'The apps.',
            inputSchema: jsonSchema({type: 'object', properties: {x: {type: 'string'}}}),
          }),
        },
      },
      {...parts, model: other},
      {...parts, reasoning: 'provider-default'},
    ];
    for (const p of changed) expect(await planKey(p)).not.toBe(key);
  });
});

describe('ModelPlanner with the plan cache (decisions 7, 10)', () => {
  const files = readPlannerFiles();
  const readers: PlatformReaders = {
    installedApps: () => [{id: 'github', displayName: 'GitHub', skills: [], reachable: true}],
    thisComposition: () => undefined,
    recentTurns: () => [],
  };
  const card = (name: string): AgentCard =>
    ({name, description: `${name} things`, skills: []}) as unknown as AgentCard;
  const shortlist = [{record: {id: 'github'}, card: card('GitHub')}] as unknown as ShortlistEntry[];
  const good: LayoutSurface = {
    dispatch: [{source: 'github', request: 'My open pull requests.'}],
    tree: {
      components: [
        {id: 'root', component: 'Column', children: ['gh']},
        {id: 'gh', component: 'Slot', source: 'github'},
      ],
    },
    dataModel: {},
  };
  const answer = `<${LAYOUT_SURFACE_TAG}>${JSON.stringify(good)}</${LAYOUT_SURFACE_TAG}>`;
  const scripted = (results: string[] | 'tool-then-answer') => {
    let calls = 0;
    const model = new MockLanguageModelV4({
      doGenerate: async () => {
        calls++;
        const toolFirst = results === 'tool-then-answer' && calls === 1;
        return {
          finishReason: {unified: toolFirst ? 'tool-calls' : 'stop', raw: undefined},
          usage: {
            inputTokens: {total: 1, noCache: 1, cacheRead: undefined, cacheWrite: undefined},
            outputTokens: {total: 1, text: 1, reasoning: undefined},
          },
          content: toolFirst
            ? [{type: 'tool-call', toolCallId: 'c1', toolName: 'installed_apps', input: '{}'}]
            : [
                {
                  type: 'text',
                  text:
                    results === 'tool-then-answer'
                      ? answer
                      : results[Math.min(calls, results.length) - 1]!,
                },
              ],
          warnings: [],
        };
      },
    });
    return {model, calls: () => calls};
  };
  const plannerOver = (model: MockLanguageModelV4, cache: PlanCache) =>
    new ModelPlanner({model, systemPrompt: 'SYSTEM', catalog: files.catalog, readers, cache});
  const input = {utterance: 'show my open pull requests', shortlist};

  test('a plan the model wrote carries its key; once stored, the very same request is answered from the cache, no model called', async () => {
    const cache = open(file());
    const {model, calls} = scripted([answer]);
    const first = await plannerOver(model, cache).plan(input);
    if (first.kind !== 'planned') throw new Error('unreachable');
    expect(first.cache?.key).toMatch(/^[0-9a-f]{64}$/);
    expect(first.cache?.hit).toBeUndefined();
    cache.store(first.cache!.key, first.attempts.at(-1)!.text);

    const second = await plannerOver(model, cache).plan(input);
    expect(calls()).toBe(1);
    if (second.kind !== 'planned') throw new Error('unreachable');
    expect(second.document).toEqual(good);
    expect(second.cache).toEqual({key: first.cache!.key, hit: true});
    expect(second.requests).toBeUndefined();
  });

  test('another utterance misses and calls the model', async () => {
    const cache = open(file());
    const {model, calls} = scripted([answer, answer]);
    const first = await plannerOver(model, cache).plan(input);
    if (first.kind !== 'planned') throw new Error('unreachable');
    cache.store(first.cache!.key, first.attempts.at(-1)!.text);
    await plannerOver(model, cache).plan({...input, utterance: 'show my issues'});
    expect(calls()).toBe(2);
  });

  test('a plan that called a tool carries no key, so it is never stored', async () => {
    const cache = open(file());
    const {model} = scripted('tool-then-answer');
    const outcome = await plannerOver(model, cache).plan(input);
    if (outcome.kind !== 'planned') throw new Error('unreachable');
    expect(outcome.toolCalls).toHaveLength(1);
    expect(outcome.cache).toBeUndefined();
  });

  test('a stored plan the validator now refuses is thrown out, and the model plans', async () => {
    const cache = open(file());
    const {model, calls} = scripted([answer]);
    const key = (await plannerOver(model, cache).plan(input)) as {cache?: {key: string}};
    const stale = `<${LAYOUT_SURFACE_TAG}>${JSON.stringify({...good, dispatch: [{source: 'linear', request: 'x'}]})}</${LAYOUT_SURFACE_TAG}>`;
    cache.store(key.cache!.key, stale);
    const spy = vi.spyOn(console, 'log').mockImplementation(() => {});
    const outcome = await plannerOver(model, cache).plan(input);
    spy.mockRestore();
    expect(calls()).toBe(2);
    if (outcome.kind !== 'planned') throw new Error('unreachable');
    expect(outcome.cache?.hit).toBeUndefined();
    expect(cache.get(key.cache!.key)).toBeUndefined();
  });

  test('without the cache, no key is carried', async () => {
    const {model} = scripted([answer]);
    const outcome = await new ModelPlanner({
      model,
      systemPrompt: 'SYSTEM',
      catalog: files.catalog,
      readers,
    }).plan(input);
    if (outcome.kind !== 'planned') throw new Error('unreachable');
    expect(outcome.cache).toBeUndefined();
  });
});
