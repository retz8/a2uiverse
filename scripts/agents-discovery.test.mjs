import assert from 'node:assert/strict';
import {mkdtempSync, mkdirSync, writeFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {test} from 'node:test';

import {MODES, discoverAgents, planRun, resolveAgentsDir, thenEnv} from './agents-discovery.mjs';

/**
 * Build an agents dir from a spec: `manifest` is written verbatim when a string, JSON-encoded
 * when an object, omitted when absent; `agent` writes the `agent/pyproject.toml` that marks a
 * launchable half.
 */
function agentsDir(spec) {
  const root = mkdtempSync(join(tmpdir(), 'a2uiverse-agents-'));
  for (const [name, {manifest, agent = true}] of Object.entries(spec)) {
    const dir = join(root, name);
    mkdirSync(dir, {recursive: true});
    if (manifest !== undefined) {
      writeFileSync(
        join(dir, 'manifest.json'),
        typeof manifest === 'string' ? manifest : JSON.stringify(manifest),
      );
    }
    if (agent) {
      mkdirSync(join(dir, 'agent'), {recursive: true});
      writeFileSync(join(dir, 'agent', 'pyproject.toml'), '');
    }
  }
  return root;
}

const manifestFor = (id, port) => ({
  id,
  displayName: id.toUpperCase(),
  agent: {url: `http://localhost:${port}`, auth: 'none'},
});

test('the kit mode vocabulary is the three the entrypoint accepts', () => {
  assert.deepEqual(MODES, ['deterministic', 'stub', 'live']);
});

test('resolveAgentsDir prefers the flag, then the env, then the sibling default', () => {
  const repoRoot = '/repo/a2uiverse';
  assert.deepEqual(resolveAgentsDir({flag: '/from/flag', env: '/from/env', repoRoot}), {
    dir: '/from/flag',
    source: '--agents-dir',
  });
  assert.deepEqual(resolveAgentsDir({flag: undefined, env: '/from/env', repoRoot}), {
    dir: '/from/env',
    source: 'A2UIVERSE_AGENTS_DIR',
  });
  assert.deepEqual(resolveAgentsDir({flag: undefined, env: undefined, repoRoot}), {
    dir: '/repo/a2uiverse-apps',
    source: 'default',
  });
});

test('the --then child inherits the resolved agents dir as A2UIVERSE_AGENTS_DIR', () => {
  const env = thenEnv({PATH: '/bin', A2UIVERSE_AGENTS_DIR: '/stale'}, '/apps/mocks');
  assert.equal(env.A2UIVERSE_AGENTS_DIR, '/apps/mocks');
  assert.equal(env.PATH, '/bin');
});

test('a directory with no manifest is not an agent and is not reported', () => {
  const dir = agentsDir({
    github: {manifest: manifestFor('github', 11001)},
    node_modules: {manifest: undefined, agent: false},
    _dev: {manifest: undefined, agent: false},
  });
  const {agents, skipped} = discoverAgents(dir);
  assert.deepEqual(
    agents.map(a => a.name),
    ['github'],
  );
  assert.deepEqual(skipped, []);
});

test('a healthy manifest yields id, display name, url, port and the agent dir', () => {
  const dir = agentsDir({github: {manifest: manifestFor('github', 11001)}});
  const [agent] = discoverAgents(dir).agents;
  assert.equal(agent.name, 'github');
  assert.equal(agent.displayName, 'GITHUB');
  assert.equal(agent.port, 11001);
  assert.equal(agent.url, 'http://localhost:11001');
  assert.equal(agent.agentDir, join(dir, 'github', 'agent'));
});

test('display name falls back to the id when the manifest omits it', () => {
  const dir = agentsDir({
    github: {manifest: {id: 'github', agent: {url: 'http://localhost:11001'}}},
  });
  assert.equal(discoverAgents(dir).agents[0].displayName, 'github');
});

test('malformed JSON is skipped under the directory name, with the reason', () => {
  const dir = agentsDir({github: {manifest: '{not json'}});
  const {agents, skipped} = discoverAgents(dir);
  assert.deepEqual(agents, []);
  assert.equal(skipped[0].name, 'github');
  assert.match(skipped[0].reason, /not valid JSON/);
});

test('a manifest without an id is skipped', () => {
  const dir = agentsDir({mystery: {manifest: {agent: {url: 'http://localhost:11001'}}}});
  const {skipped} = discoverAgents(dir);
  assert.equal(skipped[0].name, 'mystery');
  assert.match(skipped[0].reason, /no id/);
});

test('a manifest without a parseable port is skipped under its id', () => {
  const dir = agentsDir({
    github: {manifest: {id: 'github', agent: {url: 'not-a-url'}}},
    gmail: {manifest: {id: 'gmail'}},
  });
  const {skipped} = discoverAgents(dir);
  assert.deepEqual(
    skipped.map(s => s.name),
    ['github', 'gmail'],
  );
  for (const s of skipped) assert.match(s.reason, /no port/);
});

test('a manifest without an agent half is skipped', () => {
  const dir = agentsDir({github: {manifest: manifestFor('github', 11001), agent: false}});
  const {agents, skipped} = discoverAgents(dir);
  assert.deepEqual(agents, []);
  assert.equal(skipped[0].name, 'github');
  assert.match(skipped[0].reason, /agent\/pyproject\.toml/);
});

test('a broken agent is skipped and the healthy ones still run', () => {
  const dir = agentsDir({
    github: {manifest: manifestFor('github', 11001)},
    gmail: {manifest: '{broken'},
  });
  const {selected, skipped, fatal} = planRun(discoverAgents(dir), null);
  assert.deepEqual(
    selected.map(a => a.name),
    ['github'],
  );
  assert.deepEqual(
    skipped.map(s => s.name),
    ['gmail'],
  );
  assert.deepEqual(fatal, []);
});

test('--only narrows the selection', () => {
  const dir = agentsDir({
    calendar: {manifest: manifestFor('calendar', 11003)},
    github: {manifest: manifestFor('github', 11001)},
  });
  const {selected, fatal} = planRun(discoverAgents(dir), ['github']);
  assert.deepEqual(
    selected.map(a => a.name),
    ['github'],
  );
  assert.deepEqual(fatal, []);
});

test('--only naming an unknown id is fatal', () => {
  const dir = agentsDir({github: {manifest: manifestFor('github', 11001)}});
  const {fatal} = planRun(discoverAgents(dir), ['nope']);
  assert.equal(fatal.length, 1);
  assert.match(fatal[0], /unknown agent id in --only: nope/);
});

test('--only naming a skipped agent is fatal, unlike leaving it out', () => {
  const dir = agentsDir({
    github: {manifest: manifestFor('github', 11001)},
    gmail: {manifest: '{broken'},
  });
  const discovery = discoverAgents(dir);
  assert.deepEqual(planRun(discovery, ['github']).fatal, []);
  const {fatal} = planRun(discovery, ['gmail']);
  assert.equal(fatal.length, 1);
  assert.match(fatal[0], /--only names gmail, which cannot be launched/);
});

test('two agents claiming one port is fatal', () => {
  const dir = agentsDir({
    github: {manifest: manifestFor('github', 11001)},
    gmail: {manifest: manifestFor('gmail', 11001)},
  });
  const {fatal} = planRun(discoverAgents(dir), null);
  assert.equal(fatal.length, 1);
  assert.match(fatal[0], /port 11001 is claimed by github and gmail/);
});

test('a collision outside the requested set does not stop the run', () => {
  const dir = agentsDir({
    calendar: {manifest: manifestFor('calendar', 11003)},
    github: {manifest: manifestFor('github', 11001)},
    gmail: {manifest: manifestFor('gmail', 11001)},
  });
  const discovery = discoverAgents(dir);
  assert.deepEqual(planRun(discovery, ['calendar']).fatal, []);
  // Narrowing to one side of a colliding pair leaves nothing to collide with.
  assert.deepEqual(planRun(discovery, ['github']).fatal, []);
  assert.equal(planRun(discovery, null).fatal.length, 1);
});
