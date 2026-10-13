/**
 * The fixed world the replay suite's preview server answers the trusted page's reads from
 * (task-14.10 decision 14), shipped with the snapshot as `/registry` is: the snapshot's seven apps
 * listed in the Store under their publisher, each with its sample; six installed, each in a
 * different update state, and Linear left for the Store to install; GitHub with two accounts, Shop B
 * on a key; the publisher signed in to Publish, Shop A's listing ahead of the Store.
 *
 * Where it comes from (decision 15): each card and sample is the recorded one, each build the
 * snapshot's own artifact for that catalog id — the recordings name the apps checkout's packs — and
 * every installed app is one the snapshot's table packs. The states are written here by hand over
 * them, each as the orchestrator's check would read it from the installed record, the Store's entry
 * and the live card. Pure: the caller reads the recordings and the table.
 */
import {createHash} from 'node:crypto';

/** The publisher of every recorded app, signed in to Publish. */
const PUBLISHER = 'a2uiverse-apps';

/** The version an app installed before its last publish still holds. */
const EARLIER = '0.0.9';

/** When the apps were installed, and when the Store saw Shop A's live card ahead of it. */
const INSTALLED_AT = '2026-10-01T09:00:00.000Z';
const SEEN_AT = '2026-10-13T08:30:00.000Z';

/** A look Shop A's live card now declares that the Store doesn't have. */
const SHOP_A_NEW_LOOK =
  'https://github.com/retz8/a2uiverse-apps/blob/main/mocks/shop-a/shop-a-catalog/catalogs/v0.10.0/catalog.json';

/** The line Shop B's earlier version painted in, retired since. */
const SHOP_B_RETIRED_LOOK =
  'https://github.com/retz8/a2uiverse-apps/blob/main/mocks/shop-b/shop-b-catalog/catalogs/v0.9.0/catalog.json';

/**
 * Each app's state, by hand (decision 15): what is installed of it — none for the app the Store
 * installs — where from, the state the check reads, what the Store's entry says beyond the
 * recording, and its accounts, each with the scopes it was granted, or a key.
 */
const APPS = {
  // A new version: the one installed drew only in the basic look, the new one has a look of its
  // own. Its one account must sign in again.
  calendar: {
    installed: entry => ({card: declaring(withVersion(entry.card, EARLIER), []), catalogs: {}}),
    state: (entry, record) => ({
      state: 'major-update',
      publishedVersion: entry.card.version,
      newCatalogIds: declaredIds(entry.card).filter(id => !declaredIds(record.card).includes(id)),
      builds: buildMoves(record.catalogs, entry.catalogs),
    }),
    accounts: [{label: 'me@example.com', scopes: ['calendar.read'], lapsed: true}],
  },
  // An update that asks for more: the one installed asked no sign-in and drew in an older build.
  circleci: {
    installed: entry => ({
      card: askingNoSignIn(withVersion(entry.card, EARLIER)),
      catalogs: olderBuilds(entry.catalogs),
    }),
    state: (entry, record) => ({
      state: 'card-update',
      publishedVersion: entry.card.version,
      newScopes: [...scopesAsked(entry.card)].map(([scheme, scopes]) => ({scheme, scopes})),
      builds: buildMoves(record.catalogs, entry.catalogs),
    }),
    accounts: [],
  },
  // Up to date, with two accounts.
  github: {
    installed: entry => ({card: entry.card, catalogs: entry.catalogs}),
    state: entry => ({state: 'up-to-date', publishedVersion: entry.card.version}),
    accounts: [
      {label: 'me@example.com', scopes: ['github.read', 'github.write']},
      {label: 'work@example.com', scopes: ['github.read']},
    ],
  },
  // A small update: a newer build, the card unchanged, held because the app came from a local
  // copy, which the check never updates by itself.
  gmail: {
    source: 'local',
    installed: entry => ({card: entry.card, catalogs: olderBuilds(entry.catalogs)}),
    state: (entry, record) => ({
      state: 'newer-build',
      publishedVersion: entry.card.version,
      builds: buildMoves(record.catalogs, entry.catalogs),
    }),
    accounts: [{label: 'me@example.com', scopes: ['inbox', 'messages']}],
  },
  // In the Store, not installed: the app the Store installs.
  linear: {},
  // On its way from the publisher: its live card declares a look and a version the Store lacks.
  'shop-a': {
    installed: entry => ({card: entry.card, catalogs: entry.catalogs}),
    ahead: entry => ({catalogIds: [SHOP_A_NEW_LOOK], version: nextMinor(entry.card.version)}),
    state: ({card, aheadOfStore}) => ({
      state: 'ahead-of-store',
      publishedVersion: card.version,
      catalogIds: aheadOfStore.catalogIds,
      version: aheadOfStore.version,
    }),
    accounts: [],
  },
  // Needs an update: the one installed painted in a line the published version retired. On a key.
  'shop-b': {
    installed: entry => ({
      card: declaring(withVersion(entry.card, EARLIER), [SHOP_B_RETIRED_LOOK]),
      catalogs: {[SHOP_B_RETIRED_LOOK]: olderBuild(SHOP_B_RETIRED_LOOK)},
    }),
    state: (entry, record) => ({
      state: 'update-required',
      publishedVersion: entry.card.version,
      retired: retiredLines(record.card, entry.card),
    }),
    accounts: [{key: true}],
  },
};

// --- Cards ------------------------------------------------------------------------------------

/** A card at another version. */
const withVersion = (card, version) => ({...card, version});

/** A card whose A2UI extension declares `ids`, the basic look beside them. */
function declaring(card, ids) {
  const extensions = (card.capabilities?.extensions ?? []).map(extension =>
    Array.isArray(extension.params?.supportedCatalogIds)
      ? {...extension, params: {...extension.params, supportedCatalogIds: ids}}
      : extension,
  );
  return {...card, capabilities: {...card.capabilities, extensions}};
}

/** A card that asks no sign-in. */
function askingNoSignIn(card) {
  const {security: _security, securitySchemes: _schemes, ...rest} = card;
  return rest;
}

/** The catalog ids a card declares through its A2UI extension. */
const declaredIds = card =>
  (card.capabilities?.extensions ?? []).flatMap(e => e.params?.supportedCatalogIds ?? []);

/** The ids the earlier card declared and the later one no longer does. */
const retiredLines = (earlier, later) =>
  declaredIds(earlier).filter(id => !declaredIds(later).includes(id));

/** Each scheme a card's `security` alternatives name, with the scopes they ask of it. */
function scopesAsked(card) {
  const schemes = new Map();
  for (const alternative of card.security ?? []) {
    for (const [scheme, scopes] of Object.entries(alternative)) {
      schemes.set(scheme, [...new Set([...(schemes.get(scheme) ?? []), ...scopes])]);
    }
  }
  return schemes;
}

/** The next minor version: what a live card ahead of the Store says it is. */
function nextMinor(version) {
  const [major, minor] = version.split('.').map(Number);
  return `${major}.${minor + 1}.0`;
}

/** Whether an app signs in, as the vault reads its card: none, supported, or one it can't run. */
function signInOf(card) {
  const security = card.security ?? [];
  if (security.length === 0 || security.some(alt => Object.keys(alt).length === 0)) return 'none';
  const runs = scheme =>
    (scheme?.type === 'oauth2' && scheme.flows?.authorizationCode !== undefined) ||
    scheme?.type === 'openIdConnect' ||
    (scheme?.type === 'http' && scheme.scheme?.toLowerCase() === 'bearer') ||
    (scheme?.type === 'apiKey' && scheme.in === 'header' && Boolean(scheme.name));
  return security.some(
    alt => Object.keys(alt).length === 1 && runs(card.securitySchemes?.[Object.keys(alt)[0]]),
  )
    ? 'supported'
    : 'unsupported';
}

/** The card's own words for the scopes an account holds under its sign-in. */
function wordsFor(card, scopes) {
  const scheme = Object.values(card.securitySchemes ?? {}).find(
    s => s?.flows?.authorizationCode !== undefined,
  );
  const words = scheme?.flows.authorizationCode.scopes ?? {};
  return scopes.flatMap(scope => (words[scope] ? [words[scope]] : []));
}

// --- Builds -----------------------------------------------------------------------------------

/** An artifact id for a build older than the snapshot's: what a record holds before a move. */
const olderBuild = catalogId =>
  `sha256-${createHash('sha256').update(`an older build of ${catalogId}`).digest('base64url')}`;

const olderBuilds = catalogs =>
  Object.fromEntries(Object.keys(catalogs).map(id => [id, olderBuild(id)]));

/** The catalogs both sides hold at different builds. */
const buildMoves = (installed, published) =>
  Object.entries(installed).flatMap(([catalogId, artifact]) =>
    published[catalogId] !== undefined && published[catalogId] !== artifact
      ? [{catalogId, installed: artifact, published: published[catalogId]}]
      : [],
  );

// --- The world --------------------------------------------------------------------------------

/**
 * The world from the recorded Store captures and the snapshot's catalog table. Throws when the
 * two have moved apart — a recorded catalog the snapshot doesn't pack, an app the world has no
 * state or no recording for: the Store is recorded again when the snapshot's pin moves.
 */
export function storeWorld({recordings, table}) {
  const builds = new Map(
    table.flatMap(row => (row.artifact ? [[row.catalogId, row.artifact]] : [])),
  );
  // The table lists the client's own catalogs first, the basic look the first of them.
  const basic = table[0].catalogId;
  const recorded = [...recordings].sort((a, b) => (a.entry.appId < b.entry.appId ? -1 : 1));
  const missing = Object.keys(APPS).filter(id => !recorded.some(r => r.entry.appId === id));
  if (missing.length > 0) throw new Error(`no Store recording of ${missing.join(', ')}`);

  const world = {
    index: [],
    previews: {},
    installed: [],
    updates: [],
    accounts: [],
    publisher: {state: 'signed-in', publisher: PUBLISHER, store: 'accepted'},
  };
  for (const {entry: recordedEntry, preview} of recorded) {
    const {appId} = recordedEntry;
    const app = APPS[appId];
    if (!app) throw new Error(`the world has no state for ${appId}`);
    const catalogs = Object.fromEntries(
      Object.keys(recordedEntry.catalogs).map(id => {
        const artifact = builds.get(id);
        if (!artifact) throw new Error(`the snapshot packs no build of ${id} (${appId})`);
        return [id, artifact];
      }),
    );
    const published = {...recordedEntry, catalogs};
    const held = app.installed?.(published);
    // A record held at an earlier version is one the Store published before this one.
    const earlier = held && held.card.version !== published.card.version ? [held.card.version] : [];
    const entry = {
      ...published,
      versions: [...new Set([...earlier, ...published.versions])],
      retired: [
        ...new Set([
          ...published.retired,
          ...(held ? retiredLines(held.card, published.card) : []),
        ]),
      ],
      ...(app.ahead ? {aheadOfStore: {...app.ahead(published), seenAt: SEEN_AT}} : {}),
    };
    world.previews[appId] = preview;
    if (!held) {
      world.index.push({entry, installed: false});
      continue;
    }

    const record = {
      id: appId,
      cardUrl: entry.cardUrl,
      card: held.card,
      catalogs: held.catalogs,
      entitlement: [basic, ...Object.keys(held.catalogs)],
      installedAt: INSTALLED_AT,
      source: app.source ?? 'marketplace',
      reachable: true,
    };
    const update = {appId, installedVersion: held.card.version, ...app.state(entry, record)};
    world.installed.push(record);
    world.updates.push(update);
    world.index.push({entry, installed: true, update});

    // The vault reads each account by the live card; no agent's live card asks other than its
    // published one does.
    const live = entry.card;
    world.accounts.push({
      appId,
      signIn: signInOf(live),
      accounts: app.accounts.map((account, i) => ({
        source: `${appId}.${i + 1}`,
        ...(account.key
          ? {label: `${live.name} account ${i + 1}`, kind: 'key', permissions: [], lapsed: false}
          : {
              label: account.label,
              kind: 'oauth',
              permissions: wordsFor(live, account.scopes),
              lapsed: account.lapsed === true,
            }),
      })),
    });
  }
  return world;
}

/**
 * The Store's search over the world, a stand-in for the marketplace's ranking: the listings whose
 * card names every word of three letters or more — in its name, description or skills — by name.
 */
export function searchWorld(world, words) {
  const terms = words
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter(term => term.length >= 3);
  if (terms.length === 0) return [];
  const textOf = ({card}) =>
    [
      card.name,
      card.description,
      ...(card.skills ?? []).flatMap(s => [
        s.name,
        s.description,
        ...(s.tags ?? []),
        ...(s.examples ?? []),
      ]),
    ]
      .join(' ')
      .toLowerCase();
  return world.index
    .filter(listing => terms.every(term => textOf(listing.entry).includes(term)))
    .sort((a, b) => a.entry.card.name.localeCompare(b.entry.card.name, 'en'));
}
