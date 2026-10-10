import assert from 'node:assert/strict';
import {mkdtempSync, writeFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {test} from 'node:test';

import {installBody, installByIdBody, orchestratorOf} from './launch-registry.mjs';

const orchestratorDir = (envFile = null) => {
  const dir = mkdtempSync(join(tmpdir(), 'a2uiverse-orchestrator-'));
  if (envFile !== null) writeFileSync(join(dir, '.env'), envFile);
  return dir;
};

test('the orchestrator by default: port 10001, the state directory .state in its package', () => {
  const dir = orchestratorDir();
  assert.deepEqual(orchestratorOf({env: {}, orchestratorDir: dir}), {
    url: 'http://localhost:10001',
    stateDir: join(dir, '.state'),
    marketplaceUrl: 'http://localhost:10002',
  });
});

test("the orchestrator's .env is read, and the shell's environment wins over it", () => {
  const dir = orchestratorDir('PORT=10011\nSTATE_DIR=/var/state\nBASE_URL=https://tunnel\n');
  assert.deepEqual(orchestratorOf({env: {}, orchestratorDir: dir}), {
    url: 'http://localhost:10011',
    stateDir: '/var/state',
    marketplaceUrl: 'http://localhost:10002',
  });
  assert.deepEqual(
    orchestratorOf({env: {PORT: '10021', STATE_DIR: 'other'}, orchestratorDir: dir}),
    {
      url: 'http://localhost:10021',
      stateDir: join(dir, 'other'),
      marketplaceUrl: 'http://localhost:10002',
    },
  );
});

test('ORCHESTRATOR_URL names the orchestrator outright, a trailing slash dropped', () => {
  const dir = orchestratorDir('PORT=10011\n');
  assert.equal(
    orchestratorOf({env: {ORCHESTRATOR_URL: 'http://127.0.0.1:9000/'}, orchestratorDir: dir}).url,
    'http://127.0.0.1:9000',
  );
});

test("the marketplace is the orchestrator's: MARKETPLACE_URL from its .env, the shell winning, a trailing slash dropped (task-13.6 decision 2)", () => {
  const dir = orchestratorDir('MARKETPLACE_URL=http://localhost:10012/\n');
  assert.equal(
    orchestratorOf({env: {}, orchestratorDir: dir}).marketplaceUrl,
    'http://localhost:10012',
  );
  assert.equal(
    orchestratorOf({env: {MARKETPLACE_URL: 'http://127.0.0.1:9002'}, orchestratorDir: dir})
      .marketplaceUrl,
    'http://127.0.0.1:9002',
  );
});

test('the install body from the marketplace: the app id alone (task-13.5 decision 2)', () => {
  assert.deepEqual(installByIdBody('github'), {appId: 'github'});
});

test('the install body: the app, its card URL, one catalog of base64 files', () => {
  const files = new Map([
    ['index.js', new TextEncoder().encode('export {}')],
    ['artifact.json', new TextEncoder().encode('{}\n')],
  ]);
  assert.deepEqual(
    installBody('github', 'http://localhost:11001/.well-known/agent-card.json', files),
    {
      appId: 'github',
      cardUrl: 'http://localhost:11001/.well-known/agent-card.json',
      catalogs: [
        {
          files: {
            'index.js': Buffer.from('export {}').toString('base64'),
            'artifact.json': Buffer.from('{}\n').toString('base64'),
          },
        },
      ],
    },
  );
});
