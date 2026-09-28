import type { StellifyResult } from './types.js';
export declare const DESCRIPTOR_FILE = "artifact.json";
/** Writes `result` to `outDir` (default: the result's); refuses a result with findings. Returns the directory. */
export declare function writeArtifact(result: StellifyResult, outDir?: string): Promise<string>;
