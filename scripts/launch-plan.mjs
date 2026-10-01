/**
 * The launcher's plan, pure over the roster and what the checkout holds: which apps a launch runs,
 * which roster entries it skips and why, whether the launch can be trusted to run at all, and — once
 * it has run — which installed apps the reconcile takes out.
 *
 * The rule it encodes is the one the launcher always had — degrade when an app cannot run, stop
 * when the run cannot be trusted (task-11.6 decision 11). An entry missing from the checkout is
 * skipped and named, the rest launch; an unknown tier or `--only` id, `--only` naming a skipped
 * entry, or two entries of the tier on one port stops the launch: a smaller set is honest, a set
 * that is not what was asked for, or whose ids do not map to distinct processes, is not.
 */
import {join, resolve} from 'node:path';

/** The kit's mode vocabulary (`a2ui_agent_kit.modes`). Fixed-size, so it stays a literal here. */
export const MODES = ['deterministic', 'stub', 'live'];

/** Where the apps checkout is, and which source said so — echoed on every run and every listing. */
export function resolveAgentsDir({flag, env, repoRoot}) {
  if (flag) return {dir: resolve(flag), source: '--agents-dir'};
  if (env) return {dir: resolve(env), source: 'A2UIVERSE_AGENTS_DIR'};
  return {dir: resolve(repoRoot, '..', 'a2uiverse-apps'), source: 'default'};
}

/** The URL the registry fetches an app's card from: its agent, on its roster port. */
export const cardUrlOf = port => `http://localhost:${port}/.well-known/agent-card.json`;

/** The tiers the roster names, in roster order. */
export const tiersOf = roster => [...new Set(roster.map(entry => entry.tier))];

/**
 * One roster entry against the checkout: where its agent and its catalog package are, or why it
 * cannot launch. `exists` answers for a path, so the plan reads nothing itself.
 */
function placeEntry(entry, agentsDir, exists) {
  const dir = join(agentsDir, entry.folder);
  const agentDir = join(dir, 'agent');
  const catalogPackage = `${entry.id}-catalog`;
  const catalogDir = join(dir, catalogPackage);
  const placed = {
    ...entry,
    dir,
    agentDir,
    catalogDir,
    catalogPackage,
    cardUrl: cardUrlOf(entry.port),
  };
  if (!exists(dir)) return {...placed, ok: false, reason: `no ${entry.folder}/ in the checkout`};
  if (!exists(join(agentDir, 'pyproject.toml'))) {
    return {...placed, ok: false, reason: `no ${entry.folder}/agent/pyproject.toml`};
  }
  if (!exists(join(catalogDir, 'package.json'))) {
    return {...placed, ok: false, reason: `no ${entry.folder}/${catalogPackage}/package.json`};
  }
  return {...placed, ok: true};
}

/**
 * The launch: the tier's entries placed against the checkout, narrowed by `only`, judged.
 * `entries` is every entry of the tier — what the listing prints; `selected` is what runs.
 */
export function planLaunch({roster, tier, only, agentsDir, exists}) {
  const fatal = [];
  const tiers = tiersOf(roster);
  if (!tiers.includes(tier)) {
    fatal.push(`unknown --tier '${tier}' (expected ${tiers.join(' | ')})`);
    return {tier, entries: [], selected: [], fatal};
  }

  const entries = roster
    .filter(entry => entry.tier === tier)
    .map(entry => placeEntry(entry, agentsDir, exists));
  let selected = entries.filter(entry => entry.ok);

  if (only?.length) {
    const known = new Set(entries.map(entry => entry.id));
    const unknown = only.filter(id => !known.has(id));
    if (unknown.length) {
      fatal.push(
        `unknown app id${unknown.length > 1 ? 's' : ''} in --only for the ${tier} tier: ${unknown.join(', ')}`,
      );
    }
    for (const skipped of entries.filter(entry => !entry.ok && only.includes(entry.id))) {
      fatal.push(`--only names ${skipped.id}, which cannot be launched: ${skipped.reason}`);
    }
    selected = selected.filter(entry => only.includes(entry.id));
  }

  const byPort = new Map();
  for (const entry of entries)
    byPort.set(entry.port, [...(byPort.get(entry.port) ?? []), entry.id]);
  for (const [port, ids] of byPort) {
    if (ids.length > 1) fatal.push(`port ${port} is claimed by ${ids.join(' and ')}`);
  }

  return {tier, entries, selected, fatal};
}

/**
 * The reconcile (task-11.6 decisions 8 and 9): of the apps the registry holds, the roster apps this
 * launch did not install — another tier's, those `--only` left out, and those that failed — go. An
 * installed app the roster does not name is left alone.
 */
export function appsToUninstall({installedIds, roster, launchedIds}) {
  const rosterIds = new Set(roster.map(entry => entry.id));
  const launched = new Set(launchedIds);
  return installedIds.filter(id => rosterIds.has(id) && !launched.has(id));
}
