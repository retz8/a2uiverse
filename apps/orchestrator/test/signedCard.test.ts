/**
 * Signed cards in the orchestrator (task 20.7): the check with every fetch of a card from its card
 * URL — at install, at boot, at the update check and fetched again — a pass journaled, a signed
 * card that does not pass refused at install and its installed app's slot failed under a cause of
 * its own, a key set that does not answer treated as the card not answering, and a signed card
 * written for A2A 0.3 taken as an unsigned card is. Cards signed by the Python A2A SDK's own
 * signers, served at the origin they were captured on with the key set they name.
 */
import {readFileSync} from 'node:fs';
import {rm} from 'node:fs/promises';
import {afterEach, describe, expect, test, vi} from 'vitest';
import {readCard, type ServedCard} from '@a2uiverse/card';
import {FakeEmbedder} from '@a2uiverse/embedder';
import {textPart, userMessage} from '../src/a2a/parts.js';
import {AgentsPool, type Credentials, type UpdateGate} from '../src/agentsPool/agentsPool.js';
import type {DispatchTurn} from '../src/agentsPool/types.js';
import {MarketplaceClient} from '../src/registry/marketplace.js';
import {Registry} from '../src/registry/registry.js';
import {startFakeMarketplace, type FakeMarketplace} from './fakeMarketplace.js';
import {fixtureArtifact, testRegistry} from './registryFixture.js';

/** A card fixture of the card package, as served. */
const fixture = (name: string): ServedCard & {version: string} =>
  JSON.parse(
    readFileSync(new URL(`../../../packages/card/test/fixtures/${name}`, import.meta.url), 'utf8'),
  );

const ORIGIN = 'http://127.0.0.1:18731';
const CARD_URL = `${ORIGIN}/es256/agent-card.json`;
const KEY_SET_URL = `${ORIGIN}/.well-known/jwks.json`;
const KEY_SET = fixture('python-1.0-signed-key-set.json') as {keys: {kid: string}[]};
const SIGNED = fixture('python-1.0-signed-es256.json');
const SIGNED_BY_RSA = fixture('python-1.0-signed-rs256.json');
const CATALOG = 'https://example.com/catalogs/fake/v1/catalog.json';
/** The key set with es-1, the key the card is signed by, rotated away. */
const WITHOUT_ES1 = {keys: KEY_SET.keys.filter(key => key.kid !== 'es-1')};
const REFUSED = `the card at ${CARD_URL} could not be confirmed: the card's signature did not pass: the key set at ${KEY_SET_URL} holds no key under kid "es-1" for ES256`;
const PASSED = {kid: 'es-1', jku: KEY_SET_URL, alg: 'ES256'};

const dirs: string[] = [];
let marketplace: FakeMarketplace | undefined;
afterEach(async () => {
  await marketplace?.close();
  marketplace = undefined;
  await Promise.all(dirs.splice(0).map(dir => rm(dir, {recursive: true, force: true})));
});

async function fresh(options: Parameters<typeof testRegistry>[1] = {}) {
  const made = await testRegistry([], options);
  dirs.push(made.stateDir);
  made.cards.documents.set(KEY_SET_URL, KEY_SET);
  return made;
}

async function install(made: Awaited<ReturnType<typeof fresh>>, served: ServedCard = SIGNED) {
  return made.registry.install({
    appId: 'fake',
    cardUrl: made.cards.serveAt(CARD_URL, served),
    catalogs: [await fixtureArtifact(CATALOG)],
  });
}

/** A registry with the signed card installed, passing. */
async function installed() {
  const made = await fresh();
  const result = await install(made);
  if (!result.ok) throw new Error(result.findings.join('; '));
  return made;
}

describe('a signed card at install (task-20.7 decisions 8, 9, 12)', () => {
  test('one that passes installs as any card does, stored as served, its pass journaled', async () => {
    const {registry, journal} = await installed();
    expect(registry.installed()[0]!.card).toEqual(SIGNED);
    expect(registry.card('fake')).toEqual(readCard(SIGNED));
    expect(registry.unconfirmed('fake')).toBeUndefined();
    expect(journal.signatures).toEqual([
      {appId: 'fake', cardUrl: CARD_URL, fetch: 'install', outcome: 'passed', signature: PASSED},
    ]);
  });

  test('one that does not pass is refused under a cause of its own, with its one finding, and nothing is installed', async () => {
    const made = await fresh();
    made.cards.documents.set(KEY_SET_URL, WITHOUT_ES1);
    const result = await install(made);
    expect(result).toEqual({ok: false, cause: 'unconfirmed', findings: [REFUSED]});
    expect(made.registry.installed()).toEqual([]);
    expect(made.journal.entries.at(-1)).toMatchObject({
      operation: 'install',
      outcome: 'refused',
      findings: [REFUSED],
    });
    expect(made.journal.signatures).toEqual([
      {
        appId: 'fake',
        cardUrl: CARD_URL,
        fetch: 'install',
        outcome: 'refused',
        finding: REFUSED.replace(`the card at ${CARD_URL} could not be confirmed: `, ''),
      },
    ]);
  });

  test('a key set that does not answer within the card’s time limit is the card not answering', async () => {
    const made = await fresh({cardTimeoutMs: 100});
    made.cards.hanging.add(KEY_SET_URL);
    const result = await install(made);
    expect(result).toEqual({
      ok: false,
      cause: 'app-unreached',
      findings: [
        `the card at ${CARD_URL} could not be fetched: the key set at ${KEY_SET_URL} did not answer within 0.1 s`,
      ],
    });
    expect(made.journal.signatures).toEqual([]);
  });

  test('a card written for A2A 0.3 signed by the Python A2A SDK 0.3.26 is taken as an unsigned card is: no key set fetched, nothing journaled', async () => {
    const made = await fresh();
    made.cards.documents.clear();
    const result = await made.registry.install({
      appId: 'fake',
      cardUrl: made.cards.serveAt(
        `${ORIGIN}/.well-known/agent-card.json`,
        fixture('python-0.3-signed.json'),
      ),
      catalogs: [await fixtureArtifact(CATALOG)],
    });
    expect(result.ok).toBe(true);
    expect(made.journal.signatures).toEqual([]);
  });

  test('a change of signature alone is no update: the same card signed by another key installs over it as nothing changed (decision 14)', async () => {
    const made = await installed();
    const again = await install(made, SIGNED_BY_RSA);
    expect(again.ok && again.summary).toMatch(/^reinstalled fake · nothing changed/);
    expect(made.journal.signatures.at(-1)).toMatchObject({
      outcome: 'passed',
      signature: {kid: 'rs-1', alg: 'RS256'},
    });
  });

  test('an install by id from the marketplace whose live card does not pass is refused the same way', async () => {
    marketplace = await startFakeMarketplace();
    const client = new MarketplaceClient({url: marketplace.url, timeoutMs: 2_000});
    const made = await fresh({marketplace: client});
    made.cards.serveAt(CARD_URL, SIGNED);
    await marketplace.publish('fake', {
      card: SIGNED,
      cardUrl: CARD_URL,
      catalogs: [await fixtureArtifact(CATALOG)],
    });
    made.cards.documents.set(KEY_SET_URL, WITHOUT_ES1);
    const result = await made.registry.installFromMarketplace('fake');
    expect(result).toEqual({ok: false, cause: 'unconfirmed', findings: [REFUSED]});
    expect(made.registry.installed()).toEqual([]);

    made.cards.documents.set(KEY_SET_URL, KEY_SET);
    expect((await made.registry.installFromMarketplace('fake')).ok).toBe(true);
    expect(made.journal.signatures.map(line => line.outcome)).toEqual(['refused', 'passed']);
  });
});

describe('an installed app whose live card does not pass (task-20.7 decisions 8, 10)', () => {
  test('at the update check: the card held stays, the refusal is held, and a later pass clears it', async () => {
    const {registry, cards, journal} = await installed();
    cards.documents.set(KEY_SET_URL, WITHOUT_ES1);
    await registry.refetchLiveCards();
    expect(registry.unconfirmed('fake')).toBe(REFUSED);
    expect(registry.card('fake')).toEqual(readCard(SIGNED));
    expect(registry.routable().map(app => app.record.id)).toEqual(['fake']);
    expect(journal.signatures.at(-1)).toMatchObject({fetch: 'check', outcome: 'refused'});

    cards.documents.set(KEY_SET_URL, KEY_SET);
    await registry.refetchLiveCards();
    expect(registry.unconfirmed('fake')).toBeUndefined();
    expect(journal.signatures.at(-1)).toMatchObject({fetch: 'check', outcome: 'passed'});
  });

  test('a card changed after it was signed is not taken: the run keeps the card it held', async () => {
    const {registry, cards} = await installed();
    cards.serveAt(CARD_URL, {...SIGNED, name: 'Someone Else'});
    await registry.refetchLiveCards();
    expect(registry.unconfirmed('fake')).toMatch(/it does not match the card/);
    expect(registry.get('fake').displayName).toBe('Fake Agent');
  });

  test('at boot: the card stored at install is the one held, so the app stays installed and routed', async () => {
    const {cards, stateDir} = await installed();
    cards.documents.set(KEY_SET_URL, WITHOUT_ES1);
    const next = new Registry({stateDir, fetchCard: cards.fetch, embedder: new FakeEmbedder()});
    await next.load();
    await next.refreshCards();
    expect(next.unconfirmed('fake')).toBe(REFUSED);
    expect(next.card('fake')).toEqual(readCard(SIGNED));
    expect(next.routable().map(app => app.record.id)).toEqual(['fake']);
  });

  test('a key set that does not answer at a refetch changes nothing: the card held and a refusal held both stay', async () => {
    const {registry, cards} = await installed();
    cards.hanging.add(KEY_SET_URL);
    expect(await registry.refetchLiveCard('fake', 50)).toBeUndefined();
    expect(registry.unconfirmed('fake')).toBeUndefined();
    expect(registry.card('fake')).toEqual(readCard(SIGNED));

    cards.hanging.delete(KEY_SET_URL);
    cards.documents.set(KEY_SET_URL, WITHOUT_ES1);
    expect(await registry.refetchLiveCard('fake', 1_000)).toBeUndefined();
    expect(registry.unconfirmed('fake')).toBe(REFUSED);
    cards.hanging.add(KEY_SET_URL);
    await registry.refetchLiveCard('fake', 50);
    expect(registry.unconfirmed('fake')).toBe(REFUSED);
  });

  test('its signatures removed, the card is an unsigned card and is taken (decision 8)', async () => {
    const {registry, cards, journal} = await installed();
    cards.documents.set(KEY_SET_URL, WITHOUT_ES1);
    await registry.refetchLiveCards();
    const {signatures: _removed, ...unsigned} = SIGNED as {signatures?: unknown};
    cards.serveAt(CARD_URL, unsigned);
    await registry.refetchLiveCards();
    expect(registry.unconfirmed('fake')).toBeUndefined();
    expect(journal.signatures.map(line => line.fetch)).toEqual(['install', 'check']);
  });

  test('an uninstall lets the refusal go', async () => {
    const {registry, cards} = await installed();
    cards.documents.set(KEY_SET_URL, WITHOUT_ES1);
    await registry.refetchLiveCards();
    await registry.uninstall('fake');
    expect(registry.unconfirmed('fake')).toBeUndefined();
  });

  test('its dispatch fails under the cause of its own before the agent is called, ahead of everything judged on the card', async () => {
    const {registry, cards} = await installed();
    cards.documents.set(KEY_SET_URL, WITHOUT_ES1);
    await registry.refetchLiveCards();
    const updates: UpdateGate = {
      catalogsChanged: vi.fn(() => true),
      permissionChanged: vi.fn(() => true),
      finding: vi.fn(async () => undefined),
      refetched: vi.fn(async () => 'unchanged' as const),
    };
    const credentials: Credentials = {
      prepare: vi.fn(async () => ({
        need: {cause: 'signIn' as const, scheme: 'signIn', keys: [], words: []},
      })),
      unauthorized: vi.fn(),
      markAgain: vi.fn(),
      requested: vi.fn(),
    };
    const fetchImpl = vi.fn<typeof fetch>();
    const pool = new AgentsPool(registry, {
      hardCapMs: 30_000,
      debugIds: false,
      updates,
      credentials,
      fetchImpl,
    });
    const message = userMessage([textPart('hello')], {contextId: 'o-ctx', taskId: 'o-task'});
    const turn: DispatchTurn = {clientContextId: 'o-ctx', clientTaskId: 'o-task', message};
    const handle = pool.dispatch('fake', turn);
    const events = [];
    for await (const event of handle.events) events.push(event);
    const record = await handle.done;
    expect(events).toEqual([]);
    expect(record).toMatchObject({outcome: 'failed', cause: 'unconfirmed', error: REFUSED});
    expect(updates.catalogsChanged).not.toHaveBeenCalled();
    expect(credentials.prepare).not.toHaveBeenCalled();
    expect(fetchImpl).not.toHaveBeenCalled();
  });
});
