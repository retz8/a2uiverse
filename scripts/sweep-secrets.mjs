/**
 * The secret sweep (task-12.13 decision 6): every secret a sitting created — the vault file's
 * tokens and keys, what each agent's sign-in store keeps: its ID-token signing key, the vendor's
 * tokens, its own registration's secret at its vendor — and each publisher's token (task-13.8
 * decision 7), the one the orchestrator holds for Publish among them (task 14.4), searched for in the journal, in every file of the marketplace's state but its
 * embedding model, and in every file of the captured process output. It reports how many secrets
 * each searched file holds, never a secret, and exits non-zero when any file holds one. What
 * reaches the browser is not searched.
 *
 *   pnpm sweep:secrets [--state-dir <dir>] [--agents-dir <dir>] [--marketplace-state <dir>]
 *                      [--dev-publisher <file>] [--publisher <file>]... [--logs <dir>]... [<file>]...
 *
 * The orchestrator's state directory resolves as its `registry` command resolves it; the apps
 * checkout as the launcher resolves it; the marketplace's state directory as the marketplace
 * resolves its own. The publisher files are the orchestrator's, in its state directory, the
 * launcher's dev publisher's, at its own place unless given, and each one given — a second
 * publisher's, the person's own.
 */
import {existsSync, readdirSync, readFileSync, statSync} from 'node:fs';
import {join, relative, resolve, sep} from 'node:path';
import {fileURLToPath} from 'node:url';
import {parseArgs, parseEnv} from 'node:util';

import {ROSTER} from './dev-roster.mjs';
import {publisherFileOf} from './launch-marketplace.mjs';
import {resolveAgentsDir} from './launch-plan.mjs';
import {orchestratorOf} from './launch-registry.mjs';

const VAULT_FILE = join('vault', 'vault.json');
/** The publisher the orchestrator holds for Publish (task 14.4). */
const ORCHESTRATOR_PUBLISHER_FILE = join('publisher', 'publisher.json');
const JOURNAL_FILE = 'intent-journal.jsonl';
const AGENT_STORE = join('agent', '.state', 'sign-in.json');
/** The marketplace's embedding model cache: no file the marketplace writes. */
const MARKETPLACE_MODELS = 'models';

/** Shorter strings are not secrets the stores hold, and would match by chance. */
const MIN_LENGTH = 16;

/** A key naming a secret value in an agent's store: a token, a client secret. */
const SECRET_KEY = /(^|_)(token|secret)$/;

/** The vault's secrets: each account's token or key, and its refresh token. */
export function secretsOfVault(data) {
  const found = [];
  for (const app of Object.values(data?.apps ?? {})) {
    for (const account of app.accounts ?? []) {
      found.push(account.secret, account.refresh);
    }
  }
  return keep(found);
}

/**
 * An agent's store's secrets: the private part of its signing key, and every string under a key
 * naming a token or a secret — the vendor's tokens on each account, its registration at its vendor.
 * The tables of issued tokens are keyed by hash and hold none.
 */
export function secretsOfAgentStore(data) {
  const found = [data?.signing_key?.d];
  const walk = value => {
    if (Array.isArray(value)) value.forEach(walk);
    else if (value !== null && typeof value === 'object') {
      for (const [key, inner] of Object.entries(value)) {
        if (typeof inner === 'string' && SECRET_KEY.test(key)) found.push(inner);
        else walk(inner);
      }
    }
  };
  walk(data?.accounts);
  walk(data?.upstream);
  walk(data?.clients);
  return keep(found);
}

/** A publisher file's secret: its token. */
export function secretsOfPublisherFile(data) {
  return keep([data?.token]);
}

/**
 * The marketplace's state directory, as it resolves its own: `STATE_DIR` against its package,
 * `.state` by default, over its `.env` with the shell's environment winning, as `tsx --env-file`
 * gives it.
 */
export function marketplaceStateOf({env, marketplaceDir}) {
  const envFile = join(marketplaceDir, '.env');
  const merged = {
    ...(existsSync(envFile) ? parseEnv(readFileSync(envFile, 'utf8')) : {}),
    ...env,
  };
  return resolve(marketplaceDir, merged.STATE_DIR ?? '.state');
}

/** Every file of the marketplace's state — the index, the entries, the previews, the artifacts, the publishers — but its embedding model. */
export function marketplaceFiles(dir) {
  const models = join(dir, MARKETPLACE_MODELS) + sep;
  return existsSync(dir) ? filesUnder(dir).filter(path => !path.startsWith(models)) : [];
}

function keep(values) {
  return [...new Set(values.filter(v => typeof v === 'string' && v.length >= MIN_LENGTH))];
}

/** How many of the secrets each file holds, by its path. */
export function sweep(secrets, files) {
  return files.map(path => {
    const text = readFileSync(path, 'utf8');
    return {path, found: secrets.filter(secret => text.includes(secret)).length};
  });
}

/** Every file under a directory of captured output. */
function filesUnder(dir) {
  return readdirSync(dir, {recursive: true})
    .map(entry => join(dir, entry))
    .filter(path => statSync(path).isFile());
}

function readJson(path) {
  return existsSync(path) ? JSON.parse(readFileSync(path, 'utf8')) : null;
}

function main(argv) {
  const {values, positionals} = parseArgs({
    args: argv,
    options: {
      'state-dir': {type: 'string'},
      'agents-dir': {type: 'string'},
      'marketplace-state': {type: 'string'},
      'dev-publisher': {type: 'string'},
      publisher: {type: 'string', multiple: true, default: []},
      logs: {type: 'string', multiple: true, default: []},
    },
    allowPositionals: true,
  });
  const repoRoot = resolve(fileURLToPath(import.meta.url), '..', '..');
  const orchestratorDir = join(repoRoot, 'apps', 'orchestrator');
  const stateDir = values['state-dir']
    ? resolve(values['state-dir'])
    : orchestratorOf({env: process.env, orchestratorDir}).stateDir;
  const agentsDir = resolveAgentsDir({
    flag: values['agents-dir'],
    env: process.env.A2UIVERSE_AGENTS_DIR,
    repoRoot,
  }).dir;
  const marketplaceState = values['marketplace-state']
    ? resolve(values['marketplace-state'])
    : marketplaceStateOf({env: process.env, marketplaceDir: join(repoRoot, 'apps', 'marketplace')});
  const publisherFiles = [
    join(stateDir, ORCHESTRATOR_PUBLISHER_FILE),
    values['dev-publisher']
      ? resolve(values['dev-publisher'])
      : publisherFileOf(join(repoRoot, 'scripts')),
    ...values.publisher.map(path => resolve(path)),
  ];

  const sources = [];
  const vault = readJson(join(stateDir, VAULT_FILE));
  sources.push({name: 'the vault', secrets: vault ? secretsOfVault(vault) : []});
  for (const {id, folder} of ROSTER) {
    const store = readJson(join(agentsDir, folder, AGENT_STORE));
    if (store) sources.push({name: `${id}'s sign-in store`, secrets: secretsOfAgentStore(store)});
  }
  for (const path of publisherFiles) {
    const file = readJson(path);
    if (file) {
      sources.push({
        name: `the publisher file ${relative(process.cwd(), path)}`,
        secrets: secretsOfPublisherFile(file),
      });
    }
  }
  const secrets = [...new Set(sources.flatMap(source => source.secrets))];

  const files = [
    join(stateDir, JOURNAL_FILE),
    ...marketplaceFiles(marketplaceState),
    ...values.logs.flatMap(dir => filesUnder(resolve(dir))),
    ...positionals.map(path => resolve(path)),
  ].filter(path => existsSync(path));

  console.log(`state directory: ${stateDir}`);
  console.log(`marketplace state: ${marketplaceState}`);
  for (const {name, secrets: held} of sources) console.log(`  ${name}: ${held.length} secrets`);
  const results = sweep(secrets, files);
  for (const {path, found} of results) {
    console.log(
      `${found === 0 ? 'clean' : 'FOUND'}  ${found} of ${secrets.length}  ${relative(process.cwd(), path)}`,
    );
  }
  const leaked = results.filter(result => result.found > 0);
  if (secrets.length === 0) console.log('no secrets held: nothing to sweep for');
  else if (leaked.length === 0) console.log(`no secret in ${results.length} files`);
  process.exitCode = leaked.length > 0 ? 1 : 0;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main(process.argv.slice(2));
}
