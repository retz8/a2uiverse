import assert from 'node:assert/strict';
import {test} from 'node:test';

import {
  followedPackages,
  lockVersions,
  patchedVersions,
  readings,
  report,
} from './upstream-releases.mjs';

const LOCK = `lockfileVersion: '9.0'

packages:

  '@a2a-js/sdk@0.3.14':
    resolution: {integrity: sha512-a}

  '@a2a-js/sdk@1.3.0':
    resolution: {integrity: sha512-b}

  '@a2ui/web_core@0.14.0':
    resolution: {integrity: sha512-c}

snapshots:

  '@a2a-js/sdk@1.3.0(@bufbuild/protobuf@2.16.0)':
    dependencies: {}
`;

const WORKSPACE = `packages:
  - apps/*
patchedDependencies:
  "@a2ui/react@0.14.0": patches/@a2ui__react@0.14.0.patch
  "@a2ui/web_core@0.14.0": patches/@a2ui__web_core@0.14.0.patch
onlyBuiltDependencies:
  - esbuild
`;

test('followedPackages names the @a2ui and @a2a-js packages the manifests declare, with each spec', () => {
  const manifests = [
    {dependencies: {'@a2ui/web_core': '0.14.0', react: '19.3.1'}},
    {
      dependencies: {'@a2ui/react': '0.14.0', '@a2ui/web_core': '0.14.0'},
      devDependencies: {'@a2a-js/sdk': '1.3.0'},
    },
    {peerDependencies: {'@a2ui/lit': '^0.15.0'}},
  ];
  assert.deepEqual(followedPackages(manifests), [
    {name: '@a2a-js/sdk', declared: ['1.3.0']},
    {name: '@a2ui/react', declared: ['0.14.0']},
    {name: '@a2ui/web_core', declared: ['0.14.0']},
  ]);
});

test('followedPackages counts an npm alias under the package it names, with the alias beside its version', () => {
  const manifests = [
    {
      dependencies: {
        '@a2a-js/sdk': '1.3.0',
        '@a2a-js/sdk-v0_3': 'npm:@a2a-js/sdk@0.3.14',
        'other-lib': 'npm:@a2ui/react@0.14.0',
      },
    },
  ];
  assert.deepEqual(followedPackages(manifests), [
    {name: '@a2a-js/sdk', declared: ['0.3.14 (as @a2a-js/sdk-v0_3)', '1.3.0']},
    {name: '@a2ui/react', declared: ['0.14.0 (as other-lib)']},
  ]);
});

test('lockVersions reads every resolved version of a package, not the snapshots', () => {
  assert.deepEqual(lockVersions(LOCK, '@a2a-js/sdk'), ['0.3.14', '1.3.0']);
  assert.deepEqual(lockVersions(LOCK, '@a2ui/web_core'), ['0.14.0']);
  assert.deepEqual(lockVersions(LOCK, '@a2ui/react'), []);
});

test('patchedVersions reads the workspace file’s patched dependencies', () => {
  assert.deepEqual(patchedVersions(WORKSPACE), {
    '@a2ui/react': ['0.14.0'],
    '@a2ui/web_core': ['0.14.0'],
  });
});

test('readings mark a registry newer than the newest version used, and a source ahead of the registry', () => {
  const rows = readings([
    {
      name: '@a2ui/web_core',
      declared: ['0.14.0'],
      locked: ['0.14.0'],
      patched: ['0.14.0'],
      registry: {latest: '0.15.0', date: '2026-11-02'},
      source: '0.16.0',
    },
    {
      name: '@a2a-js/sdk',
      declared: ['1.3.0'],
      locked: ['0.3.14', '1.3.0'],
      patched: [],
      registry: {latest: '1.3.0', date: '2026-10-30'},
      source: null,
    },
    {
      name: '@a2ui/react',
      declared: ['0.14.0'],
      locked: ['0.14.0'],
      patched: [],
      registry: {error: 'HTTP 503'},
      source: '0.16.0',
    },
  ]);
  assert.deepEqual(
    rows.map(({name, newer, ahead, unread}) => ({name, newer, ahead, unread})),
    [
      {name: '@a2ui/web_core', newer: true, ahead: true, unread: false},
      {name: '@a2a-js/sdk', newer: false, ahead: false, unread: false},
      {name: '@a2ui/react', newer: false, ahead: false, unread: true},
    ],
  );
});

test('report puts the facts first, then one row a package', () => {
  const rows = readings([
    {
      name: '@a2ui/web_core',
      declared: ['0.14.0'],
      locked: ['0.14.0'],
      patched: ['0.14.0'],
      registry: {latest: '0.15.0', date: '2026-11-02'},
      source: '0.16.0',
    },
    {
      name: '@a2a-js/sdk',
      declared: ['1.3.0'],
      locked: ['1.3.0'],
      patched: [],
      registry: {latest: '1.3.0', date: '2026-10-30'},
      source: null,
    },
  ]);
  const {headline, markdown} = report(rows, {upstreamHead: '5ff1b05f0 (2026-11-20)'});
  assert.deepEqual(headline, [
    'On npm, newer than A2UIVerse uses: @a2ui/web_core 0.15.0 (2026-11-02; A2UIVerse uses 0.14.0).',
    "In upstream main's source, past npm's latest: @a2ui/web_core 0.16.0 (npm has 0.15.0).",
  ]);
  assert.match(markdown, /^# Upstream releases\n/);
  assert.match(
    markdown,
    /\| `@a2ui\/web_core` \| 0\.15\.0 \| 2026-11-02 \| 0\.14\.0 \| 0\.14\.0 \| 0\.14\.0 \| 0\.16\.0 \|/,
  );
  assert.match(
    markdown,
    /\| `@a2a-js\/sdk` \| 1\.3\.0 \| 2026-10-30 \| 1\.3\.0 \| 1\.3\.0 \| no \| none \|/,
  );
  assert.equal(
    report(readings([{...rows[1], registry: {latest: '1.3.0', date: '2026-10-30'}}]), {
      upstreamHead: 'x',
    }).headline[0],
    'No package A2UIVerse follows is on npm in a version newer than the one it uses.',
  );
});
