import type { PublisherRecord } from './types.js';
export declare const PUBLISHER_FILE = "publisher.json";
export declare const STELLIFY_HOME = "STELLIFY_HOME";
export type Env = Readonly<Record<string, string | undefined>>;
/** The directory: `STELLIFY_HOME`, else `stellify` under `XDG_CONFIG_HOME`, else under `~/.config`. */
export declare function publisherDir(env: Env): string;
export declare const publisherFilePath: (env: Env) => string;
/** The claimed publisher, or undefined when none is; a damaged file throws, naming its path. */
export declare function readPublisherFile(env: Env): Promise<PublisherRecord | undefined>;
/** Writes the record owner-only, the directory created as needed, through a temporary file. */
export declare function writePublisherFile(env: Env, record: PublisherRecord): Promise<string>;
