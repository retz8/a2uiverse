/**
 * The assets a copied stylesheet reaches: every relative `url()` and `@import`, copied at the path
 * that keeps the reference resolving; a `data:` or absolute URL left alone; a reference that does
 * not exist, or that escapes the package or its dependency, refused.
 */
import {existsSync, readFileSync, statSync} from 'node:fs';
import {dirname, posix, resolve} from 'node:path';
import type {Layout} from './layout.js';
import type {Finding} from './types.js';

const URL_REF = /url\(\s*(?:"([^"]*)"|'([^']*)'|([^'")\s]+))\s*\)/g;
const IMPORT_REF = /@import\s+(?:url\(\s*)?(?:"([^"]*)"|'([^']*)')/g;

const isExternal = (ref: string): boolean =>
  ref === '' ||
  ref.startsWith('#') ||
  ref.startsWith('data:') ||
  ref.startsWith('/') ||
  /^[a-z][a-z0-9+.-]*:/i.test(ref) ||
  ref.startsWith('//');

/** Every reference in a stylesheet's text, as written. */
export function stylesheetRefs(css: string): string[] {
  const refs: string[] = [];
  for (const match of css.matchAll(URL_REF)) refs.push(match[1] ?? match[2] ?? match[3] ?? '');
  for (const match of css.matchAll(IMPORT_REF)) refs.push(match[1] ?? match[2] ?? '');
  return refs;
}

export interface CopiedFiles {
  files: Map<string, Uint8Array>;
  findings: Finding[];
}

/**
 * Copies a stylesheet at `artifactPath` into `copied`, then everything it reaches, stylesheets
 * recursively. Idempotent over a sheet already copied.
 */
export function copyStylesheet(
  layout: Layout,
  file: string,
  artifactPath: string,
  copied: CopiedFiles,
): void {
  if (copied.files.has(artifactPath)) return;
  const bytes = readFileSync(file);
  copied.files.set(artifactPath, new Uint8Array(bytes));
  const css = bytes.toString('utf8');
  for (const ref of stylesheetRefs(css)) {
    if (isExternal(ref)) continue;
    const bare = ref.replace(/[?#].*$/, '');
    if (bare === '') continue;
    const asset = resolve(dirname(file), bare);
    if (!existsSync(asset) || !statSync(asset).isFile()) {
      copied.findings.push({
        file: artifactPath,
        reason: `${JSON.stringify(ref)} does not exist (${posix.normalize(posix.join(posix.dirname(artifactPath), bare))})`,
      });
      continue;
    }
    const assetPath = layout.artifactPathOf(asset);
    const expected = posix.normalize(posix.join(posix.dirname(artifactPath), bare));
    if (assetPath === undefined || assetPath !== expected) {
      copied.findings.push({
        file: artifactPath,
        reason: `${JSON.stringify(ref)} is outside the package and its dependencies; a stylesheet may only reach files beside it`,
      });
      continue;
    }
    if (/\.css$/i.test(bare)) copyStylesheet(layout, asset, assetPath, copied);
    else if (!copied.files.has(assetPath)) {
      copied.files.set(assetPath, new Uint8Array(readFileSync(asset)));
    }
  }
}
