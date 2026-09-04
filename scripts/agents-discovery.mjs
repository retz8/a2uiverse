/**
 * Discovery for the agent launcher: which agents the agents dir holds, which candidates are
 * unusable and why, and whether the requested set can be trusted to run.
 *
 * An agent is a directory carrying a `manifest.json` and an `agent/` half — the layout
 * `create-a2ui-agent` emits. The manifest supplies the id and the agent URL; the rest is that
 * convention, so a scaffolded app becomes launchable by existing rather than by being listed.
 *
 * This half is pure over a directory path: `dev-agents.mjs` owns the processes, this owns what
 * gets spawned and what refuses to. The rule it encodes — degrade when an agent cannot run,
 * stop when the run cannot be trusted — is why a broken manifest is skipped while a port
 * collision is fatal: a smaller set is honest, a set whose ids do not map to distinct processes
 * is not.
 */
import {existsSync, readdirSync, readFileSync} from 'node:fs';
import {basename, join, resolve} from 'node:path';

/** The kit's mode vocabulary (`a2ui_agent_kit.modes`). Fixed-size, so it stays a literal here. */
export const MODES = ['deterministic', 'stub', 'live'];

/** Where the agents live, and which source said so — echoed on every run and every listing. */
/**
 * The environment the `--then` child runs in: the launcher's own, with the agents dir it resolved
 * handed on as `A2UIVERSE_AGENTS_DIR`. The orchestrator reads that variable for its roster, so the
 * two processes agree on which apps are in play however the launcher was told — `--agents-dir`
 * included, which the child could not otherwise see (task 4.7).
 */
export function thenEnv(baseEnv, agentsDir) {
  return {...baseEnv, A2UIVERSE_AGENTS_DIR: agentsDir};
}

export function resolveAgentsDir({flag, env, repoRoot}) {
  if (flag) return {dir: resolve(flag), source: '--agents-dir'};
  if (env) return {dir: resolve(env), source: 'A2UIVERSE_AGENTS_DIR'};
  return {dir: resolve(repoRoot, '..', 'a2uiverse-apps'), source: 'default'};
}

/**
 * Classify one directory. `null` means "not an app folder" — no manifest, so nothing was ever
 * claimed and there is nothing to report. Everything past that point claimed to be an agent and
 * is answered for by name.
 */
function readCandidate(dir) {
  const manifestPath = join(dir, 'manifest.json');
  if (!existsSync(manifestPath)) return null;

  const skip = (name, reason) => ({ok: false, name, dir, reason});

  let manifest;
  try {
    manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
  } catch (err) {
    return skip(basename(dir), `manifest.json is not valid JSON — ${err.message}`);
  }

  const id = typeof manifest.id === 'string' ? manifest.id.trim() : '';
  if (!id) return skip(basename(dir), 'manifest has no id');

  const url = manifest.agent?.url;
  let port = NaN;
  try {
    port = Number(new URL(url).port);
  } catch {
    // leaves port NaN — reported below with whatever the manifest actually held
  }
  if (!Number.isInteger(port) || port <= 0) {
    return skip(id, `manifest agent.url carries no port — ${url ?? 'no agent.url'}`);
  }

  const agentDir = join(dir, 'agent');
  if (!existsSync(join(agentDir, 'pyproject.toml'))) {
    return skip(id, 'no agent/pyproject.toml');
  }

  const displayName = typeof manifest.displayName === 'string' ? manifest.displayName : id;
  return {ok: true, name: id, displayName, url, port, dir, agentDir};
}

/** Everything the agents dir holds, split into what can run and what answered for itself badly. */
export function discoverAgents(agentsDir) {
  const agents = [];
  const skipped = [];
  const entries = readdirSync(agentsDir, {withFileTypes: true})
    .filter(entry => entry.isDirectory())
    .map(entry => entry.name)
    .sort();
  for (const entry of entries) {
    const candidate = readCandidate(join(agentsDir, entry));
    if (!candidate) continue;
    (candidate.ok ? agents : skipped).push(candidate);
  }
  return {agents, skipped};
}

/**
 * Narrow to the requested set, then judge it. `--only` narrows *before* the checks apply, so an
 * agent you did not ask for cannot fail your run — but naming a broken one is a request that
 * cannot be satisfied, not a degraded composition, and stops it.
 */
export function planRun({agents, skipped}, only) {
  const fatal = [];
  let selected = agents;

  if (only?.length) {
    const known = new Set([...agents, ...skipped].map(candidate => candidate.name));
    const unknown = only.filter(name => !known.has(name));
    if (unknown.length) {
      fatal.push(
        `unknown agent id${unknown.length > 1 ? 's' : ''} in --only: ${unknown.join(', ')}`,
      );
    }
    for (const broken of skipped.filter(candidate => only.includes(candidate.name))) {
      fatal.push(`--only names ${broken.name}, which cannot be launched: ${broken.reason}`);
    }
    selected = agents.filter(agent => only.includes(agent.name));
  }

  const byPort = new Map();
  for (const agent of selected) {
    byPort.set(agent.port, [...(byPort.get(agent.port) ?? []), agent.name]);
  }
  for (const [port, names] of byPort) {
    if (names.length > 1) fatal.push(`port ${port} is claimed by ${names.join(' and ')}`);
  }

  return {selected, skipped, fatal};
}
