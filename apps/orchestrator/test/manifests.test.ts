/**
 * The roster read from an agents dir (task 4.7): one level down, one `manifest.json` per child,
 * the launcher's convention. Missing is silent, malformed is fatal naming the file, empty is fatal.
 */
import {mkdirSync, mkdtempSync, rmSync, writeFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {afterEach, describe, expect, test} from 'vitest';
import {buildOrchestrator} from '../src/app.js';
import {readRoster} from '../src/registry/manifests.js';
import {FakeEmbedder} from './fakeEmbedder.js';

const dirs: string[] = [];
afterEach(() => {
  for (const dir of dirs.splice(0)) rmSync(dir, {recursive: true, force: true});
});

function agentsDir(): string {
  const dir = mkdtempSync(join(tmpdir(), 'a2uiverse-agents-'));
  dirs.push(dir);
  return dir;
}

function manifest(id: string, port: number, extra: Record<string, unknown> = {}) {
  return {
    id,
    displayName: `Shop ${id.slice(-1).toUpperCase()}`,
    agent: {url: `http://localhost:${port}`, auth: 'none'},
    catalog: {id: `urn:catalog:${id}`, package: `${id}-catalog`},
    ...extra,
  };
}

function writeApp(dir: string, name: string, content: unknown) {
  mkdirSync(join(dir, name), {recursive: true});
  writeFileSync(
    join(dir, name, 'manifest.json'),
    typeof content === 'string' ? content : JSON.stringify(content),
  );
}

describe('readRoster', () => {
  test('every child with a manifest becomes a record, in name order; children without one are not apps', () => {
    const dir = agentsDir();
    writeApp(dir, 'shop-b', manifest('shop-b', 12002));
    writeApp(dir, 'shop-a', manifest('shop-a', 12001));
    mkdirSync(join(dir, 'dataset'));
    mkdirSync(join(dir, 'node_modules'));
    writeFileSync(join(dir, 'README.md'), '# not an app');

    expect(readRoster(dir)).toEqual([
      {
        id: 'shop-a',
        displayName: 'Shop A',
        agentUrl: 'http://localhost:12001',
        authScheme: 'none',
        catalogId: 'urn:catalog:shop-a',
        catalogPackage: 'shop-a-catalog',
      },
      {
        id: 'shop-b',
        displayName: 'Shop B',
        agentUrl: 'http://localhost:12002',
        authScheme: 'none',
        catalogId: 'urn:catalog:shop-b',
        catalogPackage: 'shop-b-catalog',
      },
    ]);
  });

  test('displayName defaults to the id; a missing agent.auth means none', () => {
    const dir = agentsDir();
    writeApp(dir, 'shop-a', {
      id: 'shop-a',
      agent: {url: 'http://localhost:12001'},
      catalog: {id: 'urn:c', package: 'p'},
    });
    const [record] = readRoster(dir);
    expect(record.displayName).toBe('shop-a');
    expect(record.authScheme).toBe('none');
  });

  test('a directory with no manifests is fatal', () => {
    const dir = agentsDir();
    mkdirSync(join(dir, 'dataset'));
    expect(() => readRoster(dir)).toThrow(/no manifest\.json/);
  });

  test('a directory that does not exist is fatal, naming the path', () => {
    const missing = join(agentsDir(), 'nowhere');
    expect(() => readRoster(missing)).toThrow(missing);
  });

  test('invalid JSON is fatal, naming the file', () => {
    const dir = agentsDir();
    writeApp(dir, 'shop-a', '{not json');
    expect(() => readRoster(dir)).toThrow(join(dir, 'shop-a', 'manifest.json'));
    expect(() => readRoster(dir)).toThrow(/invalid JSON/);
  });

  test.each([
    ['no id', {id: undefined}, /id/],
    ['no agent.url', {agent: {auth: 'none'}}, /agent\.url/],
    ['no catalog.id', {catalog: {package: 'p'}}, /catalog\.id/],
    ['no catalog.package', {catalog: {id: 'urn:c'}}, /catalog\.package/],
    ['an auth scheme other than none', {agent: {url: 'http://x', auth: 'oauth'}}, /agent\.auth/],
  ])('a manifest with %s is fatal, naming the field', (_label, extra, pattern) => {
    const dir = agentsDir();
    writeApp(dir, 'shop-a', manifest('shop-a', 12001, extra));
    expect(() => readRoster(dir)).toThrow(pattern);
    expect(() => readRoster(dir)).toThrow(join(dir, 'shop-a', 'manifest.json'));
  });

  test('two manifests claiming one id is fatal', () => {
    const dir = agentsDir();
    writeApp(dir, 'shop-a', manifest('shop-a', 12001));
    writeApp(dir, 'shop-a-copy', manifest('shop-a', 12003));
    expect(() => readRoster(dir)).toThrow(/shop-a/);
  });
});

describe('buildOrchestrator — roster source (task 4.7)', () => {
  const base = {
    port: 0,
    baseUrl: 'http://localhost:0',
    debugIds: false,
    googleApiKey: undefined,
    plannerModelId: 'test-model',
    plannerEffort: 'low' as const,
    shortlistCap: 5,
    synthesizerModelId: 'test-model',
    synthesizerEffort: 'low' as const,
  };

  test('no agents dir ⇒ the hardcoded roster', () => {
    const {registry} = buildOrchestrator({
      config: {...base, stateDir: agentsDir(), agentUrls: {}, agentsDir: undefined},
      overrides: {embedder: new FakeEmbedder()},
    });
    expect(registry.list().map(r => r.id)).toEqual(['github', 'gmail', 'calendar']);
  });

  test('an agents dir replaces the roster, and URL overrides still apply per id', () => {
    const dir = agentsDir();
    writeApp(dir, 'shop-a', manifest('shop-a', 12001));
    writeApp(dir, 'shop-b', manifest('shop-b', 12002));
    const {registry} = buildOrchestrator({
      config: {
        ...base,
        stateDir: agentsDir(),
        agentUrls: {'shop-b': 'https://x-12002.asse.devtunnels.ms', github: 'http://nowhere'},
        agentsDir: dir,
      },
      overrides: {embedder: new FakeEmbedder()},
    });
    expect(registry.list().map(r => [r.id, r.agentUrl])).toEqual([
      ['shop-a', 'http://localhost:12001'],
      ['shop-b', 'https://x-12002.asse.devtunnels.ms'],
    ]);
  });
});
