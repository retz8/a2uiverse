/**
 * The write token (task-11.4 decision 11): install, uninstall and install-over require it. The
 * orchestrator writes a fresh one into its state directory at every startup, readable by the owner
 * alone; the command and the launcher read it from there and send it as a bearer token. A browser
 * cannot read the file — the Store page's writes at M10 revisit this.
 */
import {randomBytes} from 'node:crypto';
import {mkdir, readFile, rename, writeFile} from 'node:fs/promises';
import {join} from 'node:path';
import {REGISTRY_DIR} from './store.js';

export const WRITE_TOKEN_FILE = 'write-token';

export const writeTokenPath = (stateDir: string) => join(stateDir, REGISTRY_DIR, WRITE_TOKEN_FILE);

/** Writes a fresh token, replacing the last run's, and returns it. */
export async function issueWriteToken(stateDir: string): Promise<string> {
  const token = randomBytes(32).toString('hex');
  const path = writeTokenPath(stateDir);
  await mkdir(join(stateDir, REGISTRY_DIR), {recursive: true});
  const temp = `${path}.${process.pid}.tmp`;
  await writeFile(temp, `${token}\n`, {mode: 0o600});
  await rename(temp, path);
  return token;
}

/** The token the running orchestrator wrote. */
export async function readWriteToken(stateDir: string): Promise<string> {
  return (await readFile(writeTokenPath(stateDir), 'utf8')).trim();
}
