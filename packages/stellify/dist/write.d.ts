import type { StellifyResult } from './types.js';
export declare const DESCRIPTOR_FILE = "artifact.json";
/**
 * Every file of the artifact, its descriptor among them, as `writeArtifact` writes them — for a
 * caller that hands the artifact on without touching disk, such as an install request. Refuses a
 * result with findings.
 */
export declare function artifactFiles(result: StellifyResult): Map<string, Uint8Array>;
/** Writes `result` to `outDir` (default: the result's); refuses a result with findings. Returns the directory. */
export declare function writeArtifact(result: StellifyResult, outDir?: string): Promise<string>;
