import type {AgentCard} from '@a2a-js/sdk';
import {describe, expect, test} from 'vitest';
import {Registry} from '../src/registry/registry.js';
import {Router} from '../src/router/router.js';
import type {AppRecord} from '../src/registry/types.js';
import {FakeEmbedder} from './fakeEmbedder.js';

function record(id: string): AppRecord {
  return {
    id,
    displayName: id,
    agentUrl: `http://localhost/${id}`,
    authScheme: 'none',
    catalogId: `cat-${id}`,
    catalogPackage: `${id}-catalog`,
  };
}

function cardFor(name: string, description: string): AgentCard {
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
    skills: [],
  };
}

async function routerWith(cards: Record<string, AgentCard | undefined>, cap = 5) {
  const registry = new Registry(Object.keys(cards).map(record));
  const embedder = new FakeEmbedder();
  await registry.refreshCards({
    resolveCard: async url => {
      const id = url.split('/').pop()!;
      const card = cards[id];
      if (!card) throw new Error('down');
      return card;
    },
    embedder,
  });
  return new Router(registry, embedder, {shortlistCap: cap});
}

describe('Router', () => {
  test('ranks agents by corpus similarity to the utterance', async () => {
    const router = await routerWith({
      github: cardFor('GitHub', 'github repositories issues pull requests code'),
      gmail: cardFor('Gmail', 'gmail email inbox labels messages'),
    });
    const out = await router.shortlist('show my github pull requests');
    expect(out.map(e => e.record.id)).toEqual(['github', 'gmail']);
    expect(out[0].score).toBeGreaterThan(out[1].score);
  });

  test('caps the shortlist', async () => {
    const router = await routerWith(
      {
        github: cardFor('GitHub', 'github code'),
        gmail: cardFor('Gmail', 'gmail email'),
        calendar: cardFor('Calendar', 'calendar events'),
      },
      2,
    );
    expect(await router.shortlist('anything at all')).toHaveLength(2);
  });

  test('a null-card agent is never shortlisted', async () => {
    const router = await routerWith({
      github: cardFor('GitHub', 'github code'),
      gmail: undefined,
    });
    const out = await router.shortlist('email from my inbox');
    expect(out.map(e => e.record.id)).toEqual(['github']);
  });

  test('empty corpus shortlists nothing', async () => {
    const router = await routerWith({});
    expect(await router.shortlist('anything')).toEqual([]);
  });

  test('is deterministic across calls', async () => {
    const router = await routerWith({
      github: cardFor('GitHub', 'github repositories'),
      gmail: cardFor('Gmail', 'gmail inbox'),
    });
    const a = await router.shortlist('github repositories');
    const b = await router.shortlist('github repositories');
    expect(a).toEqual(b);
  });
});
