import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {mkdirSync, mkdtempSync, writeFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {test} from 'node:test';

import {
  marketplaceFiles,
  marketplaceStateOf,
  secretsOfAgentStore,
  secretsOfPublisherFile,
  secretsOfVault,
  sweep,
} from './sweep-secrets.mjs';

const SCRIPT = fileURLToPath(new URL('./sweep-secrets.mjs', import.meta.url));

const ACCESS = 'access-token-0123456789abcdef';
const REFRESH = 'refresh-token-0123456789abcdef';
const KEY = 'northlight-demo-key-for-the-test';
const SIGNING = 'private-signing-key-d-0123456789';
const VENDOR = 'gho_vendor-access-token-0123456789';
const UPSTREAM = 'linear-client-secret-0123456789';
const DEV_TOKEN = 'dev-publisher-token-0123456789abcdef';
const OTHER_TOKEN = 'other-publisher-token-0123456789abcdef';

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

test("a publisher file's secret: its token, nothing else", () => {
  assert.deepEqual(
    secretsOfPublisherFile({
      marketplace: 'http://localhost:10002',
      publisher: 'a2uiverse-apps',
      token: DEV_TOKEN,
    }),
    [DEV_TOKEN],
  );
  assert.deepEqual(secretsOfPublisherFile(null), []);
});

test("the marketplace's state directory: STATE_DIR against its package, over its .env, the shell winning", () => {
  const dir = mkdtempSync(join(tmpdir(), 'a2uiverse-sweep-'));
  assert.equal(marketplaceStateOf({env: {}, marketplaceDir: dir}), join(dir, '.state'));
  writeFileSync(join(dir, '.env'), 'STATE_DIR=from-env-file\n');
  assert.equal(marketplaceStateOf({env: {}, marketplaceDir: dir}), join(dir, 'from-env-file'));
  assert.equal(
    marketplaceStateOf({env: {STATE_DIR: '/from/shell'}, marketplaceDir: dir}),
    '/from/shell',
  );
});

test("the marketplace's files: every file of its state but its embedding model", () => {
  const dir = mkdtempSync(join(tmpdir(), 'a2uiverse-sweep-'));
  mkdirSync(join(dir, 'public', 'apps', 'shop-b'), {recursive: true});
  mkdirSync(join(dir, 'models', 'model'), {recursive: true});
  writeFileSync(join(dir, 'publishers.json'), '{}');
  writeFileSync(join(dir, 'public', 'apps', 'shop-b', 'preview.json'), '{}');
  writeFileSync(join(dir, 'models', 'model', 'weights.onnx'), 'weights');
  assert.deepEqual(marketplaceFiles(dir).sort(), [
    join(dir, 'public', 'apps', 'shop-b', 'preview.json'),
    join(dir, 'publishers.json'),
  ]);
  assert.deepEqual(marketplaceFiles(join(dir, 'missing')), []);
});

/**
 * A sitting on disk: a state directory, an apps checkout with one agent store, the marketplace's
 * state, the dev publisher's file and a second publisher's, captured logs.
 */
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
  const marketplaceState = join(root, 'marketplace');
  mkdirSync(join(marketplaceState, 'public', 'apps', 'shop-b'), {recursive: true});
  mkdirSync(join(marketplaceState, 'models'), {recursive: true});
  writeFileSync(
    join(marketplaceState, 'publishers.json'),
    '{"publishers":[{"tokenHash":"sha256-x"}]}',
  );
  writeFileSync(
    join(marketplaceState, 'public', 'apps', 'shop-b', 'preview.json'),
    leak ? `{"credential":"${OTHER_TOKEN}"}` : '{"messages":[]}',
  );
  writeFileSync(join(marketplaceState, 'models', 'weights.bin'), `${DEV_TOKEN}`);
  const devPublisher = join(root, 'dev-publisher.json');
  writeFileSync(
    devPublisher,
    JSON.stringify({marketplace: 'm', publisher: 'a2uiverse-apps', token: DEV_TOKEN}),
  );
  const otherPublisher = join(root, 'other-publisher.json');
  writeFileSync(
    otherPublisher,
    JSON.stringify({marketplace: 'm', publisher: 'someone-else', token: OTHER_TOKEN}),
  );
  return {
    stateDir,
    agentsDir: join(root, 'apps'),
    logs,
    marketplaceState,
    devPublisher,
    otherPublisher,
  };
}

function run({stateDir, agentsDir, logs, marketplaceState, devPublisher, otherPublisher}) {
  return spawnSync(
    process.execPath,
    [
      SCRIPT,
      '--state-dir',
      stateDir,
      '--agents-dir',
      agentsDir,
      '--marketplace-state',
      marketplaceState,
      '--dev-publisher',
      devPublisher,
      '--publisher',
      otherPublisher,
      '--logs',
      logs,
    ],
    {encoding: 'utf8', env: {...process.env, A2UIVERSE_AGENTS_DIR: ''}},
  );
}

test('a clean sitting: every file clean, exit 0', () => {
  const result = run(sitting({leak: false}));
  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /the vault: 3 secrets/);
  assert.match(result.stdout, /github's sign-in store: 3 secrets/);
  assert.match(result.stdout, /the publisher file .*dev-publisher\.json: 1 secrets/);
  assert.match(result.stdout, /the publisher file .*other-publisher\.json: 1 secrets/);
  assert.match(result.stdout, /no secret in 5 files/);
});

test('a leak: the file named with its count, exit 1, and no secret printed', () => {
  const result = run(sitting({leak: true}));
  assert.equal(result.status, 1);
  assert.match(result.stdout, /FOUND {2}1 of 8 {2}.*orchestrator\.log/);
  assert.match(result.stdout, /FOUND {2}1 of 8 {2}.*preview\.json/);
  assert.match(result.stdout, /clean {2}0 of 8 {2}.*publishers\.json/);
  for (const secret of [ACCESS, REFRESH, KEY, SIGNING, VENDOR, UPSTREAM, DEV_TOKEN, OTHER_TOKEN]) {
    assert.ok(!result.stdout.includes(secret) && !result.stderr.includes(secret));
  }
});
