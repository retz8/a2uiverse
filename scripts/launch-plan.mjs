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
import {parseArgs} from 'node:util';

/** The kit's mode vocabulary (`a2ui_agent_kit.modes`). Fixed-size, so it stays a literal here. */
export const MODES = ['deterministic', 'stub', 'live'];

/**
 * The launcher's command line: its options, or the error that stops it. `--no-install` starts the
 * agents and neither packs nor installs them, the registry left as it is (task-11.8 decision 5).
 * `--publish` publishes each app to the marketplace and installs it from there by id (task-13.6
 * decision 1): a usage error beside `--no-install`, and beside `--mode live`, whose agents refuse
 * the fake accounts each sign-in app's preview signs in as (decision 8).
 */
export function parseLaunchArgs(args, {defaultTier}) {
  const {values} = parseArgs({
    args,
    options: {
      tier: {type: 'string', default: defaultTier},
      only: {type: 'string'},
      mode: {type: 'string', default: 'deterministic'},
      then: {type: 'string'},
      'agents-dir': {type: 'string'},
      list: {type: 'boolean', default: false},
      'no-install': {type: 'boolean', default: false},
      publish: {type: 'boolean', default: false},
      'agent-state': {type: 'string'},
    },
    allowPositionals: false,
  });
  // The mode→behavior mapping lives in the kit; only the vocabulary is checked here, so a typo
  // fails now rather than after every agent dies on it.
  if (!MODES.includes(values.mode)) {
    return {error: `unknown --mode '${values.mode}' (expected ${MODES.join(' | ')})`};
  }
  if (values.publish && values['no-install']) {
    return {
      error:
        '--publish installs every app from the marketplace and --no-install installs nothing: pass one',
    };
  }
  if (values.publish && values.mode === 'live') {
    return {
      error:
        "--publish signs each sign-in app's preview in as one of the kit's fake accounts, which live mode refuses: publish in deterministic or stub mode",
    };
  }
  return {
    tier: values.tier,
    mode: values.mode,
    only: values.only
      ? values.only
          .split(',')
          .map(s => s.trim())
          .filter(Boolean)
      : null,
    then: values.then,
    agentsDir: values['agents-dir'],
    list: values.list,
    install: !values['no-install'],
    publish: values.publish,
    // Each agent's sign-in store under this folder, not its own (task-12.13 decision 55).
    ...(values['agent-state'] ? {agentState: resolve(values['agent-state'])} : {}),
  };
}

/**
 * The command that starts one agent on its roster port: `publicUrl`, when set, is where the browser
 * reaches its sign-in pages; `agentState`, when set, the folder holding each agent's sign-in store,
 * the agent's own under it by its id (task-12.13 decision 55).
 */
export function agentCommand(entry, mode, {publicUrl, agentState} = {}) {
  return [
    'run',
    'python',
    '-m',
    'app',
    '--mode',
    mode,
    '--host',
    'localhost',
    '--port',
    String(entry.port),
    ...(publicUrl ? ['--public-url', publicUrl] : []),
    ...(agentState ? ['--state-dir', join(agentState, entry.id)] : []),
  ];
}

/** Where the apps checkout is, and which source said so — echoed on every run and every listing. */
export function resolveAgentsDir({flag, env, repoRoot}) {
  if (flag) return {dir: resolve(flag), source: '--agents-dir'};
  if (env) return {dir: resolve(env), source: 'A2UIVERSE_AGENTS_DIR'};
  return {dir: resolve(repoRoot, '..', 'a2uiverse-apps'), source: 'default'};
}

/**
 * Each agent's public address — where the browser reaches its sign-in pages — from
 * `A2UIVERSE_PUBLIC_URL`, a pattern with a `{port}` slot the agent's roster port fills; unset, every
 * agent stays on `localhost` (task-12.12 decision 2). A pattern the launcher cannot fill stops it.
 */
export function publicUrlsOf(pattern) {
  if (!pattern) return {pattern: null, of: () => null};
  if (!pattern.includes('{port}')) {
    return {error: `A2UIVERSE_PUBLIC_URL '${pattern}' has no {port} slot for each agent's port`};
  }
  if (!/^https?:\/\//.test(pattern)) {
    return {error: `A2UIVERSE_PUBLIC_URL '${pattern}' is not an http(s) address`};
  }
  return {pattern, of: port => pattern.replaceAll('{port}', String(port))};
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
