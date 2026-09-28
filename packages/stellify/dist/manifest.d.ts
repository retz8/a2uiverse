import type { Finding } from './types.js';
export interface Manifest {
    name: string;
    version: string;
    /** The entry `exports["."]` (then `main`) names, relative to the package root; undefined when neither does. */
    entry?: string;
}
export declare function readManifest(packageDir: string): {
    manifest?: Manifest;
    findings: Finding[];
};
