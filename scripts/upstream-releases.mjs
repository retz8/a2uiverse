// The upstream releases A2UIVerse follows, as facts: the `@a2ui/*` and `@a2a-js/*` packages its
// manifests declare, each one's latest on npm beside the versions the manifests declare, the
// lockfile resolves and pnpm patches, and the version upstream main's source states. It compares
// versions and judges nothing. `upstream-readings.mjs` reads the files and the registry and prints
// this module's report.

/** The scopes of the upstream packages A2UIVerse follows. */
export const SCOPES = ['@a2ui/', '@a2a-js/'];

const plain = version => /^\d+\.\d+\.\d+$/.test(version ?? '');
const numbers = version => version.split('.').map(Number);
function compare(a, b) {
  const [x, y] = [numbers(a), numbers(b)];
  for (let i = 0; i < 3; i++) if (x[i] !== y[i]) return x[i] - y[i];
  return 0;
}
const newest = versions => versions.filter(plain).sort(compare).at(-1);
const sorted = values => [...new Set(values)].sort();

/**
 * The followed packages the manifests declare as dependencies or dev dependencies, each spec once.
 * An npm alias, `npm:<name>@<spec>`, counts under the package it names.
 */
export function followedPackages(manifests) {
  const declared = new Map();
  for (const manifest of manifests) {
    for (const deps of [manifest.dependencies, manifest.devDependencies]) {
      for (const [key, value] of Object.entries(deps ?? {})) {
        const alias = /^npm:(@?[^@]+)@(.+)$/.exec(value);
        const name = alias ? alias[1] : key;
        const spec = alias ? `${alias[2]} (as ${key})` : value;
        if (!SCOPES.some(scope => name.startsWith(scope))) continue;
        declared.set(name, [...(declared.get(name) ?? []), spec]);
      }
    }
  }
  return [...declared.keys()].sort().map(name => ({name, declared: sorted(declared.get(name))}));
}

/** Every version of a package `pnpm-lock.yaml` resolves, from its `packages:` section. */
export function lockVersions(lock, name) {
  const section = lock.split(/\n(?=\S)/).find(part => part.startsWith('packages:')) ?? '';
  const escaped = name.replace(/[.*+?^${}()|[\]\\/]/g, '\\$&');
  const versions = [...section.matchAll(new RegExp(`^ {2}'?${escaped}@([^'(:]+)'?:`, 'gm'))].map(
    match => match[1],
  );
  return sorted(versions);
}

/** The patched versions of each package, from `pnpm-workspace.yaml`'s `patchedDependencies`. */
export function patchedVersions(workspace) {
  const section =
    workspace.split(/\n(?=\S)/).find(part => part.startsWith('patchedDependencies:')) ?? '';
  const patched = {};
  for (const [, name, version] of section.matchAll(/^ {2}["']?(@?[^@\s"']+)@([^"':]+)["']?:/gm)) {
    patched[name] = [...(patched[name] ?? []), version];
  }
  return patched;
}

/**
 * Each package with its facts marked: `newer` when npm's latest is newer than the newest version
 * the lockfile resolves, `ahead` when upstream main's source states a version past npm's latest,
 * `unread` when the registry was not read.
 */
export function readings(packages) {
  return packages.map(pkg => {
    const latest = pkg.registry.latest;
    const used = newest(pkg.locked);
    return {
      ...pkg,
      used,
      newer: plain(latest) && plain(used) && compare(latest, used) > 0,
      ahead: plain(latest) && plain(pkg.source) && compare(pkg.source, latest) > 0,
      unread: pkg.registry.error !== undefined,
    };
  });
}

/** The first part's lines and the whole report as Markdown. */
export function report(rows, {upstreamHead}) {
  const newer = rows.filter(row => row.newer);
  const ahead = rows.filter(row => row.ahead);
  const unread = rows.filter(row => row.unread);
  const headline = [
    newer.length === 0
      ? 'No package A2UIVerse follows is on npm in a version newer than the one it uses.'
      : `On npm, newer than A2UIVerse uses: ${newer
          .map(
            row =>
              `${row.name} ${row.registry.latest} (${row.registry.date}; A2UIVerse uses ${row.used})`,
          )
          .join(', ')}.`,
  ];
  if (ahead.length > 0) {
    headline.push(
      `In upstream main's source, past npm's latest: ${ahead
        .map(row => `${row.name} ${row.source} (npm has ${row.registry.latest})`)
        .join(', ')}.`,
    );
  }
  if (unread.length > 0) headline.push(`Not read: ${unread.map(row => row.name).join(', ')}.`);

  const lines = ['# Upstream releases', ''];
  for (const line of headline) lines.push(`**${line}**`, '');
  lines.push(`Upstream main: ${upstreamHead}.`, '');
  lines.push(
    '| Package | npm latest | Date | Declared | The lockfile has | Patched | Upstream main states |',
    '| --- | --- | --- | --- | --- | --- | --- |',
  );
  for (const row of rows) {
    const latest = row.unread ? `not read: ${row.registry.error}` : row.registry.latest;
    lines.push(
      `| \`${row.name}\` | ${latest} | ${row.registry.date ?? ''} | ${row.declared.join(', ')} | ${row.locked.join(', ') || 'none'} | ${row.patched.join(', ') || 'no'} | ${row.source ?? 'none'} |`,
    );
  }
  return {headline, markdown: `${lines.join('\n')}\n`};
}
