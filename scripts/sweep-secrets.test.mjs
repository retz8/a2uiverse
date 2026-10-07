import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {mkdirSync, mkdtempSync, writeFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {test} from 'node:test';

import {secretsOfAgentStore, secretsOfVault, sweep} from './sweep-secrets.mjs';

const SCRIPT = fileURLToPath(new URL('./sweep-secrets.mjs', import.meta.url));

const ACCESS = 'access-token-0123456789abcdef';
const REFRESH = 'refresh-token-0123456789abcdef';
const KEY = 'northlight-demo-key-for-the-test';
const SIGNING = 'private-signing-key-d-0123456789';
const VENDOR = 'gho_vendor-access-token-0123456789';
const UPSTREAM = 'linear-client-secret-0123456789';

const vault = {
  version: 1,
  apps: {
    github: {next: 2, accounts: [{n: 1, kind: 'oauth', secret: ACCESS, refresh: REFRESH}]},
    'shop-b': {next: 2, accounts: [{n: 1, kind: 'apiKey', secret: KEY, keyHash: 'h'.repeat(64)}]},
  },
  registrations: {'http://localhost:11001 cb': {clientId: 'client-id-0123456789abcdef'}},
};

const store = {
  signing_key: {kty: 'EC', crv: 'P-256', x: 'public-x-0123456789', d: SIGNING, kid: 'kid'},
  accounts: {
    sub1: {
      kind: 'vendor',
      account_id: 'retz8',
      claims: {preferred_username: 'retz8-the-account-name'},
      vendor_token: {access_token: VENDOR, token_type: 'bearer', scope: 'repo read:org user:email'},
    },
  },
  access_tokens: {['a'.repeat(64)]: {grant_id: 'grant-0123456789abcdef', expires_at: 1}},
  refresh_tokens: {},
  clients: {'client-0123456789': {client_id: 'client-0123456789', redirect_uris: ['http://x']}},
  upstream: {registration: {client_id: 'linear-client-id-0123456789', client_secret: UPSTREAM}},
};

test("the vault's secrets: each account's token or key and its refresh token, nothing public", () => {
  assert.deepEqual(secretsOfVault(vault).sort(), [ACCESS, KEY, REFRESH].sort());
});

test("an agent store's secrets: the signing key's private part, the vendor's tokens, its own registration's secret", () => {
  assert.deepEqual(secretsOfAgentStore(store).sort(), [SIGNING, UPSTREAM, VENDOR].sort());
});

test('the sweep counts the secrets each file holds', () => {
  const dir = mkdtempSync(join(tmpdir(), 'a2uiverse-sweep-'));
  writeFileSync(join(dir, 'clean.log'), 'nothing here\n');
  writeFileSync(join(dir, 'leaky.log'), `Authorization: Bearer ${ACCESS}\n${VENDOR}\n${ACCESS}`);
  assert.deepEqual(sweep([ACCESS, VENDOR, KEY], [join(dir, 'clean.log'), join(dir, 'leaky.log')]), [
    {path: join(dir, 'clean.log'), found: 0},
    {path: join(dir, 'leaky.log'), found: 2},
  ]);
});

/** A sitting on disk: a state directory, an apps checkout with one agent store, captured logs. */
function sitting({leak}) {
  const root = mkdtempSync(join(tmpdir(), 'a2uiverse-sweep-'));
  const stateDir = join(root, 'state');
  mkdirSync(join(stateDir, 'vault'), {recursive: true});
  writeFileSync(join(stateDir, 'vault', 'vault.json'), JSON.stringify(vault));
  writeFileSync(join(stateDir, 'intent-journal.jsonl'), '{"kind":"signIn","event":"started"}\n');
  const agentState = join(root, 'apps', 'github', 'agent', '.state');
  mkdirSync(agentState, {recursive: true});
  writeFileSync(join(agentState, 'sign-in.json'), JSON.stringify(store));
  const logs = join(root, 'logs');
  mkdirSync(logs);
  writeFileSync(join(logs, 'orchestrator.log'), leak ? `refreshing with ${REFRESH}\n` : 'ok\n');
  writeFileSync(join(logs, 'github.log'), 'ok\n');
  return {stateDir, agentsDir: join(root, 'apps'), logs};
}

function run({stateDir, agentsDir, logs}) {
  return spawnSync(
    process.execPath,
    [SCRIPT, '--state-dir', stateDir, '--agents-dir', agentsDir, '--logs', logs],
    {encoding: 'utf8', env: {...process.env, A2UIVERSE_AGENTS_DIR: ''}},
  );
}

test('a clean sitting: every file clean, exit 0', () => {
  const result = run(sitting({leak: false}));
  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /the vault: 3 secrets/);
  assert.match(result.stdout, /github's sign-in store: 3 secrets/);
  assert.match(result.stdout, /no secret in 3 files/);
});

test('a leak: the file named with its count, exit 1, and no secret printed', () => {
  const result = run(sitting({leak: true}));
  assert.equal(result.status, 1);
  assert.match(result.stdout, /FOUND {2}1 of 6 {2}.*orchestrator\.log/);
  for (const secret of [ACCESS, REFRESH, KEY, SIGNING, VENDOR, UPSTREAM]) {
    assert.ok(!result.stdout.includes(secret) && !result.stderr.includes(secret));
  }
});
