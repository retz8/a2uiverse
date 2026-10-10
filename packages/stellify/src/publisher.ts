/**
 * The publisher's home-directory configuration (SPEC §9.3; task-13.4 decisions 1, 2): one
 * publisher per machine — the marketplace's address, the name and the token — in `publisher.json`
 * under the stellify directory of the XDG configuration directory, `STELLIFY_HOME` naming another
 * directory. Owner-only, written through a temporary file renamed into place. The command line
 * alone reads it; the API takes the address and the token explicitly.
 */
import {mkdir, readFile, rename, writeFile} from 'node:fs/promises';
import {homedir} from 'node:os';
import {join} from 'node:path';
import type {PublisherRecord} from './types.js';

export const PUBLISHER_FILE = 'publisher.json';
export const STELLIFY_HOME = 'STELLIFY_HOME';

export type Env = Readonly<Record<string, string | undefined>>;

/** The directory: `STELLIFY_HOME`, else `stellify` under `XDG_CONFIG_HOME`, else under `~/.config`. */
export function publisherDir(env: Env): string {
  if (env[STELLIFY_HOME]) return env[STELLIFY_HOME];
  const config = env.XDG_CONFIG_HOME || join(env.HOME ?? homedir(), '.config');
  return join(config, 'stellify');
}

export const publisherFilePath = (env: Env): string => join(publisherDir(env), PUBLISHER_FILE);

/** The claimed publisher, or undefined when none is; a damaged file throws, naming its path. */
export async function readPublisherFile(env: Env): Promise<PublisherRecord | undefined> {
  const path = publisherFilePath(env);
  let text: string;
  try {
    text = await readFile(path, 'utf8');
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return undefined;
    throw new Error(`cannot read ${path}: ${(error as Error).message}`);
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch (error) {
    throw new Error(`${path} is not JSON: ${(error as Error).message}`);
  }
  const record = parsed as Partial<Record<keyof PublisherRecord, unknown>> | null;
  for (const field of ['marketplace', 'publisher', 'token'] as const) {
    if (typeof record?.[field] !== 'string' || record[field] === '') {
      throw new Error(`${path} is not a publisher file: no ${field}`);
    }
  }
  const {marketplace, publisher, token} = record as PublisherRecord;
  return {marketplace, publisher, token};
}

/** Writes the record owner-only, the directory created as needed, through a temporary file. */
export async function writePublisherFile(env: Env, record: PublisherRecord): Promise<string> {
  const dir = publisherDir(env);
  await mkdir(dir, {recursive: true, mode: 0o700});
  const path = join(dir, PUBLISHER_FILE);
  const temp = `${path}.${process.pid}.tmp`;
  await writeFile(temp, `${JSON.stringify(record, null, 2)}\n`, {mode: 0o600});
  await rename(temp, path);
  return path;
}
