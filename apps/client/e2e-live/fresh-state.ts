/**
 * The live suite's fresh start (task-14.10 decision 4): everything under the scratch folder wiped
 * but the two model caches, which the orchestrator and the marketplace each keep in their state
 * directory and would otherwise download again. A cache missing here is seeded from the one the
 * developer's own processes keep, read and never written.
 *
 *   pnpm exec tsx e2e-live/fresh-state.ts <scratch>
 */
import {cp, mkdir, readdir, rm} from 'node:fs/promises';
import {existsSync} from 'node:fs';
import {join, resolve} from 'node:path';

const scratch = process.argv[2];
if (!scratch) {
  console.error('usage: pnpm exec tsx e2e-live/fresh-state.ts <scratch>');
  process.exit(2);
}
const repo = resolve(import.meta.dirname, '..', '..', '..');
const KEPT = [
  {
    dir: join(scratch, 'orchestrator'),
    seed: join(repo, 'apps', 'orchestrator', '.state', 'models'),
  },
  {dir: join(scratch, 'marketplace'), seed: join(repo, 'apps', 'marketplace', '.state', 'models')},
];

await mkdir(scratch, {recursive: true});
for (const name of await readdir(scratch)) {
  if (!KEPT.some(kept => kept.dir === join(scratch, name))) {
    await rm(join(scratch, name), {recursive: true, force: true});
  }
}
for (const {dir, seed} of KEPT) {
  await mkdir(dir, {recursive: true});
  for (const name of await readdir(dir)) {
    if (name !== 'models') await rm(join(dir, name), {recursive: true, force: true});
  }
  if (!existsSync(join(dir, 'models')) && existsSync(seed)) {
    await cp(seed, join(dir, 'models'), {recursive: true});
  }
}
