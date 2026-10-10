/**
 * The marketplace on disk (task-13.3 decisions 2, 14, 15). The served subtree is the truth: under
 * `public/`, exactly the route layout the sdk fixes — `index.json`, `apps/<appId>/entry.json`,
 * `apps/<appId>/preview.json`, `artifacts/<artifactId>/<path>` — so a directory of the same layout
 * can stand in for the process. Beside it, never served, `publishers.json`: each publisher's name,
 * token hash, claim time, and the app ids and catalog ids they own — the ledger. Every write goes
 * through a temporary file or directory and a rename. Reading verifies: an entry or a preview that
 * does not validate, an entry without its preview, a publishers file that is not one, or an
 * artifact whose files no longer match their hashes, is an error naming the path — the boot
 * refuses rather than start on a marketplace it cannot trust.
 */
import {randomUUID} from 'node:crypto';
import {mkdir, readdir, readFile, rename, rm, stat, writeFile} from 'node:fs/promises';
import {dirname, join, relative, sep} from 'node:path';
import {
  ARTIFACT_DESCRIPTOR_FILE,
  validateArtifactDescriptor,
  validateIndexEntry,
  validatePreview,
  verifyArtifactFiles,
  type ArtifactDescriptor,
  type ArtifactFiles,
  type IndexEntry,
  type PreviewDocument,
} from '@a2uiverse/sdk';

/** The served subtree inside the state directory. */
export const PUBLIC_DIR = 'public';
/** The publishers and the ledger, beside the served subtree. */
export const PUBLISHERS_FILE = 'publishers.json';
export const INDEX_FILE = 'index.json';
export const APPS_DIR = 'apps';
export const ENTRY_FILE = 'entry.json';
export const PREVIEW_FILE = 'preview.json';
export const ARTIFACTS_DIR = 'artifacts';

const TEMP_PREFIX = '.tmp-';

/** A publisher as the ledger holds one: the name, the token's hash, and what they own. */
export interface PublisherRecord {
  name: string;
  tokenHash: string;
  claimedAt: string;
  /** The app ids this publisher first published. */
  apps: string[];
  /** The catalog ids this publisher first published an artifact for. */
  catalogs: string[];
}

export interface Loaded {
  publishers: PublisherRecord[];
  entries: IndexEntry[];
  previews: Map<string, PreviewDocument>;
  descriptors: Map<string, ArtifactDescriptor>;
}

export class MarketplaceStore {
  readonly root: string;
  readonly publicDir: string;
  readonly publishersPath: string;
  readonly indexPath: string;
  readonly appsDir: string;
  readonly artifactsDir: string;

  constructor(stateDir: string) {
    this.root = stateDir;
    this.publicDir = join(stateDir, PUBLIC_DIR);
    this.publishersPath = join(stateDir, PUBLISHERS_FILE);
    this.indexPath = join(this.publicDir, INDEX_FILE);
    this.appsDir = join(this.publicDir, APPS_DIR);
    this.artifactsDir = join(this.publicDir, ARTIFACTS_DIR);
  }

  /** Everything on disk, verified. An empty directory is an empty marketplace. Throws on damage. */
  async load(): Promise<Loaded> {
    await mkdir(this.appsDir, {recursive: true});
    await mkdir(this.artifactsDir, {recursive: true});
    const publishers = await this.#readPublishers();
    const entries: IndexEntry[] = [];
    const previews = new Map<string, PreviewDocument>();
    const names = (await readdir(this.appsDir, {withFileTypes: true}))
      .filter(d => d.isDirectory() && !d.name.startsWith(TEMP_PREFIX))
      .map(d => d.name)
      .sort();
    for (const name of names) {
      const entryPath = join(this.appsDir, name, ENTRY_FILE);
      const entry = validateIndexEntry(await readJson(entryPath));
      if (!entry.ok) throw new Error(`${entryPath}: ${entry.errors.join('; ')}`);
      if (entry.value.appId !== name) {
        throw new Error(
          `${entryPath}: appId is ${JSON.stringify(entry.value.appId)}, the directory is ${JSON.stringify(name)}`,
        );
      }
      const previewPath = join(this.appsDir, name, PREVIEW_FILE);
      const preview = validatePreview(await readJson(previewPath));
      if (!preview.ok) throw new Error(`${previewPath}: ${preview.errors.join('; ')}`);
      entries.push(entry.value);
      previews.set(name, preview.value);
    }
    const descriptors = new Map<string, ArtifactDescriptor>();
    for (const entry of entries) {
      for (const id of Object.values(entry.catalogs)) {
        if (!descriptors.has(id)) descriptors.set(id, await this.#verify(id));
      }
    }
    return {publishers, entries, previews, descriptors};
  }

  /** Writes the publishers file whole, readable by the owner alone. */
  async writePublishers(publishers: readonly PublisherRecord[]): Promise<void> {
    const temp = join(this.root, `${TEMP_PREFIX}${randomUUID()}.json`);
    await writeFile(temp, `${JSON.stringify({publishers}, null, 2)}\n`, {mode: 0o600});
    await rename(temp, this.publishersPath);
  }

  async writeEntry(entry: IndexEntry): Promise<void> {
    await this.#writeAppFile(entry.appId, ENTRY_FILE, entry);
  }

  async writePreview(preview: PreviewDocument): Promise<void> {
    await this.#writeAppFile(preview.appId, PREVIEW_FILE, preview);
  }

  /** Writes `index.json`: every entry, as served. */
  async writeIndex(entries: readonly IndexEntry[]): Promise<void> {
    const temp = join(this.publicDir, `${TEMP_PREFIX}${randomUUID()}.json`);
    await writeFile(temp, `${JSON.stringify(entries, null, 2)}\n`);
    await rename(temp, this.indexPath);
  }

  /** Removes an app's directory: its entry and its preview. */
  async removeApp(appId: string): Promise<void> {
    await rm(join(this.appsDir, appId), {recursive: true, force: true});
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

  /** One file of a held artifact; undefined when it is not there. */
  async readArtifactFile(id: string, path: string): Promise<Uint8Array | undefined> {
    try {
      return new Uint8Array(await readFile(join(this.artifactsDir, id, ...path.split('/'))));
    } catch (err) {
      if ((err as NodeJS.ErrnoException).code === 'ENOENT') return undefined;
      throw err;
    }
  }

  async #writeAppFile(appId: string, file: string, document: unknown): Promise<void> {
    const dir = join(this.appsDir, appId);
    await mkdir(dir, {recursive: true});
    const temp = join(dir, `${TEMP_PREFIX}${randomUUID()}.json`);
    await writeFile(temp, `${JSON.stringify(document, null, 2)}\n`);
    await rename(temp, join(dir, file));
  }

  async #readPublishers(): Promise<PublisherRecord[]> {
    let parsed: unknown;
    try {
      parsed = await readJson(this.publishersPath);
    } catch (err) {
      if ((err as NodeJS.ErrnoException).code === 'ENOENT') return [];
      throw err;
    }
    const problem = publishersFileProblem(parsed);
    if (problem) throw new Error(`${this.publishersPath}: ${problem}`);
    return (parsed as {publishers: PublisherRecord[]}).publishers;
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

/** A file's JSON; an error naming the path when it is not JSON. ENOENT passes through. */
async function readJson(path: string): Promise<unknown> {
  let text: string;
  try {
    text = await readFile(path, 'utf8');
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === 'ENOENT') throw err;
    throw new Error(`${path}: ${(err as Error).message}`);
  }
  try {
    return JSON.parse(text);
  } catch (err) {
    throw new Error(`${path}: not JSON (${(err as Error).message})`);
  }
}

async function exists(path: string): Promise<boolean> {
  try {
    await stat(path);
    return true;
  } catch {
    return false;
  }
}

const isStringList = (value: unknown): value is string[] =>
  Array.isArray(value) && value.every(v => typeof v === 'string');

/** Why a parsed publishers file is not one, or undefined when it is. */
function publishersFileProblem(parsed: unknown): string | undefined {
  if (
    typeof parsed !== 'object' ||
    parsed === null ||
    !Array.isArray((parsed as {publishers?: unknown}).publishers)
  ) {
    return 'expected an object with a `publishers` list';
  }
  const seen = new Set<string>();
  for (const [i, p] of (parsed as {publishers: unknown[]}).publishers.entries()) {
    const at = `publishers[${i}]`;
    if (typeof p !== 'object' || p === null) return `${at}: not an object`;
    const r = p as Record<string, unknown>;
    if (typeof r.name !== 'string' || r.name === '') return `${at}.name: not a string`;
    if (seen.has(r.name)) return `${at}.name: ${JSON.stringify(r.name)} appears twice`;
    seen.add(r.name);
    if (typeof r.tokenHash !== 'string') return `${at}.tokenHash: not a string`;
    if (typeof r.claimedAt !== 'string') return `${at}.claimedAt: not a string`;
    if (!isStringList(r.apps)) return `${at}.apps: not a list of app ids`;
    if (!isStringList(r.catalogs)) return `${at}.catalogs: not a list of catalog ids`;
  }
  return undefined;
}
