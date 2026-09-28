/**
 * The proof over the seven catalog packages in the sibling apps checkout (task-11.3 decision 15):
 * each built, packed in memory, its descriptor validated through the sdk, one line printed; the
 * checkout confirmed untouched by comparing `git status` before and after. Run by hand — the
 * checkout is not part of `pnpm verify`. `A2UIVERSE_APPS_DIR` names the checkout; default
 * `../../../a2uiverse-apps`.
 */
import {execFileSync} from 'node:child_process';
import {existsSync} from 'node:fs';
import {dirname, join, resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {validateArtifactDescriptor} from '@a2uiverse/sdk';
import {stellify} from '../dist/index.js';

const here = dirname(fileURLToPath(import.meta.url));
const apps = resolve(process.env.A2UIVERSE_APPS_DIR ?? join(here, '../../../../a2uiverse-apps'));
const CATALOGS = [
  'github/github-catalog',
  'gmail/gmail-catalog',
  'calendar/calendar-catalog',
  'circleci/circleci-catalog',
  'linear/linear-catalog',
  'mocks/shop-a/shop-a-catalog',
  'mocks/shop-b/shop-b-catalog',
];

if (!existsSync(join(apps, 'pnpm-workspace.yaml'))) {
  console.error(`no apps checkout at ${apps}; set A2UIVERSE_APPS_DIR`);
  process.exit(2);
}

const status = () =>
  execFileSync('git', ['status', '--porcelain', '--untracked-files=all'], {
    cwd: apps,
    encoding: 'utf8',
  });
const before = status();

let failed = 0;
for (const rel of CATALOGS) {
  const dir = join(apps, rel);
  execFileSync('pnpm', ['build'], {cwd: dir, stdio: 'pipe'});
  const result = await stellify(dir);
  const name = `${result.descriptor?.package.name ?? rel}`;
  if (result.findings.length > 0) {
    failed++;
    console.log(`✗ ${rel}: ${result.findings.length} findings`);
    for (const f of result.findings) console.log(`    ${f.file}: ${f.reason}`);
    continue;
  }
  const valid = validateArtifactDescriptor(result.descriptor);
  if (!valid.ok) {
    failed++;
    console.log(`✗ ${rel}: descriptor invalid — ${valid.errors.join('; ')}`);
    continue;
  }
  const bytes = [...result.files.values()].reduce((n, b) => n + b.byteLength, 0);
  console.log(
    `✓ ${name} ${result.descriptor.package.version} — ${result.files.size} files, ${(bytes / 1024).toFixed(0)} KB, entry ${result.descriptor.files['index.js']}`,
  );
}

const after = status();
if (after !== before) {
  failed++;
  console.log(`✗ the apps checkout changed:\n${after}`);
} else {
  console.log('✓ the apps checkout is untouched');
}
process.exit(failed === 0 ? 0 : 1);
