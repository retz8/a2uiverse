/**
 * The collision detector, static half: what the installed catalogs' stylesheets do to the page.
 * It enumerates whatever is installed rather than naming catalogs, so 2.6 and 2.7 widen it by
 * publishing, and acceptance 6 (Gmail + Calendar mounted together) is exercised in 2.9.
 *
 * The rules are asserted against synthetic stylesheets first — a detector nobody has seen fail is
 * not a detector — and then run over the real roster.
 */
import {describe, it, expect} from 'vitest';
import {fileURLToPath} from 'node:url';
import {dirname, resolve} from 'node:path';
import {
  analyzeCss,
  findCollisions,
  readCatalogStyles,
  sharedDefinitions,
  type CatalogStyles,
  type Finding,
} from './collisionDetector';
import {listCatalogs} from '../../orchestratorApi';

/**
 * A catalog bundle's `exports` map hides its package.json, so locate it as a dependency
 * directory — the same way `scripts/lib/drive.ts` reaches a published catalog's JSON.
 */
const DEPS = resolve(dirname(fileURLToPath(import.meta.url)), '../../../node_modules');
const packageDir = (pkg: string) => resolve(DEPS, pkg);

const RECORDS = await listCatalogs();
const INSTALLED = RECORDS.map(record =>
  readCatalogStyles(record.package, packageDir(record.package), import.meta.url),
);

const synthetic = (pkg: string, css: string): CatalogStyles => ({
  pkg,
  files: [],
  facts: analyzeCss(css),
});

describe('the detector itself', () => {
  it('records where a custom property is defined, not merely that it is', () => {
    const facts = analyzeCss(`
      :root { --text-primary: #000; }
      .vendor-scope { --text-primary: #111; --spacing: 4px; }
    `);
    expect([...(facts.definitions.get('--text-primary') ?? [])].sort()).toEqual([
      '.vendor-scope',
      ':root',
    ]);
    expect([...(facts.definitions.get('--spacing') ?? [])]).toEqual(['.vendor-scope']);
  });

  it('fails a global write, whatever the variable is called', () => {
    const findings = findCollisions([synthetic('loud-catalog', ':root { --text-primary: red; }')]);
    expect(findings).toEqual([
      {rule: 'global-write', pkg: 'loud-catalog', name: '--text-primary', selector: ':root'},
    ]);
  });

  it('permits two catalogs defining the same name, each scoped to itself', () => {
    const findings = findCollisions([
      synthetic('a-catalog', '.a-scope { --text-primary: red; }'),
      synthetic('b-catalog', '.b-scope { --text-primary: blue; }'),
    ]);
    expect(findings).toEqual([]);
    expect(
      sharedDefinitions([
        synthetic('a-catalog', '.a-scope { --text-primary: red; }'),
        synthetic('b-catalog', '.b-scope { --text-primary: blue; }'),
      ]),
    ).toEqual(['--text-primary']);
  });

  it('fails a read the catalog cannot satisfy on its own', () => {
    const findings = findCollisions([
      synthetic('borrower', '.scope { color: var(--someone-elses-token); }'),
    ]);
    expect(findings).toEqual([
      {rule: 'unsatisfied-read', pkg: 'borrower', name: '--someone-elses-token'},
    ]);
  });

  it('accepts an ambient read that carries an explicit fallback', () => {
    const findings = findCollisions([
      synthetic('polite', '.scope { color: var(--ambient, #1c2024); }'),
    ]);
    expect(findings).toEqual([]);
  });

  it('fails a class or keyframe two catalogs both ship', () => {
    const findings = findCollisions([
      synthetic('a-catalog', '.card { color: red; } @keyframes fade { from { opacity: 0; } }'),
      synthetic('b-catalog', '.card { color: blue; } @keyframes fade { from { opacity: 1; } }'),
    ]);
    expect(findings).toContainEqual({
      rule: 'duplicate-class',
      name: 'card',
      pkgs: ['a-catalog', 'b-catalog'],
    });
    expect(findings).toContainEqual({
      rule: 'duplicate-keyframes',
      name: 'fade',
      pkgs: ['a-catalog', 'b-catalog'],
    });
  });
});

/**
 * Violations that exist today, each with an owner — a record, not an exemption. All of them are
 * `github-catalog` bringing `@primer/primitives` onto the page, and all of them are task 2.8's
 * to fix by scoping Primer's sheets to the fragment boundary; that task empties this list.
 *
 *  - `@primer/primitives/dist/css/base/motion/motion.css` defines `--base-duration-*` and
 *    `--base-easing-*` at `:root`, so they land outside every boundary and the last catalog to
 *    load wins them for the whole page.
 *  - Primer's functional sheets read `--borderWidth-default` and `--focus-outline-width` bare,
 *    but the Provider imports no sheet that defines them: today those resolve to nothing, and
 *    tomorrow they would resolve to whatever a neighbouring catalog happens to set.
 */
const ACCEPTED: Array<(finding: Finding) => boolean> = [
  finding =>
    finding.rule === 'global-write' &&
    finding.pkg === 'github-catalog' &&
    (finding.name.startsWith('--base-duration-') || finding.name.startsWith('--base-easing-')),
  finding =>
    finding.rule === 'unsatisfied-read' &&
    finding.pkg === 'github-catalog' &&
    ['--borderWidth-default', '--focus-outline-width'].includes(finding.name),
];

describe('the installed catalogs', () => {
  it('brings no unaccounted CSS onto the page', () => {
    // A vendor bundle's own design-system sheets count: they are what actually lands. Primer's
    // arrive from `@primer/primitives` via github-catalog's Provider.
    const unaccounted = findCollisions(INSTALLED).filter(f => !ACCEPTED.some(known => known(f)));
    expect(JSON.stringify(unaccounted, null, 1)).toEqual('[]');
  });

  it('keeps the accepted list honest — a fixed violation must be removed from it', () => {
    const findings = findCollisions(INSTALLED);
    ACCEPTED.forEach((known, i) => {
      expect(findings.some(known), `accepted violation #${i} no longer occurs — delete it`).toBe(
        true,
      );
    });
  });

  it('enumerates the roster rather than naming it', () => {
    expect(INSTALLED.map(c => c.pkg)).toEqual(RECORDS.map(r => r.package));
  });

  it('actually reads the stylesheets a bundle brings with it', () => {
    // Guards the detector against silently scanning nothing: github-catalog's Provider imports
    // three @primer/primitives sheets, and those are the ones that land on the page.
    expect(INSTALLED.flatMap(c => c.files).some(f => f.endsWith('.css'))).toBe(true);
  });
});
