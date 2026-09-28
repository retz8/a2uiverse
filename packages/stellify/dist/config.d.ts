import type { Finding, StellifyConfig } from './types.js';
export declare const CONFIG_FILE = "stellify.config.ts";
/** Types the config; returns it unchanged. */
export declare function defineConfig(config: StellifyConfig): StellifyConfig;
export interface LoadedConfig {
    config: StellifyConfig;
    findings: Finding[];
}
/** Reads and checks `stellify.config.ts` at the package root; no file is an empty config. */
export declare function loadConfig(packageDir: string): Promise<LoadedConfig>;
/** The exported value against the config's shape: an object of known string fields. */
export declare function checkConfig(value: unknown): LoadedConfig;
export declare const messageOf: (error: unknown) => string;
