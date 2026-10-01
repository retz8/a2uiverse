/**
 * Generates the registry snapshot (task-11.5 decision 10): every catalog package this package
 * depends on — all seven pinned to one commit of the apps repo — packed by Stellify, each artifact
 * filed under its id, and the catalog table beside them, the client's own catalogs first, as the
 * orchestrator's table lists them. Git-ignored, never committed; rebuilt from scratch every run.
 */
import {mkdirSync, readFileSync, realpathSync, renameSync, rmSync, writeFileSync} from 'node:fs';
import {dirname, join, resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {artifactIdOf, BASIC_CATALOG_ID} from '@a2uiverse/sdk';
import {CATALOG_ID as SHELL_CATALOG_ID} from '@a2uiverse/shell-catalog/id';
import {stellify, writeArtifact} from '@a2uiverse/stellify';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const out = join(root, 'dist', 'registry');
const artifacts = join(out, 'artifacts');
const staging = join(root, 'dist', 'staging');

const {dependencies} = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'));

rmSync(join(root, 'dist'), {recursive: true, force: true});
mkdirSync(artifacts, {recursive: true});

const rows = [];
for (const name of Object.keys(dependencies).sort()) {
  const packageDir = realpathSync(join(root, 'node_modules', name));
  const result = await stellify(packageDir, {outDir: join(staging, name)});
  if (result.findings.length > 0) {
    const findings = result.findings.map(f => `  ${f.file}: ${f.reason}`).join('\n');
    throw new Error(`${name} does not pack:\n${findings}`);
  }
  const dir = await writeArtifact(result);
  const id = await artifactIdOf(readFileSync(join(dir, 'artifact.json')));
  renameSync(dir, join(artifacts, id));
  rows.push({catalogId: result.descriptor.catalogId, artifact: id, entry: result.descriptor.entry});
  console.log(`✓ ${name} → ${id}`);
}
rmSync(staging, {recursive: true, force: true});

const table = [
  ...[BASIC_CATALOG_ID, SHELL_CATALOG_ID].map(catalogId => ({catalogId, provided: 'client'})),
  ...rows.sort((a, b) => (a.catalogId < b.catalogId ? -1 : 1)),
];
writeFileSync(join(out, 'catalogs.json'), `${JSON.stringify(table, null, 2)}\n`);
console.log(`✓ the registry snapshot, ${rows.length} artifacts → ${out}`);
