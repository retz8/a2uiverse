import type { Layout } from './layout.js';
import type { Finding } from './types.js';
/** Every `@import` in a stylesheet's text, the address as written. */
export declare function stylesheetImports(css: string): string[];
/** Every `url()` reference in a stylesheet's text outside an `@import`, as written. */
export declare function stylesheetRefs(css: string): string[];
export interface CopiedFiles {
    files: Map<string, Uint8Array>;
    findings: Finding[];
}
/**
 * Copies a stylesheet at `artifactPath` into `copied`, then everything it reaches, stylesheets
 * recursively. Idempotent over a sheet already copied.
 */
export declare function copyStylesheet(layout: Layout, file: string, artifactPath: string, copied: CopiedFiles): void;
