/** The smoke request's transport (task-13.3 decisions 6, 17): one A2A message, what came back. */
import {afterEach, describe, expect, test} from 'vitest';
import {A2UI_CLIENT_CAPABILITIES_KEY, clientCapabilities, readAuthRequired} from '@a2uiverse/sdk';
import {a2aSmokeRunner} from '../src/smoke.js';
import {
  authRequiredScript,
  failedScript,
  FAKE_CATALOG_ID,
  hangingScript,
  noFinalScript,
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
  FAKE_CATALOG_ID,
];
const run = a2aSmokeRunner();

describe('a2aSmokeRunner', () => {
  test('an agent that paints and completes: the end state and every A2UI message, the request as sent', async () => {
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
  });

  test('an agent that answers 401', async () => {
    agent = await startFakeAgent({signIn: true, admit: () => false});
    const seen = await run({
      card: agent.card,
      entitlement: ENTITLEMENT,
      words: 'x',
      timeoutMs: 5000,
    });
    expect(seen).toEqual({kind: 'unauthorized'});
  });

  test('an agent that ends the task as auth-required: the state and the request it carries', async () => {
    agent = await startFakeAgent({signIn: true, script: authRequiredScript('signIn', ['read'])});
    const seen = await run({
      card: agent.card,
      entitlement: ENTITLEMENT,
      words: 'x',
      timeoutMs: 5000,
    });
    expect(seen.kind).toBe('ended');
    if (seen.kind !== 'ended') return;
    expect(seen.state).toBe('auth-required');
    expect(readAuthRequired(seen.data)).toEqual({security: [{signIn: ['read']}]});
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
    expect(seen.kind).toBe('error');
    if (seen.kind !== 'error') return;
    expect(seen.message).toContain('0.3 s');
  });

  test('an agent that cannot be reached', async () => {
    agent = await startFakeAgent();
    const {card} = agent;
    await agent.close();
    agent = undefined;
    const seen = await run({card, entitlement: ENTITLEMENT, words: 'x', timeoutMs: 5000});
    expect(seen.kind).toBe('error');
  });
});
