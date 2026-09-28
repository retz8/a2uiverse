/**
 * The registry on disk (task-11.4 decisions 1, 9): one record file listing the installed apps, and
 * each artifact's files in a directory named by its id. Every write goes through a temporary file
 * or directory and a rename, so a crash leaves the old state or the new one. Reading verifies:
 * a record file that does not parse or does not have the record's shape, or an artifact whose
 * files are missing or no longer match their hashes, is an error naming the path — the boot
 * refuses rather than start on a registry it cannot trust.
 */
import {randomUUID} from 'node:crypto';
import {mkdir, readdir, readFile, rename, rm, stat, writeFile} from 'node:fs/promises';
import {dirname, join, relative, sep} from 'node:path';
import {
  ARTIFACT_DESCRIPTOR_FILE,
  validateArtifactDescriptor,
  verifyArtifactFiles,
  type ArtifactDescriptor,
} from '@a2uiverse/sdk';
import type {InstalledRecord} from './types.js';

/** The registry's directory inside the state directory. */
export const REGISTRY_DIR = 'registry';
export const RECORD_FILE = 'registry.json';
export const ARTIFACTS_DIR = 'artifacts';

/** An artifact's files by path relative to its root, the descriptor among them. */
export type ArtifactFiles = ReadonlyMap<string, Uint8Array>;

const TEMP_PREFIX = '.tmp-';

export class RegistryStore {
  readonly root: string;
  readonly recordPath: string;
  readonly artifactsDir: string;

  constructor(stateDir: string) {
    this.root = join(stateDir, REGISTRY_DIR);
    this.recordPath = join(this.root, RECORD_FILE);
    this.artifactsDir = join(this.root, ARTIFACTS_DIR);
  }

  /**
   * The installed records and the descriptor of every artifact they name, each artifact's files
   * hashed again. A missing record file is an empty registry. Throws on any damage.
   */
  async load(): Promise<{
    records: InstalledRecord[];
    descriptors: Map<string, ArtifactDescriptor>;
  }> {
    await mkdir(this.artifactsDir, {recursive: true});
    let text: string;
    try {
      text = await readFile(this.recordPath, 'utf8');
    } catch (err) {
      if ((err as NodeJS.ErrnoException).code === 'ENOENT') {
        return {records: [], descriptors: new Map()};
      }
      throw new Error(`${this.recordPath}: ${(err as Error).message}`);
    }
    let parsed: unknown;
    try {
      parsed = JSON.parse(text);
    } catch (err) {
      throw new Error(`${this.recordPath}: not JSON (${(err as Error).message})`);
    }
    const problem = recordFileProblem(parsed);
    if (problem) throw new Error(`${this.recordPath}: ${problem}`);
    const records = (parsed as {apps: InstalledRecord[]}).apps;
    const descriptors = new Map<string, ArtifactDescriptor>();
    for (const record of records) {
      for (const id of Object.values(record.catalogs)) {
        if (!descriptors.has(id)) descriptors.set(id, await this.#verify(id));
      }
    }
    return {records, descriptors};
  }

  /** Writes the record file whole, through a temporary file and a rename. */
  async writeRecords(records: readonly InstalledRecord[]): Promise<void> {
    await mkdir(this.root, {recursive: true});
    const temp = join(this.root, `${TEMP_PREFIX}${randomUUID()}.json`);
    await writeFile(temp, `${JSON.stringify({apps: records}, null, 2)}\n`);
    await rename(temp, this.recordPath);
  }

  /** Writes an artifact's files under its id, unless it is already there; whole or not at all. */
  async writeArtifact(id: string, files: ArtifactFiles): Promise<void> {
    const target = join(this.artifactsDir, id);
    if (await exists(target)) return;
    const temp = join(this.artifactsDir, `${TEMP_PREFIX}${randomUUID()}`);
    for (const [path, bytes] of files) {
      const file = join(temp, ...path.split('/'));
      await mkdir(dirname(file), {recursive: true});
      await writeFile(file, bytes);
    }
    await rename(temp, target);
  }

  /** Removes every artifact directory not kept, and anything a cut-short write left. */
  async removeArtifactsExcept(keep: ReadonlySet<string>): Promise<void> {
    for (const name of await readdir(this.artifactsDir)) {
      if (!keep.has(name)) await rm(join(this.artifactsDir, name), {recursive: true, force: true});
    }
  }

  async #verify(id: string): Promise<ArtifactDescriptor> {
    const dir = join(this.artifactsDir, id);
    if (!(await exists(dir))) throw new Error(`${dir}: missing`);
    const files = await readTree(dir);
    const raw = files.get(ARTIFACT_DESCRIPTOR_FILE);
    if (!raw) throw new Error(`${dir}: no ${ARTIFACT_DESCRIPTOR_FILE}`);
    let json: unknown;
    try {
      json = JSON.parse(new TextDecoder().decode(raw));
    } catch (err) {
      throw new Error(`${dir}: ${ARTIFACT_DESCRIPTOR_FILE}: not JSON (${(err as Error).message})`);
    }
    const descriptor = validateArtifactDescriptor(json);
    if (!descriptor.ok) {
      throw new Error(`${dir}: ${ARTIFACT_DESCRIPTOR_FILE}: ${descriptor.errors.join('; ')}`);
    }
    files.delete(ARTIFACT_DESCRIPTOR_FILE);
    const errors = await verifyArtifactFiles(descriptor.value, files);
    if (errors.length > 0) throw new Error(`${dir}: ${errors.join('; ')}`);
    return descriptor.value;
  }
}

/** Every file under `dir`, by its path relative to `dir` with `/` separators. */
export async function readTree(dir: string): Promise<Map<string, Uint8Array>> {
  const files = new Map<string, Uint8Array>();
  const entries = await readdir(dir, {recursive: true, withFileTypes: true});
  for (const entry of entries) {
    if (!entry.isFile()) continue;
    const full = join(entry.parentPath, entry.name);
    files.set(relative(dir, full).split(sep).join('/'), new Uint8Array(await readFile(full)));
  }
  return new Map([...files.entries()].sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0)));
}

async function exists(path: string): Promise<boolean> {
  try {
    await stat(path);
    return true;
  } catch {
    return false;
  }
}

const isStringRecord = (value: unknown): value is Record<string, string> =>
  typeof value === 'object' &&
  value !== null &&
  !Array.isArray(value) &&
  Object.values(value).every(v => typeof v === 'string');

/** Why a parsed record file is not one, or undefined when it is. */
function recordFileProblem(parsed: unknown): string | undefined {
  if (
    typeof parsed !== 'object' ||
    parsed === null ||
    !Array.isArray((parsed as {apps?: unknown}).apps)
  ) {
    return 'expected an object with an `apps` list';
  }
  const apps = (parsed as {apps: unknown[]}).apps;
  const seen = new Set<string>();
  for (const [i, app] of apps.entries()) {
    const at = `apps[${i}]`;
    if (typeof app !== 'object' || app === null) return `${at}: not an object`;
    const a = app as Record<string, unknown>;
    if (typeof a.id !== 'string' || a.id === '') return `${at}.id: not a string`;
    if (seen.has(a.id)) return `${at}.id: ${JSON.stringify(a.id)} appears twice`;
    seen.add(a.id);
    if (typeof a.cardUrl !== 'string') return `${at}.cardUrl: not a string`;
    if (typeof a.card !== 'object' || a.card === null) return `${at}.card: not an object`;
    const card = a.card as Record<string, unknown>;
    if (typeof card.url !== 'string' || typeof card.name !== 'string') {
      return `${at}.card: no url or name`;
    }
    if (!isStringRecord(a.catalogs))
      return `${at}.catalogs: not a map of catalog id to artifact id`;
    if (!Array.isArray(a.entitlement) || !a.entitlement.every(id => typeof id === 'string')) {
      return `${at}.entitlement: not a list of catalog ids`;
    }
    if (typeof a.installedAt !== 'string') return `${at}.installedAt: not a string`;
  }
  return undefined;
}
