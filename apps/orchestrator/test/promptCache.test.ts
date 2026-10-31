/**
 * The prompt caches and Claude's least effort (task-17.6 decisions 3–6, 11, 12), driven through the
 * providers' own packages over a scripted network, so what is asserted is what would leave.
 */
import {createAnthropic} from '@ai-sdk/anthropic';
import {createGoogleGenerativeAI} from '@ai-sdk/google';
import {generateText, jsonSchema, tool, wrapLanguageModel} from 'ai';
import {afterEach, describe, expect, test, vi} from 'vitest';
import {GEMINI_CACHE_TTL_SECONDS, geminiCacheFetch} from '../src/model/geminiCache.js';
import {CLAUDE_CACHE_CONTROL, claudeSeam, leastThinking} from '../src/model/getModel.js';
import {AttemptMeasurement, requestLine} from '../src/model/requests.js';

interface Sent {
  url: string;
  method: string;
  body: Record<string, unknown> | undefined;
}

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {status, headers: {'content-type': 'application/json'}});

const settle = () => new Promise(resolve => setTimeout(resolve, 0));

afterEach(() => vi.restoreAllMocks());

const GEMINI_ANSWER = {
  candidates: [{content: {role: 'model', parts: [{text: 'ok'}]}, finishReason: 'STOP'}],
  usageMetadata: {promptTokenCount: 10, candidatesTokenCount: 1, totalTokenCount: 11},
};

/** Gemini's API as scripted: model calls answered, caches created and renewed, every request kept. */
function geminiNetwork(script: {model?: (sent: Sent) => Response; create?: () => Response} = {}) {
  const sent: Sent[] = [];
  let made = 0;
  const fetch: typeof globalThis.fetch = async (input, init) => {
    const url = String(input);
    const body = typeof init?.body === 'string' ? JSON.parse(init.body) : undefined;
    const call = {url, method: init?.method ?? 'GET', body};
    sent.push(call);
    if (url.endsWith('/cachedContents')) {
      return (
        script.create?.() ??
        json({
          name: `cachedContents/c${++made}`,
          expireTime: new Date(Date.now() + GEMINI_CACHE_TTL_SECONDS * 1000).toISOString(),
        })
      );
    }
    if (init?.method === 'PATCH') {
      return json({
        expireTime: new Date(Date.now() + GEMINI_CACHE_TTL_SECONDS * 1000).toISOString(),
      });
    }
    return script.model?.(call) ?? json(GEMINI_ANSWER);
  };
  return {fetch, sent, modelCalls: () => sent.filter(s => s.url.includes(':generateContent'))};
}

const tools = {
  installed_apps: tool({
    description: 'The apps.',
    inputSchema: jsonSchema({type: 'object', properties: {}}),
  }),
};

function gemini(fetch: typeof globalThis.fetch, now?: () => number) {
  const google = createGoogleGenerativeAI({
    apiKey: 'test-key',
    fetch: geminiCacheFetch({seam: 'Planner', fetch, ...(now ? {now} : {})}),
  });
  return (prompt = 'the turn', system = 'THE FIXED PROMPT') =>
    generateText({model: google('gemini-3.8-flash'), system, prompt, tools});
}

describe("Gemini's explicit cache (decisions 3, 4, 12)", () => {
  test('the first request goes whole and creates the cache beside it: the system prompt, the tools and their config, an hour, for the model', async () => {
    const net = geminiNetwork();
    await gemini(net.fetch)();
    await settle();
    const [first] = net.modelCalls();
    expect(first?.body).toHaveProperty('systemInstruction');
    expect(first?.body).toHaveProperty('tools');
    expect(first?.body).not.toHaveProperty('cachedContent');
    const create = net.sent.find(s => s.url.endsWith('/cachedContents'));
    expect(create?.method).toBe('POST');
    expect(create?.body).toEqual({
      model: 'models/gemini-3.8-flash',
      systemInstruction: first?.body?.systemInstruction,
      tools: first?.body?.tools,
      toolConfig: first?.body?.toolConfig,
      ttl: '3600s',
    });
  });

  test('the request does not wait for the cache: an unanswered creation holds nothing up', async () => {
    const net = geminiNetwork({create: () => new Promise<never>(() => {}) as never});
    const answered = await gemini(net.fetch)();
    expect(answered.text).toBe('ok');
  });

  test('once held, a request names the cache in place of the system prompt and the tools, keeps the turn, and pushes the expiry an hour out', async () => {
    const net = geminiNetwork();
    const ask = gemini(net.fetch);
    await ask();
    await settle();
    await ask('the next turn');
    await settle();
    const second = net.modelCalls()[1]!;
    expect(second.body?.cachedContent).toBe('cachedContents/c1');
    expect(second.body).not.toHaveProperty('systemInstruction');
    expect(second.body).not.toHaveProperty('tools');
    expect(second.body).not.toHaveProperty('toolConfig');
    expect(JSON.stringify(second.body?.contents)).toContain('the next turn');
    expect(second.body).toHaveProperty('generationConfig');
    const renew = net.sent.find(s => s.method === 'PATCH');
    expect(renew?.url).toMatch(/\/cachedContents\/c1\?updateMask=ttl$/);
    expect(renew?.body).toEqual({ttl: '3600s'});
    expect(net.sent.filter(s => s.url.endsWith('/cachedContents'))).toHaveLength(1);
  });

  test('a refused cache sends the request whole and a new cache is made', async () => {
    let refuse = false;
    const net = geminiNetwork({
      model: sent =>
        refuse && sent.body?.cachedContent !== undefined
          ? json({error: {code: 404, message: 'cache not found'}}, 404)
          : json(GEMINI_ANSWER),
    });
    vi.spyOn(console, 'log').mockImplementation(() => {});
    const ask = gemini(net.fetch);
    await ask();
    await settle();
    refuse = true;
    const answered = await ask('again');
    await settle();
    expect(answered.text).toBe('ok');
    const [, named, whole] = net.modelCalls();
    expect(named?.body?.cachedContent).toBe('cachedContents/c1');
    expect(whole?.body).toHaveProperty('systemInstruction');
    expect(net.sent.filter(s => s.url.endsWith('/cachedContents'))).toHaveLength(2);
  });

  test('a cache at its expiry is not named: the request goes whole and a new cache is made', async () => {
    let now = Date.now();
    const net = geminiNetwork();
    const ask = gemini(net.fetch, () => now);
    await ask();
    await settle();
    now += GEMINI_CACHE_TTL_SECONDS * 1000;
    await ask('an hour later');
    await settle();
    expect(net.modelCalls()[1]?.body).toHaveProperty('systemInstruction');
    expect(net.sent.filter(s => s.url.endsWith('/cachedContents'))).toHaveLength(2);
  });

  test('a cache that cannot be made is a log line; every request still goes whole, and the next tries again', async () => {
    const lines: string[] = [];
    vi.spyOn(console, 'log').mockImplementation(line => void lines.push(String(line)));
    const net = geminiNetwork({create: () => json({error: {message: 'too small'}}, 400)});
    const ask = gemini(net.fetch);
    expect((await ask()).text).toBe('ok');
    await settle();
    expect((await ask('next')).text).toBe('ok');
    await settle();
    expect(net.modelCalls().every(s => s.body?.systemInstruction !== undefined)).toBe(true);
    expect(net.sent.filter(s => s.url.endsWith('/cachedContents'))).toHaveLength(2);
    expect(lines.some(line => line.includes('Planner cache not created: 400'))).toBe(true);
  });

  test('another fixed prompt is another cache', async () => {
    const net = geminiNetwork();
    const ask = gemini(net.fetch);
    await ask('a', 'ONE PROMPT');
    await settle();
    await ask('b', 'ANOTHER PROMPT');
    await settle();
    expect(net.modelCalls()[1]?.body).toHaveProperty('systemInstruction');
    expect(net.sent.filter(s => s.url.endsWith('/cachedContents'))).toHaveLength(2);
  });
});

const CLAUDE_ANSWER = {
  id: 'msg_1',
  type: 'message',
  role: 'assistant',
  model: 'claude',
  content: [{type: 'text', text: 'ok'}],
  stop_reason: 'end_turn',
  stop_sequence: null,
  usage: {
    input_tokens: 2,
    output_tokens: 1,
    cache_creation_input_tokens: 30000,
    cache_read_input_tokens: 0,
  },
};

/** One call through the Anthropic package with Claude's side of the seam, the request body kept. */
async function claude(modelId: string, reasoning: 'none' | 'provider-default') {
  let body: Record<string, unknown> = {};
  const anthropic = createAnthropic({
    apiKey: 'test-key',
    fetch: async (_input, init) => {
      body = JSON.parse(String(init?.body));
      return json(CLAUDE_ANSWER);
    },
  });
  const result = await generateText({
    model: wrapLanguageModel({model: anthropic(modelId), middleware: claudeSeam()}),
    system: 'THE FIXED PROMPT',
    prompt: 'the turn',
    tools,
    reasoning,
  });
  return {body, result};
}

describe("Claude's cache mark and least effort (decisions 5, 6)", () => {
  test('the fixed system prompt carries the one mark, an hour; the turn after it carries none', async () => {
    const {body} = await claude('claude-haiku-5-5', 'none');
    expect(body.system).toEqual([
      {type: 'text', text: 'THE FIXED PROMPT', cache_control: CLAUDE_CACHE_CONTROL},
    ]);
    expect(JSON.stringify(body.messages)).not.toContain('cache_control');
  });

  test('`low` on Sonnet 5.5 is `between_tools` thinking at effort low', async () => {
    const {body} = await claude('claude-sonnet-5-5', 'none');
    expect(body.thinking).toEqual({type: 'between_tools'});
    expect(JSON.stringify(body)).toMatch(/"effort":"low"/);
  });

  test('`low` on Haiku 5.5 is thinking off at effort low', async () => {
    const {body} = await claude('claude-haiku-5-5', 'none');
    expect(body.thinking).toEqual({type: 'disabled'});
    expect(JSON.stringify(body)).toMatch(/"effort":"low"/);
  });

  test('`default` adds no thinking and no effort; the cache mark stays', async () => {
    const {body} = await claude('claude-sonnet-5-5', 'provider-default');
    expect(body).not.toHaveProperty('thinking');
    expect(JSON.stringify(body)).not.toMatch(/"effort"/);
    expect(JSON.stringify(body.system)).toContain('cache_control');
  });

  test('the least thinking read from the SDK’s table of the models', () => {
    expect(leastThinking('claude-sonnet-5-5')).toEqual({
      thinking: {type: 'between_tools'},
      effort: 'low',
    });
    expect(leastThinking('claude-haiku-5-5')).toEqual({
      thinking: {type: 'disabled'},
      effort: 'low',
    });
    expect(leastThinking('claude-opus-5-5')).toEqual({effort: 'low'});
    expect(leastThinking('claude-haiku-4-5')).toBeUndefined();
  });
});

describe('the cache writes on each request (decision 11)', () => {
  test("Claude's cache writes are recorded beside the cached reads and named on the line", async () => {
    const {result} = await claude('claude-haiku-5-5', 'none');
    const measurement = new AttemptMeasurement('Planner', 1);
    vi.spyOn(console, 'log').mockImplementation(() => {});
    for (const step of result.steps) measurement.take(step);
    const [record] = measurement.records;
    expect(record?.usage).toMatchObject({cacheWriteTokens: 30000});
    expect(requestLine('Planner', 't1', record!)).toMatch(/\/ 30000 cache-written tokens$/);
  });
});
