/** The thin command over the registry's operations (task-11.4 decision 14). */
import {createServer, type Server} from 'node:http';
import {mkdir, mkdtemp, rm, writeFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {dirname, join} from 'node:path';
import {afterEach, describe, expect, test} from 'vitest';
import express from 'express';
import {registryRoutes, REGISTRY_ROUTE_PREFIX} from '../src/registry/api.js';
import {runRegistryCommand} from '../src/registry/command.js';
import {MarketplaceClient} from '../src/registry/marketplace.js';
import {issueWriteToken} from '../src/registry/token.js';
import {UpdateCheck} from '../src/registry/updates.js';
import {startFakeMarketplace, type FakeMarketplace} from './fakeMarketplace.js';
import {cardFor, fixtureArtifact, testRegistry, type TestRegistry} from './registryFixture.js';

const GMAIL = 'https://example.com/gmail/catalog.json';
const CALENDAR = 'https://example.com/calendar/catalog.json';

let server: Server | undefined;
let made: TestRegistry | undefined;
let marketplace: FakeMarketplace | undefined;
const dirs: string[] = [];
afterEach(async () => {
  await new Promise<void>(resolve => (server ? server.close(() => resolve()) : resolve()));
  server = undefined;
  await marketplace?.close();
  marketplace = undefined;
  if (made) dirs.push(made.stateDir);
  made = undefined;
  for (const dir of dirs.splice(0)) await rm(dir, {recursive: true, force: true});
});

async function orchestrator() {
  marketplace = await startFakeMarketplace();
  const client = new MarketplaceClient({url: marketplace.url, timeoutMs: 2_000});
  made = await testRegistry([], {marketplace: client});
  const token = await issueWriteToken(made.stateDir);
  const app = express();
  app.use(
    REGISTRY_ROUTE_PREFIX,
    registryRoutes({
      registry: made.registry,
      writeToken: () => token,
      updates: new UpdateCheck({registry: made.registry, marketplace: client}),
    }),
  );
  server = createServer(app);
  await new Promise<void>(resolve => server!.listen(0, '127.0.0.1', resolve));
  const address = server.address();
  if (!address || typeof address === 'string') throw new Error('no port');
  return {
    env: {ORCHESTRATOR_URL: `http://127.0.0.1:${address.port}`, STATE_DIR: made.stateDir},
    registry: made.registry,
    cards: made.cards,
    marketplace,
  };
}

/** A packed artifact directory, as `stellify pack` leaves one. */
async function packed(files: Map<string, Uint8Array>): Promise<string> {
  const dir = await mkdtemp(join(tmpdir(), 'a2uiverse-artifact-'));
  dirs.push(dir);
  for (const [path, bytes] of files) {
    await mkdir(dirname(join(dir, path)), {recursive: true});
    await writeFile(join(dir, path), bytes);
  }
  return dir;
}

async function run(argv: string[], env: Record<string, string>) {
  const out: string[] = [];
  const err: string[] = [];
  const code = await runRegistryCommand(argv, {
    env,
    cwd: '/',
    packageDir: '/',
    out: line => out.push(line),
    err: line => err.push(line),
  });
  return {code, out, err};
}

describe('the registry command', () => {
  test('install reads the packed directories, sends them with the token, and says what landed', async () => {
    const {env, registry, cards} = await orchestrator();
    const dir = await packed(await fixtureArtifact(GMAIL));
    const cardUrl = cards.serve(
      cardFor('http://127.0.0.1:11002', {name: 'Gmail', catalogs: [GMAIL]}),
    );
    const result = await run(['install', 'gmail', cardUrl, dir], env);
    expect(result).toMatchObject({code: 0, err: []});
    expect(result.out).toEqual([
      expect.stringMatching(/^installed gmail · card 0\.0\.0 · catalog sha256-/),
    ]);
    expect(registry.get('gmail').catalogs).toEqual([GMAIL]);
    const again = await run(['install', 'gmail', cardUrl, dir], env);
    expect(again.out).toEqual([expect.stringMatching(/^reinstalled gmail · nothing changed · /)]);
  });

  test('a card on the basic catalog prints the note', async () => {
    const {env, cards} = await orchestrator();
    const cardUrl = cards.serve(cardFor('http://127.0.0.1:12001'));
    const result = await run(['install', 'shop-a', cardUrl], env);
    expect(result.out).toEqual([
      'installed shop-a · card 0.0.0',
      'note: the card declares no catalogs: it paints in the basic catalog only',
    ]);
  });

  test('a refusal prints each finding on its own line and exits 1', async () => {
    const {env, cards} = await orchestrator();
    const cardUrl = cards.serve(cardFor('http://127.0.0.1:11002', {catalogs: [GMAIL]}));
    const result = await run(['install', 'Gmail', cardUrl], env);
    expect(result.code).toBe(1);
    expect(result.err[0]).toBe('refused Gmail:');
    expect(result.err.slice(1)).toHaveLength(2);
    expect(result.err.slice(1).every(line => line.startsWith('  '))).toBe(true);
  });

  test('list prints each installed app with its card URL and catalogs', async () => {
    const {env, cards} = await orchestrator();
    const dir = await packed(await fixtureArtifact(GMAIL));
    const gmail = cards.serve(cardFor('http://127.0.0.1:11002', {catalogs: [GMAIL]}));
    const shop = cards.serve(cardFor('http://127.0.0.1:12001'));
    await run(['install', 'gmail', gmail, dir], env);
    await run(['install', 'shop-a', shop], env);
    expect((await run(['list'], env)).out).toEqual([
      `gmail  ${gmail}  ${GMAIL}  local`,
      `shop-a  ${shop}  basic catalog  local`,
    ]);
  });

  test('install with the app id alone installs from the marketplace (task-13.5 decisions 2, 12)', async () => {
    const {env, cards, marketplace, registry} = await orchestrator();
    const card = cardFor('http://127.0.0.1:11002', {name: 'Gmail', catalogs: [GMAIL]});
    const cardUrl = cards.serve(card);
    await marketplace.publish('gmail', {card, cardUrl, catalogs: [await fixtureArtifact(GMAIL)]});
    const result = await run(['install', 'gmail'], env);
    expect(result.code).toBe(0);
    expect(result.out).toEqual([
      expect.stringMatching(/^installed gmail · card 0\.0\.0 · catalog sha256-/),
    ]);
    expect(registry.installed()[0].source).toBe('marketplace');
    expect((await run(['list'], env)).out).toEqual([`gmail  ${cardUrl}  ${GMAIL}  marketplace`]);
    const missing = await run(['install', 'inbox'], env);
    expect(missing.code).toBe(1);
    expect(missing.err).toEqual([
      'refused inbox:',
      `  app "inbox" is not published on the marketplace at ${marketplace.url}`,
    ]);
  });

  test('updates prints one line per installed app: the state, the versions and its details in words (task-13.5 decision 12)', async () => {
    const {env, cards, marketplace} = await orchestrator();
    const gmail = cardFor('http://127.0.0.1:11002', {name: 'Gmail', catalogs: [GMAIL]});
    const gmailUrl = cards.serve(gmail);
    const first = await fixtureArtifact(GMAIL);
    await marketplace.publish('gmail', {card: gmail, cardUrl: gmailUrl, catalogs: [first]});
    await run(['install', 'gmail'], env);
    const shop = cardFor('http://127.0.0.1:12001', {name: 'Shop A'});
    const shopUrl = cards.serve(shop);
    await run(['install', 'shop-a', shopUrl], env);
    // Gmail moves to a new card with a new catalog: a major update, suggested, never automatic.
    const next = {
      ...cardFor('http://127.0.0.1:11002', {name: 'Gmail', catalogs: [GMAIL, CALENDAR]}),
      version: '1.0.0',
    };
    await marketplace.publish('gmail', {
      card: next,
      cardUrl: gmailUrl,
      catalogs: [await fixtureArtifact(GMAIL, {version: '0.2.0'}), await fixtureArtifact(CALENDAR)],
      versions: ['0.0.0', '1.0.0'],
    });
    const result = await run(['updates'], env);
    expect(result.code).toBe(0);
    expect(result.out).toHaveLength(2);
    expect(result.out[0]).toMatch(
      new RegExp(
        `^gmail  major update  0\\.0\\.0 → 1\\.0\\.0  new catalog ${CALENDAR}; catalog ${GMAIL} sha256-[^ ]+ → sha256-[^ ]+$`,
      ),
    );
    expect(result.out[1]).toBe('shop-a  not published  0.0.0');
  });

  test('uninstall removes the app; one not installed exits 1', async () => {
    const {env, cards, registry} = await orchestrator();
    await run(['install', 'shop-a', cards.serve(cardFor('http://127.0.0.1:12001'))], env);
    expect(await run(['uninstall', 'shop-a'], env)).toEqual({
      code: 0,
      out: ['uninstalled shop-a'],
      err: [],
    });
    expect(registry.list()).toEqual([]);
    const again = await run(['uninstall', 'shop-a'], env);
    expect(again.code).toBe(1);
    expect(again.err).toEqual(['refused shop-a:', '  app "shop-a" is not installed']);
  });

  test('a wrong token, a missing directory and a bad verb exit 1 with the reason', async () => {
    const {env, cards} = await orchestrator();
    const cardUrl = cards.serve(cardFor('http://127.0.0.1:12001'));
    await writeFile(join(env.STATE_DIR, 'registry', 'write-token'), 'stale\n');
    const stale = await run(['install', 'shop-a', cardUrl], env);
    expect(stale.code).toBe(1);
    expect(stale.err[0]).toMatch(/write token/);
    const missing = await run(['install', 'shop-a', cardUrl, '/nowhere/at/all'], env);
    expect(missing.code).toBe(1);
    expect(missing.err[0]).toMatch(/\/nowhere\/at\/all/);
    const verb = await run(['publish'], env);
    expect(verb.code).toBe(1);
    expect(verb.err.join('\n')).toMatch(/usage/i);
  });
});
