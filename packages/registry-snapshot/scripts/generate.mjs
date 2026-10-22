/**
 * Generates the registry snapshot (task-11.5 decision 10): every catalog package this package
 * depends on — all seven pinned to one commit of the apps repo — packed by Stellify, each artifact
 * filed under its id, and the catalog table beside them, the client's own catalogs first, as the
 * orchestrator's table lists them. Beside them, a second build of Shop A's catalog — the same
 * package, one theme token changed — packed but never in the table: the build the replay suite's
 * per-paint builds test moves a canvas onto (task-15.10 decision 11), its id and the first's in
 * `second-build.json`. Git-ignored, never committed; rebuilt from scratch every run.
 */
import {
  cpSync,
  mkdirSync,
  readFileSync,
  realpathSync,
  renameSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from 'node:fs';
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

/** A packed artifact written and filed under its id. */
async function fileArtifact(result) {
  const dir = await writeArtifact(result);
  const id = await artifactIdOf(readFileSync(join(dir, 'artifact.json')));
  renameSync(dir, join(artifacts, id));
  return id;
}

const rows = [];
for (const name of Object.keys(dependencies).sort()) {
  const packageDir = realpathSync(join(root, 'node_modules', name));
  const result = await stellify(packageDir, {outDir: join(staging, name)});
  if (result.findings.length > 0) {
    const findings = result.findings.map(f => `  ${f.file}: ${f.reason}`).join('\n');
    throw new Error(`${name} does not pack:\n${findings}`);
  }
  const id = await fileArtifact(result);
  rows.push({catalogId: result.descriptor.catalogId, artifact: id, entry: result.descriptor.entry});
  console.log(`✓ ${name} → ${id}`);
}

// Shop A's second build: its light accent changed in a copy of the built package, its
// dependencies linked from where the package sits, never copied.
const SECOND = 'shop-a-catalog';
const ACCENT = `'--a2ui-color-primary': '#8a5a2b'`;
const SECOND_ACCENT = `'--a2ui-color-primary': '#2b6a8a'`;
{
  const packageDir = realpathSync(join(root, 'node_modules', SECOND));
  const copy = join(staging, `${SECOND}-second`, 'package');
  mkdirSync(copy, {recursive: true});
  for (const part of ['package.json', 'catalogs', 'dist']) {
    cpSync(join(packageDir, part), join(copy, part), {recursive: true});
  }
  symlinkSync(dirname(packageDir), join(copy, 'node_modules'));
  const provider = join(copy, 'dist', 'provider.js');
  const source = readFileSync(provider, 'utf8');
  if (!source.includes(ACCENT)) throw new Error(`${SECOND} no longer sets ${ACCENT}`);
  writeFileSync(provider, source.replace(ACCENT, SECOND_ACCENT));
  const result = await stellify(copy, {outDir: join(staging, `${SECOND}-second-out`)});
  if (result.findings.length > 0) throw new Error(`${SECOND}'s second build does not pack`);
  const second = await fileArtifact(result);
  const first = rows.find(row => row.catalogId === result.descriptor.catalogId);
  writeFileSync(
    join(out, 'second-build.json'),
    `${JSON.stringify({catalogId: result.descriptor.catalogId, first: first.artifact, second}, null, 2)}\n`,
  );
  console.log(`✓ ${SECOND}, a second build → ${second}`);
}
rmSync(staging, {recursive: true, force: true});

const table = [
  ...[BASIC_CATALOG_ID, SHELL_CATALOG_ID].map(catalogId => ({catalogId, provided: 'client'})),
  ...rows.sort((a, b) => (a.catalogId < b.catalogId ? -1 : 1)),
];
writeFileSync(join(out, 'catalogs.json'), `${JSON.stringify(table, null, 2)}\n`);
console.log(`✓ the registry snapshot, ${rows.length} artifacts → ${out}`);
