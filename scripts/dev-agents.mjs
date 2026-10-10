#!/usr/bin/env node
/**
 * Launch the apps of the dev roster from the sibling `a2uiverse-apps` checkout, and install them.
 *
 *   pnpm dev:agents [--tier mocks] [--only github,gmail] [--mode deterministic|stub|live] [--agents-dir <path>] [--no-install | --publish] [--agent-state <dir>]
 *   pnpm agents:list [--tier mocks] [--publish]
 *
 * `A2UIVERSE_PUBLIC_URL`, a pattern with a `{port}` slot (a tunnel address), gives each agent the
 * public address the browser reaches its sign-in pages at (task-12.12 decision 2).
 *
 * Apps are never built in this repo and never depend on it (SPEC §13), so this is the one place
 * that knows how to start them: the roster (`dev-roster.mjs`) names each app, its folder in the
 * checkout, its tier and its port. A launch runs one tier, the default one unless `--tier` says
 * otherwise (task-11.6 decisions 1 to 4).
 *
 * A launch starts every agent — and, under `--then` (what `dev:all` uses), the platform — at once,
 * builds the catalog packages through the checkout's own turbo, and packs each with this repo's
 * Stellify. Once the orchestrator answers, each app is installed through its install operation as
 * soon as its own card answers; then the roster apps this launch did not install — another tier's,
 * those `--only` left out, those that failed — are uninstalled, so the registry holds what runs
 * (decisions 5 to 9). With no orchestrator answering, the agents run, not installed. Stopping
 * uninstalls nothing: the next launch reconciles (decision 10). Under `--no-install` the agents run
 * and nothing is built, packed, installed or uninstalled: the apps are installed by hand through the
 * registry command (task-11.8 decision 5).
 *
 * Under `--publish` each app goes through the marketplace the orchestrator installs from (task-13.6):
 * the dev publisher `a2uiverse-apps` is established once, kept in the launcher's own file
 * (`launch-marketplace.mjs`); then each app, once its card answers, is previewed when its card
 * requires sign-in, with a credential the launcher obtains (`launch-preview.mjs`), published, and
 * installed from the marketplace by its id alone, so every app the launch installs counts as
 * installed from the marketplace. A marketplace that does not answer, or a publisher that cannot be
 * established, installs nothing, as an orchestrator that does not answer; a refused preview,
 * publish or install leaves that app out, as any failure does. The reconcile stays the registry's:
 * the launcher never unpublishes. The notices of the dev publisher's apps this launch did not
 * publish are printed at the end.
 *
 * `--list` is the same plan halted before anything starts: what it reports is what a launch would
 * run, and it exits non-zero when it reports something that would stop one (decision 11).
 *
 * The launcher hands no credential to an agent. Each agent loads its own `agent/.env`, and refuses
 * to start rather than degrade when a mode's credential is missing — so an agent that does not come
 * up is reported by name and left out, never papered over. Under `--publish` the launcher holds two
 * of its own: the dev publisher's token, in its file and never printed, and each sign-in app's
 * preview credential, for that one preview.
 */
import {spawn} from 'node:child_process';
import {existsSync} from 'node:fs';
import {dirname, resolve} from 'node:path';
import {fileURLToPath} from 'node:url';

import {
  artifactFiles,
  claim,
  describeNotice,
  listPublished,
  preview,
  publish,
  stellify,
  unpublish,
} from '@a2uiverse/stellify';

import {DEFAULT_TIER, ROSTER} from './dev-roster.mjs';
import {
  agentCommand,
  appsToUninstall,
  parseLaunchArgs,
  planLaunch,
  publicUrlsOf,
  resolveAgentsDir,
} from './launch-plan.mjs';
import {
  DEV_PUBLISHER,
  establishPublisher,
  noticesLeft,
  previewWords,
  publisherFileOf,
  publisherLine,
  publisherState,
  readPublisherFile,
  writePublisherFile,
} from './launch-marketplace.mjs';
import {previewCredential, requiresSignIn} from './launch-preview.mjs';
import {
  cardAnswers,
  installBody,
  installByIdBody,
  orchestratorOf,
  Registry,
  CannotWrite,
} from './launch-registry.mjs';

const SCRIPTS_DIR = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(SCRIPTS_DIR, '..');
/** The dev publisher's file under `--publish` (task-13.6 decision 4). */
const PUBLISHER_FILE = publisherFileOf(SCRIPTS_DIR);
const ORCHESTRATOR_DIR = resolve(REPO_ROOT, 'apps', 'orchestrator');

/** How long an agent has to answer its card before it counts as never having come up. */
const CARD_TIMEOUT_MS = 90_000;
/**
 * How long to wait for the orchestrator: under `dev:all` it builds its workspace dependencies first.
 * Under `--publish` the marketplace is waited for as long (task-13.6 decision 6).
 */
const ORCHESTRATOR_TIMEOUT_MS = 180_000;
/** How long an agent's card may take to read under `--publish`, as Stellify's own card fetch. */
const CARD_READ_TIMEOUT_MS = 10_000;
const POLL_MS = 500;

const COLORS = ['\x1b[36m', '\x1b[35m', '\x1b[33m', '\x1b[32m', '\x1b[34m', '\x1b[31m'];
const DIM = '\x1b[2m';
const RESET = '\x1b[0m';

const log = message => console.error(`dev:agents — ${message}`);

function fail(message) {
  log(message);
  process.exit(2);
}

function parse() {
  const parsed = parseLaunchArgs(process.argv.slice(2), {defaultTier: DEFAULT_TIER});
  if (parsed.error) fail(parsed.error);
  return parsed;
}

/** Prefix every line so interleaved processes stay readable. */
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

const sleep = ms => new Promise(r => setTimeout(r, ms));

/** Poll `check` until it holds or `ms` pass; `gone` ends the wait early with its reason. */
async function waitFor(check, ms, gone = () => null) {
  const deadline = Date.now() + ms;
  while (Date.now() < deadline) {
    if (gone()) return false;
    if (await check()) return true;
    await sleep(POLL_MS);
  }
  return false;
}

/**
 * Start one agent on its roster port, and begin waiting for its card. `ready` resolves to null once
 * the card answers, or to the reason it never came up. `publicUrl`, when set, is where the browser
 * reaches the agent's sign-in pages; its card and the rest stay on `localhost`. `agentState`, when
 * set, holds the agent's sign-in store in place of its own (task-12.13 decision 55).
 */
function start(entry, mode, color, publicUrl, agentState) {
  const child = spawn('uv', agentCommand(entry, mode, {publicUrl, agentState}), {
    cwd: entry.agentDir,
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  const prefix = `${color}[${entry.id}]${RESET}`;
  pipe(child.stdout, prefix, process.stdout);
  pipe(child.stderr, prefix, process.stderr);
  let exitedWith = null;
  const exited = new Promise(r => {
    child.on('error', err => {
      console.error(`${prefix} failed to spawn: ${err.message}`);
      exitedWith = `failed to spawn: ${err.message}`;
      r();
    });
    child.on('exit', code => {
      // One agent dying is a degraded composition, not a dead session: its siblings keep serving
      // and the orchestrator paints its slot as failed.
      console.error(`${prefix} exited (${code ?? 'signal'})`);
      exitedWith ??= `exited (${code ?? 'signal'})`;
      r();
    });
  });
  const ready = waitFor(
    () => cardAnswers(entry.cardUrl),
    CARD_TIMEOUT_MS,
    () => exitedWith,
  ).then(up =>
    up
      ? null
      : exitedWith
        ? `never came up: ${exitedWith} before its card answered`
        : `never came up: its card did not answer on ${entry.port} in ${CARD_TIMEOUT_MS / 1000} s`,
  );
  return {entry, child, exited, ready};
}

/** Run a command, its output prefixed; resolves to its exit code (null when it could not start). */
function run(command, args, {cwd, prefix}) {
  return new Promise(r => {
    const child = spawn(command, args, {cwd, stdio: ['ignore', 'pipe', 'pipe']});
    if (prefix) {
      pipe(child.stdout, prefix, process.stderr);
      pipe(child.stderr, prefix, process.stderr);
    } else {
      child.stdout.resume();
      child.stderr.resume();
    }
    child.on('error', () => r(null));
    child.on('exit', code => r(code));
  });
}

/**
 * Build the launched catalog packages through the checkout's own turbo (decision 6), an unchanged
 * package a cache hit. One run builds them all; when it fails, each package is built alone to name
 * the ones that did not build — the others answer from the cache. Returns each failure's reason.
 */
async function buildCatalogs(agentsDir, entries) {
  const filters = entries.map(entry => `--filter=${entry.catalogPackage}`);
  const prefix = `${DIM}[build]${RESET}`;
  const code = await run(
    'pnpm',
    ['exec', 'turbo', 'run', 'build', ...filters, '--continue', '--output-logs=errors-only'],
    {cwd: agentsDir, prefix},
  );
  const failures = new Map();
  if (code === 0) return failures;
  for (const entry of entries) {
    const alone = await run(
      'pnpm',
      ['exec', 'turbo', 'run', 'build', `--filter=${entry.catalogPackage}`, '--output-logs=none'],
      {cwd: agentsDir},
    );
    if (alone !== 0) {
      failures.set(entry.id, `${entry.catalogPackage} did not build — see [build] above`);
    }
  }
  return failures;
}

/** Pack each built catalog with this repo's Stellify (decision 7): its files, or the findings. */
async function packCatalog(entry) {
  const result = await stellify(entry.catalogDir);
  if (result.findings.length > 0) {
    const findings = result.findings.map(f => `\n    ${f.file}: ${f.reason}`).join('');
    return {reason: `Stellify refused ${entry.catalogPackage}:${findings}`};
  }
  return {files: artifactFiles(result)};
}

const indented = lines => lines.map(line => `\n    ${line}`).join('');

/**
 * Preview, then publish, one app under `--publish` (task-13.6 decisions 7 to 9): the reason it is
 * left out, or null once the marketplace took it. The preview runs only for a card that requires
 * sign-in, with the credential `previewCredential` obtains, its document held in memory and handed
 * to publish; for any other card the marketplace captures the preview itself.
 */
async function publishApp(entry, files, {marketplace, publisher, token}) {
  let card;
  try {
    const res = await fetch(entry.cardUrl, {signal: AbortSignal.timeout(CARD_READ_TIMEOUT_MS)});
    if (!res.ok) return `its card answered ${res.status}`;
    card = await res.json();
  } catch (err) {
    return `its card could not be read: ${err.message}`;
  }
  let captured;
  if (requiresSignIn(card)) {
    const {credential, reason} = await previewCredential(card, entry);
    if (reason) return reason;
    const result = await preview({
      appId: entry.id,
      cardUrl: entry.cardUrl,
      catalogs: [files],
      credential,
      marketplace,
      publisher,
    });
    if (result.findings.length) return `its preview was refused:${indented(result.findings)}`;
    captured = result.document;
  }
  const answer = await publish({
    marketplace,
    token,
    appId: entry.id,
    cardUrl: entry.cardUrl,
    catalogs: [files],
    ...(captured ? {preview: captured} : {}),
  });
  if (!answer.ok) return `the marketplace refused it:${indented(answer.findings)}`;
  log(answer.summary);
  for (const note of answer.notes) log(`${entry.id}: ${note}`);
  return null;
}

/** The dev publisher, established before any publish; null when the marketplace path cannot run. */
async function devPublisher(marketplace) {
  const established = await establishPublisher({
    marketplace,
    path: PUBLISHER_FILE,
    api: {claim, unpublish},
    read: readPublisherFile,
    write: writePublisherFile,
  });
  if (!established.ok) {
    log(`${established.words} · the apps run, not installed`);
    return null;
  }
  log(
    established.claimed === 'again'
      ? `claimed ${DEV_PUBLISHER} again at ${marketplace}: it no longer knew the token in ${PUBLISHER_FILE}`
      : established.claimed
        ? `claimed ${DEV_PUBLISHER} at ${marketplace}, its token kept in ${PUBLISHER_FILE}`
        : `publishing as ${DEV_PUBLISHER} to ${marketplace}`,
  );
  return established.record;
}

/**
 * Build, pack, install and reconcile (decisions 5 to 9). Every failure is reported by name with its
 * reason and leaves that app out; the reconcile then takes out any install of it an earlier launch
 * left behind. `marketplace`, under `--publish`, is where each app is published before it is
 * installed from there by id (task-13.6).
 */
async function installLaunch(selected, running, registry, agentsDir, marketplace) {
  const failed = new Map();
  const report = (id, reason) => {
    failed.set(id, reason);
    log(`${id} left out — ${reason}`);
  };

  const orchestratorUp = waitFor(
    () => cardAnswers(`${registry.url}/.well-known/agent-card.json`),
    ORCHESTRATOR_TIMEOUT_MS,
  );
  const marketplaceUp =
    marketplace && waitFor(() => cardAnswers(`${marketplace}/index.json`), ORCHESTRATOR_TIMEOUT_MS);

  log(`building ${selected.map(e => e.catalogPackage).join(', ')}…`);
  for (const [id, reason] of await buildCatalogs(agentsDir, selected)) report(id, reason);
  const packed = new Map();
  for (const entry of selected.filter(e => !failed.has(e.id))) {
    const {files, reason} = await packCatalog(entry);
    if (reason) report(entry.id, reason);
    else packed.set(entry.id, files);
  }

  if (!(await orchestratorUp)) {
    log(
      `no orchestrator answered at ${registry.url} in ${ORCHESTRATOR_TIMEOUT_MS / 1000} s · the apps run, not installed`,
    );
    return;
  }
  await registry.readToken();

  let publisher = null;
  if (marketplace) {
    if (!(await marketplaceUp)) {
      log(
        `no marketplace answered at ${marketplace} in ${ORCHESTRATOR_TIMEOUT_MS / 1000} s · the apps run, not installed`,
      );
      return;
    }
    publisher = await devPublisher(marketplace);
    if (!publisher) return;
  }

  const installed = [];
  const published = [];
  await Promise.all(
    [...packed].map(async ([id, files]) => {
      const {entry, ready} = running.get(id);
      const notUp = await ready;
      if (notUp) return report(id, notUp);
      if (publisher) {
        const notPublished = await publishApp(entry, files, publisher);
        if (notPublished) return report(id, notPublished);
        published.push(id);
      }
      let answer;
      try {
        answer = await registry.install(
          publisher ? installByIdBody(id) : installBody(id, entry.cardUrl, files),
        );
      } catch (err) {
        if (err instanceof CannotWrite) throw err;
        return report(id, `the install did not complete: ${err.message}`);
      }
      if (!answer.ok) {
        return report(
          id,
          `the orchestrator refused it:${answer.findings.map(f => `\n    ${f}`).join('')}`,
        );
      }
      installed.push(id);
      log(answer.summary ?? `installed ${id}`);
      for (const note of answer.notes ?? []) log(`${id}: ${note}`);
    }),
  );

  const uninstalled = [];
  const records = await registry.installed();
  for (const id of appsToUninstall({
    installedIds: records.map(record => record.id),
    roster: ROSTER,
    launchedIds: installed,
  })) {
    const answer = await registry.uninstall(id);
    if (!answer.ok) {
      log(`could not uninstall ${id}:${answer.findings.map(f => `\n    ${f}`).join('')}`);
      continue;
    }
    uninstalled.push(id);
    log(`uninstalled ${id} — ${failed.has(id) ? 'it failed this launch' : 'not in this launch'}`);
  }

  if (publisher) {
    const listed = await listPublished({
      marketplace: publisher.marketplace,
      publisher: publisher.publisher,
    });
    if (!listed.ok) log(`the notices could not be read:${indented(listed.findings)}`);
    else for (const notice of noticesLeft(listed.notices, published)) log(describeNotice(notice));
  }

  const parts = [`installed ${installed.length ? installed.sort().join(', ') : 'nothing'}`];
  if (publisher)
    parts.unshift(`published ${published.length ? published.sort().join(', ') : 'nothing'}`);
  if (failed.size) parts.push(`left out ${[...failed.keys()].sort().join(', ')}`);
  if (uninstalled.length) parts.push(`uninstalled ${uninstalled.sort().join(', ')}`);
  log(parts.join(' · '));
}

/**
 * The listing (decision 11). Under `--publish` it also names the marketplace, the dev publisher's
 * file as it stands, and what each sign-in app's preview signs in with — read from disk, nothing
 * contacted, the exit code unchanged (task-13.6 decision 13).
 */
function printListing({dir, source}, {tier, entries, fatal}, publishing) {
  console.log(`agents dir: ${dir} (${source})`);
  console.log(`tier: ${tier}`);
  if (publishing) {
    console.log(`marketplace: ${publishing.marketplace}`);
    console.log(publisherLine(publishing.known, PUBLISHER_FILE));
  }
  const rows = entries.map(e => [
    e.id,
    e.folder,
    String(e.port),
    ...(publishing ? [previewWords(e)] : []),
    e.ok ? 'ok' : `skipped: ${e.reason}`,
  ]);
  if (!rows.length) console.log('  no apps in this tier');
  const widths = (rows[0] ?? []).map((_, n) => Math.max(...rows.map(r => r[n].length), 0));
  for (const row of rows) {
    const cells = row.map((cell, n) =>
      n === row.length - 1 ? cell : n === 2 ? cell.padStart(widths[n]) : cell.padEnd(widths[n]),
    );
    console.log(`  ${cells.join('  ')}`);
  }
  for (const problem of fatal) console.log(`fatal: ${problem}`);
}

async function main() {
  const {
    tier,
    mode,
    only,
    then,
    agentsDir,
    list,
    install,
    publish: toMarketplace,
    agentState,
  } = parse();
  const orchestrator = orchestratorOf({env: process.env, orchestratorDir: ORCHESTRATOR_DIR});
  const marketplace = toMarketplace ? orchestrator.marketplaceUrl : null;

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

  const publicUrls = publicUrlsOf(process.env.A2UIVERSE_PUBLIC_URL);
  if (publicUrls.error) fail(publicUrls.error);

  const plan = planLaunch({
    roster: ROSTER,
    tier,
    only,
    agentsDir: resolved.dir,
    exists: existsSync,
  });

  if (list) {
    const publishing = marketplace && {
      marketplace,
      known: publisherState(await readPublisherFile(PUBLISHER_FILE), marketplace, PUBLISHER_FILE),
    };
    printListing(resolved, plan, publishing);
    process.exit(plan.fatal.length ? 2 : 0);
  }

  log(`agents dir ${resolved.dir} (${resolved.source})`);
  for (const entry of plan.entries.filter(e => !e.ok)) log(`skipping ${entry.id}: ${entry.reason}`);
  if (plan.fatal.length) {
    for (const problem of plan.fatal) log(problem);
    process.exit(2);
  }
  const {selected} = plan;
  if (!selected.length) fail(`no launchable apps in the ${tier} tier`);

  log(`${selected.map(e => e.id).join(', ')} in ${mode} mode (${tier} tier)`);
  if (publicUrls.pattern) log(`sign-in pages at ${publicUrls.pattern} (A2UIVERSE_PUBLIC_URL)`);
  if (agentState) log(`sign-in stores under ${agentState} (--agent-state)`);
  if (marketplace)
    log(`publishing to ${marketplace} as ${DEV_PUBLISHER}, installing from there (--publish)`);
  const running = new Map(
    selected.map((entry, i) => [
      entry.id,
      start(entry, mode, COLORS[i % COLORS.length], publicUrls.of(entry.port), agentState),
    ]),
  );

  /** Ctrl-C tears the whole group down — the agents, and the platform if we started it. */
  let platform = null;
  let stopping = false;
  const stop = async () => {
    if (stopping) return;
    stopping = true;
    for (const {child} of running.values()) child.kill('SIGINT');
    platform?.kill('SIGINT');
    await Promise.all([...running.values()].map(r => r.exited));
    process.exit();
  };
  process.on('SIGINT', stop);
  process.on('SIGTERM', stop);

  if (then) {
    platform = spawn(then, {cwd: REPO_ROOT, shell: true, stdio: 'inherit'});
    platform.on('exit', code => {
      process.exitCode = code ?? 0;
      stop();
    });
  }

  if (!install) {
    log('--no-install · the apps run, not installed');
    await new Promise(() => {});
  }

  const registry = new Registry(orchestrator);
  try {
    await installLaunch(selected, running, registry, resolved.dir, marketplace);
  } catch (err) {
    log(err instanceof CannotWrite ? err.message : `installing stopped: ${err.message}`);
  }
  await new Promise(() => {});
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
