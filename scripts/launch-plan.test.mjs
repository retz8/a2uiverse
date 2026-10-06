import assert from 'node:assert/strict';
import {join} from 'node:path';
import {test} from 'node:test';

import {DEFAULT_TIER, ROSTER} from './dev-roster.mjs';
import {
  MODES,
  appsToUninstall,
  cardUrlOf,
  parseLaunchArgs,
  planLaunch,
  publicUrlsOf,
  resolveAgentsDir,
  tiersOf,
} from './launch-plan.mjs';

const CHECKOUT = '/apps';

/** A checkout holding every roster app whole, less the paths `missing` names. */
const checkout =
  (missing = []) =>
  path =>
    path.startsWith(CHECKOUT) && !missing.some(gone => path.startsWith(join(CHECKOUT, gone)));

const plan = ({roster = ROSTER, tier = DEFAULT_TIER, only = null, missing} = {}) =>
  planLaunch({roster, tier, only, agentsDir: CHECKOUT, exists: checkout(missing)});

const ids = entries => entries.map(entry => entry.id);

test('the kit mode vocabulary is the three the entrypoint accepts', () => {
  assert.deepEqual(MODES, ['deterministic', 'stub', 'live']);
});

test('resolveAgentsDir prefers the flag, then the env, then the sibling default', () => {
  const repoRoot = '/repo/a2uiverse';
  assert.deepEqual(resolveAgentsDir({flag: '/from/flag', env: '/from/env', repoRoot}), {
    dir: '/from/flag',
    source: '--agents-dir',
  });
  assert.deepEqual(resolveAgentsDir({flag: undefined, env: '/from/env', repoRoot}), {
    dir: '/from/env',
    source: 'A2UIVERSE_AGENTS_DIR',
  });
  assert.deepEqual(resolveAgentsDir({flag: undefined, env: undefined, repoRoot}), {
    dir: '/repo/a2uiverse-apps',
    source: 'default',
  });
});

test('the roster: the five vendor apps in the default tier, the two stores in the mock tier', () => {
  assert.deepEqual(tiersOf(ROSTER), ['default', 'mocks']);
  assert.deepEqual(ids(ROSTER.filter(e => e.tier === 'default')), [
    'github',
    'gmail',
    'calendar',
    'circleci',
    'linear',
  ]);
  assert.deepEqual(ids(ROSTER.filter(e => e.tier === 'mocks')), ['shop-a', 'shop-b']);
});

test('the roster: one id per app and one port per app, across every tier', () => {
  assert.equal(new Set(ids(ROSTER)).size, ROSTER.length);
  assert.equal(new Set(ROSTER.map(e => e.port)).size, ROSTER.length);
});

test('every roster tier launches whole from a whole checkout', () => {
  for (const tier of tiersOf(ROSTER)) {
    const {fatal, entries, selected} = plan({tier});
    assert.deepEqual(fatal, []);
    assert.deepEqual(ids(selected), ids(entries));
  }
});

test('the default tier runs the vendor apps alone; the mock tier the two stores alone', () => {
  assert.deepEqual(ids(plan().selected), ['github', 'gmail', 'calendar', 'circleci', 'linear']);
  assert.deepEqual(ids(plan({tier: 'mocks'}).selected), ['shop-a', 'shop-b']);
});

test('an entry is placed by the convention: its agent, its catalog package, its card URL', () => {
  const [shopA] = plan({tier: 'mocks'}).selected;
  assert.equal(shopA.agentDir, '/apps/mocks/shop-a/agent');
  assert.equal(shopA.catalogDir, '/apps/mocks/shop-a/shop-a-catalog');
  assert.equal(shopA.catalogPackage, 'shop-a-catalog');
  assert.equal(shopA.cardUrl, 'http://localhost:12001/.well-known/agent-card.json');
  assert.equal(cardUrlOf(11001), 'http://localhost:11001/.well-known/agent-card.json');
});

test('an unknown tier stops the launch, naming the tiers there are', () => {
  const {fatal, selected} = plan({tier: 'staging'});
  assert.deepEqual(selected, []);
  assert.deepEqual(fatal, ["unknown --tier 'staging' (expected default | mocks)"]);
});

test('an entry missing from the checkout is skipped and named; the rest launch', () => {
  const cases = [
    ['linear', 'no linear/ in the checkout'],
    ['linear/agent', 'no linear/agent/pyproject.toml'],
    ['linear/linear-catalog', 'no linear/linear-catalog/package.json'],
  ];
  for (const [missing, reason] of cases) {
    const {fatal, entries, selected} = plan({missing: [missing]});
    assert.deepEqual(fatal, []);
    assert.deepEqual(ids(selected), ['github', 'gmail', 'calendar', 'circleci']);
    const linear = entries.find(e => e.id === 'linear');
    assert.equal(linear.ok, false);
    assert.equal(linear.reason, reason);
  }
});

test('--only narrows inside the tier', () => {
  const {fatal, selected} = plan({only: ['gmail', 'github']});
  assert.deepEqual(fatal, []);
  assert.deepEqual(ids(selected), ['github', 'gmail']);
});

test('--only naming an app outside the tier stops the launch', () => {
  assert.deepEqual(plan({only: ['github', 'shop-a']}).fatal, [
    'unknown app id in --only for the default tier: shop-a',
  ]);
  assert.deepEqual(plan({tier: 'mocks', only: ['nope', 'github']}).fatal, [
    'unknown app ids in --only for the mocks tier: nope, github',
  ]);
});

test('--only naming a skipped entry stops the launch; a skipped entry it does not name does not', () => {
  assert.deepEqual(plan({only: ['linear'], missing: ['linear']}).fatal, [
    '--only names linear, which cannot be launched: no linear/ in the checkout',
  ]);
  const {fatal, selected} = plan({only: ['github'], missing: ['linear']});
  assert.deepEqual(fatal, []);
  assert.deepEqual(ids(selected), ['github']);
});

test('two entries of the tier on one port stop the launch, even when --only picks one of them', () => {
  const roster = [
    {id: 'a', folder: 'a', tier: 'default', port: 11001},
    {id: 'b', folder: 'b', tier: 'default', port: 11001},
    {id: 'c', folder: 'c', tier: 'other', port: 11001},
  ];
  assert.deepEqual(plan({roster, only: ['a']}).fatal, ['port 11001 is claimed by a and b']);
  assert.deepEqual(plan({roster, tier: 'other'}).fatal, []);
});

test('the reconcile takes out the other tier, what --only left out, and what failed', () => {
  const installedIds = ['github', 'gmail', 'linear', 'shop-a', 'shop-b'];
  assert.deepEqual(
    appsToUninstall({installedIds, roster: ROSTER, launchedIds: ['shop-a', 'shop-b']}),
    ['github', 'gmail', 'linear'],
  );
  assert.deepEqual(
    appsToUninstall({installedIds, roster: ROSTER, launchedIds: ['github', 'gmail']}),
    ['linear', 'shop-a', 'shop-b'],
  );
});

test('the reconcile leaves alone an installed app the roster does not name', () => {
  assert.deepEqual(
    appsToUninstall({
      installedIds: ['hello-agent', 'github', 'gmail'],
      roster: ROSTER,
      launchedIds: ['github'],
    }),
    ['gmail'],
  );
});

const parseArgsOf = args => parseLaunchArgs(args, {defaultTier: DEFAULT_TIER});

test('a launch installs unless --no-install says otherwise', () => {
  assert.equal(parseArgsOf([]).install, true);
  assert.equal(parseArgsOf(['--no-install']).install, false);
  assert.equal(parseArgsOf(['--tier', 'mocks', '--no-install']).install, false);
});

test('parseLaunchArgs defaults to the default tier in deterministic mode, splitting --only', () => {
  assert.deepEqual(parseArgsOf(['--only', 'github, gmail,']), {
    tier: DEFAULT_TIER,
    mode: 'deterministic',
    only: ['github', 'gmail'],
    then: undefined,
    agentsDir: undefined,
    list: false,
    install: true,
  });
});

test('parseLaunchArgs names an unknown mode as the error that stops the launch', () => {
  assert.deepEqual(parseArgsOf(['--mode', 'replay']), {
    error: "unknown --mode 'replay' (expected deterministic | stub | live)",
  });
});

test('publicUrlsOf fills each agent its own port from the pattern, and is off when unset', () => {
  const urls = publicUrlsOf('https://abc-{port}.asse.devtunnels.ms');
  assert.equal(urls.of(11001), 'https://abc-11001.asse.devtunnels.ms');
  assert.equal(urls.of(12002), 'https://abc-12002.asse.devtunnels.ms');
  assert.equal(publicUrlsOf(undefined).of(11001), null);
  assert.equal(publicUrlsOf('').of(11001), null);
});

test('publicUrlsOf refuses a pattern with no port slot, or not on http(s)', () => {
  assert.match(publicUrlsOf('https://abc.asse.devtunnels.ms').error, /\{port\}/);
  assert.match(publicUrlsOf('abc-{port}.devtunnels.ms').error, /http/);
});
