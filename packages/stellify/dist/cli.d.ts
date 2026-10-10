import { STELLIFY_HOME, type Env } from './publisher.js';
export interface CliIo {
    out(text: string): void;
    err(text: string): void;
    /** The environment; the process's by default. */
    env?: Env;
    /** Where relative paths are resolved; the process's working directory by default. */
    cwd?: string;
}
/** The variable the publisher's own credential is read from (task-13.4 decision 5). */
export declare const CREDENTIAL_VARIABLE = "STELLIFY_CREDENTIAL";
/** The timeouts, the marketplace's own variables (task-13.4 decision 12). */
export declare const CARD_TIMEOUT_VARIABLE = "A2UIVERSE_CARD_TIMEOUT_SECONDS";
export declare const SMOKE_TIMEOUT_VARIABLE = "A2UIVERSE_SMOKE_TIMEOUT_SECONDS";
export declare function runCli(argv: string[], io: CliIo): Promise<number>;
export { STELLIFY_HOME };
