/**
 * Each signed-in account's extended card (task-20.8 decisions 2, 6, 8 to 12, 16): fetched over the
 * dial against the server of `@a2a-js/sdk` 1.3.0 on the six paths, read from the answer as served,
 * a signed one checked on the app's card URL's origin; what each ending leaves held; when it is
 * fetched behind the registry's fetches of the public card, within what remains of their limit;
 * the journal's line, which never carries the card.
 */
import {rm} from 'node:fs/promises';
import {afterEach, describe, expect, test} from 'vitest';
import {AgentCard} from '@a2a-js/sdk';
import {readCard, type ServedCard} from '@a2uiverse/card';
import {keySetOf, signServed, testSigner} from '@a2uiverse/card/testing';
import {FakeEmbedder} from '@a2uiverse/embedder';
import {Dialer} from '@a2uiverse/smoke-transport';
import type {AdmitRequest} from '@a2uiverse/smoke-transport/testing';
import {
  cardForV1,
  completingScriptV1,
  startFakeAgentV1,
  textPartV1,
  type FakeAgentV1,
  type FakeAgentV1Options,
  type FakeBindingUrls,
  type FakePath,
} from '@a2uiverse/smoke-transport/testing/v1';
import {AccountCards, type AccountCardJournalEntry} from '../src/registry/accountCards.js';
import {testRegistry} from './registryFixture.js';

const KEY = 'X-Shop-Key';
const SIX: FakePath[] = (['JSONRPC', 'HTTP+JSON', 'GRPC'] as const).flatMap(binding =>
  (['1.0', '0.3'] as const).map(version => ({binding, version})),
);
const JSONRPC_1: FakePath = {binding: 'JSONRPC', version: '1.0'};

const agents: FakeAgentV1[] = [];
const dirs: string[] = [];
afterEach(async () => {
  await Promise.all(agents.splice(0).map(agent => agent.close()));
  await Promise.all(dirs.splice(0).map(dir => rm(dir, {recursive: true, force: true})));
});

/** The card Alice's account is served: one skill more, and the paths it lists. */
const alicesCard = (urls: FakeBindingUrls, paths: FakePath[]): AgentCard =>
  cardForV1(urls, {
    paths,
    extendedCard: true,
    name: 'Shop for Alice',
    skills: [
      {id: 'fake', name: 'fake', description: 'fake', tags: []},
      {id: 'orders', name: 'Orders', description: 'Lists your orders', tags: []},
    ],
  });

async function agent(
  paths: FakePath[],
  options: Partial<FakeAgentV1Options> & {flag?: boolean} = {},
): Promise<FakeAgentV1> {
  const {flag = true, ...rest} = options;
  const started: FakeAgentV1 = await startFakeAgentV1({
    script: completingScriptV1([textPartV1('hi')]),
    card: urls => cardForV1(urls, {paths, extendedCard: flag}),
    extendedCard: (request: AdmitRequest) =>
      request.header(KEY) === 'alice' ? alicesCard(started.urls, paths) : undefined,
    ...rest,
  });
  agents.push(started);
  return started;
}

interface Made {
  cards: AccountCards;
  journal: AccountCardJournalEntry[];
  keys: Map<number, string | undefined>;
  live: {card: AgentCard; cardUrl: string};
}

/** The account cards of `shop`, its accounts' keys by number, over a real dial. */
function accountCardsFor(
  started: FakeAgentV1,
  keys: Record<number, string | undefined> = {1: 'alice', 2: 'bob'},
): Made {
  const journal: AccountCardJournalEntry[] = [];
  const held = new Map(Object.entries(keys).map(([n, key]) => [Number(n), key]));
  const live = {card: readCard(started.served), cardUrl: started.cardUrl};
  const dialer = new Dialer({connectTimeoutMs: 2000});
  const cards = new AccountCards({
    accountsOf: () => [...held.keys()].map(n => ({n})),
    credentialFor: async source => {
      const key = held.get(Number(source.split('.')[1]));
      return key === undefined ? undefined : {[KEY]: key};
    },
    liveCard: () => live,
    fetchExtendedCard: (_appId, options) => dialer.fetchExtendedCard(options),
    embedder: new FakeEmbedder(),
    journal: async entry => void journal.push(entry),
  });
  return {cards, journal, keys: held, live};
}

const fetchAll = (made: Made, timeoutMs = 5000) =>
  made.cards.afterLiveCard('shop', made.live, {fetch: 'boot', timeoutMs});

describe('an account card on the six paths', () => {
  test.each(SIX)('$binding at A2A $version: Alice’s own, Bob the public card', async path => {
    const made = accountCardsFor(await agent([path]));
    await fetchAll(made);
    expect(made.cards.card('shop.1')?.name).toBe('Shop for Alice');
    expect(made.cards.card('shop.2')?.name).toBe('Fake Agent');
    const alice = made.journal.find(({source}) => source === 'shop.1')!;
    expect(alice).toMatchObject({
      appId: 'shop',
      fetch: 'boot',
      outcome: 'taken',
      binding: path.binding,
      a2aVersion: path.version,
    });
    // Bob's key is no account the agent knows: it serves him the public card.
    expect(made.journal.find(({source}) => source === 'shop.2')?.outcome).toBe('taken');
    expect(made.cards.adds('shop.1', made.live.card)).toEqual({
      name: 'Shop for Alice',
      skills: [expect.objectContaining({id: 'orders'})],
    });
    expect(made.cards.adds('shop.2', made.live.card)).toBeUndefined();
  });
});

describe('what each ending leaves held (decision 9)', () => {
  async function heldThen(change: (started: FakeAgentV1) => void, timeoutMs = 5000) {
    const started = await agent([JSONRPC_1]);
    const made = accountCardsFor(started);
    await fetchAll(made);
    expect(made.cards.card('shop.1')?.name).toBe('Shop for Alice');
    change(started);
    made.journal.length = 0;
    await fetchAll(made, timeoutMs);
    return made;
  }

  test('the agent says it has none: the card held is dropped', async () => {
    const made = await heldThen(started => started.serveExtendedCard(undefined));
    expect(made.cards.card('shop.1')).toBeUndefined();
    expect(made.journal[0]).toMatchObject({source: 'shop.1', outcome: 'none'});
  });

  test('nothing answers within the time limit: the card held stays', async () => {
    const made = await heldThen(started => started.serveExtendedCard('hang'), 300);
    expect(made.cards.card('shop.1')?.name).toBe('Shop for Alice');
    expect(made.journal[0]).toMatchObject({source: 'shop.1', outcome: 'unanswered'});
  });

  test('an answer that is no card that reads: the card held stays', async () => {
    const made = await heldThen(started => started.serveExtendedCard({raw: {hello: 'world'}}));
    expect(made.cards.card('shop.1')?.name).toBe('Shop for Alice');
    expect(made.journal[0]).toMatchObject({
      source: 'shop.1',
      outcome: 'unread',
      reason: 'not an agent card: no name',
    });
  });

  test('the credential refused: the card held stays, and the account is not marked to sign in', async () => {
    const started = await agent([JSONRPC_1], {admit: request => request.header(KEY) !== 'gone'});
    const made = accountCardsFor(started);
    await fetchAll(made);
    made.keys.set(1, 'gone');
    made.journal.length = 0;
    await fetchAll(made);
    expect(made.cards.card('shop.1')?.name).toBe('Shop for Alice');
    expect(made.journal.find(({source}) => source === 'shop.1')?.outcome).toBe('refused');
  });

  test('an account the vault has nothing to send for has no fetch', async () => {
    const made = accountCardsFor(await agent([JSONRPC_1]), {1: undefined});
    await fetchAll(made);
    expect(made.journal).toEqual([]);
  });

  test('a public card without the flag: no fetch, and every card held goes', async () => {
    const started = await agent([JSONRPC_1]);
    const made = accountCardsFor(started);
    await fetchAll(made);
    const flagless = {...made.live.card, capabilities: {...made.live.card.capabilities!}};
    flagless.capabilities.extendedAgentCard = false;
    made.journal.length = 0;
    await made.cards.afterLiveCard(
      'shop',
      {...made.live, card: flagless},
      {
        fetch: 'check',
        timeoutMs: 5000,
      },
    );
    expect(made.cards.card('shop.1')).toBeUndefined();
    expect(made.journal).toEqual([]);
  });

  test('no time left behind the public fetch: unanswered, nothing sent', async () => {
    const started = await agent([JSONRPC_1]);
    const made = accountCardsFor(started);
    await fetchAll(made, 0);
    expect(made.journal.map(({outcome}) => outcome)).toEqual(['unanswered', 'unanswered']);
    expect(started.requests).toEqual([]);
  });
});

describe('a signed account card (decision 11)', () => {
  async function signed(jkuOf: (started: FakeAgentV1) => string) {
    const signer = await testSigner({kid: 'shop-1'});
    const started: FakeAgentV1 = await startFakeAgentV1({
      script: completingScriptV1([textPartV1('hi')]),
      card: urls => cardForV1(urls, {paths: [JSONRPC_1], extendedCard: true}),
      keySet: keySetOf(signer),
      extendedCard: () => signedCard,
    });
    agents.push(started);
    const json = AgentCard.toJSON(alicesCard(started.urls, [JSONRPC_1])) as object;
    const signedCard = AgentCard.fromJSON(await signServed(json, signer, {jku: jkuOf(started)}));
    return started;
  }

  test('one that passes against the key set on the card URL origin is taken, its signature journaled', async () => {
    const made = accountCardsFor(await signed(started => started.keySetUrl), {1: 'alice'});
    await fetchAll(made);
    expect(made.cards.card('shop.1')?.name).toBe('Shop for Alice');
    expect(made.journal[0]).toMatchObject({
      outcome: 'taken',
      signature: {kid: 'shop-1', alg: 'ES256'},
    });
  });

  test('one that names a key set elsewhere is not taken', async () => {
    const made = accountCardsFor(await signed(() => 'http://127.0.0.1:1/.well-known/jwks.json'), {
      1: 'alice',
    });
    await fetchAll(made);
    expect(made.cards.card('shop.1')).toBeUndefined();
    expect(made.journal[0]?.outcome).toBe('unconfirmed');
    expect(made.journal[0]?.reason).toMatch(/did not pass/);
  });
});

describe('the journal never carries the card (decision 12)', () => {
  test("no line holds the account card's words", async () => {
    const made = accountCardsFor(await agent([JSONRPC_1]));
    await fetchAll(made);
    const written = JSON.stringify(made.journal);
    expect(written).not.toContain('Shop for Alice');
    expect(written).not.toContain('Lists your orders');
  });
});

describe('a sign-in and a sign-out (decision 6)', () => {
  test("a sign-in fetches the account's card in 5 s; a sign-out drops it", async () => {
    const made = accountCardsFor(await agent([JSONRPC_1]));
    await made.cards.signedIn('shop.1');
    expect(made.cards.card('shop.1')?.name).toBe('Shop for Alice');
    expect(made.journal).toEqual([expect.objectContaining({source: 'shop.1', fetch: 'signIn'})]);
    made.cards.drop('shop.1');
    expect(made.cards.card('shop.1')).toBeUndefined();
  });

  test('a card for an account signed out while it was fetched is not kept', async () => {
    const made = accountCardsFor(await agent([JSONRPC_1]));
    const fetching = made.cards.signedIn('shop.1');
    made.keys.delete(1);
    await fetching;
    expect(made.cards.card('shop.1')).toBeUndefined();
  });
});

describe('behind the registry fetches of the public card (decisions 6, 8)', () => {
  async function installed(started: FakeAgentV1, cardTimeoutMs = 10_000) {
    const made = await testRegistry([], {cardTimeoutMs});
    dirs.push(made.stateDir);
    const result = await made.registry.install({
      appId: 'shop',
      cardUrl: made.cards.serveAt(started.cardUrl, started.served as ServedCard),
      catalogs: [],
    });
    if (!result.ok) throw new Error(result.findings.join('; '));
    return made;
  }

  test('boot, the update check and a refetch each fetch the accounts cards within what remains', async () => {
    const started = await agent([JSONRPC_1]);
    const made = await installed(started);
    const seen: {fetch: string; timeoutMs: number}[] = [];
    made.registry.behindLiveCard(async (_appId, _live, at) => void seen.push(at));
    await made.registry.refreshCards();
    await made.registry.refetchLiveCards();
    await made.registry.refetchLiveCard('shop', 5000);
    expect(seen.map(({fetch}) => fetch)).toEqual(['boot', 'check', 'refetch']);
    expect(seen[0]!.timeoutMs).toBeGreaterThan(9000);
    expect(seen[0]!.timeoutMs).toBeLessThanOrEqual(10_000);
    expect(seen[2]!.timeoutMs).toBeLessThanOrEqual(5000);
  });

  test('a public card not answered runs nothing behind it', async () => {
    const started = await agent([JSONRPC_1]);
    const made = await installed(started);
    made.cards.hanging.add(started.cardUrl);
    const seen: string[] = [];
    made.registry.behindLiveCard(async (_appId, _live, at) => void seen.push(at.fetch));
    await made.registry.refetchLiveCard('shop', 200);
    expect(seen).toEqual([]);
  });

  test('a refetch waits on the accounts cards', async () => {
    const started = await agent([JSONRPC_1]);
    const made = await installed(started);
    let ended = false;
    made.registry.behindLiveCard(async () => {
      await new Promise(resolve => setTimeout(resolve, 50));
      ended = true;
    });
    await made.registry.refetchLiveCard('shop', 5000);
    expect(ended).toBe(true);
  });

  test('an install over the app fetches them; a first install has none to fetch', async () => {
    const started = await agent([JSONRPC_1]);
    const made = await installed(started);
    const seen: string[] = [];
    made.registry.behindLiveCard(async (_appId, _live, at) => void seen.push(at.fetch));
    const over = await made.registry.install({
      appId: 'shop',
      cardUrl: started.cardUrl,
      catalogs: [],
    });
    expect(over.ok).toBe(true);
    expect(seen).toEqual(['install']);
  });
});
