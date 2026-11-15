/**
 * The assets a copied stylesheet reaches: every relative `url()`, copied at the path that keeps the
 * reference resolving; a `data:` or absolute URL left alone; a reference that does not exist, or
 * that escapes the package or its dependency, refused. An `@import` is refused: the client puts a
 * sheet on a constructed stylesheet, which drops it.
 */
import {existsSync, readFileSync, statSync} from 'node:fs';
import {dirname, posix, resolve} from 'node:path';
import type {Layout} from './layout.js';
import type {Finding} from './types.js';

const URL_REF = /url\(\s*(?:"([^"]*)"|'([^']*)'|([^'")\s]+))\s*\)/g;
const IMPORT_RULE =
  /@import\s+(?:url\(\s*(?:"([^"]*)"|'([^']*)'|([^'")\s]+))\s*\)|"([^"]*)"|'([^']*)')[^;]*;?/g;
const COMMENT = /\/\*[\s\S]*?\*\//g;

const isExternal = (ref: string): boolean =>
  ref === '' ||
  ref.startsWith('#') ||
  ref.startsWith('data:') ||
  ref.startsWith('/') ||
  /^[a-z][a-z0-9+.-]*:/i.test(ref) ||
  ref.startsWith('//');

/** Every `@import` in a stylesheet's text, the address as written. */
export function stylesheetImports(css: string): string[] {
  return [...css.replace(COMMENT, '').matchAll(IMPORT_RULE)].map(
    match => match.slice(1, 6).find(address => address !== undefined) ?? '',
  );
}

/** Every `url()` reference in a stylesheet's text outside an `@import`, as written. */
export function stylesheetRefs(css: string): string[] {
  const refs: string[] = [];
  const text = css.replace(COMMENT, '').replace(IMPORT_RULE, '');
  for (const match of text.matchAll(URL_REF)) refs.push(match[1] ?? match[2] ?? match[3] ?? '');
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
  for (const address of stylesheetImports(css)) {
    copied.findings.push({
      file: artifactPath,
      reason: `${JSON.stringify(address)} is an @import, which the client does not follow; import the stylesheet from your code instead`,
    });
  }
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
    if (!copied.files.has(assetPath)) {
      copied.files.set(assetPath, new Uint8Array(readFileSync(asset)));
    }
  }
}
