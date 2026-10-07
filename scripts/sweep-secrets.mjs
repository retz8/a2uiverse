/**
 * The secret sweep (task-12.13 decision 6): every secret a sitting created — the vault file's
 * tokens and keys, and what each agent's sign-in store keeps: its ID-token signing key, the
 * vendor's tokens, its own registration's secret at its vendor — searched for in the journal and
 * in every file of the captured process output. It reports how many secrets each searched file
 * holds, never a secret, and exits non-zero when any file holds one. What reaches the browser is
 * not searched.
 *
 *   pnpm sweep:secrets [--state-dir <dir>] [--agents-dir <dir>] [--logs <dir>]... [<file>]...
 *
 * The orchestrator's state directory resolves as its `registry` command resolves it; the apps
 * checkout as the launcher resolves it.
 */
import {existsSync, readdirSync, readFileSync, statSync} from 'node:fs';
import {join, relative, resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {parseArgs} from 'node:util';

import {ROSTER} from './dev-roster.mjs';
import {resolveAgentsDir} from './launch-plan.mjs';
import {orchestratorOf} from './launch-registry.mjs';

const VAULT_FILE = join('vault', 'vault.json');
const JOURNAL_FILE = 'intent-journal.jsonl';
const AGENT_STORE = join('agent', '.state', 'sign-in.json');

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

  const sources = [];
  const vault = readJson(join(stateDir, VAULT_FILE));
  sources.push({name: 'the vault', secrets: vault ? secretsOfVault(vault) : []});
  for (const {id, folder} of ROSTER) {
    const store = readJson(join(agentsDir, folder, AGENT_STORE));
    if (store) sources.push({name: `${id}'s sign-in store`, secrets: secretsOfAgentStore(store)});
  }
  const secrets = [...new Set(sources.flatMap(source => source.secrets))];

  const files = [
    join(stateDir, JOURNAL_FILE),
    ...values.logs.flatMap(dir => filesUnder(resolve(dir))),
    ...positionals.map(path => resolve(path)),
  ].filter(path => existsSync(path));

  console.log(`state directory: ${stateDir}`);
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
