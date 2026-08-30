/**
 * The collision detector's analysis half.
 *
 * Phase 2 puts several catalogs — several design systems — on one page at once. CSS is global by
 * nature, so three things can go wrong silently: two catalogs defining the same custom property
 * at a scope that escapes their own subtree; two catalogs shipping the same class or keyframe
 * name; and a catalog reading a variable it never defines, so its appearance depends on whichever
 * neighbour happens to be installed. None of these throw. None are visible to a vendor testing
 * its catalog alone — they exist only in composition.
 *
 * The rules are deliberately prefix-agnostic. `--a2ui-*` is only the set we happen to know about;
 * two design systems can independently ship `--text-primary` meaning different colours.
 *
 * Sharing a name is not the failure — that is exactly what scoping is for. Writing one where it
 * escapes is.
 */
import {createRequire} from 'node:module';
import {readFileSync, readdirSync, statSync} from 'node:fs';
import {dirname, join, resolve} from 'node:path';

/** Selectors that put a declaration outside every fragment boundary on the page. */
const GLOBAL_SELECTOR = /^\s*(:root|html|body)\s*$/;

export interface StyleFacts {
  /** Custom property → the selectors it is defined under. */
  definitions: Map<string, Set<string>>;
  /** Custom property → how many reads of it carried an explicit fallback, and how many did not. */
  reads: Map<string, {withFallback: number; bare: number}>;
  classes: Set<string>;
  keyframes: Set<string>;
}

const emptyFacts = (): StyleFacts => ({
  definitions: new Map(),
  reads: new Map(),
  classes: new Set(),
  keyframes: new Set(),
});

/**
 * Walk a stylesheet, tracking the selector each declaration sits under. Regex-level rather than a
 * real parser: enough to see where a custom property is defined and what a sheet reads, which is
 * all the rules below need.
 */
export function analyzeCss(css: string, into: StyleFacts = emptyFacts()): StyleFacts {
  const text = css.replace(/\/\*[\s\S]*?\*\//g, '');
  const stack: string[] = [];
  let prelude = '';

  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    if (char === '{') {
      stack.push(prelude.trim());
      prelude = '';
    } else if (char === '}') {
      stack.pop();
      prelude = '';
    } else if (char === ';') {
      recordDeclaration(prelude, stack, into);
      prelude = '';
    } else {
      prelude += char;
    }
  }

  for (const match of text.matchAll(/@keyframes\s+([\w-]+)/g)) into.keyframes.add(match[1]);
  return into;
}

function recordDeclaration(declaration: string, stack: string[], into: StyleFacts) {
  const defined = /(--[\w-]+)\s*:/.exec(declaration);
  if (defined) {
    // The innermost selector that is not an at-rule is what this declaration is scoped to.
    const owner = [...stack].reverse().find(s => !s.startsWith('@')) ?? '';
    const selectors = into.definitions.get(defined[1]) ?? new Set<string>();
    for (const part of owner.split(',')) selectors.add(part.trim());
    into.definitions.set(defined[1], selectors);
  }
  for (const read of declaration.matchAll(/var\(\s*(--[\w-]+)\s*(,?)/g)) {
    const seen = into.reads.get(read[1]) ?? {withFallback: 0, bare: 0};
    if (read[2] === ',') seen.withFallback++;
    else seen.bare++;
    into.reads.set(read[1], seen);
  }
  // Class names are only meaningful in a selector prelude, which is what `stack` records; a
  // prelude is captured on the way into a block, so pick them up there.
  if (stack.length === 0) return;
  for (const cls of (stack[stack.length - 1] ?? '').matchAll(/\.(-?[_a-zA-Z][\w-]*)/g)) {
    into.classes.add(cls[1]);
  }
}

/** One installed catalog's styles, as the page will see them. */
export interface CatalogStyles {
  /** The package name, as the client depends on it. */
  pkg: string;
  /** Absolute paths of every stylesheet the catalog brings onto the page. */
  files: string[];
  facts: StyleFacts;
}

export type Finding =
  | {rule: 'global-write'; pkg: string; name: string; selector: string}
  | {rule: 'unsatisfied-read'; pkg: string; name: string}
  | {rule: 'duplicate-class'; name: string; pkgs: string[]}
  | {rule: 'duplicate-keyframes'; name: string; pkgs: string[]};

/**
 * Every stylesheet a catalog pulls onto the page. A catalog's own directory is not enough: a
 * bundle brings its design system's CSS with it (github-catalog imports three
 * `@primer/primitives` sheets from its Provider), and those are the sheets that actually land.
 */
export function stylesheetsFor(pkgDir: string, requireFrom: string): string[] {
  const req = createRequire(requireFrom);
  const found = new Set<string>();

  const visit = (dir: string) => {
    for (const name of readdirSync(dir)) {
      if (name === 'node_modules') continue;
      const path = join(dir, name);
      if (statSync(path).isDirectory()) {
        visit(path);
        continue;
      }
      if (name.endsWith('.css')) {
        found.add(path);
        continue;
      }
      if (!/\.(js|mjs|cjs)$/.test(name)) continue;
      for (const spec of readFileSync(path, 'utf8').matchAll(/['"]([^'"\n]+\.css)['"]/g)) {
        try {
          found.add(
            spec[1].startsWith('.') ? resolve(dirname(path), spec[1]) : req.resolve(spec[1]),
          );
        } catch {
          // A specifier this install cannot resolve brings no CSS onto this page.
        }
      }
    }
  };

  visit(pkgDir);
  return [...found].sort();
}

export function readCatalogStyles(pkg: string, pkgDir: string, requireFrom: string): CatalogStyles {
  const files = stylesheetsFor(pkgDir, requireFrom);
  const facts = emptyFacts();
  for (const file of files) analyzeCss(readFileSync(file, 'utf8'), facts);
  return {pkg, files, facts};
}

/** Custom properties more than one catalog defines — the set worth proving stays scoped. */
export function sharedDefinitions(catalogs: CatalogStyles[]): string[] {
  const owners = new Map<string, Set<string>>();
  for (const catalog of catalogs) {
    for (const name of catalog.facts.definitions.keys()) {
      (owners.get(name) ?? owners.set(name, new Set()).get(name)!).add(catalog.pkg);
    }
  }
  return [...owners]
    .filter(([, pkgs]) => pkgs.size > 1)
    .map(([name]) => name)
    .sort();
}

export function findCollisions(catalogs: CatalogStyles[]): Finding[] {
  const findings: Finding[] = [];

  for (const catalog of catalogs) {
    // A declaration at :root/html/body lands outside every boundary, so the last catalog to
    // load wins the page. This is the failure — sharing the name is not.
    for (const [name, selectors] of catalog.facts.definitions) {
      for (const selector of selectors) {
        if (GLOBAL_SELECTOR.test(selector)) {
          findings.push({rule: 'global-write', pkg: catalog.pkg, name, selector});
        }
      }
    }
    // A bare read of a variable the catalog never defines inherits whatever a neighbour set:
    // the catalog renders correctly only by accident of what else is installed.
    for (const [name, seen] of catalog.facts.reads) {
      if (seen.bare > 0 && !catalog.facts.definitions.has(name)) {
        findings.push({rule: 'unsatisfied-read', pkg: catalog.pkg, name});
      }
    }
  }

  findings.push(...duplicates(catalogs, 'classes', 'duplicate-class'));
  findings.push(...duplicates(catalogs, 'keyframes', 'duplicate-keyframes'));
  return findings;
}

function duplicates(
  catalogs: CatalogStyles[],
  key: 'classes' | 'keyframes',
  rule: 'duplicate-class' | 'duplicate-keyframes',
): Finding[] {
  const owners = new Map<string, string[]>();
  for (const catalog of catalogs) {
    for (const name of catalog.facts[key]) {
      owners.set(name, [...(owners.get(name) ?? []), catalog.pkg]);
    }
  }
  return [...owners]
    .filter(([, pkgs]) => pkgs.length > 1)
    .map(([name, pkgs]) => ({rule, name, pkgs}) as Finding);
}
