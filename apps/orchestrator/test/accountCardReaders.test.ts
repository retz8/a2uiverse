/**
 * What the Router and the Planner read of an app whose accounts hold cards of their own (task-20.8
 * decision 3, 16): the Router ranks an app by its best-matching card, and the Planner's listing and
 * its installed-apps reader carry, under each account, what that account's card adds. No model.
 */
import type {AgentCard as LegacyCard} from '@a2a-js/sdk-v0_3';
import type {AgentCard} from '@a2a-js/sdk';
import {accountCardAdds} from '@a2uiverse/card';
import {FakeEmbedder, corpusDoc} from '@a2uiverse/embedder';
import {describe, expect, test} from 'vitest';
import {Sources, type AccountStore} from '../src/accounts/accounts.js';
import {platformReaders} from '../src/planner/platformReaders.js';
import {buildPlannerTurn} from '../src/planner/prompt.js';
import {Router} from '../src/router/router.js';
import {testRegistry} from './registryFixture.js';

function cardFor(id: string, name: string, description: string): LegacyCard {
  return {
    name,
    description,
    version: '0.0.0',
    protocolVersion: '0.3.0',
    url: `http://127.0.0.1/${id}`,
    preferredTransport: 'JSONRPC',
    capabilities: {},
    defaultInputModes: ['text'],
    defaultOutputModes: ['text'],
    skills: [{id: 'search', name: 'Search', description, tags: []}],
    securitySchemes: {key: {type: 'apiKey', in: 'header', name: 'X-Key'}},
    security: [{key: []}],
  };
}

/** Alice's card at the shop: the members' price list beside what the shop's card says. */
function alicesCard(shop: AgentCard): AgentCard {
  return {
    ...shop,
    name: 'Shop B · members',
    skills: [
      ...shop.skills,
      {
        id: 'ledger',
        name: 'Members ledger',
        description: 'quarterly invoices tax ledger reconciliation statements',
        tags: [],
        examples: ['my invoices this quarter'],
        inputModes: [],
        outputModes: [],
        securityRequirements: [],
      },
    ],
  };
}

const ACCOUNTS: AccountStore = {
  accountsOf: appId =>
    appId === 'shop'
      ? [
          {n: 1, label: 'alice@example.com'},
          {n: 2, label: 'bob@example.com'},
        ]
      : [],
  nextAccount: () => 3,
};

async function setup() {
  const embedder = new FakeEmbedder();
  const {registry} = await testRegistry(
    [
      {id: 'shop', card: cardFor('shop', 'Shop B', 'cameras lenses tripods prices')},
      {id: 'mail', card: cardFor('mail', 'Mail', 'email inbox messages invoices quarterly')},
    ],
    {embedder},
  );
  await registry.refreshCards();
  const shop = registry.card('shop')!;
  const alice = alicesCard(shop);
  const [aliceVector] = await embedder.embed([corpusDoc(alice)]);
  const held = new Map<string, AgentCard>([['shop.1', alice]]);
  const accountCards = {
    adds: (source: string, publicCard: AgentCard | undefined) => {
      const card = held.get(source);
      return card && publicCard ? accountCardAdds(publicCard, card) : undefined;
    },
  };
  const sources = new Sources(registry, ACCOUNTS, accountCards);
  return {registry, embedder, sources, aliceVector: aliceVector!};
}

describe('the Router ranks an app by its best-matching card', () => {
  test("an account's skill brings its app up the shortlist", async () => {
    const {registry, embedder, aliceVector} = await setup();
    const question = 'my quarterly invoices tax ledger reconciliation statements';
    const without = new Router(registry, embedder, {shortlistCap: 1});
    expect((await without.shortlist(question)).map(({record}) => record.id)).toEqual(['mail']);
    const router = new Router(registry, embedder, {
      shortlistCap: 1,
      accountVectors: appId => (appId === 'shop' ? [aliceVector] : []),
    });
    const ranked = await router.shortlist(question);
    expect(ranked.map(({record}) => record.id)).toEqual(['shop']);
    // The entry carries the public card, and the app is listed once.
    expect(ranked[0]!.card.name).toBe('Shop B');
    const all = await new Router(registry, embedder, {
      shortlistCap: 5,
      accountVectors: appId => (appId === 'shop' ? [aliceVector] : []),
    }).shortlist(question);
    expect(all.map(({record}) => record.id).filter(id => id === 'shop')).toHaveLength(1);
  });
});

describe("the Planner's listing carries what each account's card adds", () => {
  test('under the account, its name and the skill the app’s card lacks; nothing under the other', async () => {
    const {registry, sources} = await setup();
    const shortlist = [{record: registry.get('shop'), card: registry.card('shop')!, score: 1}];
    const turn = buildPlannerTurn({utterance: 'x', shortlist}, appId => sources.of(appId));
    expect(turn).toContain(
      [
        '  sources:',
        '    - shop.1 · alice@example.com',
        "      this account's own card adds:",
        '        name: Shop B · members',
        '        skills:',
        '          - Members ledger: quarterly invoices tax ledger reconciliation statements (e.g. my invoices this quarter)',
        '    - shop.2 · bob@example.com',
        '  name: Shop B',
      ].join('\n'),
    );
  });

  test('the installed-apps reader carries it the same way', async () => {
    const {registry, sources} = await setup();
    const readers = platformReaders({
      registry,
      sources,
      composition: () => undefined,
      ancestry: () => [],
    });
    const shop = readers.installedApps().find(({id}) => id === 'shop')!;
    expect(shop.name).toBe('Shop B');
    expect(shop.accounts).toEqual([
      {
        source: 'shop.1',
        label: 'alice@example.com',
        ownCardAdds: {
          name: 'Shop B · members',
          skills: [
            {
              name: 'Members ledger',
              description: 'quarterly invoices tax ledger reconciliation statements',
              examples: ['my invoices this quarter'],
            },
          ],
        },
      },
      {source: 'shop.2', label: 'bob@example.com'},
    ]);
  });
});
