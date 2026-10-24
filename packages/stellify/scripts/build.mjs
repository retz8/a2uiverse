/**
 * The committed build (task-11.3 decision 2; task-16.5 decision 1): `dist/index.js` and
 * `dist/cli.js` with the sdk's projection and contracts inlined, so a git install of this package
 * needs no workspace sibling and no build, the code the two entries share in one `dist/shared.js`.
 * Every npm package stays external, resolved from npm at a vendor's install: esbuild, the A2A client
 * (task-13.4 decision 4), and the sdk's own dependencies, which this package declares at the sdk's
 * versions. Deterministic: `pnpm verify` rebuilds and fails on a diff. Declarations come from `tsc`
 * after this.
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
