#!/usr/bin/env node
/**
 * Launch the vendor agents that live in the sibling `a2uiverse-apps` repo.
 *
 *   pnpm dev:agents [--only github,gmail] [--mode deterministic|stub|live]
 *
 * Apps are never built in this repo and never depend on it (SPEC §13), so this is the one place
 * that knows how to start them: the table below is the launch contract, and it stays here rather
 * than in each agent until Phase 3 extracts a uniform vendor kit.
 *
 * The launcher handles no credentials. Each agent loads its own `agent/.env`, and refuses to
 * start rather than degrade when a mode's credential is missing — so an agent that does not come
 * up is reported by name, never papered over.
 *
 * Under `--wait-for-cards` (what `dev:all` uses) the launcher blocks until every agent's card
 * answers before returning. The orchestrator fetches cards once at boot and treats a failure as
 * an unroutable agent for the session, so starting the platform first is not a slow start, it is
 * a canvas where nothing routes and nothing says why.
 */
import {spawn} from 'node:child_process';
import {existsSync} from 'node:fs';
import {dirname, resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {parseArgs} from 'node:util';

const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');

/** Where the apps repo is. Overridable so a checkout elsewhere needs no edit here. */
const APPS_DIR = resolve(
  process.env.A2UIVERSE_APPS_DIR ?? resolve(REPO_ROOT, '..', 'a2uiverse-apps'),
);

/**
 * The launch table. `dir` is relative to the apps repo; `port` is the agent's, in every run
 * mode. Modes name the agent's own vocabulary: `deterministic` is the canned A2A server,
 * `stub` the live model over canned tool data, `live` the model over its real MCP endpoint.
 */
const AGENTS = [
  {id: 'github', dir: 'github/agent', port: 11001},
  {id: 'gmail', dir: 'gmail/agent', port: 11002},
  {id: 'calendar', dir: 'calendar/agent', port: 11003},
];

const MODES = {
  deterministic: {module: 'deterministic_agent', env: {}},
  stub: {module: 'llm_agent', env: {TOOL_BACKEND: 'stub'}},
  live: {module: 'llm_agent', env: {}},
};

/** How long to wait for every agent card before starting the platform anyway. */
const CARD_TIMEOUT_MS = 90_000;
const CARD_POLL_MS = 500;

const COLORS = ['\x1b[36m', '\x1b[35m', '\x1b[33m'];
const RESET = '\x1b[0m';

function fail(message) {
  console.error(`dev:agents — ${message}`);
  process.exit(2);
}

function parse() {
  const {values} = parseArgs({
    options: {
      only: {type: 'string'},
      mode: {type: 'string', default: 'deterministic'},
      'wait-for-cards': {type: 'boolean', default: false},
      then: {type: 'string'},
    },
    allowPositionals: false,
  });
  if (!(values.mode in MODES)) {
    fail(`unknown --mode '${values.mode}' (expected ${Object.keys(MODES).join(' | ')})`);
  }
  const wanted = values.only
    ? values.only
        .split(',')
        .map(s => s.trim())
        .filter(Boolean)
    : AGENTS.map(a => a.id);
  const unknown = wanted.filter(id => !AGENTS.some(a => a.id === id));
  if (unknown.length) {
    fail(`unknown app id${unknown.length > 1 ? 's' : ''} in --only: ${unknown.join(', ')}`);
  }
  return {
    mode: values.mode,
    agents: AGENTS.filter(a => wanted.includes(a.id)),
    waitForCards: values['wait-for-cards'],
    then: values.then,
  };
}

/** Prefix every line so three interleaved agents stay readable. */
function pipe(stream, prefix, sink) {
  let held = '';
  stream.setEncoding('utf8');
  stream.on('data', chunk => {
    const lines = (held + chunk).split('\n');
    held = lines.pop() ?? '';
    for (const line of lines) sink.write(`${prefix} ${line}\n`);
  });
  stream.on('end', () => {
    if (held) sink.write(`${prefix} ${held}\n`);
  });
}

function start(agent, mode, color) {
  const cwd = resolve(APPS_DIR, agent.dir);
  if (!existsSync(cwd)) fail(`no agent at ${cwd} — is A2UIVERSE_APPS_DIR right?`);
  const {module, env} = MODES[mode];
  const child = spawn('uv', ['run', 'python', '-m', module, '--host', 'localhost'], {
    cwd,
    env: {...process.env, ...env},
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  const prefix = `${color}[${agent.id}]${RESET}`;
  pipe(child.stdout, prefix, process.stdout);
  pipe(child.stderr, prefix, process.stderr);
  child.on('error', err => {
    console.error(`${prefix} failed to spawn: ${err.message}`);
  });
  child.on('exit', code => {
    // One agent dying is a degraded composition, not a dead session: its siblings keep serving
    // and the orchestrator paints its slot as failed.
    console.error(`${prefix} exited (${code ?? 'signal'})`);
  });
  return {agent, child};
}

async function cardAnswers(port) {
  try {
    const res = await fetch(`http://localhost:${port}/.well-known/agent-card.json`, {
      signal: AbortSignal.timeout(2_000),
    });
    return res.ok;
  } catch {
    return false;
  }
}

/** Poll until every agent's card answers; return the ones that never did. */
async function waitForCards(running) {
  const deadline = Date.now() + CARD_TIMEOUT_MS;
  const pending = new Map(running.map(r => [r.agent.id, r.agent]));
  console.error(`dev:agents — waiting for ${pending.size} agent card(s)…`);
  while (pending.size > 0 && Date.now() < deadline) {
    for (const [id, agent] of [...pending]) {
      if (await cardAnswers(agent.port)) {
        pending.delete(id);
        console.error(`dev:agents — ${id} ready on ${agent.port}`);
      }
    }
    if (pending.size > 0) await new Promise(r => setTimeout(r, CARD_POLL_MS));
  }
  return [...pending.keys()];
}

async function main() {
  const {mode, agents, waitForCards: gate, then} = parse();
  if (!existsSync(APPS_DIR)) {
    fail(`apps repo not found at ${APPS_DIR}. Set A2UIVERSE_APPS_DIR to its checkout.`);
  }
  console.error(`dev:agents — ${agents.map(a => a.id).join(', ')} in ${mode} mode`);
  const running = agents.map((agent, i) => start(agent, mode, COLORS[i % COLORS.length]));

  /** Ctrl-C tears the whole group down — the agents, and the platform if we started it. */
  let platform = null;
  const stop = () => {
    for (const {child} of running) child.kill('SIGINT');
    platform?.kill('SIGINT');
  };
  process.on('SIGINT', stop);
  process.on('SIGTERM', stop);

  if (gate) {
    const missing = await waitForCards(running);
    if (missing.length) {
      // Starting degraded beats blocking: an agent that refuses to start for want of a
      // credential is a two-agent composition, which is a legitimate thing to work against.
      console.error(
        `dev:agents — never came up: ${missing.join(', ')} · starting the platform without them`,
      );
    }
  }
  if (then) {
    platform = spawn(then, {cwd: REPO_ROOT, shell: true, stdio: 'inherit'});
    platform.on('exit', code => {
      stop();
      process.exit(code ?? 0);
    });
  }
  await new Promise(() => {});
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
