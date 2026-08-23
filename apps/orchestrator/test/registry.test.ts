import {describe, expect, test} from 'vitest';
import {Registry} from '../src/registry/registry.js';
import {applyUrlOverrides, defaultEntries, GITHUB_CATALOG_ID} from '../src/registry/entries.js';
import type {AppRecord} from '../src/registry/types.js';

const github: AppRecord = {
  id: 'github',
  displayName: 'GitHub',
  agentUrl: 'http://localhost:11001',
  authScheme: 'none',
  catalogId: 'cat-github',
  catalogPackage: 'primer-a2ui-adapter',
};

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
});

describe('defaultEntries', () => {
  test('contains github on port 11001 with the Primer catalog', () => {
    const [entry] = defaultEntries();
    expect(entry.id).toBe('github');
    expect(entry.agentUrl).toBe('http://localhost:11001');
    expect(entry.catalogId).toBe(GITHUB_CATALOG_ID);
    expect(entry.catalogPackage).toBe('primer-a2ui-adapter');
  });
});

describe('applyUrlOverrides', () => {
  test('replaces the agent URL of a matching app and leaves others untouched', () => {
    const out = applyUrlOverrides([github], {github: 'https://x-11001.devtunnels.ms'});
    expect(out[0].agentUrl).toBe('https://x-11001.devtunnels.ms');
    expect(github.agentUrl).toBe('http://localhost:11001');
  });

  test('ignores unknown app ids', () => {
    const out = applyUrlOverrides([github], {gmail: 'http://nowhere'});
    expect(out).toEqual([github]);
  });
});
