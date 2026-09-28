/**
 * The committed build (task-11.3 decision 2): `dist/index.js` with the sdk's projection and
 * contracts inlined — and with them ajv, the sdk's one dependency — so a git install of this
 * package needs no workspace sibling and no build; `dist/cli.js` over it. esbuild is the one
 * runtime dependency and stays external. Deterministic: `pnpm verify` rebuilds and fails on a
 * diff. Declarations come from `tsc` after this.
 */
import {build} from 'esbuild';
import {dirname, resolve} from 'node:path';
import {fileURLToPath} from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');

const shared = {
  absWorkingDir: root,
  bundle: true,
  platform: 'node',
  format: 'esm',
  target: 'node22',
  minify: false,
  sourcemap: false,
  legalComments: 'none',
  charset: 'utf8',
  logLevel: 'info',
};

await build({
  ...shared,
  entryPoints: ['src/index.ts'],
  outfile: 'dist/index.js',
  external: ['esbuild'],
  // The inlined CommonJS (ajv) may `require` at runtime; give it a require of this module's own.
  banner: {
    js: "import {createRequire as __stellifyRequire} from 'node:module';\nconst require = __stellifyRequire(import.meta.url);",
  },
});

await build({
  ...shared,
  entryPoints: ['src/main.ts'],
  outfile: 'dist/cli.js',
  external: ['esbuild', './index.js'],
  banner: {js: '#!/usr/bin/env node'},
});
