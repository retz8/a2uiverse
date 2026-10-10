/** The platform's card in the Registry (phase-6 decision 1, task-6.4 decision 9). */
import type {AgentCard} from '@a2a-js/sdk';
import {CATALOG_ID as SHELL_CATALOG_ID} from '@a2uiverse/shell-catalog/id';
import {describe, expect, test} from 'vitest';
import {buildAgentCard} from '../src/agentCard.js';
import {Router} from '../src/router/router.js';
import {FakeEmbedder} from '@a2uiverse/embedder';
import {cardUrlOf, testRegistry} from './registryFixture.js';

function cardFor(name: string, description: string): AgentCard {
  return {
    name,
    description,
    version: '0.0.0',
    protocolVersion: '0.3.0',
    url: 'http://localhost:11001',
    preferredTransport: 'JSONRPC',
    capabilities: {},
    defaultInputModes: ['text'],
    defaultOutputModes: ['text'],
    skills: [],
  };
}

const platformCard = buildAgentCard('https://x-10001.asse.devtunnels.ms');

/** GitHub installed through the registry, the platform's card handed to it or not. */
async function withGithub(description: string, options: {platform?: boolean} = {}) {
  const embedder = new FakeEmbedder();
  const made = await testRegistry([{id: 'github', card: cardFor('GitHub', description)}], {
    embedder,
    ...(options.platform === false ? {} : {platformCard}),
  });
  return {...made, embedder};
}

describe('Registry with the platform’s card', () => {
  test('indexes it under shell at startup, in-process, with no fetch', async () => {
    const {registry, cards} = await withGithub('repositories');
    cards.fetched.length = 0;
    await registry.refreshCards();
    expect(cards.fetched).toEqual([cardUrlOf('http://localhost:11001')]);
    expect(registry.card('shell')).toBe(platformCard);
    expect(registry.routable().map(a => a.record.id)).toEqual(['github', 'shell']);
    expect(registry.routable().find(a => a.record.id === 'shell')!.vector.length).toBeGreaterThan(
      0,
    );
  });

  test('its record is one shape with the apps’: the orchestrator’s own URL, entitled to the shell catalog alone', async () => {
    const {registry} = await withGithub('repositories');
    expect(registry.get('shell')).toEqual({
      id: 'shell',
      displayName: 'A2UIVerse',
      agentUrl: 'https://x-10001.asse.devtunnels.ms',
      catalogs: [],
      entitlement: [SHELL_CATALOG_ID],
    });
  });

  test('the platform is not an installed app: list() leaves it out', async () => {
    const {registry} = await withGithub('repositories');
    expect(registry.list().map(r => r.id)).toEqual(['github']);
  });

  test('without a platform card nothing changes', async () => {
    const {registry} = await withGithub('repositories', {platform: false});
    await registry.refreshCards();
    expect(registry.routable().map(a => a.record.id)).toEqual(['github']);
    expect(registry.card('shell')).toBeUndefined();
    expect(() => registry.get('shell')).toThrow('Unknown app: shell');
  });

  test('the Router ranks the platform like any app: a platform question shortlists it first', async () => {
    const {registry, embedder} = await withGithub('github repositories pull requests');
    await registry.refreshCards();
    const router = new Router(registry, embedder, {shortlistCap: 5});
    const out = await router.shortlist('what apps do I have installed?');
    expect(out.map(e => e.record.id)).toEqual(['shell', 'github']);
  });
});
