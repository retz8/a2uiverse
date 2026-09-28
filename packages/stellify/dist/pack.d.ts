import type { StellifyOptions, StellifyResult } from './types.js';
export declare const TOOL_NAME = "@a2uiverse/stellify";
export declare const TOOL_VERSION: string;
/** Runs the whole pipeline in memory and returns the artifact or the findings; writes nothing. */
export declare function stellify(packageDir: string, options?: StellifyOptions): Promise<StellifyResult>;
