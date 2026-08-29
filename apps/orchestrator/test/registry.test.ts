import type {AgentCard} from '@a2a-js/sdk';
import {describe, expect, test} from 'vitest';
import {corpusDoc} from '../src/registry/corpus.js';
import {Registry} from '../src/registry/registry.js';
import {applyUrlOverrides, defaultEntries, GITHUB_CATALOG_ID} from '../src/registry/entries.js';
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
    skills: [
      {
        id: 's',
        name: `${name} palette`,
        description,
        tags: ['palette'],
        examples: [`use ${name}`],
      },
    ],
  };
}

describe('Registry', () => {
  test('get returns the record for a known app id', () => {
    const registry = new Registry([github]);
    expect(registry.get('github')).toEqual(github);
  });

  test('get throws on an unknown app id', () => {
    const registry = new Registry([github]);
    expect(() => registry.get('gmail')).toThrow('Unknown app: gmail');
  });

  test('list returns every record in order', () => {
    const gmail: AppRecord = {...github, id: 'gmail', agentUrl: 'http://localhost:11002'};
    const registry = new Registry([github, gmail]);
    expect(registry.list().map(r => r.id)).toEqual(['github', 'gmail']);
  });

  test('resolveByCatalogId finds the app owning a catalog', () => {
    const registry = new Registry([github]);
    expect(registry.resolveByCatalogId('cat-github')?.id).toBe('github');
    expect(registry.resolveByCatalogId('nope')).toBeUndefined();
  });

  test("rejects an entry claiming the reserved 'shell' id", () => {
    expect(() => new Registry([{...github, id: 'shell'}])).toThrow(
      "App id 'shell' is reserved for the shell",
    );
  });

  test('refreshCards stores a card and vector per reachable agent', async () => {
    const gmail: AppRecord = {...github, id: 'gmail', agentUrl: 'http://localhost:11002'};
    const registry = new Registry([github, gmail]);
    const cards: Record<string, AgentCard> = {
      [github.agentUrl]: cardFor('GitHub', 'repositories and pull requests'),
      [gmail.agentUrl]: cardFor('Gmail', 'email inbox and labels'),
    };
    await registry.refreshCards({
      resolveCard: async url => cards[url],
      embedder: new FakeEmbedder(),
    });
    expect(registry.card('github')?.name).toBe('GitHub');
    expect(registry.card('gmail')?.name).toBe('Gmail');
    expect(registry.routable().map(a => a.record.id)).toEqual(['github', 'gmail']);
    expect(registry.routable()[0].vector.length).toBeGreaterThan(0);
  });

  test('an unreachable agent gets a null card and is unroutable', async () => {
    const gmail: AppRecord = {...github, id: 'gmail', agentUrl: 'http://localhost:11002'};
    const registry = new Registry([github, gmail]);
    await registry.refreshCards({
      resolveCard: async url => {
        if (url === gmail.agentUrl) throw new Error('down');
        return cardFor('GitHub', 'repositories');
      },
      embedder: new FakeEmbedder(),
    });
    expect(registry.card('gmail')).toBeNull();
    expect(registry.routable().map(a => a.record.id)).toEqual(['github']);
  });

  test('card is undefined before any refresh', () => {
    expect(new Registry([github]).card('github')).toBeUndefined();
  });
});

describe('corpusDoc', () => {
  test('blends name, description, and skill texts into one document', () => {
    const doc = corpusDoc(cardFor('Gmail', 'email inbox and labels'));
    expect(doc).toContain('Gmail');
    expect(doc).toContain('email inbox and labels');
    expect(doc).toContain('Gmail palette');
    expect(doc).toContain('use Gmail');
  });
});

describe('defaultEntries', () => {
  test('contains github, gmail, calendar on ports 11001-11003', () => {
    const entries = defaultEntries();
    expect(entries.map(e => e.id)).toEqual(['github', 'gmail', 'calendar']);
    expect(entries.map(e => e.agentUrl)).toEqual([
      'http://localhost:11001',
      'http://localhost:11002',
      'http://localhost:11003',
    ]);
    expect(entries[0].catalogId).toBe(GITHUB_CATALOG_ID);
    expect(entries.map(e => e.catalogPackage)).toEqual([
      'github-catalog',
      'gmail-catalog',
      'calendar-catalog',
    ]);
  });
});

describe('applyUrlOverrides', () => {
  test('replaces the agent URL of a matching app and leaves others untouched', () => {
    const out = applyUrlOverrides([github], {github: 'https://x-11001.devtunnels.ms'});
    expect(out[0].agentUrl).toBe('https://x-11001.devtunnels.ms');
    expect(github.agentUrl).toBe('http://localhost:11001');
  });

  test('ignores unknown app ids', () => {
    const out = applyUrlOverrides([github], {other: 'http://nowhere'});
    expect(out).toEqual([github]);
  });
});
