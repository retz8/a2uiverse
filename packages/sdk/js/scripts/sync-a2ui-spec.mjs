/**
 * Copies the pinned A2UI v1.0 spec schemas the platform reads, the v1 basic catalog with its
 * examples, and upstream's v1.0 validator conformance cases with the catalogs they read into
 * `packages/sdk/a2ui-spec/`, from the sibling A2UI fork, and records the upstream commit in
 * `a2ui-spec/UPSTREAM.json`. The copies are never hand-edited: sync the spec
 * (`git -C ../A2UI fetch upstream`), then run `pnpm --filter @a2uiverse/sdk sync-a2ui-spec`.
 *
 * The copy is held at the commit the pinned `@a2ui/web_core` was released from (task-21.10
 * decision 2), so the default ref is that commit and not `upstream/main`. `A2UI_REPO` overrides
 * the fork's path (default: the monorepo's sibling `../A2UI`); `A2UI_REF` the ref synced from.
 */
import {execFileSync} from 'node:child_process';
import {mkdirSync, rmSync, writeFileSync} from 'node:fs';
import {dirname, resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {parse} from 'yaml';

const here = dirname(fileURLToPath(import.meta.url));
const repo = process.env.A2UI_REPO ?? resolve(here, '../../../../../A2UI');
const target = resolve(here, '../../a2ui-spec');
/** The commit `@a2ui/web_core` 0.16.1 was released from. */
const PINNED_COMMIT = '7a776e7a476b61215ec68c6511f3b8f1921d6e24';
const REF = process.env.A2UI_REF ?? PINNED_COMMIT;

const SPEC_FILES = [
  // The definitions a catalog's component schemas reference: the catalog gate compiles against
  // them, and the schema-form check compiles the messages against them.
  'specification/v1_0/json/common_types.json',
  // The messages, both ways: the schema-form check's (task-21.10 decision 10).
  'specification/v1_0/json/agent_to_renderer.json',
  'specification/v1_0/json/renderer_to_agent.json',
  // The two sides of catalog negotiation: what an agent's card declares under the A2UI
  // extension's params, and what the hub tells each agent it may paint in.
  'specification/v1_0/json/agent_capabilities.json',
  'specification/v1_0/json/renderer_capabilities.json',
  // The data model a renderer sends an agent.
  'specification/v1_0/json/renderer_data_model.json',
  // What a catalog document is: the catalog gate validates against it (task-21.10 decision 14).
  'specification/v1_0/json/catalog_definition.json',
  'catalogs/basic/v1/catalog.json',
];
const EXAMPLES = 'catalogs/basic/v1/examples';
const CONFORMANCE = 'conformance/core/validator_v1_0.yaml';

const git = (...args) => execFileSync('git', ['-C', repo, ...args], {encoding: 'utf8'});
const show = path => git('show', `${REF}:${path}`);

const commit = git('rev-parse', `${REF}^{commit}`).trim();

const examples = git('ls-tree', '--name-only', `${REF}`, `${EXAMPLES}/`)
  .split('\n')
  .filter(path => path.endsWith('.json'))
  .sort();

// The conformance cases name the catalogs they read by path from the repository's root; copy each one.
const cases = parse(show(CONFORMANCE));
const read = new Set();
for (const testCase of cases) for (const path of testCase.catalogPaths ?? []) read.add(path);
const files = [
  ...SPEC_FILES,
  ...examples,
  CONFORMANCE,
  ...[...read].filter(p => !SPEC_FILES.includes(p)).sort(),
];

rmSync(target, {recursive: true, force: true});
for (const file of files) {
  const out = resolve(target, file);
  mkdirSync(dirname(out), {recursive: true});
  writeFileSync(out, show(file));
}
writeFileSync(
  resolve(target, 'UPSTREAM.json'),
  `${JSON.stringify({repository: 'a2ui-project/a2ui', commit, files}, null, 2)}\n`,
);
console.log(`a2ui-spec: ${files.length} files at ${commit}`);
