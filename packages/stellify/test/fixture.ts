/**
 * A working copy of the fixture catalog for one test: `test/fixtures/star-catalog` copied under
 * `test/.tmp/` (git-ignored, inside this package so the host packages resolve) with its fixture
 * dependency `star-dialog` placed in its `node_modules`, the way pnpm would. `installed` places the
 * copy itself in a `node_modules`, as a consumer's install of the package sits.
 */
import {cpSync, mkdtempSync, mkdirSync, readFileSync, writeFileSync} from 'node:fs';
import {dirname, join} from 'node:path';
import {fileURLToPath} from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const fixtures = join(here, 'fixtures');
const tmp = join(here, '.tmp');

export function copyFixture({installed = false}: {installed?: boolean} = {}): string {
  mkdirSync(tmp, {recursive: true});
  const root = mkdtempSync(join(tmp, 'star-'));
  const packageDir = join(root, ...(installed ? ['consumer', 'node_modules'] : []), 'star-catalog');
  cpSync(join(fixtures, 'star-catalog'), packageDir, {recursive: true});
  cpSync(join(fixtures, 'star-dialog'), join(packageDir, 'node_modules', 'star-dialog'), {
    recursive: true,
  });
  return packageDir;
}

export function edit(packageDir: string, file: string, change: (text: string) => string): void {
  const path = join(packageDir, file);
  writeFileSync(path, change(readFileSync(path, 'utf8')));
}

export function write(packageDir: string, file: string, text: string): void {
  const path = join(packageDir, file);
  mkdirSync(dirname(path), {recursive: true});
  writeFileSync(path, text);
}

export const decode = (bytes: Uint8Array): string => new TextDecoder().decode(bytes);
