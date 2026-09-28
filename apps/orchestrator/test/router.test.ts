import type {AgentCard} from '@a2a-js/sdk';
import {describe, expect, test} from 'vitest';
import {Router} from '../src/router/router.js';
import {FakeEmbedder} from './fakeEmbedder.js';
import {cardUrlOf, testRegistry} from './registryFixture.js';

function cardFor(name: string, description: string, id = name.toLowerCase()): AgentCard {
  return {
    name,
    description,
    version: '0.0.0',
    protocolVersion: '0.3.0',
    url: `http://127.0.0.1/${id}`,
    preferredTransport: 'JSONRPC',
    capabilities: {},
    defaultInputModes: ['text'],
    defaultOutputModes: ['text'],
    skills: [],
  };
}

/** A router over apps installed through the registry; an undefined card is an agent down at startup. */
async function routerWith(cards: Record<string, AgentCard | undefined>, cap = 5) {
  const embedder = new FakeEmbedder();
  const apps = Object.entries(cards).map(([id, card]) => ({
    id,
    card: card ? {...card, url: `http://127.0.0.1/${id}`} : cardFor(id, `${id} agent`, id),
  }));
  const {registry, cards: served} = await testRegistry(apps, {embedder});
  for (const [id, card] of Object.entries(cards)) {
    if (!card) served.cards.delete(cardUrlOf(`http://127.0.0.1/${id}`));
  }
  await registry.refreshCards();
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

  test('a question asked from a view keeps the viewed sources past the cap', async () => {
    const router = await routerWith(
      {
        github: cardFor('GitHub', 'github repositories pull requests'),
        gmail: cardFor('Gmail', 'gmail email inbox'),
        calendar: cardFor('Calendar', 'calendar events'),
      },
      1,
    );
    const out = await router.shortlist('add github pull requests', ['gmail', 'calendar']);
    expect(out.map(e => e.record.id).sort()).toEqual(['calendar', 'github', 'gmail']);
    expect(out[0]!.record.id).toBe('github');
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
