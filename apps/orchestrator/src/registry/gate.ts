/**
 * The static gate over one handed artifact (task-11.4 decision 4, phase-11 decision 13): what the
 * files alone can prove, through the sdk's functions, so the marketplace refuses the same artifacts
 * for the same reasons. The descriptor conforms; every listed file is present with its hash and
 * nothing unlisted is there; the schema compiles as an A2UI catalog and its id is the descriptor's;
 * the host interface is one the platform supplies. Nothing is evaluated. Every finding is collected.
 */
import {
  ARTIFACT_DESCRIPTOR_FILE,
  artifactIdOf,
  checkArtifactSchema,
  checkCatalogSchemaCompiles,
  checkHostInterface,
  validateArtifactDescriptor,
  verifyArtifactFiles,
  type ArtifactDescriptor,
} from '@a2uiverse/sdk';
import type {ArtifactFiles} from './store.js';

/** An artifact the gate passed: its id, its descriptor, its files. */
export interface GatedArtifact {
  id: string;
  descriptor: ArtifactDescriptor;
  files: ArtifactFiles;
}

export interface GateResult {
  findings: string[];
  /** The catalog id the descriptor names, when the descriptor could be read. */
  catalogId?: string;
  /** Present when there are no findings. */
  artifact?: GatedArtifact;
}

/** The gate over the artifact handed `index`-th (from 0) in an install. */
export async function gateArtifact(files: ArtifactFiles, index: number): Promise<GateResult> {
  const label = `catalog artifact ${index + 1}`;
  const raw = files.get(ARTIFACT_DESCRIPTOR_FILE);
  if (!raw) return {findings: [`${label}: no ${ARTIFACT_DESCRIPTOR_FILE}`]};
  const json = parseJson(raw);
  if (!json.ok) return {findings: [`${label}: ${ARTIFACT_DESCRIPTOR_FILE}: ${json.error}`]};
  const read = validateArtifactDescriptor(json.value);
  if (!read.ok) {
    return {findings: read.errors.map(e => `${label}: ${ARTIFACT_DESCRIPTOR_FILE}: ${e}`)};
  }
  const descriptor = read.value;
  const at = `${label} (${descriptor.catalogId})`;
  const findings: string[] = [];
  const listed = new Map(files);
  listed.delete(ARTIFACT_DESCRIPTOR_FILE);
  findings.push(...(await verifyArtifactFiles(descriptor, listed)).map(e => `${at}: ${e}`));
  findings.push(...checkHostInterface(descriptor.hostInterface).map(e => `${at}: ${e}`));
  const schemaBytes = listed.get(descriptor.schema);
  if (schemaBytes) {
    const schema = parseJson(schemaBytes);
    if (!schema.ok) {
      findings.push(`${at}: ${descriptor.schema}: ${schema.error}`);
    } else {
      findings.push(...checkArtifactSchema(descriptor, schema.value).map(e => `${at}: ${e}`));
      findings.push(
        ...checkCatalogSchemaCompiles(schema.value).map(e => `${at}: ${descriptor.schema}: ${e}`),
      );
    }
  }
  if (findings.length > 0) return {findings, catalogId: descriptor.catalogId};
  return {
    findings,
    catalogId: descriptor.catalogId,
    artifact: {id: await artifactIdOf(raw), descriptor, files},
  };
}

function parseJson(bytes: Uint8Array): {ok: true; value: unknown} | {ok: false; error: string} {
  try {
    return {ok: true, value: JSON.parse(new TextDecoder().decode(bytes))};
  } catch (err) {
    return {ok: false, error: `not JSON (${(err as Error).message})`};
  }
}
