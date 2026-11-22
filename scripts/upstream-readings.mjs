// Prints the upstream releases A2UIVerse follows, as `upstream-releases.mjs` reports them: the
// `@a2ui/*` and `@a2a-js/*` packages its tracked manifests declare, each one's latest on npm, and,
// from a clone of upstream's repository, the version upstream main's source states. From the
// repository root:
//
//     node scripts/upstream-readings.mjs --upstream <clone of a2ui-project/a2ui>
//
// Under GitHub Actions it also writes the report to the job's summary, and its first part as a
// notice. It exits non-zero only when it cannot read its files or the clone.

import {execFileSync} from 'node:child_process';
import {appendFileSync, readFileSync} from 'node:fs';
import {dirname, join, resolve} from 'node:path';
import {fileURLToPath} from 'node:url';

import {
  followedPackages,
  lockVersions,
  patchedVersions,
  readings,
  report,
} from './upstream-releases.mjs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const REF = 'origin/main';

const args = process.argv.slice(2);
const at = args.indexOf('--upstream');
if (at === -1 || args[at + 1] === undefined) {
  console.error('Run it as `node scripts/upstream-readings.mjs --upstream <clone>`.');
  process.exit(2);
}
const upstream = resolve(args[at + 1]);

const git = (dir, gitArgs) =>
  execFileSync('git', ['-C', dir, ...gitArgs], {
    encoding: 'utf8',
    maxBuffer: 64 * 1024 * 1024,
    stdio: ['ignore', 'pipe', 'pipe'],
  });

const manifests = git(ROOT, ['ls-files', 'package.json', '*/package.json'])
  .split('\n')
  .filter(Boolean)
  .map(file => JSON.parse(readFileSync(join(ROOT, file), 'utf8')));
const lock = readFileSync(join(ROOT, 'pnpm-lock.yaml'), 'utf8');
const patched = patchedVersions(readFileSync(join(ROOT, 'pnpm-workspace.yaml'), 'utf8'));

// The version each upstream TypeScript package states on upstream main, by its manifest's name.
const sourceVersions = new Map();
for (const file of git(upstream, ['ls-tree', '-r', '--name-only', REF, 'typescript/'])
  .split('\n')
  .filter(file => file.endsWith('/package.json') && !file.includes('node_modules'))) {
  try {
    const {name, version} = JSON.parse(git(upstream, ['show', `${REF}:${file}`]));
    if (name && version && !sourceVersions.has(name)) sourceVersions.set(name, version);
  } catch {
    // A manifest that does not parse names no package.
  }
}
const upstreamHead = git(upstream, ['log', '-1', '--format=%h (%cs)', REF]).trim();

async function registry(name) {
  try {
    const response = await fetch(`https://registry.npmjs.org/${name.replace('/', '%2f')}`, {
      headers: {accept: 'application/json'},
    });
    if (!response.ok) return {error: `HTTP ${response.status}`};
    const doc = await response.json();
    const latest = doc['dist-tags'].latest;
    return {latest, date: doc.time[latest].slice(0, 10)};
  } catch (error) {
    return {error: error.message};
  }
}

const packages = [];
for (const {name, declared} of followedPackages(manifests)) {
  packages.push({
    name,
    declared,
    locked: lockVersions(lock, name),
    patched: patched[name] ?? [],
    registry: await registry(name),
    source: sourceVersions.get(name) ?? null,
  });
}

const {headline, markdown} = report(readings(packages), {upstreamHead});
process.stdout.write(markdown);
if (process.env.GITHUB_STEP_SUMMARY) appendFileSync(process.env.GITHUB_STEP_SUMMARY, markdown);
if (process.env.GITHUB_ACTIONS) {
  // A workflow command's message escapes `%`, carriage returns and newlines.
  const escape = text => text.replace(/%/g, '%25').replace(/\r/g, '%0D').replace(/\n/g, '%0A');
  console.log(`::notice title=Upstream releases::${escape(headline.join(' '))}`);
}
