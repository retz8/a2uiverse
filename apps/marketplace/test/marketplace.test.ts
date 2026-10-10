/**
 * The marketplace's core (task 13.3): the claim, publish in order, the smoke test judged, unpublish,
 * search, the refresh and the report, the boot from a populated directory.
 */
import {mkdtemp, readFile, rm, stat} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {afterEach, describe, expect, test} from 'vitest';
import type {AgentCard} from '@a2a-js/sdk';
import {
  A2UI_CLIENT_CAPABILITIES_KEY,
  BASIC_CATALOG_ID,
  clientCapabilities,
  SMOKE_GREETING,
  type PublishBody,
} from '@a2uiverse/sdk';
import {FakeEmbedder} from '@a2uiverse/embedder';
import {Marketplace, type PublishAnswer} from '../src/marketplace.js';
import {a2aSmokeRunner} from '../src/smoke.js';
import {
  APPS_DIR,
  ARTIFACTS_DIR,
  ENTRY_FILE,
  INDEX_FILE,
  PREVIEW_FILE,
  PUBLIC_DIR,
} from '../src/store.js';
import {
  authRequiredScript,
  credentialScript,
  failedScript,
  FAKE_CATALOG_ID,
  noFinalScript,
  paintingScript,
  startFakeAgent,
  type FakeAgent,
  type FakeAgentOptions,
} from './fakeAgent.js';
import {
  cardUrlOf,
  fixtureArtifact,
  idOf,
  previewFor,
  schemaFor,
  type ArtifactFiles,
} from './fixture.js';

const CAT = FAKE_CATALOG_ID;
const CAT2 = 'https://example.com/fake/second/catalog.json';

/** Cards served by URL, so a test can move an agent's live card without restarting it. */
class CardServer {
  readonly cards = new Map<string, AgentCard>();
  readonly fetched: string[] = [];
  serve(card: AgentCard): string {
    const url = cardUrlOf(card.url);
    this.cards.set(url, card);
    return url;
  }
  resolve = async (url: string): Promise<AgentCard> => {
    this.fetched.push(url);
    const card = this.cards.get(url);
    if (!card) throw new Error(`fetch failed: ${url}`);
    return card;
  };
}

const agents: FakeAgent[] = [];
const dirs: string[] = [];
afterEach(async () => {
  await Promise.all(agents.splice(0).map(a => a.close()));
  await Promise.all(dirs.splice(0).map(d => rm(d, {recursive: true, force: true})));
});

async function agentOf(options: FakeAgentOptions = {}): Promise<FakeAgent> {
  const agent = await startFakeAgent(options);
  agents.push(agent);
  return agent;
}

async function made(stateDir?: string) {
  stateDir ??= await mkdtemp(join(tmpdir(), 'a2uiverse-marketplace-'));
  if (!dirs.includes(stateDir)) dirs.push(stateDir);
  const cards = new CardServer();
  const embedder = new FakeEmbedder();
  const marketplace = new Marketplace({
    stateDir,
    embedder,
    fetchCard: cards.resolve,
    smoke: a2aSmokeRunner(),
    smokeTimeoutMs: 5000,
  });
  await marketplace.load();
  return {marketplace, stateDir, cards, embedder};
}

async function claimed(marketplace: Marketplace, name = 'acme'): Promise<string> {
  const result = await marketplace.claim(name);
  if (!result.ok) throw new Error(result.findings.join('; '));
  return result.token;
}

function body(
  appId: string,
  cardUrl: string,
  catalogs: ArtifactFiles[] = [],
  preview?: PublishBody['preview'],
): PublishBody {
  return {appId, cardUrl, catalogs, ...(preview ? {preview} : {})};
}

const ok = (answer: PublishAnswer) => {
  if (!answer.ok) throw new Error(answer.findings.join('; '));
  return answer;
};
const refused = (answer: PublishAnswer) => {
  if (answer.ok) throw new Error(`took: ${answer.summary}`);
  return answer;
};

const readJson = async (path: string) => JSON.parse(await readFile(path, 'utf8'));

describe('the claim', () => {
  test('a free name is minted its token once; the same name again is taken', async () => {
    const {marketplace, stateDir} = await made();
    const first = await marketplace.claim('acme');
    expect(first.ok).toBe(true);
    if (!first.ok) return;
    expect(first.publisher).toBe('acme');
    expect(first.token).toMatch(/^[A-Za-z0-9_-]{43}$/);
    const file = await readJson(join(stateDir, 'publishers.json'));
    expect(file.publishers[0].name).toBe('acme');
    expect(file.publishers[0].tokenHash).toMatch(/^sha256-/);
    expect(JSON.stringify(file)).not.toContain(first.token);
    const again = await marketplace.claim('acme');
    expect(again).toEqual({
      ok: false,
      kind: 'taken',
      findings: ['publisher name "acme" is taken'],
    });
  });

  test('a name the grammar refuses, and the reserved one', async () => {
    const {marketplace} = await made();
    const bad = await marketplace.claim('Acme!');
    expect(bad.ok).toBe(false);
    if (bad.ok) return;
    expect(bad.kind).toBe('invalid');
    const shell = await marketplace.claim('shell');
    expect(shell.ok).toBe(false);
  });

  test('the token resolves to its publisher; a wrong one to nobody', async () => {
    const {marketplace} = await made();
    const token = await claimed(marketplace);
    expect((await marketplace.publisherOf(token))?.name).toBe('acme');
    expect(await marketplace.publisherOf('x'.repeat(43))).toBeUndefined();
    expect(await marketplace.publisherOf('')).toBeUndefined();
  });
});

describe('publish, the first time', () => {
  test('a painting agent with its artifact: the entry, the preview, the index, the ledger, the request as sent', async () => {
    const {marketplace, stateDir, cards} = await made();
    await claimed(marketplace);
    const agent = await agentOf({
      skills: [
        {
          id: 'orders',
          name: 'Orders',
          description: 'your orders',
          tags: [],
          examples: ['Show my orders'],
        },
      ],
    });
    const files = await fixtureArtifact(CAT);
    const artifactId = await idOf(files);
    const answer = ok(
      await marketplace.publish('acme', body('shop', cards.serve(agent.card), [files])),
    );
    expect(answer.appId).toBe('shop');
    expect(answer.version).toBe('0.1.0');
    expect(answer.summary).toBe(
      `published shop · card 0.1.0 · catalog ${artifactId.slice(0, 15)}…`,
    );
    expect(answer.notes).toEqual([
      'app id "shop" is now acme\'s',
      `catalog ${JSON.stringify(CAT)} is now acme's`,
    ]);

    const entry = await readJson(join(stateDir, PUBLIC_DIR, APPS_DIR, 'shop', ENTRY_FILE));
    expect(entry).toEqual({
      appId: 'shop',
      publisher: 'acme',
      cardUrl: cardUrlOf(agent.url),
      card: agent.card,
      catalogs: {[CAT]: artifactId},
      versions: ['0.1.0'],
      publishedAt: expect.any(String),
      retired: [],
    });
    const preview = await readJson(join(stateDir, PUBLIC_DIR, APPS_DIR, 'shop', PREVIEW_FILE));
    expect(preview).toEqual({
      appId: 'shop',
      version: '0.1.0',
      words: 'Show my orders',
      messages: [
        {version: 'v0.9', createSurface: {surfaceId: 's1', catalogId: CAT}},
        expect.objectContaining({updateComponents: expect.anything()}),
      ],
      capturedBy: 'marketplace',
      capturedAt: expect.any(String),
    });
    expect(await readJson(join(stateDir, PUBLIC_DIR, INDEX_FILE))).toEqual([entry]);
    expect(
      (await stat(join(stateDir, PUBLIC_DIR, ARTIFACTS_DIR, artifactId, 'index.js'))).isFile(),
    ).toBe(true);
    const ledger = await readJson(join(stateDir, 'publishers.json'));
    expect(ledger.publishers[0].apps).toEqual(['shop']);
    expect(ledger.publishers[0].catalogs).toEqual([CAT]);

    const [request] = agent.requests;
    expect(request.message.parts).toEqual([{kind: 'text', text: 'Show my orders'}]);
    expect(request.message.metadata?.[A2UI_CLIENT_CAPABILITIES_KEY]).toEqual(
      clientCapabilities([BASIC_CATALOG_ID, CAT]),
    );
    expect(request.authorization).toBeUndefined();
    expect(marketplace.entries().map(e => e.appId)).toEqual(['shop']);
  });

  test('an agent on the basic catalog alone: nothing handed, the greeting asked', async () => {
    const {marketplace, cards} = await made();
    await claimed(marketplace);
    const agent = await agentOf({catalogs: [], script: paintingScript(BASIC_CATALOG_ID)});
    const answer = ok(await marketplace.publish('acme', body('plain', cards.serve(agent.card))));
    expect(answer.summary).toBe('published plain · card 0.1.0 · basic catalog');
    expect(marketplace.preview('plain')?.words).toBe(SMOKE_GREETING);
    expect(marketplace.entry('plain')?.catalogs).toEqual({});
  });
});

describe('publish, refused before the gate', () => {
  test('an app id the grammar refuses', async () => {
    const {marketplace, cards} = await made();
    await claimed(marketplace);
    const agent = await agentOf();
    const answer = refused(
      await marketplace.publish(
        'acme',
        body('Shop!', cards.serve(agent.card), [await fixtureArtifact(CAT)]),
      ),
    );
    expect(answer.kind).toBe('refused');
    expect(answer.findings.some(f => f.includes('app id'))).toBe(true);
  });

  test("another publisher's app id is forbidden, alone, before the card is fetched", async () => {
    const {marketplace, cards} = await made();
    await claimed(marketplace, 'acme');
    await claimed(marketplace, 'rival');
    const agent = await agentOf();
    const url = cards.serve(agent.card);
    ok(await marketplace.publish('acme', body('shop', url, [await fixtureArtifact(CAT)])));
    const fetched = cards.fetched.length;
    const answer = refused(
      await marketplace.publish('rival', body('shop', url, [await fixtureArtifact(CAT)])),
    );
    expect(answer).toEqual({
      ok: false,
      kind: 'forbidden',
      findings: ['app id "shop" belongs to publisher "acme"'],
    });
    expect(cards.fetched.length).toBe(fetched);
  });

  test("another publisher's catalog id on the card is forbidden, whether or not an artifact is handed", async () => {
    const {marketplace, cards} = await made();
    await claimed(marketplace, 'acme');
    await claimed(marketplace, 'rival');
    const theirs = await agentOf();
    ok(
      await marketplace.publish(
        'acme',
        body('shop', cards.serve(theirs.card), [await fixtureArtifact(CAT)]),
      ),
    );
    const mine = await agentOf();
    const without = refused(
      await marketplace.publish('rival', body('other', cards.serve(mine.card))),
    );
    expect(without).toEqual({
      ok: false,
      kind: 'forbidden',
      findings: [`catalog ${JSON.stringify(CAT)} belongs to publisher "acme"`],
    });
    const withOne = refused(
      await marketplace.publish(
        'rival',
        body('other', cards.serve(mine.card), [await fixtureArtifact(CAT)]),
      ),
    );
    expect(withOne.kind).toBe('forbidden');
  });
});

describe('publish, the findings collected', () => {
  test('a card that cannot be fetched', async () => {
    const {marketplace} = await made();
    await claimed(marketplace);
    const answer = refused(
      await marketplace.publish(
        'acme',
        body('shop', 'http://127.0.0.1:1/card.json', [await fixtureArtifact(CAT)]),
      ),
    );
    expect(answer.findings).toEqual([
      'the card at http://127.0.0.1:1/card.json could not be fetched: fetch failed: http://127.0.0.1:1/card.json',
    ]);
  });

  test('coverage both ways: a declared id with no artifact and no held row; an artifact for an undeclared id', async () => {
    const {marketplace, cards} = await made();
    await claimed(marketplace);
    const agent = await agentOf({catalogs: [CAT, CAT2]});
    const answer = refused(
      await marketplace.publish(
        'acme',
        body('shop', cards.serve(agent.card), [
          await fixtureArtifact(CAT),
          await fixtureArtifact('https://example.com/orphan/catalog.json'),
        ]),
      ),
    );
    expect(answer.findings).toEqual([
      expect.stringContaining(CAT2),
      expect.stringContaining('https://example.com/orphan/catalog.json'),
    ]);
  });

  test('the gate, the basic catalog handed, and a card without a version, each named', async () => {
    const {marketplace, cards} = await made();
    await claimed(marketplace);
    const agent = await agentOf({catalogs: [CAT, BASIC_CATALOG_ID], card: {version: ''}});
    const answer = refused(
      await marketplace.publish(
        'acme',
        body('shop', cards.serve(agent.card), [
          await fixtureArtifact(CAT, {hostInterface: '1.0.0'}),
          await fixtureArtifact(BASIC_CATALOG_ID),
        ]),
      ),
    );
    expect(answer.findings).toEqual(
      expect.arrayContaining([
        expect.stringContaining('host interface "1.0.0"'),
        expect.stringContaining('provided by the client'),
        expect.stringContaining('version'),
      ]),
    );
  });

  test('a new build whose schema is not an additive evolution of the held one', async () => {
    const {marketplace, cards} = await made();
    await claimed(marketplace);
    const agent = await agentOf();
    const url = cards.serve(agent.card);
    ok(await marketplace.publish('acme', body('shop', url, [await fixtureArtifact(CAT)])));
    const breaking = await fixtureArtifact(CAT, {
      schema: schemaFor(CAT, {
        Text: {type: 'object', properties: {text: {type: 'number'}}, required: ['text']},
      }),
    });
    const answer = refused(await marketplace.publish('acme', body('shop', url, [breaking])));
    expect(answer.findings).toEqual([
      expect.stringMatching(/^catalog artifact 1 \(.*\): .*Text.*/),
    ]);
  });

  test('the card-version rule: changed at a published version; a version moved past', async () => {
    const {marketplace, cards} = await made();
    await claimed(marketplace);
    const agent = await agentOf();
    const url = cards.serve(agent.card);
    ok(await marketplace.publish('acme', body('shop', url, [await fixtureArtifact(CAT)])));
    cards.cards.set(url, {...agent.card, description: 'changed'});
    const same = refused(await marketplace.publish('acme', body('shop', url)));
    expect(same.findings).toEqual([
      'the card changed, but version "0.1.0" is already published: a changed card carries a version this app id has never published',
    ]);
    cards.cards.set(url, {...agent.card, version: '0.2.0'});
    ok(await marketplace.publish('acme', body('shop', url)));
    cards.cards.set(url, agent.card);
    const back = refused(await marketplace.publish('acme', body('shop', url)));
    expect(back.findings).toEqual([
      'version "0.1.0" was published before and moved past: the published versions are 0.1.0, 0.2.0',
    ]);
  });

  test('the preview rule: a sign-in card hands one, a card without sign-in does not', async () => {
    const {marketplace, cards} = await made();
    await claimed(marketplace);
    const signIn = await agentOf({signIn: true, admit: () => false});
    const without = refused(
      await marketplace.publish(
        'acme',
        body('locked', cards.serve(signIn.card), [await fixtureArtifact(CAT)]),
      ),
    );
    expect(without.findings).toEqual([
      'the card requires sign-in: publish needs the preview `stellify preview` captures with your own credential',
    ]);
    const open = await agentOf();
    const withOne = refused(
      await marketplace.publish(
        'acme',
        body(
          'open',
          cards.serve(open.card),
          [await fixtureArtifact(CAT)],
          previewFor('open', '0.1.0', CAT, 'publisher'),
        ),
      ),
    );
    expect(withOne.findings).toEqual([
      "a preview is only taken for an app whose card requires sign-in: the marketplace captured this app's paint itself",
    ]);
  });

  test('a captured preview for another app, another version, or not captured by the publisher', async () => {
    const {marketplace, cards} = await made();
    await claimed(marketplace);
    const agent = await agentOf({signIn: true, admit: () => false});
    const url = cards.serve(agent.card);
    const wrongApp = refused(
      await marketplace.publish(
        'acme',
        body(
          'locked',
          url,
          [await fixtureArtifact(CAT)],
          previewFor('other', '0.1.0', CAT, 'publisher'),
        ),
      ),
    );
    expect(wrongApp.findings).toEqual(['the preview is for app "other", not "locked"']);
    const wrongVersion = refused(
      await marketplace.publish(
        'acme',
        body(
          'locked',
          url,
          [await fixtureArtifact(CAT)],
          previewFor('locked', '0.0.1', CAT, 'publisher'),
        ),
      ),
    );
    expect(wrongVersion.findings).toEqual([
      'the preview was captured at version "0.0.1", the card is at "0.1.0"',
    ]);
    const byMarketplace = refused(
      await marketplace.publish(
        'acme',
        body(
          'locked',
          url,
          [await fixtureArtifact(CAT)],
          previewFor('locked', '0.1.0', CAT, 'marketplace'),
        ),
      ),
    );
    expect(byMarketplace.findings).toEqual(['a handed preview is captured by the publisher']);
  });
});

describe('publish, the smoke test', () => {
  test('an agent that ends its task as failed, in its own words', async () => {
    const {marketplace, cards} = await made();
    await claimed(marketplace);
    const agent = await agentOf({script: failedScript});
    const answer = refused(
      await marketplace.publish(
        'acme',
        body('shop', cards.serve(agent.card), [await fixtureArtifact(CAT)]),
      ),
    );
    expect(answer.findings).toEqual(['the agent ended the task as failed: boom']);
  });

  test('an agent that never finishes', async () => {
    const {marketplace, cards} = await made();
    await claimed(marketplace);
    const agent = await agentOf({script: noFinalScript});
    const answer = refused(
      await marketplace.publish(
        'acme',
        body('shop', cards.serve(agent.card), [await fixtureArtifact(CAT)]),
      ),
    );
    expect(answer.findings).toEqual([
      'the agent never finished: the stream ended without a final event',
    ]);
  });

  test('a paint outside the entitlement, and a credential input', async () => {
    const {marketplace, cards} = await made();
    await claimed(marketplace);
    const outside = await agentOf({script: paintingScript(CAT2)});
    const out = refused(
      await marketplace.publish(
        'acme',
        body('shop', cards.serve(outside.card), [await fixtureArtifact(CAT)]),
      ),
    );
    expect(out.findings).toEqual([
      `surface "s1" is painted in catalog ${JSON.stringify(CAT2)}, outside the entitlement`,
    ]);
    const credential = await agentOf({script: credentialScript()});
    const cred = refused(
      await marketplace.publish(
        'acme',
        body('shop', cards.serve(credential.card), [await fixtureArtifact(CAT)]),
      ),
    );
    expect(cred.findings).toEqual([expect.stringMatching(/^surface "s1": a credential input: /)]);
  });

  test('an agent that cannot be reached, named with the words that were sent', async () => {
    const {marketplace, cards} = await made();
    await claimed(marketplace);
    const agent = await agentOf();
    const url = cards.serve(agent.card);
    await agent.close();
    agents.splice(agents.indexOf(agent), 1);
    const answer = refused(
      await marketplace.publish('acme', body('shop', url, [await fixtureArtifact(CAT)])),
    );
    expect(answer.findings).toEqual([expect.stringMatching(/^the smoke request failed: /)]);
  });

  test('a sign-in agent passes by 401, by auth-required naming its scheme, and not by painting', async () => {
    const {marketplace, cards} = await made();
    await claimed(marketplace);
    const preview = previewFor('locked', '0.1.0', CAT, 'publisher');
    const by401 = await agentOf({signIn: true, admit: () => false});
    const first = ok(
      await marketplace.publish(
        'acme',
        body('locked', cards.serve(by401.card), [await fixtureArtifact(CAT)], preview),
      ),
    );
    expect(first.summary).toContain('published locked');
    expect(marketplace.preview('locked')).toEqual({...preview, capturedAt: preview.capturedAt});
    const byState = await agentOf({signIn: true, script: authRequiredScript('signIn', ['read'])});
    ok(
      await marketplace.publish(
        'acme',
        body('locked2', cards.serve(byState.card), [], preview && {...preview, appId: 'locked2'}),
      ),
    );
    const unknownScheme = await agentOf({signIn: true, script: authRequiredScript('other')});
    const bad = refused(
      await marketplace.publish(
        'acme',
        body('locked3', cards.serve(unknownScheme.card), [], {...preview, appId: 'locked3'}),
      ),
    );
    expect(bad.findings).toEqual([
      'the auth-required answer names scheme "other", which the card does not declare',
    ]);
    const paints = await agentOf({signIn: true});
    const painted = refused(
      await marketplace.publish(
        'acme',
        body('locked4', cards.serve(paints.card), [], {...preview, appId: 'locked4'}),
      ),
    );
    expect(painted.findings).toEqual([
      'the agent answered a task in state "completed" instead of asking to sign in: an HTTP 401 or an auth-required task',
    ]);
  });

  test('a captured preview is checked as a live paint is', async () => {
    const {marketplace, cards} = await made();
    await claimed(marketplace);
    const agent = await agentOf({signIn: true, admit: () => false});
    const outside = previewFor('locked', '0.1.0', CAT2, 'publisher');
    const answer = refused(
      await marketplace.publish(
        'acme',
        body('locked', cards.serve(agent.card), [await fixtureArtifact(CAT)], outside),
      ),
    );
    expect(answer.findings).toEqual([
      `surface "s1" is painted in catalog ${JSON.stringify(CAT2)}, outside the entitlement`,
    ]);
  });
});

describe('publish, again', () => {
  test('a card-only publish at a new version hands nothing: the held row counts as covered', async () => {
    const {marketplace, cards} = await made();
    await claimed(marketplace);
    const agent = await agentOf();
    const url = cards.serve(agent.card);
    const files = await fixtureArtifact(CAT);
    ok(await marketplace.publish('acme', body('shop', url, [files])));
    cards.cards.set(url, {...agent.card, version: '0.2.0', description: 'better'});
    const answer = ok(await marketplace.publish('acme', body('shop', url)));
    expect(answer.version).toBe('0.2.0');
    expect(answer.summary).toBe(
      `republished shop · card 0.1.0 → 0.2.0 · catalog ${(await idOf(files)).slice(0, 15)}…`,
    );
    expect(answer.notes).toEqual([
      `catalog ${JSON.stringify(CAT)}: the held build counts as covered`,
    ]);
    const entry = marketplace.entry('shop')!;
    expect(entry.versions).toEqual(['0.1.0', '0.2.0']);
    expect(entry.card.description).toBe('better');
    expect(entry.catalogs).toEqual({[CAT]: await idOf(files)});
    expect(marketplace.preview('shop')?.version).toBe('0.2.0');
  });

  test("a newer build at a held id, the card unchanged: the row moves and the publisher's other app follows", async () => {
    const {marketplace, stateDir, cards} = await made();
    await claimed(marketplace);
    const a = await agentOf();
    const b = await agentOf();
    const v1 = await fixtureArtifact(CAT, {version: '1.0.0'});
    const v2 = await fixtureArtifact(CAT, {version: '2.0.0'});
    ok(await marketplace.publish('acme', body('a', cards.serve(a.card), [v1])));
    ok(await marketplace.publish('acme', body('b', cards.serve(b.card))));
    expect(marketplace.entry('b')?.catalogs).toEqual({[CAT]: await idOf(v1)});
    const answer = ok(await marketplace.publish('acme', body('a', cards.serve(a.card), [v2])));
    expect(answer.summary).toBe(
      `republished a · card 0.1.0 · catalog ${(await idOf(v1)).slice(0, 15)}… → ${(await idOf(v2)).slice(0, 15)}…`,
    );
    expect(answer.notes).toEqual([
      `catalog ${JSON.stringify(CAT)} moved to a new build, followed by: b`,
    ]);
    expect(marketplace.entry('a')?.catalogs).toEqual({[CAT]: await idOf(v2)});
    expect(marketplace.entry('b')?.catalogs).toEqual({[CAT]: await idOf(v2)});
    expect(marketplace.entry('a')?.versions).toEqual(['0.1.0']);
    await expect(stat(join(stateDir, PUBLIC_DIR, ARTIFACTS_DIR, await idOf(v1)))).rejects.toThrow();
    expect(
      (await readJson(join(stateDir, PUBLIC_DIR, APPS_DIR, 'b', ENTRY_FILE))).catalogs,
    ).toEqual({[CAT]: await idOf(v2)});
  });

  test('a publish whose card drops an id retires the line; the row goes when nothing names it', async () => {
    const {marketplace, stateDir, cards} = await made();
    await claimed(marketplace);
    const agent = await agentOf({catalogs: [CAT, CAT2]});
    const url = cards.serve(agent.card);
    const second = await fixtureArtifact(CAT2);
    ok(await marketplace.publish('acme', body('shop', url, [await fixtureArtifact(CAT), second])));
    const narrower = {
      ...agent.card,
      version: '0.2.0',
      capabilities: {
        ...agent.card.capabilities,
        extensions: [
          {uri: 'https://a2ui.org/a2a-extension/a2ui/v0.9.1', params: {supportedCatalogIds: [CAT]}},
        ],
      },
    };
    cards.cards.set(url, narrower);
    const answer = ok(await marketplace.publish('acme', body('shop', url)));
    expect(answer.notes).toContain(`catalog ${JSON.stringify(CAT2)} retired for shop`);
    const entry = marketplace.entry('shop')!;
    expect(entry.retired).toEqual([CAT2]);
    expect(Object.keys(entry.catalogs)).toEqual([CAT]);
    await expect(
      stat(join(stateDir, PUBLIC_DIR, ARTIFACTS_DIR, await idOf(second))),
    ).rejects.toThrow();
    const ledger = await readJson(join(stateDir, 'publishers.json'));
    expect(ledger.publishers[0].catalogs).toEqual([CAT, CAT2]);
  });

  test('a publish that changes nothing passes the smoke test again and refreshes the preview', async () => {
    const {marketplace, cards} = await made();
    await claimed(marketplace);
    const agent = await agentOf();
    const url = cards.serve(agent.card);
    const files = await fixtureArtifact(CAT);
    ok(await marketplace.publish('acme', body('shop', url, [files])));
    const before = marketplace.preview('shop')!.capturedAt;
    await new Promise(r => setTimeout(r, 5));
    const answer = ok(await marketplace.publish('acme', body('shop', url, [files])));
    expect(answer.summary).toBe(
      `republished shop · card 0.1.0 · catalog ${(await idOf(files)).slice(0, 15)}…`,
    );
    expect(marketplace.preview('shop')!.capturedAt).not.toBe(before);
    expect(agent.requests).toHaveLength(2);
  });
});

describe('unpublish', () => {
  test("the owner removes the app; the row goes; the names stay the owner's", async () => {
    const {marketplace, stateDir, cards} = await made();
    await claimed(marketplace, 'acme');
    await claimed(marketplace, 'rival');
    const agent = await agentOf();
    const url = cards.serve(agent.card);
    const files = await fixtureArtifact(CAT);
    ok(await marketplace.publish('acme', body('shop', url, [files])));
    expect(await marketplace.unpublish('acme', 'shop')).toEqual({ok: true, appId: 'shop'});
    expect(marketplace.entry('shop')).toBeUndefined();
    expect(marketplace.preview('shop')).toBeUndefined();
    expect(await readJson(join(stateDir, PUBLIC_DIR, INDEX_FILE))).toEqual([]);
    await expect(stat(join(stateDir, PUBLIC_DIR, APPS_DIR, 'shop'))).rejects.toThrow();
    await expect(
      stat(join(stateDir, PUBLIC_DIR, ARTIFACTS_DIR, await idOf(files))),
    ).rejects.toThrow();
    expect((await marketplace.search('fake')).results).toEqual([]);
    const rival = refused(await marketplace.publish('rival', body('shop', url, [files])));
    expect(rival.kind).toBe('forbidden');
    ok(await marketplace.publish('acme', body('shop', url, [files])));
  });

  test("another publisher's app, and an app not published", async () => {
    const {marketplace, cards} = await made();
    await claimed(marketplace, 'acme');
    await claimed(marketplace, 'rival');
    const agent = await agentOf();
    ok(
      await marketplace.publish(
        'acme',
        body('shop', cards.serve(agent.card), [await fixtureArtifact(CAT)]),
      ),
    );
    expect(await marketplace.unpublish('rival', 'shop')).toEqual({
      ok: false,
      kind: 'forbidden',
      findings: ['app id "shop" belongs to publisher "acme"'],
    });
    expect(await marketplace.unpublish('acme', 'nope')).toEqual({
      ok: false,
      kind: 'not-published',
      findings: ['app "nope" is not published'],
    });
  });
});

describe('search', () => {
  test('words in, every entry out with its score, in rank order', async () => {
    const {marketplace, cards} = await made();
    await claimed(marketplace);
    const orders = await agentOf({
      name: 'Shop',
      skills: [
        {id: 'o', name: 'Orders', description: 'see your orders and deliveries', tags: ['orders']},
      ],
    });
    const weather = await agentOf({
      name: 'Sky',
      skills: [
        {
          id: 'w',
          name: 'Forecast',
          description: 'the weather forecast for your city',
          tags: ['weather'],
        },
      ],
    });
    ok(
      await marketplace.publish(
        'acme',
        body('shop', cards.serve(orders.card), [await fixtureArtifact(CAT)]),
      ),
    );
    ok(await marketplace.publish('acme', body('sky', cards.serve(weather.card))));
    const {results} = await marketplace.search('weather forecast');
    expect(results.map(r => r.entry.appId)).toEqual(['sky', 'shop']);
    expect(results[0].score).toBeGreaterThan(results[1].score);
    expect(results[0].entry.card.name).toBe('Sky');
  });
});

describe('ahead of the Store', () => {
  test('a report refetches the live card and flags the drift; a card back in line clears it; an unreachable one leaves it', async () => {
    const {marketplace, stateDir, cards} = await made();
    await claimed(marketplace);
    const agent = await agentOf();
    const url = cards.serve(agent.card);
    ok(await marketplace.publish('acme', body('shop', url, [await fixtureArtifact(CAT)])));
    await marketplace.report('shop');
    expect(marketplace.entry('shop')?.aheadOfStore).toBeUndefined();
    const ahead = {
      ...agent.card,
      version: '0.3.0',
      capabilities: {
        ...agent.card.capabilities,
        extensions: [
          {
            uri: 'https://a2ui.org/a2a-extension/a2ui/v0.9.1',
            params: {supportedCatalogIds: [CAT, CAT2]},
          },
        ],
      },
    };
    cards.cards.set(url, ahead);
    await marketplace.report('shop');
    expect(marketplace.entry('shop')?.aheadOfStore).toEqual({
      catalogIds: [CAT2],
      version: '0.3.0',
      seenAt: expect.any(String),
    });
    expect(
      (await readJson(join(stateDir, PUBLIC_DIR, APPS_DIR, 'shop', ENTRY_FILE))).aheadOfStore
        .catalogIds,
    ).toEqual([CAT2]);
    cards.cards.delete(url);
    await marketplace.report('shop');
    expect(marketplace.entry('shop')?.aheadOfStore?.catalogIds).toEqual([CAT2]);
    cards.cards.set(url, agent.card);
    await marketplace.report('shop');
    expect(marketplace.entry('shop')?.aheadOfStore).toBeUndefined();
    await marketplace.report('nope');
  });

  test('a burst of reports costs one fetch', async () => {
    const {marketplace, cards} = await made();
    await claimed(marketplace);
    const agent = await agentOf();
    const url = cards.serve(agent.card);
    ok(await marketplace.publish('acme', body('shop', url, [await fixtureArtifact(CAT)])));
    const before = cards.fetched.length;
    await Promise.all([
      marketplace.report('shop'),
      marketplace.report('shop'),
      marketplace.report('shop'),
    ]);
    expect(cards.fetched.length).toBe(before + 1);
  });

  test('the refresh at boot runs the same over every entry', async () => {
    const {marketplace, stateDir, cards} = await made();
    await claimed(marketplace);
    const agent = await agentOf();
    const url = cards.serve(agent.card);
    ok(await marketplace.publish('acme', body('shop', url, [await fixtureArtifact(CAT)])));
    cards.cards.set(url, {...agent.card, version: '9.0.0'});
    const again = new Marketplace({
      stateDir,
      embedder: new FakeEmbedder(),
      fetchCard: cards.resolve,
      smoke: a2aSmokeRunner(),
      smokeTimeoutMs: 5000,
    });
    await again.load();
    expect(again.entry('shop')?.aheadOfStore).toBeUndefined();
    await again.refreshCards();
    expect(again.entry('shop')?.aheadOfStore).toEqual({
      catalogIds: [],
      version: '9.0.0',
      seenAt: expect.any(String),
    });
  });
});

describe('the boot', () => {
  test('a second marketplace over the same directory holds everything, searches, and regenerates the index', async () => {
    const {marketplace, stateDir, cards} = await made();
    const token = await claimed(marketplace);
    const agent = await agentOf({
      name: 'Sky',
      skills: [{id: 'w', name: 'Forecast', description: 'weather', tags: []}],
    });
    ok(
      await marketplace.publish(
        'acme',
        body('sky', cards.serve(agent.card), [await fixtureArtifact(CAT)]),
      ),
    );
    await rm(join(stateDir, PUBLIC_DIR, INDEX_FILE));
    const {marketplace: again} = await made(stateDir);
    expect(again.entries().map(e => e.appId)).toEqual(['sky']);
    expect(again.preview('sky')?.appId).toBe('sky');
    expect((await again.publisherOf(token))?.name).toBe('acme');
    expect((await again.search('weather')).results.map(r => r.entry.appId)).toEqual(['sky']);
    expect(await readJson(join(stateDir, PUBLIC_DIR, INDEX_FILE))).toEqual([again.entry('sky')]);
  });
});
