/** The smoke request's transport (task-13.4 decision 4) and the live-card fetch (decision 12). */
import {afterEach, describe, expect, test} from 'vitest';
import {A2UI_CLIENT_CAPABILITIES_KEY, clientCapabilities, readAuthRequired} from '@a2uiverse/sdk';
import {fetchCard} from '../src/card.js';
import {a2aSmokeRunner} from '../src/transport.js';
import {
  authRequiredScript,
  failedScript,
  hangingScript,
  noFinalScript,
  STAR_CATALOG_ID,
  startFakeAgent,
  type FakeAgent,
} from './fakeAgent.js';

let agent: FakeAgent | undefined;
afterEach(async () => {
  await agent?.close();
  agent = undefined;
});

const ENTITLEMENT = [
  'https://a2ui.org/specification/v0_9/catalogs/basic/catalog.json',
  STAR_CATALOG_ID,
];
const run = a2aSmokeRunner();

describe('a2aSmokeRunner', () => {
  test('an agent that paints and completes: the end state, every A2UI message, the request as sent', async () => {
    agent = await startFakeAgent();
    const seen = await run({
      card: agent.card,
      entitlement: ENTITLEMENT,
      words: 'Hello!',
      timeoutMs: 5000,
    });
    expect(seen.kind).toBe('ended');
    if (seen.kind !== 'ended') return;
    expect(seen.state).toBe('completed');
    expect(seen.messages.map(m => Object.keys(m).find(k => k !== 'version'))).toEqual([
      'createSurface',
      'updateComponents',
    ]);
    const [request] = agent.requests;
    expect(request.message.parts).toEqual([{kind: 'text', text: 'Hello!'}]);
    expect(request.message.metadata?.[A2UI_CLIENT_CAPABILITIES_KEY]).toEqual(
      clientCapabilities(ENTITLEMENT),
    );
    expect(request.extensionsHeader).toContain('https://a2ui.org/a2a-extension/a2ui/v0.9.1');
    expect(request.headers.authorization).toBeUndefined();
  });

  test('the credential rides as the headers given, on the request to the agent', async () => {
    agent = await startFakeAgent({signIn: 'apiKey'});
    await run({
      card: agent.card,
      entitlement: ENTITLEMENT,
      words: 'x',
      timeoutMs: 5000,
      headers: {'X-Star-Key': 'secret-key', Authorization: 'Bearer tok'},
    });
    const [request] = agent.requests;
    expect(request.headers['x-star-key']).toBe('secret-key');
    expect(request.headers.authorization).toBe('Bearer tok');
  });

  test('an agent that answers 401', async () => {
    agent = await startFakeAgent({signIn: 'oauth', admit: () => false});
    const seen = await run({
      card: agent.card,
      entitlement: ENTITLEMENT,
      words: 'x',
      timeoutMs: 5000,
    });
    expect(seen).toEqual({kind: 'unauthorized'});
  });

  test('an agent that ends the task as auth-required: the state and the request it carries', async () => {
    agent = await startFakeAgent({
      signIn: 'oauth',
      script: authRequiredScript('signIn', ['write']),
    });
    const seen = await run({
      card: agent.card,
      entitlement: ENTITLEMENT,
      words: 'x',
      timeoutMs: 5000,
    });
    expect(seen.kind).toBe('ended');
    if (seen.kind !== 'ended') return;
    expect(seen.state).toBe('auth-required');
    expect(readAuthRequired(seen.data)).toEqual({security: [{signIn: ['write']}]});
    expect(seen.text).toBe('Please sign in.');
  });

  test('an agent that ends the task as failed, in its words', async () => {
    agent = await startFakeAgent({script: failedScript});
    const seen = await run({
      card: agent.card,
      entitlement: ENTITLEMENT,
      words: 'x',
      timeoutMs: 5000,
    });
    expect(seen).toEqual({kind: 'ended', state: 'failed', messages: [], text: 'boom'});
  });

  test('a stream that ends with no final event', async () => {
    agent = await startFakeAgent({script: noFinalScript});
    const seen = await run({
      card: agent.card,
      entitlement: ENTITLEMENT,
      words: 'x',
      timeoutMs: 5000,
    });
    expect(seen).toEqual({kind: 'unfinished', messages: []});
  });

  test('an agent that never answers: an error naming the timeout', async () => {
    agent = await startFakeAgent({script: hangingScript});
    const seen = await run({
      card: agent.card,
      entitlement: ENTITLEMENT,
      words: 'x',
      timeoutMs: 300,
    });
    expect(seen).toEqual({kind: 'error', message: 'the agent did not answer within 0.3 s'});
  });

  test('an agent that cannot be reached', async () => {
    agent = await startFakeAgent();
    const card = {...agent.card, url: 'http://127.0.0.1:1'};
    const seen = await run({card, entitlement: ENTITLEMENT, words: 'x', timeoutMs: 5000});
    expect(seen.kind).toBe('error');
  });
});

describe('fetchCard', () => {
  test('the live card from its URL', async () => {
    agent = await startFakeAgent({version: '0.3.0'});
    const card = await fetchCard(agent.cardUrl, 5000);
    expect(card.version).toBe('0.3.0');
    expect(card.url).toBe(agent.url);
  });

  test('no card there', async () => {
    agent = await startFakeAgent({noCard: true});
    await expect(fetchCard(agent.cardUrl, 5000)).rejects.toThrow('HTTP 404');
  });

  test('nothing listening', async () => {
    await expect(fetchCard('http://127.0.0.1:1/card.json', 5000)).rejects.toThrow();
  });
});
