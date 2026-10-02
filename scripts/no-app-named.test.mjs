/**
 * No line of the client's or the orchestrator's runtime code names an app (phase-11 decision 17,
 * task-11.8 decision 4): every app is installed from its card and its catalog artifact, never built
 * in. The runtime source — the client, the orchestrator, and the shell catalog the client runs — is
 * searched for every dev-roster app's id as a string literal or a surface's namespace, its catalog
 * package's name, and its catalog id. Comments are not code and are not searched; tests sit outside
 * the runtime source. What remains is allowed only by an entry below, with its reason, and an entry
 * that allows nothing any more fails too, so the list never outlives what it excuses.
 */
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {readFileSync} from 'node:fs';
import {dirname, resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {test} from 'node:test';

import {ROSTER} from './dev-roster.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');

const RUNTIME_SOURCE = ['apps/client/src', 'apps/orchestrator/src', 'packages/shell-catalog/src'];
const SOURCE_FILE = /\.(ts|tsx|js|mjs|css|json|html)$/;
const TEST_FILE = /(\.test\.|\.spec\.|\/test\/|\/__tests__\/)/;

/** Each path, file or directory, where a naming is allowed, and why. */
const ALLOWED = [
  {
    path: 'apps/client/src/beats/',
    reason:
      "the replay's fixture data: the recorded and hand-authored beats carry the app ids, surfaces and catalog ids they were painted with",
  },
  {
    path: 'apps/orchestrator/src/planner/examples.ts',
    reason:
      "the Planner prompt's worked examples, authored over fixture cards: they teach the layout surface's form, and route nothing",
  },
  {
    path: 'apps/orchestrator/src/synthesizer/examples.ts',
    reason:
      "the Synthesizer prompt's worked examples, authored over fixture sources: they teach the synthesis surface's form, and route nothing",
  },
];

const escape = text => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/** What names one app: its id quoted or as a surface's namespace, its catalog package, its catalog id. */
const namings = ROSTER.map(({id, folder}) => ({
  id,
  pattern: new RegExp(
    [
      `['"\`]${escape(id)}['"\`:]`,
      `\\b${escape(id)}-catalog\\b`,
      `a2uiverse-apps/blob/main/${escape(folder)}/`,
    ].join('|'),
  ),
}));

/** Comment lines and trailing `//` comments go; a `//` after `:` is a URL's, and stays. */
function codeLines(text) {
  return text.split('\n').map(line => {
    const trimmed = line.trimStart();
    if (/^(\/\/|\/\*|\*)/.test(trimmed)) return '';
    return line.replace(/(^|[^:])\/\/.*$/, '$1').trimEnd();
  });
}

function runtimeFiles() {
  return execFileSync('git', ['ls-files', '--', ...RUNTIME_SOURCE], {cwd: root, encoding: 'utf8'})
    .split('\n')
    .filter(path => SOURCE_FILE.test(path) && !TEST_FILE.test(path));
}

function findNamings() {
  const found = [];
  for (const path of runtimeFiles()) {
    const lines = codeLines(readFileSync(resolve(root, path), 'utf8'));
    lines.forEach((line, i) => {
      for (const {id, pattern} of namings) {
        if (pattern.test(line)) found.push({path, line: i + 1, id, text: line.trim()});
      }
    });
  }
  return found;
}

const allowedBy = path => ALLOWED.find(entry => path.startsWith(entry.path));

test('no runtime code of the client or the orchestrator names an app', () => {
  const unallowed = findNamings().filter(hit => !allowedBy(hit.path));
  assert.deepEqual(
    unallowed.map(hit => `${hit.path}:${hit.line} names ${hit.id}: ${hit.text}`),
    [],
  );
});

test('every allowed path still holds a naming it excuses', () => {
  const hits = findNamings();
  const stale = ALLOWED.filter(entry => !hits.some(hit => hit.path.startsWith(entry.path)));
  assert.deepEqual(
    stale.map(entry => entry.path),
    [],
  );
});

test('the search finds a naming in code and none in a comment', () => {
  const [github] = namings;
  assert.ok(github.pattern.test(`const source = 'github';`));
  assert.ok(github.pattern.test(`const surface = 'github:list';`));
  assert.ok(github.pattern.test(`import {CATALOG} from 'github-catalog';`));
  assert.ok(
    github.pattern.test(
      `'https://github.com/retz8/a2uiverse-apps/blob/main/github/github-catalog/catalogs/v0.9.1/catalog.json'`,
    ),
  );
  assert.ok(!github.pattern.test(`const host = 'https://github.com/retz8/a2uiverse';`));
  assert.deepEqual(codeLines(`// 'github'\n * 'github'\nconst a = 1; // 'github'`), [
    '',
    '',
    'const a = 1;',
  ]);
});
