#!/usr/bin/env node
/**
 * The validator's verdict on every recorded surface of both repos, taken before the flip
 * (task-21.11 decisions 9 and 11).
 *
 *   node scripts/recorded-verdicts.mjs [--agents-dir <path>]
 *
 * Writes `scripts/recorded-verdicts.json`: for each recorded file, each surface it paints, and
 * whether the sdk's v0.9.1 validator accepts it against the catalog it names, or which components
 * it refuses and why. The client's recorded beats are read from this checkout; the apps repo's
 * files from the commit its checkout is at, which the list names. The Store captures, each
 * agent's gitignored `.recordings/`, Shop C's payloads and the stub corpora are not read.
 *
 * A surface is judged paint by paint: the messages from its `createSurface` to the next, within one
 * canvas of a beat. A fixture that names no surface is stamped with one, as the agent kit stamps
 * it at send; a surface the file updates without creating it is judged as the incremental update
 * it is, in the catalog of the app the file belongs to.
 */
import {execFileSync} from 'node:child_process';
import {readdirSync, readFileSync, writeFileSync} from 'node:fs';
import {dirname, join, resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {createA2uiValidator} from '@a2uiverse/sdk';
import {format} from 'prettier';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const OUT = join(ROOT, 'scripts', 'recorded-verdicts.json');

const flag = name => {
  const at = process.argv.indexOf(name);
  return at === -1 ? undefined : process.argv[at + 1];
};
const APPS = resolve(
  ROOT,
  flag('--agents-dir') ?? process.env.A2UIVERSE_AGENTS_DIR ?? '../a2uiverse-apps',
);

const git = (dir, ...args) =>
  execFileSync('git', ['-C', dir, ...args], {encoding: 'utf8', maxBuffer: 1 << 28});
const APPS_COMMIT = git(APPS, 'rev-parse', 'HEAD').trim();
const appsFile = path => git(APPS, 'show', `${APPS_COMMIT}:${path}`);
const APPS_FILES = git(APPS, 'ls-tree', '-r', '--name-only', APPS_COMMIT).split('\n');

const OPERATIONS = ['createSurface', 'updateComponents', 'updateDataModel', 'deleteSurface'];

/** The catalog id a GitHub blob address names, as the repo and the path inside it. */
const PLATFORM_BLOB = 'https://github.com/retz8/a2uiverse/blob/main/';
const APPS_BLOB = 'https://github.com/retz8/a2uiverse-apps/blob/main/';

/** The agent kit's test catalogs, named by ids of their own. */
const KIT_CATALOGS = {
  'https://example.test/a2uiverse-kit/basic/catalog.json':
    'agent-kit/tests/fixtures/catalog-basic.json',
  'https://example.test/a2uiverse-kit/custom/catalog.json':
    'agent-kit/tests/fixtures/catalog-custom.json',
};

/**
 * The apps repo's recorded files, each with the catalog its app paints in: the one a surface the
 * file does not create is judged in, and the one the scaffolder's `__CATALOG_ID__` stands for.
 */
const APP_FOLDERS = [
  ['agent-kit/tests/fixtures/', 'agent-kit/tests/fixtures/catalog-basic.json'],
  [
    'create-a2ui-agent/templates/agent-kind/basic/',
    'create-a2ui-agent/templates/catalog/basic/catalogs/v0.9.1/catalog.json',
  ],
  [
    'create-a2ui-agent/templates/agent-kind/custom/',
    'create-a2ui-agent/templates/catalog/custom/catalogs/v0.9.1/catalog.json',
  ],
  ['calendar/', 'calendar/calendar-catalog/catalogs/v0.9.1/catalog.json'],
  ['circleci/', 'circleci/circleci-catalog/catalogs/v0.9.1/catalog.json'],
  ['github/', 'github/github-catalog/catalogs/v0.9.1/catalog.json'],
  ['gmail/', 'gmail/gmail-catalog/catalogs/v0.9.1/catalog.json'],
  ['linear/', 'linear/linear-catalog/catalogs/v0.9.1/catalog.json'],
  ['mocks/shop-a/', 'mocks/shop-a/shop-a-catalog/catalogs/v0.9.1/catalog.json'],
  ['mocks/shop-b/', 'mocks/shop-b/shop-b-catalog/catalogs/v0.9.1/catalog.json'],
];

/** Where the apps repo keeps what an agent sends: its recorded beats, fixtures and examples. */
const RECORDED = [
  /^[^/]+\/agent\/recordings\/beats\/.+\.json$/,
  /^mocks\/shop-[ab]\/agent\/recordings\/beats\/.+\.json$/,
  /^[^/]+\/agent\/app\/fixtures\/deterministic\/.+\.json$/,
  /^[^/]+\/agent\/app\/knowledge\/examples\/.+\.json$/,
  /^mocks\/shop-[ab]\/agent\/app\/knowledge\/examples\/.+\.json$/,
  /^agent-kit\/tests\/fixtures\/(?!catalog-).+\.json$/,
  /^create-a2ui-agent\/templates\/agent-kind\/[^/]+\/app\/(fixtures\/deterministic|knowledge\/examples)\/.+\.json$/,
];

const catalogCache = new Map();
function catalogDocument(repo, path) {
  const key = `${repo}:${path}`;
  if (!catalogCache.has(key)) {
    const text = repo === 'platform' ? readFileSync(join(ROOT, path), 'utf8') : appsFile(path);
    catalogCache.set(key, {path: key, schema: JSON.parse(text)});
  }
  return catalogCache.get(key);
}

/** The catalog document a catalog id names, `own` standing for the file's app catalog. */
function catalogFor(id, own) {
  if (id === undefined || id === '__CATALOG_ID__') return own;
  if (id.startsWith(PLATFORM_BLOB))
    return catalogDocument('platform', id.slice(PLATFORM_BLOB.length));
  if (id.startsWith(APPS_BLOB)) return catalogDocument('apps', id.slice(APPS_BLOB.length));
  if (KIT_CATALOGS[id]) return catalogDocument('apps', KIT_CATALOGS[id]);
  throw new Error(`no catalog document known for ${id}`);
}

const isObject = value => typeof value === 'object' && value !== null && !Array.isArray(value);
const operationOf = message => OPERATIONS.find(op => isObject(message[op]));

/**
 * A file's messages in arrival order, each with the canvas it lands on: a beat's turns in order, a
 * turn's canvas the one it names, an utterance opening one of its own; a list, or an example's
 * `messages`, one canvas.
 */
function messagesOf(file) {
  if (Array.isArray(file)) return file.map(message => ({canvas: 0, message}));
  if (Array.isArray(file.messages)) return file.messages.map(message => ({canvas: 0, message}));
  if (!Array.isArray(file.turns)) return [];
  const out = [];
  let opened = -1;
  for (const turn of file.turns) {
    const canvas = turn.kind === 'utterance' ? ++opened : (turn.canvas ?? opened);
    for (const batch of turn.batches) {
      for (const message of batch.messages) out.push({canvas, message});
    }
  }
  return out;
}

/** One file's surfaces, paint by paint, each judged against its catalog. */
function judgeFile(name, file, own) {
  const paints = [];
  const open = new Map();
  const counts = new Map();
  for (const {canvas, message} of messagesOf(file)) {
    const op = isObject(message) ? operationOf(message) : undefined;
    if (!op) continue;
    const body = message[op];
    const stamped =
      typeof body.surfaceId === 'string'
        ? message
        : {...message, [op]: {...body, surfaceId: 'fixture'}};
    const surfaceId = stamped[op].surfaceId;
    const key = `${canvas}|${surfaceId}`;
    if (op === 'createSurface' || !open.has(key)) {
      const created = op === 'createSurface';
      const n = created ? (counts.get(surfaceId) ?? 0) + 1 : 0;
      if (created) counts.set(surfaceId, n);
      const catalogId = created ? body.catalogId : undefined;
      const paint = {
        surface: surfaceId,
        paint: n,
        catalog: catalogFor(catalogId, own),
        messages: [],
      };
      paints.push(paint);
      open.set(key, paint);
    }
    open.get(key).messages.push(stamped);
    if (op === 'deleteSurface') open.delete(key);
  }
  return paints.map(({surface, paint, catalog, messages}) => {
    const findings = createA2uiValidator({catalog: catalog.schema}).validate(messages);
    const entry = {surface, paint, catalog: catalog.path};
    if (findings.length === 0) return {...entry, verdict: 'accepted'};
    const components = [...new Set(findings.map(f => f.componentId).filter(Boolean))].sort();
    return {
      ...entry,
      verdict: 'refused',
      components,
      findings: findings.map(f =>
        [f.path, f.componentId && `(${f.componentId})`, f.message].filter(Boolean).join(' '),
      ),
    };
  });
}

const files = [];
const beats = join(ROOT, 'apps/client/recordings/beats');
for (const name of readdirSync(beats)
  .filter(f => f.endsWith('.json'))
  .sort()) {
  const path = `apps/client/recordings/beats/${name}`;
  files.push({
    repo: 'a2uiverse',
    path,
    json: JSON.parse(readFileSync(join(ROOT, path), 'utf8')),
    own: undefined,
  });
}
for (const path of APPS_FILES.filter(p => RECORDED.some(re => re.test(p))).sort()) {
  const json = JSON.parse(appsFile(path));
  const carries = messagesOf(json).some(({message}) => isObject(message) && operationOf(message));
  if (!carries) continue;
  const folder = APP_FOLDERS.find(([prefix]) => path.startsWith(prefix));
  if (!folder) throw new Error(`no app catalog known for ${path}`);
  files.push({repo: 'a2uiverse-apps', path, json, own: catalogDocument('apps', folder[1])});
}

const list = {
  appsCommit: APPS_COMMIT,
  files: files.map(({repo, path, json, own}) => ({
    repo,
    path,
    surfaces: judgeFile(path, json, own),
  })),
};
writeFileSync(OUT, await format(JSON.stringify(list), {filepath: OUT}));

const surfaces = list.files.flatMap(f => f.surfaces);
const refused = surfaces.filter(s => s.verdict === 'refused');
console.log(
  `${list.files.length} files, ${surfaces.length} surfaces, ${refused.length} refused — apps at ${APPS_COMMIT.slice(0, 7)}`,
);
