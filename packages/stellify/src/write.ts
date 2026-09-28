/** The one writer: empties the output directory and writes the artifact's files and its descriptor. */
import {mkdirSync, rmSync, writeFileSync} from 'node:fs';
import {dirname, join} from 'node:path';
import type {StellifyResult} from './types.js';

export const DESCRIPTOR_FILE = 'artifact.json';

/** Writes `result` to `outDir` (default: the result's); refuses a result with findings. Returns the directory. */
export async function writeArtifact(
  result: StellifyResult,
  outDir = result.outDir,
): Promise<string> {
  if (result.findings.length > 0 || result.descriptor === null) {
    throw new Error(`the result has ${result.findings.length} findings; nothing written`);
  }
  rmSync(outDir, {recursive: true, force: true});
  mkdirSync(outDir, {recursive: true});
  for (const [path, bytes] of result.files) {
    const target = join(outDir, path);
    mkdirSync(dirname(target), {recursive: true});
    writeFileSync(target, bytes);
  }
  writeFileSync(join(outDir, DESCRIPTOR_FILE), `${JSON.stringify(result.descriptor, null, 2)}\n`);
  return outDir;
}
