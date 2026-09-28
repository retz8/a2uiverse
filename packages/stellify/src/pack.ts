/**
 * The pipeline: the config, the manifest, the schema, the bundle, then the gate (task-11.3
 * decision 14) — every failure collected into findings, never a throw — and the artifact in
 * memory: the entry, the schema verbatim, the stylesheets and assets reached, every file hashed
 * into the descriptor. Static throughout: nothing of the vendor's runs (decision 13).
 */
import {
  checkArtifactSchema,
  checkCatalogSchemaCompiles,
  credentialLint,
  hashArtifactFile,
  HOST_INTERFACE_VERSION,
  validateArtifactDescriptor,
  verifyArtifactFiles,
} from '@a2uiverse/sdk';
import {existsSync, readFileSync} from 'node:fs';
import {join, resolve} from 'node:path';
import {bundleEntry} from './bundle.js';
import {loadConfig} from './config.js';
import {readManifest} from './manifest.js';
import type {ArtifactDescriptor, Finding, StellifyOptions, StellifyResult} from './types.js';

export const TOOL_NAME = '@a2uiverse/stellify';
export const TOOL_VERSION = (
  JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8')) as {
    version: string;
  }
).version;

const DEFAULT_SCHEMA = 'catalogs/v0.9.1/catalog.json';
const DEFAULT_OUT_DIR = 'dist/artifact';
const ENTRY_PATH = 'index.js';
const SCHEMA_PATH = 'catalog.json';

const sorted = (files: Map<string, Uint8Array>): Map<string, Uint8Array> =>
  new Map([...files].sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0)));

/** Runs the whole pipeline in memory and returns the artifact or the findings; writes nothing. */
export async function stellify(
  packageDir: string,
  options: StellifyOptions = {},
): Promise<StellifyResult> {
  packageDir = resolve(packageDir);
  const findings: Finding[] = [];
  const loaded = await loadConfig(packageDir);
  findings.push(...loaded.findings);
  const config = {...loaded.config, ...options};
  const outDir = resolve(packageDir, config.outDir ?? DEFAULT_OUT_DIR);
  const result = (files: Map<string, Uint8Array>, descriptor: ArtifactDescriptor | null) => ({
    packageDir,
    outDir,
    descriptor,
    files,
    findings,
  });

  const hostInterface = options.hostInterface ?? HOST_INTERFACE_VERSION;
  if (hostInterface !== HOST_INTERFACE_VERSION) {
    findings.push({
      file: 'package.json',
      reason: `host interface ${JSON.stringify(hostInterface)} is not one the platform supplies; it supplies ${JSON.stringify(HOST_INTERFACE_VERSION)}`,
    });
  }

  const read = readManifest(packageDir);
  findings.push(...read.findings);
  const manifest = read.manifest;

  // The schema: parsed, its id the catalog's, the config agreeing.
  const schemaRel = config.schema ?? DEFAULT_SCHEMA;
  let schema: unknown;
  let schemaBytes: Uint8Array | undefined;
  let catalogId: string | undefined;
  if (!existsSync(join(packageDir, schemaRel))) {
    findings.push({file: schemaRel, reason: 'the catalog schema is missing'});
  } else {
    schemaBytes = new Uint8Array(readFileSync(join(packageDir, schemaRel)));
    try {
      schema = JSON.parse(Buffer.from(schemaBytes).toString('utf8'));
    } catch (error) {
      findings.push({file: schemaRel, reason: `not JSON: ${(error as Error).message}`});
    }
  }
  if (schema !== undefined) {
    const id = (schema as {catalogId?: unknown}).catalogId;
    if (typeof id !== 'string' || id === '') {
      findings.push({file: schemaRel, reason: 'catalogId is missing or empty'});
    } else {
      catalogId = id;
      if (config.catalogId !== undefined && config.catalogId !== id) {
        findings.push({
          file: 'stellify.config.ts',
          reason: `catalogId is ${JSON.stringify(config.catalogId)}, the schema says ${JSON.stringify(id)}`,
        });
      }
    }
    for (const error of checkCatalogSchemaCompiles(schema))
      findings.push({file: schemaRel, reason: error});
    for (const error of credentialLint(schema as Parameters<typeof credentialLint>[0])) {
      findings.push({file: schemaRel, reason: error});
    }
  }

  // The entry: built, bundled, exporting CATALOG.
  const entryRel = config.entry ?? manifest?.entry;
  let code: string | undefined;
  let copied = new Map<string, Uint8Array>();
  if (entryRel === undefined) {
    if (manifest !== undefined)
      findings.push({file: 'package.json', reason: 'neither exports["."] nor main names an entry'});
  } else if (!existsSync(join(packageDir, entryRel))) {
    findings.push({file: entryRel, reason: `${entryRel} is missing — build the package first`});
  } else {
    const bundle = await bundleEntry(packageDir, entryRel);
    findings.push(...bundle.findings);
    if (bundle.code !== undefined && !bundle.exports.includes('CATALOG')) {
      findings.push({
        file: entryRel,
        reason: 'the entry exports no CATALOG — export your Catalog from @a2ui/web_core',
      });
    }
    code = bundle.code;
    copied = bundle.copied;
  }

  if (
    findings.length > 0 ||
    code === undefined ||
    schemaBytes === undefined ||
    manifest === undefined
  ) {
    return result(sorted(copied), null);
  }

  // The artifact: every file hashed into the descriptor, then the descriptor's own checks.
  const files = sorted(
    new Map([...copied, [ENTRY_PATH, new TextEncoder().encode(code)], [SCHEMA_PATH, schemaBytes]]),
  );
  const hashes: Record<string, string> = {};
  for (const [path, bytes] of files) hashes[path] = await hashArtifactFile(bytes);
  const descriptor: ArtifactDescriptor = {
    catalogId: catalogId!,
    entry: ENTRY_PATH,
    schema: SCHEMA_PATH,
    hostInterface,
    files: hashes,
    package: {name: manifest.name, version: manifest.version},
    packedBy: {tool: TOOL_NAME, version: TOOL_VERSION},
  };
  const valid = validateArtifactDescriptor(descriptor);
  if (!valid.ok) {
    for (const error of valid.errors) findings.push({file: 'artifact.json', reason: error});
    return result(files, null);
  }
  for (const error of checkArtifactSchema(valid.value, schema))
    findings.push({file: SCHEMA_PATH, reason: error});
  for (const error of await verifyArtifactFiles(valid.value, files))
    findings.push({file: 'artifact.json', reason: error});
  return result(files, findings.length === 0 ? descriptor : null);
}
