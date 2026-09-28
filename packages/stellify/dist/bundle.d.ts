import type { Finding } from './types.js';
export interface Bundle {
    /** The entry's text, when it built. */
    code?: string;
    /** The entry's export names, from the bundler. */
    exports: string[];
    /** The stylesheets and assets reached, by artifact path. */
    copied: Map<string, Uint8Array>;
    findings: Finding[];
}
export declare function bundleEntry(packageDir: string, entryRel: string): Promise<Bundle>;
