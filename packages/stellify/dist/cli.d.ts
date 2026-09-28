export interface CliIo {
    out(text: string): void;
    err(text: string): void;
}
export declare function runCli(argv: string[], io: CliIo): Promise<number>;
