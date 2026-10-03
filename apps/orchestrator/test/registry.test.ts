/** The registry (task 11.4): persisted in the state directory, written by install, uninstall and install-over. */
import {readdir, readFile, rm, writeFile} from 'node:fs/promises';
import {join} from 'node:path';
import {afterEach, describe, expect, test} from 'vitest';
import {ARTIFACT_DESCRIPTOR_FILE, artifactIdOf, BASIC_CATALOG_ID} from '@a2uiverse/sdk';
import {CATALOG_ID as SHELL_CATALOG_ID} from '@a2uiverse/shell-catalog/id';
import {corpusDoc} from '../src/registry/corpus.js';
import {Registry} from '../src/registry/registry.js';
import {FakeEmbedder} from './fakeEmbedder.js';
import {cardFor, fixtureArtifact, testRegistry, type TestRegistry} from './registryFixture.js';

const GMAIL = 'https://example.com/gmail/catalog.json';
const CALENDAR = 'https://example.com/calendar/catalog.json';

const created: string[] = [];
afterEach(async () => {
  for (const dir of created.splice(0)) await rm(dir, {recursive: true, force: true});
});

async function fresh(...args: Parameters<typeof testRegistry>): Promise<TestRegistry> {
  const made = await testRegistry(...args);
  created.push(made.stateDir);
  return made;
}

const artifactIds = async (stateDir: string) =>
  (await readdir(join(stateDir, 'registry', 'artifacts'))).sort();

const idOf = async (files: Map<string, Uint8Array>) =>
  artifactIdOf(files.get(ARTIFACT_DESCRIPTOR_FILE)!);

describe('an empty registry', () => {
  test('a fresh state directory is a valid empty registry: no app, the two seeded catalogs', async () => {
    const {registry} = await fresh();
    expect(registry.list()).toEqual([]);
    expect(registry.installed()).toEqual([]);
    expect(registry.table()).toEqual([
      {catalogId: BASIC_CATALOG_ID, provided: 'client'},
      {catalogId: SHELL_CATALOG_ID, provided: 'client'},
    ]);
  });
});

describe('install', () => {
  test('an app on the basic catalog installs from its card URL alone, and says so', async () => {
    const {registry, cards} = await fresh();
    const card = cardFor('http://127.0.0.1:12001', {name: 'Shop A'});
    const result = await registry.install({
      appId: 'shop-a',
      cardUrl: cards.serve(card),
      catalogs: [],
    });
    expect(result).toEqual({
      ok: true,
      appId: 'shop-a',
      replaced: false,
      summary: 'installed shop-a · card 0.0.0',
      notes: ['the card declares no catalogs: it paints in the basic catalog only'],
    });
    expect(registry.get('shop-a')).toEqual({
      id: 'shop-a',
      displayName: 'Shop A',
      agentUrl: 'http://127.0.0.1:12001',
      catalogs: [],
      entitlement: [BASIC_CATALOG_ID],
    });
  });

  test('an app handing its catalog: the files on disk, a table row, the id in its entitlement', async () => {
    const {registry, cards, stateDir} = await fresh();
    const artifact = await fixtureArtifact(GMAIL);
    const id = await idOf(artifact);
    const card = cardFor('http://127.0.0.1:11002', {name: 'Gmail', catalogs: [GMAIL]});
    const result = await registry.install({
      appId: 'gmail',
      cardUrl: cards.serve(card),
      catalogs: [artifact],
    });
    expect(result).toMatchObject({ok: true, appId: 'gmail', replaced: false, notes: []});
    expect(registry.get('gmail').entitlement).toEqual([BASIC_CATALOG_ID, GMAIL]);
    expect(registry.table()).toContainEqual({catalogId: GMAIL, artifact: id, entry: 'index.js'});
    for (const [path, bytes] of artifact) {
      expect(
        new Uint8Array(await readFile(join(stateDir, 'registry', 'artifacts', id, path))),
      ).toEqual(bytes);
    }
    expect(registry.installed()).toEqual([
      {
        id: 'gmail',
        cardUrl: 'http://127.0.0.1:11002/.well-known/agent-card.json',
        card,
        catalogs: {[GMAIL]: id},
        entitlement: [BASIC_CATALOG_ID, GMAIL],
        installedAt: expect.any(String),
      },
    ]);
  });

  test('an install is live at once: the app is routable with no restart', async () => {
    const {registry, cards} = await fresh();
    const card = cardFor('http://127.0.0.1:11002', {name: 'Gmail'});
    await registry.install({appId: 'gmail', cardUrl: cards.serve(card), catalogs: []});
    expect(registry.routable().map(app => app.record.id)).toEqual(['gmail']);
    expect(registry.card('gmail')).toEqual(card);
  });

  test('installs persist: a registry opened over the same state directory holds them', async () => {
    const {registry, cards, stateDir} = await fresh();
    const card = cardFor('http://127.0.0.1:11002', {name: 'Gmail', catalogs: [GMAIL]});
    await registry.install({
      appId: 'gmail',
      cardUrl: cards.serve(card),
      catalogs: [await fixtureArtifact(GMAIL)],
    });
    const reopened = new Registry({
      stateDir,
      resolveCard: cards.resolve,
      embedder: new FakeEmbedder(),
    });
    await reopened.load();
    expect(reopened.installed()).toEqual(registry.installed());
    expect(reopened.table()).toEqual(registry.table());
  });

  describe('the gate refuses the whole app, every finding together', () => {
    const refused = async (
      input: {
        appId?: string;
        card?: Parameters<typeof cardFor>[1];
        catalogs?: Map<string, Uint8Array>[];
      },
      serve = true,
    ) => {
      const {registry, cards, stateDir} = await fresh();
      const card = cardFor('http://127.0.0.1:11002', input.card ?? {});
      const cardUrl = serve
        ? cards.serve(card)
        : 'http://127.0.0.1:11002/.well-known/agent-card.json';
      const result = await registry.install({
        appId: input.appId ?? 'gmail',
        cardUrl,
        catalogs: input.catalogs ?? [],
      });
      expect(result.ok).toBe(false);
      expect(registry.list()).toEqual([]);
      await expect(readdir(join(stateDir, 'registry', 'artifacts'))).resolves.toEqual([]);
      return result.ok ? [] : result.findings;
    };

    test('an app id that is not a slug, and the reserved one', async () => {
      expect(await refused({appId: 'Gmail'})).toEqual([
        'app id "Gmail" is not a slug: lowercase letters, digits and hyphens, starting with a letter',
      ]);
      expect(await refused({appId: 'shell'})).toEqual(['app id "shell" is reserved']);
    });

    test('a card that cannot be fetched', async () => {
      expect(await refused({}, false)).toEqual([
        'the card at http://127.0.0.1:11002/.well-known/agent-card.json could not be fetched: fetch failed: http://127.0.0.1:11002/.well-known/agent-card.json',
      ]);
    });

    test('coverage both ways: a declared catalog not handed, an artifact not declared', async () => {
      expect(await refused({card: {catalogs: [GMAIL]}})).toEqual([
        `the card declares catalog "${GMAIL}" but no artifact for it was handed and it is not public`,
      ]);
      expect(await refused({catalogs: [await fixtureArtifact(GMAIL)]})).toEqual([
        `an artifact for catalog "${GMAIL}" was handed but the card does not declare it`,
      ]);
    });

    test('a malformed catalog declaration is refused with the schema’s error, never read as none', async () => {
      const findings = await refused({card: {catalogs: 'nope' as unknown as string[]}});
      expect(findings).toHaveLength(1);
      expect(findings[0]).toMatch(/^the card's A2UI extension params/);
    });

    test('a file that does not match its hash, and a file the descriptor does not list', async () => {
      const artifact = await fixtureArtifact(GMAIL);
      artifact.set('index.js', new TextEncoder().encode('export const CATALOG = 2;\n'));
      artifact.set('extra.css', new TextEncoder().encode('a{}'));
      const findings = await refused({card: {catalogs: [GMAIL]}, catalogs: [artifact]});
      expect(findings).toEqual([
        expect.stringMatching(new RegExp(`^catalog artifact 1 \\(${GMAIL}\\): index.js: hash is `)),
        `catalog artifact 1 (${GMAIL}): extra.css: present but not listed in the descriptor`,
      ]);
    });

    test('no descriptor, and a descriptor that does not conform', async () => {
      const missing = await fixtureArtifact(GMAIL);
      missing.delete(ARTIFACT_DESCRIPTOR_FILE);
      expect(await refused({catalogs: [missing]})).toEqual([
        'catalog artifact 1: no artifact.json',
      ]);
      const broken = await fixtureArtifact(GMAIL);
      broken.set(ARTIFACT_DESCRIPTOR_FILE, new TextEncoder().encode('{"catalogId": 1}'));
      const findings = await refused({catalogs: [broken]});
      expect(findings.length).toBeGreaterThan(0);
      expect(findings.every(f => f.startsWith('catalog artifact 1: artifact.json'))).toBe(true);
    });

    test('a schema whose id is not the descriptor’s, and one that does not compile', async () => {
      const other = await fixtureArtifact(GMAIL, {
        schema: {catalogId: CALENDAR, components: {Text: {type: 'object'}}},
      });
      expect(await refused({card: {catalogs: [GMAIL]}, catalogs: [other]})).toEqual([
        `catalog artifact 1 (${GMAIL}): catalog.json: catalogId is "${CALENDAR}", the descriptor says "${GMAIL}"`,
      ]);
      const broken = await fixtureArtifact(GMAIL, {
        schema: {catalogId: GMAIL, components: {Broken: {$ref: '#/$defs/nowhere'}}},
      });
      const findings = await refused({card: {catalogs: [GMAIL]}, catalogs: [broken]});
      expect(findings).toEqual([
        expect.stringMatching(/^catalog artifact 1 \(.*\): catalog.json: components\/Broken: /),
      ]);
    });

    test('a host interface the platform does not supply', async () => {
      const artifact = await fixtureArtifact(GMAIL, {hostInterface: '1.0.0'});
      expect(await refused({card: {catalogs: [GMAIL]}, catalogs: [artifact]})).toEqual([
        `catalog artifact 1 (${GMAIL}): host interface "1.0.0" is not one the platform supplies (it supplies "0.9.1")`,
      ]);
    });

    test('the credential lint over the schema', async () => {
      const artifact = await fixtureArtifact(GMAIL, {
        schema: {catalogId: GMAIL, components: {PasswordField: {type: 'object'}}},
      });
      expect(await refused({card: {catalogs: [GMAIL]}, catalogs: [artifact]})).toEqual([
        expect.stringMatching(
          /^catalog artifact 1 \(.*\): catalog.json: component "PasswordField"/,
        ),
      ]);
    });

    test('an artifact for a catalog the client provides', async () => {
      const basic = await fixtureArtifact(BASIC_CATALOG_ID);
      expect(await refused({card: {catalogs: [BASIC_CATALOG_ID]}, catalogs: [basic]})).toEqual([
        `catalog "${BASIC_CATALOG_ID}" is provided by the client: no artifact may be handed for it`,
      ]);
    });

    test('two artifacts for one catalog id', async () => {
      const findings = await refused({
        card: {catalogs: [GMAIL]},
        catalogs: [await fixtureArtifact(GMAIL), await fixtureArtifact(GMAIL, {version: '0.2.0'})],
      });
      expect(findings).toEqual([`two artifacts were handed for catalog "${GMAIL}"`]);
    });

    test('several failures are reported together', async () => {
      const findings = await refused({appId: 'Gmail', card: {catalogs: [GMAIL]}});
      expect(findings).toHaveLength(2);
    });
  });
});

describe('a held catalog id', () => {
  test('two apps handing the same artifact share one row', async () => {
    const artifact = await fixtureArtifact(GMAIL);
    const {registry, stateDir} = await fresh([
      {
        id: 'gmail',
        card: cardFor('http://127.0.0.1:11002', {catalogs: [GMAIL]}),
        catalogs: [artifact],
      },
      {
        id: 'inbox',
        card: cardFor('http://127.0.0.1:11009', {catalogs: [GMAIL]}),
        catalogs: [artifact],
      },
    ]);
    expect(registry.table().filter(row => row.catalogId === GMAIL)).toHaveLength(1);
    expect(await artifactIds(stateDir)).toEqual([await idOf(artifact)]);
  });

  test('a new hash is refused while another installed app names the id, naming it', async () => {
    const {registry, cards} = await fresh([
      {
        id: 'gmail',
        card: cardFor('http://127.0.0.1:11002', {catalogs: [GMAIL]}),
        catalogs: [await fixtureArtifact(GMAIL)],
      },
    ]);
    const result = await registry.install({
      appId: 'inbox',
      cardUrl: cards.serve(cardFor('http://127.0.0.1:11009', {catalogs: [GMAIL]})),
      catalogs: [await fixtureArtifact(GMAIL, {version: '0.2.0'})],
    });
    expect(result).toEqual({
      ok: false,
      findings: [`catalog "${GMAIL}" is held at another hash by gmail`],
    });
  });

  test('a new hash from the only app naming the id replaces the row and drops the old files', async () => {
    const old = await fixtureArtifact(GMAIL);
    const {registry, cards, stateDir} = await fresh([
      {id: 'gmail', card: cardFor('http://127.0.0.1:11002', {catalogs: [GMAIL]}), catalogs: [old]},
    ]);
    const next = await fixtureArtifact(GMAIL, {version: '0.2.0'});
    const result = await registry.install({
      appId: 'gmail',
      cardUrl: cards.serve(cardFor('http://127.0.0.1:11002', {catalogs: [GMAIL]})),
      catalogs: [next],
    });
    expect(result).toMatchObject({ok: true, appId: 'gmail', replaced: true, notes: []});
    expect(registry.table()).toContainEqual({
      catalogId: GMAIL,
      artifact: await idOf(next),
      entry: 'index.js',
    });
    expect(await artifactIds(stateDir)).toEqual([await idOf(next)]);
  });
});

describe('install-over', () => {
  test('replaces the card, the catalogs and the entitlement in place', async () => {
    const {registry, cards} = await fresh([
      {
        id: 'gmail',
        card: cardFor('http://127.0.0.1:11002', {name: 'Gmail', catalogs: [GMAIL]}),
        catalogs: [await fixtureArtifact(GMAIL)],
      },
    ]);
    const card = cardFor('http://127.0.0.1:11012', {name: 'Gmail 2'});
    const result = await registry.install({
      appId: 'gmail',
      cardUrl: cards.serve(card),
      catalogs: [],
    });
    expect(result.ok && result.replaced).toBe(true);
    expect(registry.get('gmail')).toMatchObject({
      displayName: 'Gmail 2',
      agentUrl: 'http://127.0.0.1:11012',
      entitlement: [BASIC_CATALOG_ID],
    });
    expect(registry.table().map(row => row.catalogId)).toEqual([
      BASIC_CATALOG_ID,
      SHELL_CATALOG_ID,
    ]);
  });
});

describe('uninstall', () => {
  test('removes the app; its artifact goes when no installed card names the id', async () => {
    const artifact = await fixtureArtifact(GMAIL);
    const {registry, stateDir} = await fresh([
      {
        id: 'gmail',
        card: cardFor('http://127.0.0.1:11002', {catalogs: [GMAIL]}),
        catalogs: [artifact],
      },
      {
        id: 'inbox',
        card: cardFor('http://127.0.0.1:11009', {catalogs: [GMAIL]}),
        catalogs: [artifact],
      },
    ]);
    expect(await registry.uninstall('gmail')).toEqual({ok: true, appId: 'gmail'});
    expect(registry.find('gmail')).toBeUndefined();
    expect(registry.routable().map(app => app.record.id)).toEqual(['inbox']);
    expect(await artifactIds(stateDir)).toEqual([await idOf(artifact)]);
    await registry.uninstall('inbox');
    expect(await artifactIds(stateDir)).toEqual([]);
    expect(registry.table().map(row => row.catalogId)).toEqual([
      BASIC_CATALOG_ID,
      SHELL_CATALOG_ID,
    ]);
  });

  test('an app that is not installed is refused', async () => {
    const {registry} = await fresh();
    expect(await registry.uninstall('gmail')).toEqual({
      ok: false,
      findings: ['app "gmail" is not installed'],
    });
  });
});

describe('startup', () => {
  test('a run uses the card fetched at startup; disk keeps the installed one', async () => {
    const installed = cardFor('http://127.0.0.1:11002', {name: 'Gmail'});
    const {cards, stateDir} = await fresh([{id: 'gmail', card: installed}]);
    const moved = cardFor('http://127.0.0.1:11022', {name: 'Gmail, renamed'});
    cards.cards.set('http://127.0.0.1:11002/.well-known/agent-card.json', moved);
    const next = new Registry({stateDir, resolveCard: cards.resolve, embedder: new FakeEmbedder()});
    await next.load();
    await next.refreshCards();
    expect(next.get('gmail')).toMatchObject({
      displayName: 'Gmail, renamed',
      agentUrl: 'http://127.0.0.1:11022',
    });
    expect(next.card('gmail')).toEqual(moved);
    expect(next.installed()[0].card).toEqual(installed);
  });

  test('an agent down at startup stays installed, unroutable, named by its stored card', async () => {
    const installed = cardFor('http://127.0.0.1:11002', {name: 'Gmail'});
    const {cards, stateDir} = await fresh([{id: 'gmail', card: installed}]);
    cards.cards.clear();
    const next = new Registry({stateDir, resolveCard: cards.resolve, embedder: new FakeEmbedder()});
    await next.load();
    await next.refreshCards();
    expect(next.card('gmail')).toBeNull();
    expect(next.routable()).toEqual([]);
    expect(next.get('gmail')).toMatchObject({
      displayName: 'Gmail',
      agentUrl: 'http://127.0.0.1:11002',
    });
    expect(next.storedCard('gmail')).toEqual(installed);
  });

  test('the platform’s card is indexed under shell, never listed as installed', async () => {
    const embedder = new FakeEmbedder();
    const platformCard = cardFor('http://127.0.0.1:10001', {name: 'A2UIVerse'});
    const {registry} = await fresh([], {platformCard, embedder});
    await registry.refreshCards();
    expect(registry.list()).toEqual([]);
    expect(registry.routable().map(app => app.record.id)).toEqual(['shell']);
    expect(registry.get('shell').entitlement).toEqual([SHELL_CATALOG_ID]);
    const [vector] = await embedder.embed([corpusDoc(platformCard)]);
    expect(registry.routable()[0].vector).toEqual(vector);
  });

  describe('a damaged registry refuses the boot, naming the path and what is wrong', () => {
    const damaged = async (damage: (stateDir: string, artifactId: string) => Promise<void>) => {
      const artifact = await fixtureArtifact(GMAIL);
      const {stateDir, cards} = await fresh([
        {
          id: 'gmail',
          card: cardFor('http://127.0.0.1:11002', {catalogs: [GMAIL]}),
          catalogs: [artifact],
        },
      ]);
      await damage(stateDir, await idOf(artifact));
      const next = new Registry({
        stateDir,
        resolveCard: cards.resolve,
        embedder: new FakeEmbedder(),
      });
      return next.load();
    };

    test('a record file that does not parse', async () => {
      await expect(
        damaged(dir => writeFile(join(dir, 'registry', 'registry.json'), '{"apps": [')),
      ).rejects.toThrow(/registry\/registry\.json: /);
    });

    test('a record that does not have the record’s shape', async () => {
      await expect(
        damaged(dir => writeFile(join(dir, 'registry', 'registry.json'), '{"apps": [{"id": 1}]}')),
      ).rejects.toThrow(/registry\/registry\.json: /);
    });

    test('an artifact file changed on disk', async () => {
      await expect(
        damaged((dir, id) => writeFile(join(dir, 'registry', 'artifacts', id, 'index.js'), 'x')),
      ).rejects.toThrow(/index\.js: hash is /);
    });

    test('an artifact missing from disk', async () => {
      await expect(
        damaged((dir, id) => rm(join(dir, 'registry', 'artifacts', id), {recursive: true})),
      ).rejects.toThrow(/registry\/artifacts\/.*: /);
    });
  });
});

describe('the journal', () => {
  test('install, install-over, uninstall and a refusal each write one registry entry', async () => {
    const artifact = await fixtureArtifact(GMAIL);
    const card = cardFor('http://127.0.0.1:11002', {catalogs: [GMAIL]});
    const {registry, cards, journal} = await fresh([{id: 'gmail', card, catalogs: [artifact]}]);
    await registry.install({appId: 'gmail', cardUrl: cards.serve(card), catalogs: [artifact]});
    await registry.install({appId: 'Bad', cardUrl: cards.serve(card), catalogs: []});
    await registry.uninstall('gmail');
    const cardUrl = 'http://127.0.0.1:11002/.well-known/agent-card.json';
    const catalogs = [{catalogId: GMAIL, artifact: await idOf(artifact)}];
    expect(journal.entries).toEqual([
      {operation: 'install', appId: 'gmail', cardUrl, catalogs, outcome: 'installed'},
      {operation: 'install-over', appId: 'gmail', cardUrl, catalogs, outcome: 'installed'},
      {
        operation: 'install',
        appId: 'Bad',
        cardUrl,
        catalogs: [],
        outcome: 'refused',
        findings: expect.arrayContaining([expect.stringMatching(/is not a slug/)]),
      },
      {operation: 'uninstall', appId: 'gmail', catalogs, outcome: 'uninstalled'},
    ]);
  });
});

describe('the install’s summary: what it changed (task-11.8 decision 22)', () => {
  const short = (id: string) => `${id.slice(0, 'sha256-'.length + 8)}…`;

  test('a first install names the card’s version and each catalog’s artifact', async () => {
    const {registry, cards} = await fresh();
    const artifact = await fixtureArtifact(GMAIL);
    const result = await registry.install({
      appId: 'gmail',
      cardUrl: cards.serve(cardFor('http://127.0.0.1:11002', {catalogs: [GMAIL]})),
      catalogs: [artifact],
    });
    expect(result.ok && result.summary).toBe(
      `installed gmail · card 0.0.0 · catalog ${short(await idOf(artifact))}`,
    );
  });

  test('an install over it with a new artifact is an update, old → new', async () => {
    const old = await fixtureArtifact(GMAIL);
    const {registry, cards} = await fresh([
      {id: 'gmail', card: cardFor('http://127.0.0.1:11002', {catalogs: [GMAIL]}), catalogs: [old]},
    ]);
    const next = await fixtureArtifact(GMAIL, {version: '0.2.0'});
    const result = await registry.install({
      appId: 'gmail',
      cardUrl: cards.serve(cardFor('http://127.0.0.1:11002', {catalogs: [GMAIL]})),
      catalogs: [next],
    });
    expect(result.ok && result.summary).toBe(
      `updated gmail · card 0.0.0 · catalog ${short(await idOf(old))} → ${short(await idOf(next))}`,
    );
  });

  test('an install over it changing nothing says so', async () => {
    const artifact = await fixtureArtifact(GMAIL);
    const card = cardFor('http://127.0.0.1:11002', {catalogs: [GMAIL]});
    const {registry, cards} = await fresh([{id: 'gmail', card, catalogs: [artifact]}]);
    const result = await registry.install({
      appId: 'gmail',
      cardUrl: cards.serve(card),
      catalogs: [artifact],
    });
    expect(result.ok && result.summary).toBe(
      `reinstalled gmail · nothing changed · card 0.0.0 · catalog ${short(await idOf(artifact))}`,
    );
  });

  test('a new card version and a catalog id swapped for another name both sides', async () => {
    const old = await fixtureArtifact(GMAIL);
    const {registry, cards} = await fresh([
      {id: 'gmail', card: cardFor('http://127.0.0.1:11002', {catalogs: [GMAIL]}), catalogs: [old]},
    ]);
    const next = await fixtureArtifact(CALENDAR);
    const result = await registry.install({
      appId: 'gmail',
      cardUrl: cards.serve({
        ...cardFor('http://127.0.0.1:11002', {catalogs: [CALENDAR]}),
        version: '0.1.0',
      }),
      catalogs: [next],
    });
    expect(result.ok && result.summary).toBe(
      `updated gmail · card 0.0.0 → 0.1.0 · catalog ${GMAIL} ${short(await idOf(old))} gone · catalog ${CALENDAR} ${short(await idOf(next))} new`,
    );
  });
});
