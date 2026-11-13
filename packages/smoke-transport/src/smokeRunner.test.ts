/**
 * The smoke request's transport against an A2A 0.3 agent, the server of `@a2a-js/sdk` 0.3.14
 * (task-20.2 decisions 1, 6, 11): one A2A message, what came back.
 */
import {randomUUID} from 'node:crypto';
import {createServer, type Server} from 'node:http';
import {afterEach, describe, expect, test} from 'vitest';
import {
  A2UI_CLIENT_CAPABILITIES_KEY,
  authRequiredData,
  clientCapabilities,
  readAuthRequired,
  type PublishedCard,
} from '@a2uiverse/sdk';
import {a2aSmokeRunner} from './smokeRunner.js';
import {
  authRequiredScript,
  cardFor,
  completingScript,
  failedScript,
  finalUpdate,
  firstTurnTask,
  hangingScript,
  paintParts,
  startFakeAgent,
  statusUpdate,
  submittedOnlyScript,
  unmarkedScript,
  type AgentCard,
  type FakeAgent,
  type Script,
} from './testing/fakeAgent.js';

const CATALOG_ID = 'https://example.com/fake/catalog.json';
const ENTITLEMENT = ['https://a2ui.org/specification/v0_9/catalogs/basic/catalog.json', CATALOG_ID];
const PAINT = paintParts(CATALOG_ID);
const OPERATIONS = ['createSurface', 'updateComponents'];

let agent: FakeAgent | undefined;
let server: Server | undefined;
afterEach(async () => {
  await agent?.close();
  agent = undefined;
  await new Promise<void>(resolve => (server ? server.close(() => resolve()) : resolve()));
  server = undefined;
});

/** A fake agent on `script`, its card carrying `card` beyond the defaults. */
async function start(script: Script = completingScript(PAINT), card: Partial<AgentCard> = {}) {
  agent = await startFakeAgent({
    script,
    card: url => cardFor(url, {catalogs: [CATALOG_ID], card}),
  });
  return agent;
}

/** The card as the marketplace and Stellify hold it: as its agent served it. */
const served = (card: AgentCard) => card as unknown as PublishedCard;

const run = a2aSmokeRunner();
const smoke = (
  card: AgentCard,
  extra: {timeoutMs?: number; headers?: Record<string, string>} = {},
) => run({card: served(card), entitlement: ENTITLEMENT, words: 'x', timeoutMs: 5000, ...extra});

const operationsOf = (messages: Record<string, unknown>[]) =>
  messages.map(m => Object.keys(m).find(k => k !== 'version'));

describe('a2aSmokeRunner, the request', () => {
  test('one message in the words given, the entitlement as its client capabilities, the A2UI extensions asked for', async () => {
    const {card, requests} = await start();
    const seen = await run({
      card: served(card),
      entitlement: ENTITLEMENT,
      words: 'Hello!',
      timeoutMs: 5000,
    });
    expect(seen.kind).toBe('ended');
    expect(requests).toHaveLength(1);
    const [request] = requests;
    expect(request.message.parts).toEqual([{kind: 'text', text: 'Hello!'}]);
    expect(request.message.metadata?.[A2UI_CLIENT_CAPABILITIES_KEY]).toEqual(
      clientCapabilities(ENTITLEMENT),
    );
    expect(request.extensionsHeader).toContain('https://a2ui.org/a2a-extension/a2ui/v0.9.1');
    expect(request.headers.authorization).toBeUndefined();
  });

  test('a map by version is advertised key by key, each version its own set (task-19.2 decision 6)', async () => {
    const {card, requests} = await start();
    const byVersion = {'v0.9': [ENTITLEMENT[0]], 'v0.9.1': ENTITLEMENT};
    const seen = await run({
      card: served(card),
      entitlement: byVersion,
      words: 'x',
      timeoutMs: 5000,
    });
    expect(seen.kind).toBe('ended');
    expect(requests[0].message.metadata?.[A2UI_CLIENT_CAPABILITIES_KEY]).toEqual(
      clientCapabilities(byVersion),
    );
  });

  test('the credential rides as the headers given, on the request to the agent', async () => {
    const {card, requests} = await start();
    await smoke(card, {headers: {'X-Star-Key': 'secret-key', Authorization: 'Bearer tok'}});
    const [request] = requests;
    expect(request.headers['x-star-key']).toBe('secret-key');
    expect(request.headers.authorization).toBe('Bearer tok');
  });
});

describe('a2aSmokeRunner, an answer that ended', () => {
  test('an agent that paints and completes: the end state and every A2UI message', async () => {
    const {card} = await start();
    const seen = await smoke(card);
    expect(seen.kind).toBe('ended');
    if (seen.kind !== 'ended') return;
    expect(seen.state).toBe('completed');
    expect(operationsOf(seen.messages)).toEqual(OPERATIONS);
  });

  test('a bare message ends the answer as completed, with what it carried', async () => {
    const {card} = await start(() => [
      {kind: 'message', messageId: randomUUID(), role: 'agent', parts: PAINT},
    ]);
    const seen = await smoke(card);
    expect(seen.kind).toBe('ended');
    if (seen.kind !== 'ended') return;
    expect(seen.state).toBe('completed');
    expect(operationsOf(seen.messages)).toEqual(OPERATIONS);
  });

  test('an agent that ends the task as auth-required: the state and the request it carries', async () => {
    const {card} = await start(authRequiredScript('signIn', ['read']));
    const seen = await smoke(card);
    expect(seen.kind).toBe('ended');
    if (seen.kind !== 'ended') return;
    expect(seen.state).toBe('auth-required');
    expect(readAuthRequired(seen.data)).toEqual({security: [{signIn: ['read']}]});
    expect(seen.text).toBe('Please sign in.');
  });

  test('a stream closing on auth-required set by an update not marked final has ended asking to sign in (task-20.2 decision 6)', async () => {
    const {card} = await start(({ctx}) => [
      firstTurnTask(ctx),
      statusUpdate(
        ctx,
        'auth-required',
        [{kind: 'data', data: {...authRequiredData({security: [{signIn: ['read']}]})}}],
        false,
      ),
    ]);
    const seen = await smoke(card);
    expect(seen.kind).toBe('ended');
    if (seen.kind !== 'ended') return;
    expect(seen.state).toBe('auth-required');
    expect(readAuthRequired(seen.data)).toEqual({security: [{signIn: ['read']}]});
  });

  test('an agent that ends the task as failed, in its words', async () => {
    const {card} = await start(failedScript);
    expect(await smoke(card)).toEqual({
      kind: 'ended',
      state: 'failed',
      messages: [],
      text: 'boom',
    });
  });

  test('a stream closing on input-required, not marked final: ended there, with its paint', async () => {
    const {card} = await start(unmarkedScript(['input-required'], PAINT));
    const seen = await smoke(card);
    expect(seen.kind).toBe('ended');
    if (seen.kind !== 'ended') return;
    expect(seen.state).toBe('input-required');
    expect(operationsOf(seen.messages)).toEqual(OPERATIONS);
  });
});

describe('a2aSmokeRunner, an answer that never finished', () => {
  test('a status update marked final while its task is still working does not end the answer (task-20.2 decision 6)', async () => {
    const {card} = await start(({ctx}) => [firstTurnTask(ctx), finalUpdate(ctx, 'working', PAINT)]);
    const seen = await smoke(card);
    expect(seen.kind).toBe('unfinished');
    if (seen.kind !== 'unfinished') return;
    expect(seen.state).toBe('working');
    expect(operationsOf(seen.messages)).toEqual(OPERATIONS);
  });

  test('a stream that closes on a task still submitted names that state', async () => {
    const {card} = await start(submittedOnlyScript);
    expect(await smoke(card)).toEqual({kind: 'unfinished', state: 'submitted', messages: []});
  });

  test('input-required followed by more work before the close names the last state', async () => {
    const {card} = await start(unmarkedScript(['input-required', 'working'], PAINT));
    const seen = await smoke(card);
    expect(seen.kind).toBe('unfinished');
    if (seen.kind !== 'unfinished') return;
    expect(seen.state).toBe('working');
  });

  test("a state with no name in A2A 1.0 is spelled as A2A 0.3 spells it, 'unknown'", async () => {
    const {card} = await start(({ctx}) => [
      firstTurnTask(ctx),
      statusUpdate(ctx, 'unknown', [], false),
    ]);
    expect(await smoke(card)).toEqual({kind: 'unfinished', state: 'unknown', messages: []});
  });

  test('a stream that carried nothing names no state', async () => {
    server = createServer((_req, res) => {
      res.writeHead(200, {'content-type': 'text/event-stream'});
      res.end();
    });
    await new Promise<void>(resolve => server!.listen(0, '127.0.0.1', resolve));
    const address = server.address();
    if (!address || typeof address === 'string') throw new Error('no port');
    const card = cardFor(`http://127.0.0.1:${address.port}`, {catalogs: [CATALOG_ID]});
    expect(await smoke(card)).toEqual({kind: 'unfinished', messages: []});
  });
});

describe('a2aSmokeRunner, a request that could not be made', () => {
  test('an agent that answers 401', async () => {
    agent = await startFakeAgent({
      script: completingScript(PAINT),
      card: url => cardFor(url, {catalogs: [CATALOG_ID]}),
      admit: () => false,
    });
    expect(await smoke(agent.card)).toEqual({kind: 'unauthorized'});
  });

  test('an agent that never answers: an error naming the timeout', async () => {
    const {card} = await start(hangingScript);
    expect(await smoke(card, {timeoutMs: 300})).toEqual({
      kind: 'error',
      message: 'the agent did not answer within 0.3 s',
    });
  });

  test('an agent that cannot be reached', async () => {
    const seen = await smoke(cardFor('http://127.0.0.1:1', {catalogs: [CATALOG_ID]}));
    expect(seen.kind).toBe('error');
  });

  test("a 0.3 card the A2A SDK's translators refuse: an error in the A2A SDK's own words (task-20.2 decision 5)", async () => {
    const {card, requests} = await start();
    const {skills: _skills, ...noSkills} = card;
    const seen = await run({
      card: noSkills as unknown as PublishedCard,
      entitlement: ENTITLEMENT,
      words: 'x',
      timeoutMs: 5000,
    });
    expect(seen.kind).toBe('error');
    if (seen.kind !== 'error') return;
    expect(seen.message).toMatch(/skills/);
    expect(requests).toHaveLength(0);
  });
});
