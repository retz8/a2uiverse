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
/**
 * The entry bundled: once to learn which sheets the package imports only later, and again with
 * the entry importing each of them, so they load before it finishes.
 */
export declare function bundleEntry(packageDir: string, entryRel: string): Promise<Bundle>;
