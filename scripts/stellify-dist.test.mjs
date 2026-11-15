/**
 * Stellify's build output is committed (task-11.3 decision 2), so a git install of it needs no
 * build. This gate keeps the commit honest: the build is deterministic, so after `turbo run build`
 * has rebuilt `packages/stellify/dist`, git must see no change there — modified or untracked.
 */
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {existsSync, rmSync, writeFileSync} from 'node:fs';
import {dirname, resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {test} from 'node:test';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const dist = 'packages/stellify/dist';
const build = () =>
  execFileSync('pnpm', ['--filter', '@a2uiverse/stellify', 'build'], {cwd: root, stdio: 'pipe'});

test('a file the build no longer writes, a declaration of a deleted source, goes at the next build', t => {
  const stale = resolve(root, dist, 'removed.d.ts');
  t.after(() => rmSync(stale, {force: true}));
  writeFileSync(stale, 'export declare const removed: true;\n');
  build();
  assert.equal(existsSync(stale), false, `${dist}/removed.d.ts outlived the build`);
});

test('packages/stellify/dist is committed as built', () => {
  build();
  const status = execFileSync(
    'git',
    ['status', '--porcelain', '--untracked-files=all', '--', dist],
    {
      cwd: root,
      encoding: 'utf8',
    },
  );
  assert.equal(
    status,
    '',
    `packages/stellify/dist differs from the commit — rebuild it and commit the result:\n${status}`,
  );
});
