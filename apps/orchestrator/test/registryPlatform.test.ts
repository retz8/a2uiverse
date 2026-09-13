/** The platform's card in the Registry (phase-6 decision 1, task-6.4 decision 9). */
import type {AgentCard} from '@a2a-js/sdk';
import {CATALOG_ID as SHELL_CATALOG_ID} from '@a2uiverse/shell-catalog/id';
import {describe, expect, test} from 'vitest';
import {buildAgentCard} from '../src/agentCard.js';
import {Registry} from '../src/registry/registry.js';
import {Router} from '../src/router/router.js';
import type {AppRecord} from '../src/registry/types.js';
import {FakeEmbedder} from './fakeEmbedder.js';

const github: AppRecord = {
  id: 'github',
  displayName: 'GitHub',
  agentUrl: 'http://localhost:11001',
  authScheme: 'none',
  catalogId: 'cat-github',
  catalogPackage: 'github-catalog',
};

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

const platformCard = buildAgentCard('https://x-10001.asse.devtunnels.ms');

describe('Registry with the platform’s card', () => {
  test('indexes it under shell at refresh, in-process, with no fetch', async () => {
    const registry = new Registry([github], {platformCard});
    const fetched: string[] = [];
    await registry.refreshCards({
      resolveCard: async url => {
        fetched.push(url);
        return cardFor('GitHub', 'repositories');
      },
      embedder: new FakeEmbedder(),
    });
    expect(fetched).toEqual([github.agentUrl]);
    expect(registry.card('shell')).toBe(platformCard);
    expect(registry.routable().map(a => a.record.id)).toEqual(['github', 'shell']);
    expect(registry.routable().find(a => a.record.id === 'shell')!.vector.length).toBeGreaterThan(
      0,
    );
  });

  test('its record is one shape with the apps’: the shell catalog, the orchestrator’s own URL', () => {
    const registry = new Registry([github], {platformCard});
    expect(registry.get('shell')).toEqual({
      id: 'shell',
      displayName: 'A2UIVerse',
      agentUrl: 'https://x-10001.asse.devtunnels.ms',
      authScheme: 'none',
      catalogId: SHELL_CATALOG_ID,
      catalogPackage: '@a2uiverse/shell-catalog',
    });
  });

  test('the platform is not an installed app: list() leaves it out', () => {
    const registry = new Registry([github], {platformCard});
    expect(registry.list().map(r => r.id)).toEqual(['github']);
  });

  test('without a platform card nothing changes', async () => {
    const registry = new Registry([github]);
    await registry.refreshCards({
      resolveCard: async () => cardFor('GitHub', 'repositories'),
      embedder: new FakeEmbedder(),
    });
    expect(registry.routable().map(a => a.record.id)).toEqual(['github']);
    expect(registry.card('shell')).toBeUndefined();
    expect(() => registry.get('shell')).toThrow('Unknown app: shell');
  });

  test('the Router ranks the platform like any app: a platform question shortlists it first', async () => {
    const registry = new Registry([github], {platformCard});
    const embedder = new FakeEmbedder();
    await registry.refreshCards({
      resolveCard: async () => cardFor('GitHub', 'github repositories pull requests'),
      embedder,
    });
    const router = new Router(registry, embedder, {shortlistCap: 5});
    const out = await router.shortlist('what apps do I have installed?');
    expect(out.map(e => e.record.id)).toEqual(['shell', 'github']);
  });
});
