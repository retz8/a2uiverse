/**
 * The registry snapshot (task-11.5 decision 10): the catalog table and the packed artifacts of the
 * seven catalogs this package depends on, in the layout of the orchestrator's `/registry` routes —
 * `catalogs.json` and `artifacts/<id>/<path>` — written by `scripts/generate.mjs` at build; and the
 * fixed world the trusted page reads beside it (task-14.10 decision 14), built in `world.js`.
 */
import {dirname, join} from 'node:path';
import {fileURLToPath} from 'node:url';

export {searchWorld, storeWorld} from './world.js';

/** The snapshot's root: what the orchestrator serves under `/registry`. */
export const REGISTRY_SNAPSHOT_DIR = join(
  dirname(fileURLToPath(import.meta.url)),
  'dist',
  'registry',
);

/** Shop A's two builds — the table's and the second, packed beside it (task-15.10 decision 11). */
export const SECOND_BUILD_FILE = join(REGISTRY_SNAPSHOT_DIR, 'second-build.json');
