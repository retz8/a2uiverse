/** A packed artifact directory read as `registry install` reads one: every file under it, by path relative to it, sorted. */
import {readdir, readFile} from 'node:fs/promises';
import {join, relative, sep} from 'node:path';

export async function readTree(dir: string): Promise<Map<string, Uint8Array>> {
  const files = new Map<string, Uint8Array>();
  const entries = await readdir(dir, {recursive: true, withFileTypes: true});
  for (const entry of entries) {
    if (!entry.isFile()) continue;
    const full = join(entry.parentPath, entry.name);
    files.set(relative(dir, full).split(sep).join('/'), new Uint8Array(await readFile(full)));
  }
  return new Map([...files].sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0)));
}
