/**
 * The collision detector, static half: what the catalogs' stylesheets do to the page, read from
 * the registry snapshot's artifacts (task-11.5 decision 12). It enumerates whatever the snapshot
 * holds rather than naming catalogs.
 *
 * The rules are asserted against synthetic stylesheets first — a detector nobody has seen fail is
 * not a detector — and then run over the real roster.
 */
import {describe, it, expect} from 'vitest';
import {
  analyzeCss,
  findCollisions,
  readArtifactStyles,
  sharedDefinitions,
  type CatalogStyles,
  type Finding,
} from './collisionDetector';
import {SNAPSHOT_ARTIFACTS} from '../../../tests/snapshot';

/** Every artifact of the registry snapshot, its stylesheets read from its directory. */
const INSTALLED = SNAPSHOT_ARTIFACTS.map(artifact =>
  readArtifactStyles(artifact.package, artifact.dir),
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

  it('holds only a catalog’s own sheets to its reads; any sheet it brings may satisfy one', () => {
    const own = analyzeCss('.scope { color: var(--fgColor-default); }');
    const all = analyzeCss(`
      .scope { color: var(--fgColor-default); }
      .scope { --fgColor-default: #1f2328; }
      .Avatar { width: var(--avatarSize); }
    `);
    // A design system's sheet reads a variable its component sets inline: not the catalog's read.
    expect(findCollisions([{pkg: 'designed', files: [], facts: all, ownReads: own.reads}])).toEqual(
      [],
    );
    // The catalog's own read with nothing defining it anywhere still fails.
    const bare = analyzeCss('.scope { color: var(--nowhere); }');
    expect(
      findCollisions([{pkg: 'designed', files: [], facts: all, ownReads: bare.reads}]),
    ).toEqual([{rule: 'unsatisfied-read', pkg: 'designed', name: '--nowhere'}]);
  });

  it('accepts an ambient read that carries an explicit fallback', () => {
    const findings = findCollisions([
      synthetic('polite', '.scope { color: var(--ambient, #1c2024); }'),
    ]);
    expect(findings).toEqual([]);
  });

  it('permits two catalogs styling the same class, each under its own scope', () => {
    // Styling an upstream hook under the catalog's scope class ships nothing new onto the
    // page; only the leading compound of a selector is DOM the catalog introduces.
    const findings = findCollisions([
      synthetic('a-catalog', '.a-scope .chip { color: red; }'),
      synthetic('b-catalog', '.b-scope .chip:hover { color: blue; }'),
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

  it('fails a font family two catalogs both declare, as the page matches it', () => {
    const face = (family: string, file: string) =>
      `@font-face { font-family: ${family}; src: url(./${file}.woff2) format('woff2'); }`;
    const findings = findCollisions([
      synthetic('a-catalog', face("'Brand Sans'", 'a') + face("'Brand Sans'", 'a-bold')),
      synthetic('b-catalog', face('"brand sans"', 'b')),
    ]);
    expect(findings).toEqual([
      {rule: 'duplicate-font-face', name: 'brand sans', pkgs: ['a-catalog', 'b-catalog']},
    ]);
  });

  it('permits two catalogs each declaring a family of its own', () => {
    const findings = findCollisions([
      synthetic('a-catalog', "@font-face { font-family: 'a-catalog-sans'; src: url(./a.woff2); }"),
      synthetic('b-catalog', "@font-face { font-family: 'b-catalog-sans'; src: url(./b.woff2); }"),
    ]);
    expect(findings).toEqual([]);
  });
});

/**
 * Violations that exist today, each with an owner — a record, not an exemption.
 *
 * Owner github-catalog: Primer's ProgressBar sheet writes `--progress-bg` on `:root` inside its
 * `@media (forced-colors: active)` block — the page's in high-contrast mode.
 */
const ACCEPTED: Array<(finding: Finding) => boolean> = [
  finding =>
    finding.rule === 'global-write' &&
    finding.pkg === 'github-catalog' &&
    finding.name === '--progress-bg',
];

describe('the registry snapshot’s catalogs', () => {
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

  it('enumerates the snapshot rather than naming it', () => {
    expect(INSTALLED.map(c => c.pkg)).toEqual(SNAPSHOT_ARTIFACTS.map(a => a.package));
    expect(INSTALLED.length).toBeGreaterThan(1);
  });

  it('actually reads the stylesheets a bundle brings with it', () => {
    // Guards the detector against silently scanning nothing: github-catalog's Provider imports
    // three @primer/primitives sheets, and those are the ones that land on the page.
    expect(INSTALLED.flatMap(c => c.files).some(f => f.endsWith('.css'))).toBe(true);
  });

  it('actually reads the typefaces the catalogs vendor', () => {
    // Gmail's, Calendar's, Linear's and CircleCI's catalogs each declare their own family.
    expect(INSTALLED.filter(c => c.facts.fontFaces.size > 0).length).toBeGreaterThan(1);
  });
});
