/**
 * Copies the pinned A2UI v0.9.1 spec schemas, its basic catalog, and upstream's validator conformance cases into
 * `packages/sdk/a2ui-spec/`, from the `upstream/main` ref of the sibling A2UI fork, and records the
 * upstream commit in `a2ui-spec/UPSTREAM.json`. The copies are never hand-edited: sync the spec
 * (`git -C ../A2UI fetch upstream`), then run `pnpm --filter @a2uiverse/sdk sync-a2ui-spec`.
 *
 * `A2UI_REPO` overrides the fork's path (default: the monorepo's sibling `../A2UI`).
 */
import {execFileSync} from 'node:child_process';
import {mkdirSync, rmSync, writeFileSync} from 'node:fs';
import {dirname, resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {parse} from 'yaml';

const here = dirname(fileURLToPath(import.meta.url));
const repo = process.env.A2UI_REPO ?? resolve(here, '../../../../../A2UI');
const target = resolve(here, '../../a2ui-spec');
const REF = 'upstream/main';

const SPEC_FILES = [
  'specification/v0_9_1/json/server_to_client.json',
  'specification/v0_9_1/json/common_types.json',
  'specification/v0_9_1/catalogs/basic/catalog.json',
];
const CONFORMANCE = 'conformance/core/validator.yaml';

const git = (...args) => execFileSync('git', ['-C', repo, ...args], {encoding: 'utf8'});
const show = path => git('show', `${REF}:${path}`);

const commit = git('rev-parse', REF).trim();

// The conformance cases name their schemas by path relative to `conformance/`; copy each one.
const cases = parse(show(CONFORMANCE));
const testData = new Set();
for (const testCase of cases) {
  for (const value of Object.values(testCase.catalog ?? {})) {
    if (typeof value === 'string' && value.startsWith('test_data/')) testData.add(value);
  }
}
const files = [...SPEC_FILES, CONFORMANCE, ...[...testData].sort().map(p => `conformance/${p}`)];

rmSync(target, {recursive: true, force: true});
for (const file of files) {
  const out = resolve(target, file);
  mkdirSync(dirname(out), {recursive: true});
  writeFileSync(out, show(file));
}
writeFileSync(
  resolve(target, 'UPSTREAM.json'),
  `${JSON.stringify({repository: 'a2ui-project/a2ui', ref: REF, commit, files}, null, 2)}\n`,
);
console.log(`a2ui-spec: ${files.length} files at ${commit}`);
