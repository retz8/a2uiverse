/**
 * The committed build (task-11.3 decision 2; task-16.5 decision 1; task-20.2 decisions 2, 3;
 * task-20.3 decision 2): `dist/index.js` and `dist/cli.js` with the three workspace packages
 * inlined — the sdk's projection and contracts, the smoke transport, and the card package — so a
 * git install of this package needs no workspace sibling and no build, the code the two entries share in one `dist/shared.js`. Every npm package
 * stays external, resolved from npm at a vendor's install: esbuild, the A2A SDK at its exact pin,
 * and the inlined packages' other dependencies, which this package declares at their versions. A
 * pnpm patch reaches installs of this workspace alone, so the A2A SDK moves into this build in the
 * change that first patches how an agent is reached. Deterministic: `pnpm verify` rebuilds and
 * fails on a diff. Declarations come from `tsc` after this.
 */
import {build} from 'esbuild';
import {readFileSync} from 'node:fs';
import {dirname, resolve} from 'node:path';
import {fileURLToPath} from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const {dependencies} = JSON.parse(readFileSync(resolve(root, 'package.json'), 'utf8'));
const EXTERNAL = Object.keys(dependencies).flatMap(name => [name, `${name}/*`]);

await build({
  absWorkingDir: root,
  entryPoints: {index: 'src/index.ts', cli: 'src/main.ts'},
  outdir: 'dist',
  chunkNames: 'shared',
  splitting: true,
  bundle: true,
  platform: 'node',
  format: 'esm',
  target: 'node22',
  external: EXTERNAL,
  minify: false,
  sourcemap: false,
  legalComments: 'none',
  charset: 'utf8',
  logLevel: 'info',
});
