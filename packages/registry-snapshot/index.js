/**
 * The registry snapshot (task-11.5 decision 10): the catalog table and the packed artifacts of the
 * seven catalogs this package depends on, in the layout of the orchestrator's `/registry` routes —
 * `catalogs.json` and `artifacts/<id>/<path>` — written by `scripts/generate.mjs` at build.
 */
import {dirname, join} from 'node:path';
import {fileURLToPath} from 'node:url';

/** The snapshot's root: what the orchestrator serves under `/registry`. */
export const REGISTRY_SNAPSHOT_DIR = join(
  dirname(fileURLToPath(import.meta.url)),
  'dist',
  'registry',
);
