#!/usr/bin/env node
/**
 * Launch the vendor agents that live in the sibling `a2uiverse-apps` repo.
 *
 *   pnpm dev:agents [--only github,gmail] [--mode deterministic|stub|live] [--agents-dir <path>]
 *   pnpm agents:list
 *
 * Apps are never built in this repo and never depend on it (SPEC §13), so this is the one place
 * that knows how to start them — but it no longer knows *which* they are. Discovery reads the
 * manifests in the agents dir (see `agents-discovery.mjs`), so a scaffolded app becomes
 * launchable by existing.
 *
 * `--list` is this same path halted before spawn: what it reports is what a run would do, and it
 * exits non-zero when it reports something that would stop one.
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

import {MODES, discoverAgents, planRun, resolveAgentsDir} from './agents-discovery.mjs';

const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');

/** How long to wait for every agent card before starting the platform anyway. */
const CARD_TIMEOUT_MS = 90_000;
const CARD_POLL_MS = 500;

const COLORS = ['\x1b[36m', '\x1b[35m', '\x1b[33m', '\x1b[32m', '\x1b[34m', '\x1b[31m'];
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
      'agents-dir': {type: 'string'},
      list: {type: 'boolean', default: false},
    },
    allowPositionals: false,
  });
  // The mode→behavior mapping lives in the kit; only the vocabulary is checked here, so a typo
  // fails now rather than after three agents die and `--wait-for-cards` times out on them.
  if (!MODES.includes(values.mode)) {
    fail(`unknown --mode '${values.mode}' (expected ${MODES.join(' | ')})`);
  }
  return {
    mode: values.mode,
    only: values.only
      ? values.only
          .split(',')
          .map(s => s.trim())
          .filter(Boolean)
      : null,
    waitForCards: values['wait-for-cards'],
    then: values.then,
    agentsDir: values['agents-dir'],
    list: values.list,
  };
}

/** Prefix every line so interleaved agents stay readable. */
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
  // The port comes from the manifest rather than the agent's own default, so the card the
  // launcher polls and the port the agent binds cannot disagree.
  const child = spawn(
    'uv',
    [
      'run',
      'python',
      '-m',
      'app',
      '--mode',
      mode,
      '--host',
      'localhost',
      '--port',
      String(agent.port),
    ],
    {cwd: agent.agentDir, stdio: ['ignore', 'pipe', 'pipe']},
  );
  const prefix = `${color}[${agent.name}]${RESET}`;
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

async function cardAnswers(url) {
  try {
    const res = await fetch(new URL('/.well-known/agent-card.json', url), {
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
  const pending = new Map(running.map(r => [r.agent.name, r.agent]));
  console.error(`dev:agents — waiting for ${pending.size} agent card(s)…`);
  while (pending.size > 0 && Date.now() < deadline) {
    for (const [name, agent] of [...pending]) {
      if (await cardAnswers(agent.url)) {
        pending.delete(name);
        console.error(`dev:agents — ${name} ready on ${agent.port}`);
      }
    }
    if (pending.size > 0) await new Promise(r => setTimeout(r, CARD_POLL_MS));
  }
  return [...pending.keys()];
}

function printListing({dir, source}, {agents, skipped}, fatal) {
  console.log(`agents dir: ${dir} (${source})`);
  const rows = [
    ...agents.map(a => [a.name, a.displayName, String(a.port), 'ok']),
    ...skipped.map(s => [s.name, '—', '—', `skipped: ${s.reason}`]),
  ];
  if (!rows.length) console.log('  no agents found');
  const width = n => Math.max(...rows.map(r => r[n].length), 0);
  const [w0, w1, w2] = [width(0), width(1), width(2)];
  for (const [name, display, port, status] of rows) {
    console.log(`  ${name.padEnd(w0)}  ${display.padEnd(w1)}  ${port.padStart(w2)}  ${status}`);
  }
  for (const problem of fatal) console.log(`fatal: ${problem}`);
}

async function main() {
  const {mode, only, waitForCards: gate, then, agentsDir, list} = parse();

  const resolved = resolveAgentsDir({
    flag: agentsDir,
    env: process.env.A2UIVERSE_AGENTS_DIR,
    repoRoot: REPO_ROOT,
  });
  if (!existsSync(resolved.dir)) {
    fail(
      `agents dir not found at ${resolved.dir} (${resolved.source}). ` +
        'Pass --agents-dir or set A2UIVERSE_AGENTS_DIR to the a2uiverse-apps checkout.',
    );
  }

  const discovery = discoverAgents(resolved.dir);
  const {selected, skipped, fatal} = planRun(discovery, only);

  if (list) {
    printListing(resolved, discovery, fatal);
    process.exit(fatal.length ? 2 : 0);
  }

  console.error(`dev:agents — agents dir ${resolved.dir} (${resolved.source})`);
  for (const candidate of skipped) {
    console.error(`dev:agents — skipping ${candidate.name}: ${candidate.reason}`);
  }
  if (fatal.length) {
    for (const problem of fatal) console.error(`dev:agents — ${problem}`);
    process.exit(2);
  }
  if (!selected.length) fail('no launchable agents found');

  console.error(`dev:agents — ${selected.map(a => a.name).join(', ')} in ${mode} mode`);
  const running = selected.map((agent, i) => start(agent, mode, COLORS[i % COLORS.length]));

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
