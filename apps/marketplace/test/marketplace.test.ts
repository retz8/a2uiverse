/**
 * The marketplace's core (task 13.3): the claim, publish in order, the smoke test judged, unpublish,
 * search, the refresh and the report, the boot from a populated directory.
 */
import {readFileSync} from 'node:fs';
import {mkdtemp, readFile, rm, stat, writeFile} from 'node:fs/promises';
import {createServer as createNetServer} from 'node:net';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {afterEach, describe, expect, test, vi} from 'vitest';
import {
  A2UI_EXTENSION_URI,
  A2UI_RENDERER_CAPABILITIES_KEY,
  BASIC_CATALOG_ID,
  OLDER_VERSION_HELD,
  rendererCapabilities,
  SMOKE_GREETING,
  type PublishBody,
} from '@a2uiverse/sdk';
import {fetchLiveCard, readCard, type LiveCard, type ServedCard} from '@a2uiverse/card';
import {keySetOf, signServed, testSigner} from '@a2uiverse/card/testing';
import {FakeEmbedder} from '@a2uiverse/embedder';
import {a2aSmokeRunner, type SmokeRunner} from '@a2uiverse/smoke-transport';
import {
  authRequiredBody,
  completingScript,
  finalUpdate,
  firstTurnTask,
  paintParts,
  statusUpdate,
  type RequirementShape,
} from '@a2uiverse/smoke-transport/testing';
import {
  authRequiredScriptV1,
  cardForV1,
  completingScriptV1,
  paintPartsV1,
  startFakeAgentV1,
  type CardV1Options,
  type FakeA2aVersion,
  type FakeAgentV1,
  type FakePath,
  type ScriptV1,
} from '@a2uiverse/smoke-transport/testing/v1';
import {
  Marketplace,
  matches,
  nameMatches,
  SEARCH_FLOOR,
  SEARCH_MARGIN,
  type PublishAnswer,
} from '../src/marketplace.js';
import {
  APPS_DIR,
  ARTIFACTS_DIR,
  ENTRY_FILE,
  INDEX_FILE,
  PREVIEW_FILE,
  MarketplaceStore,
  PUBLIC_DIR,
  type PublisherRecord,
} from '../src/store.js';
import {
  authRequiredScript,
  credentialScript,
  failedScript,
  FAKE_CATALOG_ID,
  paintingScript,
  startFakeAgent,
  STREAMED_SETTLED,
  STREAMED_SURFACE,
  streamedScript,
  submittedOnlyScript,
  unmarkedScript,
  type FakeAgent,
  type FakeAgentOptions,
} from './fakeAgent.js';
import {
  cardFor,
  cardUrlOf,
  entryFor,
  fixtureArtifact,
  idOf,
  previewFor,
  schemaFor,
  type AgentCard,
  type ArtifactFiles,
} from './fixture.js';

const CAT = FAKE_CATALOG_ID;
const CAT2 = 'https://example.com/fake/second/catalog.json';

/** Cards served by URL, so a test can move an agent's live card without restarting it. */
class CardServer {
  readonly cards = new Map<string, ServedCard>();
  readonly fetched: string[] = [];
  serve(card: AgentCard): string {
    return this.serveAt(cardUrlOf(card.url), card);
  }
  /** Whatever a card URL answers, in whichever shape. */
  serveAt(url: string, served: ServedCard): string {
    this.cards.set(url, served);
    return url;
  }
  /** What a URL other than a card's answers: a key set, by its URL (task-20.7). */
  readonly documents = new Map<string, unknown>();
  /**
   * The card as the marketplace holds it: as its agent served it, through the one fetch of the
   * live card, so a signed card is checked as it is in a run.
   */
  resolve = async (url: string): Promise<LiveCard> => {
    this.fetched.push(url);
    return fetchLiveCard(url, {
      timeoutMs: 5_000,
      fetchImpl: async input => {
        const body = this.cards.get(String(input)) ?? this.documents.get(String(input));
        if (body === undefined) throw new Error(`fetch failed: ${String(input)}`);
        return new Response(JSON.stringify(body));
      },
    });
  };
}

const agents: (FakeAgent | FakeAgentV1)[] = [];
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

/** A fake A2A 1.0 agent, painting in `CAT` unless `script` says otherwise, its card as `options` say. */
async function agentV1Of(
  options: CardV1Options = {},
  script: ScriptV1 = completingScriptV1(paintPartsV1(CAT)),
): Promise<FakeAgentV1> {
  const agent = await startFakeAgentV1({
    script,
    card: interfaces => cardForV1(interfaces, {catalogs: [CAT], ...options}),
  });
  agents.push(agent);
  return agent;
}

async function made(stateDir?: string, smoke: SmokeRunner = a2aSmokeRunner()) {
  stateDir ??= await mkdtemp(join(tmpdir(), 'a2uiverse-marketplace-'));
  if (!dirs.includes(stateDir)) dirs.push(stateDir);
  const cards = new CardServer();
  const embedder = new FakeEmbedder();
  const marketplace = new Marketplace({
    stateDir,
    embedder,
    fetchCard: cards.resolve,
    smoke,
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
        {version: '1.0', createSurface: {surfaceId: 's1', catalogId: CAT}},
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
    expect(request.message.metadata?.[A2UI_RENDERER_CAPABILITIES_KEY]).toEqual(
      rendererCapabilities([BASIC_CATALOG_ID, CAT]),
    );
    expect(request.headers.authorization).toBeUndefined();
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
        Text: {
          type: 'object',
          properties: {component: {const: 'Text'}, text: {type: 'number'}},
          required: ['component', 'text'],
        },
      }),
    });
    const answer = refused(await marketplace.publish('acme', body('shop', url, [breaking])));
    expect(answer.findings).toEqual([
      `catalog artifact 1 (${CAT}): components/Text/properties/text/type: added`,
      `catalog artifact 1 (${CAT}): components/Text/properties/text/$ref: removed`,
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

  test('an agent whose stream closes on a task that has not ended never finished, the finding naming the last state', async () => {
    const {marketplace, cards} = await made();
    await claimed(marketplace);
    const agent = await agentOf({script: submittedOnlyScript});
    const answer = refused(
      await marketplace.publish(
        'acme',
        body('shop', cards.serve(agent.card), [await fixtureArtifact(CAT)]),
      ),
    );
    expect(answer.findings).toEqual([
      'the agent never finished: the stream ended with its task still submitted',
    ]);
  });

  test('a status update marked final while its task is still working does not end the answer (task-20.2 decision 6)', async () => {
    const {marketplace, cards} = await made();
    await claimed(marketplace);
    const agent = await agentOf({
      script: ({ctx}) => [firstTurnTask(ctx), finalUpdate(ctx, 'working', paintParts(CAT))],
    });
    const answer = refused(
      await marketplace.publish(
        'acme',
        body('shop', cards.serve(agent.card), [await fixtureArtifact(CAT)]),
      ),
    );
    expect(answer.findings).toEqual([
      'the agent never finished: the stream ended with its task still working',
    ]);
  });

  test('a stream that carried nothing never finished, before any answer', async () => {
    const {marketplace, cards} = await made(undefined, async () => ({
      kind: 'unfinished',
      messages: [],
    }));
    await claimed(marketplace);
    const agent = await agentOf();
    const answer = refused(
      await marketplace.publish(
        'acme',
        body('shop', cards.serve(agent.card), [await fixtureArtifact(CAT)]),
      ),
    );
    expect(answer.findings).toEqual([
      'the agent never finished: the stream ended before any answer',
    ]);
  });

  test('an agent that ends its answer on input-required, not marked final, is published', async () => {
    const {marketplace, cards} = await made();
    await claimed(marketplace);
    const agent = await agentOf({script: unmarkedScript(['input-required'])});
    const answer = ok(
      await marketplace.publish(
        'acme',
        body('shop', cards.serve(agent.card), [await fixtureArtifact(CAT)]),
      ),
    );
    expect(answer.summary).toMatch(/^published shop · card 0\.1\.0/);
  });

  test('the smoke test advertises the entitlement as one list read from the card', async () => {
    const advertised: unknown[] = [];
    const spy: SmokeRunner = request => {
      advertised.push(request.entitlement);
      return a2aSmokeRunner()(request);
    };
    const {marketplace, cards} = await made(undefined, spy);
    await claimed(marketplace);
    const agent = await agentOf({catalogs: [CAT, CAT2]});
    ok(
      await marketplace.publish(
        'acme',
        body('shop', cards.serve(agent.card), [
          await fixtureArtifact(CAT),
          await fixtureArtifact(CAT2),
        ]),
      ),
    );
    expect(advertised).toEqual([[BASIC_CATALOG_ID, CAT, CAT2]]);
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
      `surface "s1": its createSurface names catalog ${JSON.stringify(CAT2)}, outside its entitlement (/0/createSurface/catalogId)`,
    ]);
    const credential = await agentOf({script: credentialScript()});
    const cred = refused(
      await marketplace.publish(
        'acme',
        body('shop', cards.serve(credential.card), [await fixtureArtifact(CAT)]),
      ),
    );
    expect(cred.findings).toContainEqual(
      expect.stringMatching(/^surface "s1": a credential input: /),
    );
  });

  test('an agent that cannot be reached: no interface the card lists was reached (task-20.5 decision 7)', async () => {
    const {marketplace, cards} = await made();
    await claimed(marketplace);
    const agent = await agentOf();
    const url = cards.serve(agent.card);
    await agent.close();
    agents.splice(agents.indexOf(agent), 1);
    const answer = refused(
      await marketplace.publish('acme', body('shop', url, [await fixtureArtifact(CAT)])),
    );
    expect(answer.findings).toEqual([
      `no interface the card lists was reached: JSONRPC at A2A 0.3.0 (${agent.url}): no connection could be opened`,
    ]);
  });

  test('a sign-in agent whose stream closes on auth-required, set by an update not marked final, has asked to sign in (task-20.2 decision 6)', async () => {
    const {marketplace, cards} = await made();
    await claimed(marketplace);
    const agent = await agentOf({
      signIn: true,
      script: ({ctx}) => [
        firstTurnTask(ctx),
        statusUpdate(
          ctx,
          'auth-required',
          [{kind: 'data', data: authRequiredBody('0.3', 'signIn', ['read'])}],
          false,
        ),
      ],
    });
    const answer = ok(
      await marketplace.publish(
        'acme',
        body(
          'locked',
          cards.serve(agent.card),
          [await fixtureArtifact(CAT)],
          previewFor('locked', '0.1.0', CAT, 'publisher'),
        ),
      ),
    );
    expect(answer.summary).toContain('published locked');
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

  test('a paint streamed piece by piece is stored settled, as the check judged it', async () => {
    const {marketplace, stateDir, cards} = await made();
    await claimed(marketplace);
    const agent = await agentOf({catalogs: [], script: streamedScript()});
    ok(await marketplace.publish('acme', body('finder', cards.serve(agent.card))));
    const settled = [
      {
        version: '1.0',
        createSurface: {surfaceId: STREAMED_SURFACE, catalogId: BASIC_CATALOG_ID},
      },
      {
        version: '1.0',
        updateComponents: {surfaceId: STREAMED_SURFACE, components: STREAMED_SETTLED},
      },
    ];
    expect(marketplace.preview('finder')?.messages).toEqual(settled);
    const stored = await readJson(join(stateDir, PUBLIC_DIR, APPS_DIR, 'finder', PREVIEW_FILE));
    expect(stored.messages).toEqual(settled);
  });

  test('a handed preview is settled on receipt, so one from an older Stellify is stored settled', async () => {
    const {marketplace, cards} = await made();
    await claimed(marketplace);
    const agent = await agentOf({signIn: true, admit: () => false});
    const handed = previewFor('locked', '0.1.0', CAT, 'publisher');
    const copy = (text?: string) => ({
      version: '1.0',
      updateComponents: {
        surfaceId: 's1',
        components: [{id: 'root', component: 'Text', ...(text === undefined ? {} : {text})}],
      },
    });
    handed.messages = [handed.messages[0]!, copy(), copy('hi')];
    ok(
      await marketplace.publish(
        'acme',
        body('locked', cards.serve(agent.card), [await fixtureArtifact(CAT)], handed),
      ),
    );
    expect(marketplace.preview('locked')).toEqual({
      ...handed,
      messages: [handed.messages[0], copy('hi')],
    });
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
      `surface "s1": its createSurface names catalog ${JSON.stringify(CAT2)}, outside its entitlement (/0/createSurface/catalogId)`,
    ]);
  });
});

describe('publish, the card read (task-20.3 decisions 8, 15)', () => {
  test('a card the reading refuses: one finding in the A2A SDK’s own words, and no smoke request', async () => {
    const {marketplace, cards} = await made();
    await claimed(marketplace);
    const agent = await agentOf();
    const {skills: _skills, ...noSkills} = agent.card;
    const url = cards.serve(noSkills as AgentCard);
    const answer = refused(
      await marketplace.publish('acme', body('shop', url, [await fixtureArtifact(CAT)])),
    );
    expect(answer.findings).toHaveLength(1);
    expect(answer.findings[0]).toMatch(
      new RegExp(`^the card at ${url} could not be read: .*agentCard\\.skills`),
    );
    expect(agent.requests).toHaveLength(0);
  });

  test('a thing that is not a card, and a card with no name', async () => {
    const {marketplace, cards} = await made();
    await claimed(marketplace);
    const url = 'http://127.0.0.1:1/card.json';
    // A body that is no JSON object is turned back by the fetch itself.
    cards.serveAt(url, ['a list']);
    expect(refused(await marketplace.publish('acme', body('shop', url))).findings).toEqual([
      `the card at ${url} could not be fetched: not an agent card`,
    ]);
    cards.serveAt(url, {url: 'http://127.0.0.1:1'});
    expect(refused(await marketplace.publish('acme', body('shop', url))).findings).toEqual([
      `the card at ${url} could not be read: not an agent card: no name`,
    ]);
  });

  test('a card listing no interface the platform speaks is refused, naming both, with nothing sent', async () => {
    const {marketplace, cards} = await made();
    await claimed(marketplace);
    const agent = await agentV1Of();
    const served = {
      ...(agent.served as object),
      supportedInterfaces: [
        {url: `${agent.url}/acme`, protocolBinding: 'ACME-RPC', protocolVersion: '1.0'},
        {url: agent.interfaces['1.0'], protocolBinding: 'JSONRPC', protocolVersion: '2.0'},
      ],
    };
    const answer = refused(
      await marketplace.publish(
        'acme',
        body('shop', cards.serveAt(agent.cardUrl, served), [await fixtureArtifact(CAT)]),
      ),
    );
    expect(answer.findings).toEqual([
      'the card lists no interface A2UIVerse speaks: it lists ACME-RPC at A2A 1.0 and JSONRPC at A2A 2.0; A2UIVerse speaks JSONRPC, HTTP+JSON and GRPC at A2A 0.3 and 1.x',
    ]);
    expect(agent.requests).toHaveLength(0);
    expect(marketplace.entries()).toEqual([]);
  });

  test('a card listing no interface at all', async () => {
    const {marketplace, cards} = await made();
    await claimed(marketplace);
    const agent = await agentV1Of();
    const {supportedInterfaces: _none, ...served} = agent.served as {supportedInterfaces: unknown};
    const answer = refused(
      await marketplace.publish(
        'acme',
        body('shop', cards.serveAt(agent.cardUrl, served), [await fixtureArtifact(CAT)]),
      ),
    );
    expect(answer.findings).toEqual(['the card lists no interface']);
    expect(agent.requests).toHaveLength(0);
  });
});

describe('publish, a signed card (task-20.7 decisions 8, 9, 11, 12)', () => {
  /** A fake A2A 1.0 agent serving its card signed, the key set at its own origin. */
  async function signedAgent() {
    const signer = await testSigner();
    const agent = await agentV1Of();
    const signed = await signServed(agent.served as object, signer, {jku: agent.keySetUrl});
    return {agent, signer, signed};
  }

  test('one that passes is published, stored as served, its pass a note on the accepted publish', async () => {
    const {marketplace, cards} = await made();
    await claimed(marketplace);
    const {agent, signer, signed} = await signedAgent();
    cards.documents.set(agent.keySetUrl, keySetOf(signer));
    const answer = ok(
      await marketplace.publish(
        'acme',
        body('shop', cards.serveAt(agent.cardUrl, signed), [await fixtureArtifact(CAT)]),
      ),
    );
    expect(answer.notes).toContain(
      `the card's signature passed: key "test-1" (ES256) in the key set at ${agent.keySetUrl}`,
    );
    expect(marketplace.entry('shop')?.card).toEqual(signed);
  });

  test('one that does not pass is refused with its one finding, nothing sent to the agent and nothing listed', async () => {
    const {marketplace, cards} = await made();
    await claimed(marketplace);
    const {agent, signed} = await signedAgent();
    cards.documents.set(agent.keySetUrl, keySetOf(await testSigner({kid: 'someone-else'})));
    const url = cards.serveAt(agent.cardUrl, signed);
    const answer = refused(
      await marketplace.publish('acme', body('shop', url, [await fixtureArtifact(CAT)])),
    );
    expect(answer.findings).toEqual([
      `the card at ${url} could not be confirmed: the card's signature did not pass: the key set at ${agent.keySetUrl} holds no key under kid "test-1" for ES256`,
    ]);
    expect(agent.requests).toHaveLength(0);
    expect(marketplace.entries()).toEqual([]);
  });

  test('an unsigned card publishes with no note of a signature', async () => {
    const {marketplace, cards} = await made();
    await claimed(marketplace);
    const agent = await agentV1Of();
    const answer = ok(
      await marketplace.publish(
        'acme',
        body('shop', cards.serveAt(agent.cardUrl, agent.served as object), [
          await fixtureArtifact(CAT),
        ]),
      ),
    );
    expect(answer.notes.filter(note => note.includes('signature'))).toEqual([]);
  });

  test('a listed app whose live card later does not pass: the listing stays, and its flag as it was', async () => {
    const {marketplace, cards} = await made();
    await claimed(marketplace);
    const {agent, signer, signed} = await signedAgent();
    cards.documents.set(agent.keySetUrl, keySetOf(signer));
    const url = cards.serveAt(agent.cardUrl, signed);
    ok(await marketplace.publish('acme', body('shop', url, [await fixtureArtifact(CAT)])));

    // Ahead of the Store, then refused: the flag set stays set, and the listing stays.
    cards.serveAt(
      url,
      await signServed({...(agent.served as object), version: '9.0.0'}, signer, {
        jku: agent.keySetUrl,
      }),
    );
    expect(await marketplace.report('shop')).toBe('set');
    cards.documents.set(agent.keySetUrl, {keys: []});
    cards.serveAt(url, signed);
    expect(await marketplace.report('shop')).toBe('unchanged');
    expect(marketplace.entry('shop')?.aheadOfStore?.version).toBe('9.0.0');
    expect(marketplace.entry('shop')?.card).toEqual(signed);
  });
});

describe('publish, the walk over the card’s interfaces (task-20.5 decisions 1, 2, 7)', () => {
  /** A port nothing listens on. */
  async function closedPort(): Promise<number> {
    const server = createNetServer();
    await new Promise<void>(resolve => server.listen(0, '127.0.0.1', resolve));
    const {port} = server.address() as {port: number};
    await new Promise<void>(resolve => server.close(() => resolve()));
    return port;
  }

  test.each<FakePath>(
    (['JSONRPC', 'HTTP+JSON', 'GRPC'] as const).flatMap(binding =>
      (['1.0', '0.3'] as const).map(version => ({binding, version})),
    ),
  )('$binding at A2A $version is published, its paint captured there', async path => {
    const {marketplace, cards} = await made();
    await claimed(marketplace);
    const agent = await agentV1Of({paths: [path]});
    const answer = ok(
      await marketplace.publish(
        'acme',
        body('shop', cards.serveAt(agent.cardUrl, agent.served as object), [
          await fixtureArtifact(CAT),
        ]),
      ),
    );
    expect(answer.notes.filter(note => note.includes('reached'))).toEqual([]);
    expect(agent.requests.map(r => [r.binding, r.reached])).toEqual([[path.binding, path.version]]);
  });

  test('an interface passed over is a note on the accepted publish', async () => {
    const {marketplace, cards} = await made();
    await claimed(marketplace);
    const agent = await agentV1Of({paths: [{binding: 'JSONRPC', version: '0.3'}]});
    const grpc = `127.0.0.1:${await closedPort()}`;
    const served = agent.served as {supportedInterfaces: object[]};
    const listing = {
      ...served,
      supportedInterfaces: [
        {url: grpc, protocolBinding: 'GRPC', protocolVersion: '1.0'},
        ...served.supportedInterfaces,
      ],
    };
    const answer = ok(
      await marketplace.publish(
        'acme',
        body('shop', cards.serveAt(agent.cardUrl, listing), [await fixtureArtifact(CAT)]),
      ),
    );
    expect(answer.notes).toContain(
      `GRPC at A2A 1.0 (${grpc}) was not reached: no connection could be opened; the request went to JSONRPC at A2A 0.3`,
    );
    expect(agent.requests).toHaveLength(1);
  });

  test('no interface reached: refused with one finding in place of the smoke request’s', async () => {
    const {marketplace, cards} = await made();
    await claimed(marketplace);
    const agent = await agentV1Of();
    const grpc = `127.0.0.1:${await closedPort()}`;
    const jsonrpc = `http://127.0.0.1:${await closedPort()}/`;
    const listing = {
      ...(agent.served as object),
      supportedInterfaces: [
        {url: grpc, protocolBinding: 'GRPC', protocolVersion: '1.0'},
        {url: jsonrpc, protocolBinding: 'JSONRPC', protocolVersion: '0.3'},
      ],
    };
    const answer = refused(
      await marketplace.publish(
        'acme',
        body('shop', cards.serveAt(agent.cardUrl, listing), [await fixtureArtifact(CAT)]),
      ),
    );
    expect(answer.findings).toEqual([
      `no interface the card lists was reached: GRPC at A2A 1.0 (${grpc}): no connection could be opened; JSONRPC at A2A 0.3 (${jsonrpc}): no connection could be opened`,
    ]);
    expect(marketplace.entries()).toEqual([]);
  });
});

describe('publish, an agent on A2A 1.0 (task-20.3 decisions 11, 12, 20)', () => {
  test('a card in A2A 1.0’s shape is published: stored as served, its paint captured from the interface taken', async () => {
    const {marketplace, stateDir, cards} = await made();
    await claimed(marketplace);
    const agent = await agentV1Of({name: 'Shop', version: '1.0.0', order: ['1.0', '0.3']});
    const url = cards.serveAt(agent.cardUrl, agent.served as object);
    const answer = ok(
      await marketplace.publish('acme', body('shop', url, [await fixtureArtifact(CAT)])),
    );
    expect(answer.version).toBe('1.0.0');
    expect(agent.requests.map(r => [r.reached, r.method])).toEqual([
      ['1.0', 'SendStreamingMessage'],
    ]);
    const entry = marketplace.entry('shop')!;
    expect(entry.card).toEqual(agent.served);
    expect(entry.versions).toEqual(['1.0.0']);
    expect(marketplace.preview('shop')?.messages.map(m => Object.keys(m)[1])).toEqual([
      'createSurface',
      'updateComponents',
    ]);
    expect(await readJson(join(stateDir, PUBLIC_DIR, APPS_DIR, 'shop', ENTRY_FILE))).toEqual(entry);
    expect((await marketplace.search('Shop')).results.map(r => r.entry.appId)).toEqual(['shop']);
  });

  test('A2A 0.3 listed first is the interface the smoke request reaches', async () => {
    const {marketplace, cards} = await made();
    await claimed(marketplace);
    const agent = await agentV1Of({order: ['0.3', '1.0']});
    ok(
      await marketplace.publish(
        'acme',
        body('shop', cards.serveAt(agent.cardUrl, agent.served as object), [
          await fixtureArtifact(CAT),
        ]),
      ),
    );
    expect(agent.requests.map(r => [r.reached, r.method])).toEqual([['0.3', 'message/stream']]);
  });

  test('one agent’s card in A2A 0.3’s shape, then in 1.0’s, nothing else changed: accepted at the published version, the live card stored', async () => {
    const {marketplace, cards} = await made();
    await claimed(marketplace);
    const legacy = await agentOf();
    ok(
      await marketplace.publish(
        'acme',
        body('shop', cards.serve(legacy.card), [await fixtureArtifact(CAT)]),
      ),
    );
    expect(marketplace.entry('shop')!.card).toEqual(legacy.card);

    const current = await agentV1Of({order: ['1.0', '0.3']});
    const answer = ok(
      await marketplace.publish(
        'acme',
        body('shop', cards.serveAt(current.cardUrl, current.served as object)),
      ),
    );
    expect(answer.version).toBe('0.1.0');
    const entry = marketplace.entry('shop')!;
    expect(entry.versions).toEqual(['0.1.0']);
    expect(entry.card).toEqual(current.served);
    expect(readCard(entry.card).supportedInterfaces.map(i => i.protocolVersion)).toEqual([
      '1.0',
      '0.3',
    ]);
  });

  test('a changed skill at a published version is still refused, in A2A 1.0’s shape too', async () => {
    const {marketplace, cards} = await made();
    await claimed(marketplace);
    const legacy = await agentOf();
    ok(
      await marketplace.publish(
        'acme',
        body('shop', cards.serve(legacy.card), [await fixtureArtifact(CAT)]),
      ),
    );
    const current = await agentV1Of({
      skills: [{id: 'fake', name: 'fake', description: 'changed', tags: []}],
    });
    const answer = refused(
      await marketplace.publish(
        'acme',
        body('shop', cards.serveAt(current.cardUrl, current.served as object)),
      ),
    );
    expect(answer.findings).toEqual([
      'the card changed, but version "0.1.0" is already published: a changed card carries a version this app id has never published',
    ]);
    expect(current.requests).toHaveLength(0);
    expect(marketplace.entry('shop')!.card).toEqual(legacy.card);
  });
});

describe('publish, a sign-in agent on A2A 1.0 (task-20.4 decisions 9, 10)', () => {
  /** A sign-in card in A2A 1.0's JSON: one OAuth scheme, required with its scope `read`. */
  const signInCard = {
    securitySchemes: {
      signIn: {
        oauth2SecurityScheme: {
          flows: {
            authorizationCode: {
              authorizationUrl: 'https://shop.example/oauth/authorize',
              tokenUrl: 'https://shop.example/oauth/token',
              scopes: {read: 'See your things'},
            },
          },
        },
      },
    },
    securityRequirements: [{schemes: {signIn: {list: ['read']}}}],
  };

  test.each<[string, FakeA2aVersion[], RequirementShape]>([
    ["A2A 1.0's requirement shape, at its A2A 1.0 interface", ['1.0'], '1.0'],
    ["A2A 0.3's requirement shape, at its A2A 1.0 interface", ['1.0'], '0.3'],
    ["A2A 1.0's requirement shape, through its 0.3 layer", ['0.3', '1.0'], '1.0'],
  ])(
    'it passes by auth-required naming its scheme, holding its stream open after it asks: %s',
    async (_name, order, shape) => {
      const {marketplace, cards} = await made();
      await claimed(marketplace);
      const agent = await agentV1Of(
        {name: 'Locked', order, card: signInCard},
        authRequiredScriptV1('signIn', ['read'], shape),
      );
      const started = Date.now();
      const answer = ok(
        await marketplace.publish(
          'acme',
          body(
            'locked',
            cards.serveAt(agent.cardUrl, agent.served as object),
            [await fixtureArtifact(CAT)],
            previewFor('locked', '0.1.0', CAT, 'publisher'),
          ),
        ),
      );
      // The smoke request ends at the state, well inside its five seconds.
      expect(Date.now() - started).toBeLessThan(3000);
      expect(answer.summary).toContain('published locked');
      expect(agent.requests.map(r => r.reached)).toEqual([order[0]]);
    },
  );

  test('a scheme its card does not declare is refused in the same words, in either shape', async () => {
    const {marketplace, cards} = await made();
    await claimed(marketplace);
    for (const shape of ['1.0', '0.3'] as const) {
      const agent = await agentV1Of(
        {name: 'Locked', card: signInCard},
        authRequiredScriptV1('elsewhere', [], shape),
      );
      const answer = refused(
        await marketplace.publish(
          'acme',
          body(
            'locked',
            cards.serveAt(agent.cardUrl, agent.served as object),
            [await fixtureArtifact(CAT)],
            previewFor('locked', '0.1.0', CAT, 'publisher'),
          ),
        ),
      );
      expect(answer.findings).toEqual([
        'the auth-required answer names scheme "elsewhere", which the card does not declare',
      ]);
    }
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
        extensions: [{uri: A2UI_EXTENSION_URI, params: {supportedCatalogIds: [CAT]}}],
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

  test('an unpublished id keeps its versions and its last card: a changed card at the last version and an earlier version refused, the same card listed again (task-13.8 decision 17)', async () => {
    const first = await made();
    const {marketplace, stateDir} = first;
    let {cards} = first;
    await claimed(marketplace, 'acme');
    const agent = await agentOf();
    const url = cards.serve(agent.card);
    const files = await fixtureArtifact(CAT);
    ok(await marketplace.publish('acme', body('shop', url, [files])));
    cards.cards.set(url, {...agent.card, version: '0.2.0'});
    ok(await marketplace.publish('acme', body('shop', url)));
    ok(await marketplace.unpublish('acme', 'shop'));

    // The history outlives a restart: it is the publisher's, beside the served subtree.
    const reopened = await made(stateDir);
    const again = reopened.marketplace;
    cards = reopened.cards;
    cards.cards.set(url, {...agent.card, version: '0.2.0', description: 'changed'});
    expect(refused(await again.publish('acme', body('shop', url, [files]))).findings).toEqual([
      'the card changed, but version "0.2.0" is already published: a changed card carries a version this app id has never published',
    ]);
    cards.cards.set(url, agent.card);
    expect(refused(await again.publish('acme', body('shop', url, [files]))).findings).toEqual([
      'version "0.1.0" was published before and moved past: the published versions are 0.1.0, 0.2.0',
    ]);
    cards.cards.set(url, {...agent.card, version: '0.2.0'});
    const listed = ok(await again.publish('acme', body('shop', url, [files])));
    expect(listed.notes).toContain('shop is listed again');
    expect(again.entry('shop')?.versions).toEqual(['0.1.0', '0.2.0']);
    cards.cards.set(url, {...agent.card, version: '0.3.0', description: 'changed'});
    ok(await again.publish('acme', body('shop', url)));
    expect(again.entry('shop')?.versions).toEqual(['0.1.0', '0.2.0', '0.3.0']);
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
  test('words in, the entries that match out with their scores, in rank order', async () => {
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
    expect(results.map(r => r.entry.appId)).toEqual(['sky']);
    expect(results[0].entry.card.name).toBe('Sky');
    expect(
      (await marketplace.search('orders and deliveries')).results.map(r => r.entry.appId),
    ).toEqual(['shop']);
  });

  test('an app whose name the words start is a match, listed first (task-14.11 decision 30)', async () => {
    const {marketplace, cards} = await made();
    await claimed(marketplace);
    const calendar = await agentOf({
      name: 'Google Calendar',
      skills: [{id: 'c', name: 'Agenda', description: 'what is on today', tags: ['agenda']}],
    });
    const weather = await agentOf({
      name: 'Sky',
      skills: [{id: 'w', name: 'Forecast', description: 'the weather forecast', tags: ['weather']}],
    });
    ok(
      await marketplace.publish(
        'acme',
        body('calendar', cards.serve(calendar.card), [await fixtureArtifact(CAT)]),
      ),
    );
    ok(await marketplace.publish('acme', body('sky', cards.serve(weather.card))));
    for (const words of ['google', 'Goog', 'calendar google']) {
      const {results} = await marketplace.search(words);
      expect(
        results.map(r => r.entry.appId),
        words,
      ).toEqual(['calendar']);
    }
    const {results} = await marketplace.search('sky weather');
    expect(results.map(r => r.entry.appId)).toEqual(['sky']);
  });

  test('a name matches when every word searched starts a word of it, in any case', () => {
    expect(nameMatches('goog', 'Google Calendar')).toBe(true);
    expect(nameMatches('CALENDAR goo', 'Google Calendar')).toBe(true);
    expect(nameMatches('shop a', 'Shop A')).toBe(true);
    expect(nameMatches('shop a', 'Shop B')).toBe(false);
    expect(nameMatches('google mail', 'Google Calendar')).toBe(false);
    expect(nameMatches('circle', 'CircleCI')).toBe(true);
    expect(nameMatches(' ', 'Gmail')).toBe(false);
  });

  test('a match scores at least the floor and within the margin of the best (task-14.11 decision 27)', () => {
    const ranked = [0.5, 0.5 - SEARCH_MARGIN, 0.5 - SEARCH_MARGIN - 0.001, 0.1].map(score => ({
      score,
    }));
    expect(matches(ranked).map(r => r.score)).toEqual([0.5, 0.5 - SEARCH_MARGIN]);
    expect(matches([{score: SEARCH_FLOOR}, {score: SEARCH_FLOOR - 0.001}])).toEqual([
      {score: SEARCH_FLOOR},
    ]);
    expect(matches([{score: SEARCH_FLOOR - 0.001}])).toEqual([]);
    expect(matches([])).toEqual([]);
  });
});

describe('ahead of the Store', () => {
  test('a report refetches the live card and flags the drift; a card back in line clears it; an unreachable one leaves it', async () => {
    const {marketplace, stateDir, cards} = await made();
    await claimed(marketplace);
    const agent = await agentOf();
    const url = cards.serve(agent.card);
    ok(await marketplace.publish('acme', body('shop', url, [await fixtureArtifact(CAT)])));
    expect(await marketplace.report('shop')).toBe('unchanged');
    expect(marketplace.entry('shop')?.aheadOfStore).toBeUndefined();
    const ahead = {
      ...agent.card,
      version: '0.3.0',
      capabilities: {
        ...agent.card.capabilities,
        extensions: [
          {
            uri: A2UI_EXTENSION_URI,
            params: {supportedCatalogIds: [CAT, CAT2]},
          },
        ],
      },
    };
    cards.cards.set(url, ahead);
    expect(await marketplace.report('shop')).toBe('set');
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
    expect(await marketplace.report('shop')).toBe('unchanged');
    expect(marketplace.entry('shop')?.aheadOfStore?.catalogIds).toEqual([CAT2]);
    cards.cards.set(url, {...ahead, version: '0.4.0'});
    expect(await marketplace.report('shop')).toBe('changed');
    // The change each report made is answered, so a clearing is said (task-13.8 decision 31).
    cards.cards.set(url, agent.card);
    expect(await marketplace.report('shop')).toBe('cleared');
    expect(marketplace.entry('shop')?.aheadOfStore).toBeUndefined();
    expect(await marketplace.report('nope')).toBe('unchanged');
  });

  test('a live card in A2A 1.0’s shape, nothing else changed, raises no flag; one that does not read leaves the flag; one unreachable is still judged (task-20.3 decisions 12, 17)', async () => {
    const {marketplace, cards} = await made();
    await claimed(marketplace);
    const legacy = await agentOf();
    const url = cards.serve(legacy.card);
    ok(await marketplace.publish('acme', body('shop', url, [await fixtureArtifact(CAT)])));
    const current = await agentV1Of({order: ['1.0', '0.3']});
    cards.serveAt(url, current.served as object);
    expect(await marketplace.report('shop')).toBe('unchanged');
    expect(marketplace.entry('shop')?.aheadOfStore).toBeUndefined();
    // The stored copy keeps its older shape until the app is next published.
    expect(marketplace.entry('shop')?.card).toEqual(legacy.card);

    const ahead = {...(current.served as object), version: '0.3.0'};
    cards.serveAt(url, ahead);
    expect(await marketplace.report('shop')).toBe('set');
    cards.serveAt(url, {url: 'http://127.0.0.1:1'});
    expect(await marketplace.report('shop')).toBe('unchanged');
    expect(marketplace.entry('shop')?.aheadOfStore?.version).toBe('0.3.0');

    const unspoken = {
      ...(current.served as object),
      supportedInterfaces: [
        {url: 'http://127.0.0.1:1/acme', protocolBinding: 'ACME-RPC', protocolVersion: '1.0'},
      ],
    };
    cards.serveAt(url, unspoken);
    expect(await marketplace.report('shop')).toBe('cleared');
    expect(marketplace.entry('shop')?.card).toEqual(legacy.card);
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

  test('a stored card that does not read refuses the boot, naming the app and the reason (task-20.3 decision 9)', async () => {
    const {marketplace, stateDir, cards} = await made();
    await claimed(marketplace);
    const agent = await agentOf();
    ok(
      await marketplace.publish(
        'acme',
        body('sky', cards.serve(agent.card), [await fixtureArtifact(CAT)]),
      ),
    );
    const entryPath = join(stateDir, PUBLIC_DIR, APPS_DIR, 'sky', ENTRY_FILE);
    const entry = await readJson(entryPath);
    const {skills: _skills, ...noSkills} = entry.card;
    await writeFile(entryPath, JSON.stringify({...entry, card: noSkills}));
    await expect(made(stateDir)).rejects.toThrow(
      /^the stored card of app "sky" could not be read: .*agentCard\.skills/,
    );
  });

  test('a stored card whose version is not the last its entry published refuses the boot', async () => {
    const {marketplace, stateDir, cards} = await made();
    await claimed(marketplace);
    const agent = await agentOf();
    ok(
      await marketplace.publish(
        'acme',
        body('sky', cards.serve(agent.card), [await fixtureArtifact(CAT)]),
      ),
    );
    const entryPath = join(stateDir, PUBLIC_DIR, APPS_DIR, 'sky', ENTRY_FILE);
    const entry = await readJson(entryPath);
    await writeFile(entryPath, JSON.stringify({...entry, versions: ['0.1.0', '0.2.0']}));
    await expect(made(stateDir)).rejects.toThrow(
      'the entry of app "sky" is damaged: the last published version is "0.2.0", the stored card’s is "0.1.0"',
    );
  });
});

/** A card fixture of the sdk: upstream's sample agents' cards as served (task-21.10 decision 23.3). */
const upstreamCard = (name: string): ServedCard & {url: string} =>
  JSON.parse(
    readFileSync(
      new URL(`../../../packages/sdk/js/test/fixtures/cards/${name}`, import.meta.url),
      'utf8',
    ),
  );

/** A card's A2UI entries, one per URI, written by hand. */
const declaring = (...uris: string[]) => ({
  capabilities: {
    streaming: true,
    extensions: uris.map(uri => ({uri, params: {supportedCatalogIds: [CAT]}})),
  },
});
const A2UI_V09 = 'https://a2ui.org/a2a-extension/a2ui/v0.9';
const A2UI_V11 = 'https://a2ui.org/a2a-extension/a2ui/v1.1';

/** Paints the shared surface in `CAT`, every message stamped `version`: written to be refused. */
const stampedScript = (version: string) =>
  completingScript(
    paintParts(CAT).map(part =>
      part.kind === 'data' ? {...part, data: {...(part.data as object), version}} : part,
    ),
  );

describe('an agent on another A2UI version at publish (task-21.15 decisions 1, 2, 3)', () => {
  test("upstream's ADK restaurant finder, declaring v0.8 and v0.9: refused alone, nothing sent", async () => {
    const {marketplace, cards} = await made();
    await claimed(marketplace);
    const adk = upstreamCard('adk-restaurant-finder.json');
    const url = cards.serveAt('http://127.0.0.1:1/.well-known/agent-card.json', adk);
    // A bad app id and a missing artifact are not judged beside it.
    const answer = await marketplace.publish('acme', body('Finder!', url));
    expect(answer).toEqual({
      ok: false,
      kind: 'refused',
      findings: [
        'the card declares A2UI v0.8 and v0.9, which A2UIVerse no longer supports: A2UIVerse speaks A2UI v1.0',
      ],
    });
    expect(marketplace.entries()).toEqual([]);
  });

  test('a card declaring only a newer version, and one declaring an older and a newer, each refused alone', async () => {
    const {marketplace, cards} = await made();
    await claimed(marketplace);
    const newer = await agentOf({card: declaring(A2UI_V11)});
    expect(
      refused(await marketplace.publish('acme', body('shop', cards.serve(newer.card)))).findings,
    ).toEqual([
      'the card declares A2UI v1.1, which is newer than this A2UIVerse supports: A2UIVerse speaks A2UI v1.0',
    ]);
    const both = await agentOf({card: declaring(A2UI_V09, A2UI_V11)});
    expect(
      refused(await marketplace.publish('acme', body('shop', cards.serve(both.card)))).findings,
    ).toEqual([
      'the card declares A2UI v0.9 and v1.1, not v1.0: v1.1 is newer than this A2UIVerse supports, and A2UIVerse speaks A2UI v1.0',
    ]);
    expect(newer.requests).toEqual([]);
    expect(both.requests).toEqual([]);
  });

  test('a malformed v1.0 declaration is collected beside the other findings', async () => {
    const {marketplace, cards} = await made();
    await claimed(marketplace);
    const keyed = await agentOf({
      card: {
        description: '',
        capabilities: {
          streaming: true,
          extensions: [{uri: A2UI_EXTENSION_URI, params: {'1.0': {supportedCatalogIds: [CAT]}}}],
        },
      },
    });
    const answer = refused(
      await marketplace.publish('acme', body('shop', cards.serve(keyed.card))),
    );
    expect(answer.findings).toEqual([
      'the card has no description',
      'the card\'s A2UI v1.0 extension params: keyed under "1.0"; v1.0 params are read flat',
    ]);
    expect(keyed.requests).toEqual([]);
  });

  test("upstream's Node restaurant finder, with no A2UI entry, published on the basic catalog against a scripted agent", async () => {
    const {marketplace, cards} = await made();
    await claimed(marketplace);
    const agent = await agentOf({catalogs: [], script: paintingScript(BASIC_CATALOG_ID)});
    const node = {...upstreamCard('node-restaurant-finder.json'), url: agent.url};
    const answer = ok(
      await marketplace.publish('acme', body('finder', cards.serveAt(cardUrlOf(agent.url), node))),
    );
    expect(answer.summary).toBe('published finder · card 1.0.0 · basic catalog');
    expect(agent.requests[0]?.message.parts).toEqual([
      {kind: 'text', text: 'Find me the top 10 chinese restaurants in the US'},
    ]);
    expect(agent.requests[0]?.message.metadata?.[A2UI_RENDERER_CAPABILITIES_KEY]).toEqual(
      rendererCapabilities([BASIC_CATALOG_ID]),
    );
  });

  test.each([
    [
      'v0.9',
      'the answer is stamped A2UI "v0.9", an older version A2UIVerse no longer supports: A2UIVerse reads only what is stamped "1.0"',
    ],
    [
      '1.1',
      'the answer is stamped A2UI "1.1", a newer version than this A2UIVerse supports: A2UIVerse reads only what is stamped "1.0"',
    ],
    [
      'abc',
      'the answer is stamped "abc", which is no A2UI version: A2UIVerse reads only what is stamped "1.0"',
    ],
  ])(
    'an answer stamped %s on a v1.0 card, refused by what its stamp reads as',
    async (stamp, finding) => {
      const {marketplace, cards} = await made();
      await claimed(marketplace);
      const agent = await agentOf({script: stampedScript(stamp)});
      const answer = refused(
        await marketplace.publish(
          'acme',
          body('shop', cards.serve(agent.card), [await fixtureArtifact(CAT)]),
        ),
      );
      expect(answer.findings).toEqual([finding]);
    },
  );

  test('an answer in v0.8, whose messages carry no version, refused as painting nothing', async () => {
    const {marketplace, cards} = await made();
    await claimed(marketplace);
    const v08 = completingScript([
      {kind: 'data', data: {beginRendering: {surfaceId: 's1', root: 'root'}}},
      {
        kind: 'data',
        data: {
          surfaceUpdate: {
            surfaceId: 's1',
            components: [{id: 'root', component: {Text: {text: {literalString: 'hi'}}}}],
          },
        },
      },
    ]);
    const agent = await agentOf({script: v08});
    const answer = refused(
      await marketplace.publish(
        'acme',
        body('shop', cards.serve(agent.card), [await fixtureArtifact(CAT)]),
      ),
    );
    expect(answer.findings).toEqual(['the answer paints nothing: no createSurface']);
  });

  test('an artifact packed for 0.16.1 refused by name', async () => {
    const {marketplace, cards} = await made();
    await claimed(marketplace);
    const agent = await agentOf();
    const old = await fixtureArtifact(CAT, {hostInterface: '0.16.1'});
    const answer = refused(
      await marketplace.publish('acme', body('shop', cards.serve(agent.card), [old])),
    );
    expect(answer.findings).toEqual([
      `catalog artifact 1 (${CAT}): host interface "0.16.1" is not one the platform supplies (it supplies "0.16.1-v1.0")`,
    ]);
    expect(agent.requests).toEqual([]);
  });
});

/** The catalog document a catalog for v0.9 carries: no protocolVersion, as `main` packed them. */
const v09Schema = {
  catalogId: CAT,
  components: {Text: {type: 'object', properties: {text: {type: 'string'}}, required: ['text']}},
};

/**
 * A state directory as `main` left it (task-21.15 decisions 4, 5, 6): app `old` listed by acme on a
 * card declaring v0.9, its catalog row at a build packed for `hostInterface`, its preview stamped
 * v0.9.
 */
async function stateBeforeFlip(hostInterface = '0.16.1', flagged = false) {
  const stateDir = await mkdtemp(join(tmpdir(), 'a2uiverse-marketplace-'));
  dirs.push(stateDir);
  const store = new MarketplaceStore(stateDir);
  await store.load();
  const files = await fixtureArtifact(CAT, {hostInterface, schema: v09Schema});
  const artifactId = await idOf(files);
  const card = {...cardFor('http://127.0.0.1:1', {catalogs: [CAT]}), ...declaring(A2UI_V09)};
  const entry = entryFor('old', card, {[CAT]: artifactId});
  const preview = {
    appId: 'old',
    version: card.version,
    words: SMOKE_GREETING,
    messages: [
      {version: 'v0.9', createSurface: {surfaceId: 's1', catalogId: CAT}},
      {
        version: 'v0.9',
        updateComponents: {
          surfaceId: 's1',
          components: [{id: 'root', component: 'Text', text: 'hi'}],
        },
      },
    ],
    capturedBy: 'marketplace' as const,
    capturedAt: '2026-10-10T00:00:00.000Z',
  };
  const publisher: PublisherRecord = {
    name: 'acme',
    tokenHash: 'sha256-AAAA',
    claimedAt: '2026-10-10T00:00:00.000Z',
    apps: ['old'],
    catalogs: [CAT],
  };
  const stored = flagged
    ? {...entry, aheadOfStore: {catalogIds: [CAT2], seenAt: '2026-10-11T00:00:00.000Z'}}
    : entry;
  await store.writeArtifact(artifactId, files);
  await store.writeEntry(stored);
  await store.writePreview(preview);
  await store.writePublishers([publisher]);
  await store.writeIndex([stored]);
  return {stateDir, artifactId, card};
}

describe('the held catalog rows and the listings from before the flip (task-21.15 decisions 4, 5, 6)', () => {
  test('a v1.0 card naming an id held at a build packed for 0.16.1, no artifact handed: a coverage finding of its own', async () => {
    const {stateDir} = await stateBeforeFlip('0.16.1');
    const {marketplace, cards} = await made(stateDir);
    const agent = await agentOf();
    const answer = refused(
      await marketplace.publish('acme', body('shop', cards.serve(agent.card))),
    );
    expect(answer.findings).toEqual([
      `the card declares catalog ${JSON.stringify(CAT)} but no artifact for it was handed, and the build the marketplace holds for it is packed for host interface "0.16.1", while the platform supplies "0.16.1-v1.0"`,
    ]);
    expect(agent.requests).toEqual([]);
  });

  test('the same id held at a build packed for 0.16.1-v1.0 is covered', async () => {
    const {marketplace, cards} = await made();
    await claimed(marketplace);
    const first = await agentOf();
    ok(
      await marketplace.publish(
        'acme',
        body('first', cards.serve(first.card), [await fixtureArtifact(CAT)]),
      ),
    );
    const agent = await agentOf();
    const answer = ok(await marketplace.publish('acme', body('shop', cards.serve(agent.card))));
    expect(answer.notes).toContain(
      `catalog ${JSON.stringify(CAT)}: the held build counts as covered`,
    );
  });

  test('a v1.0 artifact handed for an id held as an older-version catalog: one finding, no walk', async () => {
    const {stateDir} = await stateBeforeFlip('0.16.1');
    const {marketplace, cards} = await made(stateDir);
    const agent = await agentOf();
    const answer = refused(
      await marketplace.publish(
        'acme',
        body('shop', cards.serve(agent.card), [await fixtureArtifact(CAT)]),
      ),
    );
    expect(answer.findings).toEqual([`catalog artifact 1 (${CAT}): ${OLDER_VERSION_HELD}`]);
  });

  test('the boot on a state directory from before the flip: its listings, artifacts and previews unchanged', async () => {
    const {stateDir} = await stateBeforeFlip('0.16.1', true);
    const tree = async () => {
      const {readTree} = await import('../src/store.js');
      return readTree(stateDir);
    };
    const before = await tree();
    const {marketplace} = await made(stateDir);
    expect(marketplace.entries().map(e => e.appId)).toEqual(['old']);
    expect(marketplace.preview('old')?.messages[0]).toMatchObject({version: 'v0.9'});
    expect(await tree()).toEqual(before);
  });

  test('the drift check on a live card declaring only v0.9: the flag left as it was, said in the log; a live card moved to v1.0 under a new id flagged', async () => {
    const {stateDir, card} = await stateBeforeFlip('0.16.1', true);
    const {marketplace, cards} = await made(stateDir);
    const url = cards.serve(card);
    const log = vi.spyOn(console, 'log').mockImplementation(() => {});
    try {
      expect(await marketplace.report('old')).toBe('unchanged');
      expect(log.mock.calls.map(([line]) => String(line))).toContainEqual(
        expect.stringMatching(
          /@a2uiverse\/marketplace: the live card of old declares A2UI v0\.9 and not v1\.0: its ahead-of-the-Store flag is left as it was$/,
        ),
      );
    } finally {
      log.mockRestore();
    }
    expect(marketplace.entry('old')?.aheadOfStore?.catalogIds).toEqual([CAT2]);
    const NEW = 'https://example.com/fake/v1/catalog.json';
    cards.serveAt(url, {
      ...card,
      capabilities: {
        streaming: true,
        extensions: [{uri: A2UI_EXTENSION_URI, params: {supportedCatalogIds: [NEW]}}],
      },
    });
    expect(await marketplace.report('old')).toBe('changed');
    expect(marketplace.entry('old')?.aheadOfStore?.catalogIds).toEqual([NEW]);
  });
});
