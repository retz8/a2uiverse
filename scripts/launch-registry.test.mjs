import assert from 'node:assert/strict';
import {mkdtempSync, writeFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {test} from 'node:test';

import {installBody, orchestratorOf} from './launch-registry.mjs';

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
  });
});

test("the orchestrator's .env is read, and the shell's environment wins over it", () => {
  const dir = orchestratorDir('PORT=10011\nSTATE_DIR=/var/state\nBASE_URL=https://tunnel\n');
  assert.deepEqual(orchestratorOf({env: {}, orchestratorDir: dir}), {
    url: 'http://localhost:10011',
    stateDir: '/var/state',
  });
  assert.deepEqual(
    orchestratorOf({env: {PORT: '10021', STATE_DIR: 'other'}, orchestratorDir: dir}),
    {
      url: 'http://localhost:10021',
      stateDir: join(dir, 'other'),
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
