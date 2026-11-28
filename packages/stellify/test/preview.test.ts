/** `preview` (task-13.4 decisions 5–8, 12): the paint captured on the publisher's machine. */
import {
  A2UI_EXTENSION_URI,
  ARTIFACT_DESCRIPTOR_FILE,
  artifactIdOf,
  BASIC_CATALOG_ID,
  SMOKE_GREETING,
} from '@a2uiverse/sdk';
import {a2aSmokeRunner, type SmokeRunner} from '@a2uiverse/smoke-transport';
import {
  authRequiredBody,
  completingScript,
  finalUpdate,
  firstTurnTask,
  paintParts,
  statusUpdate,
} from '@a2uiverse/smoke-transport/testing';
import {
  authRequiredScriptV1,
  cardForV1,
  completingScriptV1,
  paintPartsV1,
  startFakeAgentV1,
  type CardV1Options,
  type FakeAgentV1,
  type FakePath,
} from '@a2uiverse/smoke-transport/testing/v1';
import {AgentCard} from '@a2a-js/sdk';
import {keySetOf, signServed, testSigner, type TestSigner} from '@a2uiverse/card/testing';
import {readFileSync} from 'node:fs';
import {createServer as createNetServer} from 'node:net';
import {afterEach, beforeAll, describe, expect, test} from 'vitest';
import {UNSUPPORTED_SCHEME} from '../src/credential.js';
import {artifactFiles, preview, stellify} from '../src/index.js';
import {heldElsewhereNote, previewWith} from '../src/preview.js';
import {
  authored,
  authRequiredScript,
  failedScript,
  hangingScript,
  invalidPaintScript,
  paintingScript,
  STAR_CATALOG_ID,
  startFakeAgent,
  streamedScript,
  submittedOnlyScript,
  unmarkedScript,
  type FakeAgent,
} from './fakeAgent.js';
import {entryFor, startFakeMarketplace, type FakeMarketplace} from './fakeMarketplace.js';
import {copyFixture} from './fixture.js';

let star: Map<string, Uint8Array>;
let starId: string;
beforeAll(async () => {
  star = artifactFiles(await stellify(copyFixture()));
  starId = await artifactIdOf(star.get(ARTIFACT_DESCRIPTOR_FILE)!);
});

let agent: FakeAgent | undefined;
let agentV1: FakeAgentV1 | undefined;
let marketplace: FakeMarketplace | undefined;
afterEach(async () => {
  await agent?.close();
  await agentV1?.close();
  await marketplace?.close();
  agent = agentV1 = marketplace = undefined;
});

const NOW = () => new Date('2026-10-10T12:00:00.000Z');

describe('preview of an app that needs no sign-in', () => {
  test('the document: captured by the publisher at the card’s version, the words, every message', async () => {
    agent = await startFakeAgent({version: '0.4.0'});
    const result = await preview({
      appId: 'star',
      cardUrl: agent.cardUrl,
      catalogs: [star],
      now: NOW,
    });
    expect(result.findings).toEqual([]);
    expect(result.signIn).toBe(false);
    expect(result.document).toEqual({
      appId: 'star',
      version: '0.4.0',
      words: SMOKE_GREETING,
      messages: [
        {version: '1.0', createSurface: {surfaceId: 's1', catalogId: STAR_CATALOG_ID}},
        {
          version: '1.0',
          updateComponents: {
            surfaceId: 's1',
            components: [{id: 'root', component: 'StarText', text: 'hi'}],
          },
        },
      ],
      capturedBy: 'publisher',
      capturedAt: '2026-10-10T12:00:00.000Z',
    });
    expect(result.notes).toEqual([]);
    expect(result.notices).toEqual([]);
  });

  test('the words are the card’s first skill’s first example', async () => {
    agent = await startFakeAgent({
      skills: [{id: 'a', name: 'a', description: 'a', tags: [], examples: ['Show my stars']}],
    });
    const result = await preview({appId: 'star', cardUrl: agent.cardUrl, catalogs: [star]});
    expect(result.document?.words).toBe('Show my stars');
    expect(agent.requests[0]?.message.parts).toEqual([{kind: 'text', text: 'Show my stars'}]);
  });

  test('a credential given is not sent, with a note', async () => {
    agent = await startFakeAgent();
    const result = await preview({
      appId: 'star',
      cardUrl: agent.cardUrl,
      catalogs: [star],
      credential: 'tok',
    });
    expect(result.findings).toEqual([]);
    expect(result.notes).toEqual([
      'the card requires no sign-in: the credential is not sent, and the marketplace captures this app’s preview itself at publish',
    ]);
    expect(agent.requests[0]?.headers.authorization).toBeUndefined();
  });

  test('the answer ends on input-required, not marked final: its paint is the preview', async () => {
    agent = await startFakeAgent({script: unmarkedScript(['input-required'])});
    const result = await preview({appId: 'star', cardUrl: agent.cardUrl, catalogs: [star]});
    expect(result.findings).toEqual([]);
    expect(result.document?.messages.map(m => Object.keys(m).find(k => k !== 'version'))).toEqual([
      'createSurface',
      'updateComponents',
    ]);
  });
  test('a paint streamed piece by piece: the document holds it settled, as the check judged it', async () => {
    agent = await startFakeAgent({script: streamedScript()});
    const result = await preview({appId: 'star', cardUrl: agent.cardUrl, catalogs: [star]});
    expect(result.findings).toEqual([]);
    expect(result.document?.messages).toEqual([
      {version: '1.0', createSurface: {surfaceId: 's1', catalogId: STAR_CATALOG_ID}},
      {
        version: '1.0',
        updateComponents: {
          surfaceId: 's1',
          components: [{id: 'root', component: 'StarText', text: 'hi'}],
        },
      },
    ]);
  });
});

describe('preview of an agent on A2A 1.0 (task-20.3 decisions 11, 20)', () => {
  const startV1 = async (options: CardV1Options = {}) => {
    agentV1 = await startFakeAgentV1({
      script: completingScriptV1(paintPartsV1(STAR_CATALOG_ID, {component: 'StarText'})),
      card: interfaces =>
        cardForV1(interfaces, {name: 'Star Agent', catalogs: [STAR_CATALOG_ID], ...options}),
      admit: request => request.header('X-Star-Key') !== 'wrong',
    });
    return agentV1;
  };

  test('a card in A2A 1.0’s shape: the request reaches its first interface, and its paint is the document', async () => {
    const fake = await startV1({version: '1.2.0', order: ['1.0', '0.3']});
    const result = await preview({
      appId: 'star',
      cardUrl: fake.cardUrl,
      catalogs: [star],
      now: NOW,
    });
    expect(result.findings).toEqual([]);
    expect(result.document?.version).toBe('1.2.0');
    expect(result.document?.messages.map(m => Object.keys(m)[1])).toEqual([
      'createSurface',
      'updateComponents',
    ]);
    expect(fake.requests.map(r => [r.reached, r.method])).toEqual([
      ['1.0', 'SendStreamingMessage'],
    ]);
  });

  test('A2A 0.3 listed first is the interface reached', async () => {
    const fake = await startV1({order: ['0.3', '1.0']});
    const result = await preview({appId: 'star', cardUrl: fake.cardUrl, catalogs: [star]});
    expect(result.findings).toEqual([]);
    expect(fake.requests.map(r => [r.reached, r.method])).toEqual([['0.3', 'message/stream']]);
  });

  test('a sign-in card in A2A 1.0’s shape: the credential rides as the header its scheme names', async () => {
    const fake = await startV1({
      card: {
        securitySchemes: {key: {apiKeySecurityScheme: {location: 'header', name: 'X-Star-Key'}}},
        securityRequirements: [{schemes: {key: {list: []}}}],
      },
    });
    const result = await preview({
      appId: 'star',
      cardUrl: fake.cardUrl,
      catalogs: [star],
      credential: 'k-1',
    });
    expect(result.findings).toEqual([]);
    expect(result.signIn).toBe(true);
    expect(fake.requests[0]?.headers['x-star-key']).toBe('k-1');
  });

  test.each<[string, '1.0' | '0.3']>([
    ["A2A 1.0's requirement shape", '1.0'],
    ["A2A 0.3's requirement shape", '0.3'],
  ])(
    'an agent that asks to sign in and holds its stream open: the preview ends at the state, the finding naming what it asked in %s (task-20.4 decisions 9, 10)',
    async (_name, shape) => {
      agentV1 = await startFakeAgentV1({
        script: authRequiredScriptV1('key', ['write'], shape),
        card: interfaces =>
          cardForV1(interfaces, {
            name: 'Star Agent',
            catalogs: [STAR_CATALOG_ID],
            card: {
              securitySchemes: {
                key: {apiKeySecurityScheme: {location: 'header', name: 'X-Star-Key'}},
              },
              securityRequirements: [{schemes: {key: {list: []}}}],
            },
          }),
      });
      const started = Date.now();
      const result = await preview({
        appId: 'star',
        cardUrl: agentV1.cardUrl,
        catalogs: [star],
        credential: 'k-1',
      });
      expect(Date.now() - started).toBeLessThan(3000);
      expect(result.findings).toEqual([
        'the agent asked to sign in although a credential was sent: key (write)',
      ]);
    },
  );
});

describe('preview of a signed card (task-20.7 decisions 9, 10, 12)', () => {
  /** A fake A2A 1.0 agent serving its card signed by `signer`, the key set `keySet` at its origin. */
  const startSigned = async (signer: TestSigner, keySet: unknown) => {
    agentV1 = await startFakeAgentV1({
      script: completingScriptV1(paintPartsV1(STAR_CATALOG_ID, {component: 'StarText'})),
      card: interfaces => cardForV1(interfaces, {name: 'Star Agent', catalogs: [STAR_CATALOG_ID]}),
      serve: (card, {keySetUrl}) =>
        signServed(AgentCard.toJSON(card) as object, signer, {jku: keySetUrl}),
      keySet,
    });
    return agentV1;
  };

  test('one that passes: the paint captured as before, the pass a note on the terminal', async () => {
    const signer = await testSigner();
    const fake = await startSigned(signer, keySetOf(signer));
    const result = await preview({appId: 'star', cardUrl: fake.cardUrl, catalogs: [star]});
    expect(result.findings).toEqual([]);
    expect(result.document).not.toBeNull();
    expect(result.notes).toContain(
      `the card's signature passed: key "test-1" (ES256) in the key set at ${fake.keySetUrl}`,
    );
  });

  test('one that does not pass: one finding naming why in a developer’s terms, nothing captured, nothing sent', async () => {
    const fake = await startSigned(await testSigner(), keySetOf(await testSigner({kid: 'other'})));
    const result = await preview({appId: 'star', cardUrl: fake.cardUrl, catalogs: [star]});
    expect(result.document).toBeNull();
    expect(result.findings).toEqual([
      `the card at ${fake.cardUrl} could not be confirmed: the card's signature did not pass: the key set at ${fake.keySetUrl} holds no key under kid "test-1" for ES256`,
    ]);
    expect(fake.requests).toEqual([]);
  });

  test('a key set that does not answer within the card’s time limit: the card could not be fetched', async () => {
    const fake = await startSigned(await testSigner(), 'hang');
    const result = await preview({
      appId: 'star',
      cardUrl: fake.cardUrl,
      catalogs: [star],
      cardTimeoutMs: 200,
    });
    expect(result.findings).toEqual([
      `the card at ${fake.cardUrl} could not be fetched: the key set at ${fake.keySetUrl} did not answer within 0.2 s`,
    ]);
    expect(fake.requests).toEqual([]);
  });
});

describe('preview over the card’s interfaces (task-20.5 decisions 1, 2, 7, 8, 9)', () => {
  const KEY_CARD = {
    securitySchemes: {key: {apiKeySecurityScheme: {location: 'header', name: 'X-Star~Key'}}},
    securityRequirements: [{schemes: {key: {list: []}}}],
  };

  /** A port nothing listens on. */
  async function closedPort(): Promise<number> {
    const server = createNetServer();
    await new Promise<void>(resolve => server.listen(0, '127.0.0.1', resolve));
    const {port} = server.address() as {port: number};
    await new Promise<void>(resolve => server.close(() => resolve()));
    return port;
  }

  const startPaths = async (paths: FakePath[], options: Partial<CardV1Options> = {}) => {
    agentV1 = await startFakeAgentV1({
      script: completingScriptV1(paintPartsV1(STAR_CATALOG_ID, {component: 'StarText'})),
      card: urls => cardForV1(urls, {catalogs: [STAR_CATALOG_ID], paths, ...options}),
      admit: request => request.header('X-Star-Key') !== 'wrong',
    });
    return agentV1;
  };

  /** The preview of `fake`, its card URL listing `ahead` before the agent's own interfaces. */
  const previewAhead = (fake: FakeAgentV1, ahead: object[], credential?: string) => {
    const served = fake.served as {supportedInterfaces?: object[]};
    const listing = {
      ...served,
      supportedInterfaces: [...ahead, ...(served.supportedInterfaces ?? [])],
    };
    return previewWith(
      {appId: 'star', cardUrl: fake.cardUrl, catalogs: [star], ...(credential ? {credential} : {})},
      {
        fetchImpl: async (input, init) =>
          String(input) === fake.cardUrl ? Response.json(listing) : fetch(input, init),
      },
    );
  };

  test.each<FakePath>(
    (['JSONRPC', 'HTTP+JSON', 'GRPC'] as const).flatMap(binding =>
      (['1.0', '0.3'] as const).map(version => ({binding, version})),
    ),
  )('$binding at A2A $version: the paint is the document', async path => {
    const fake = await startPaths([path]);
    const result = await preview({appId: 'star', cardUrl: fake.cardUrl, catalogs: [star]});
    expect(result.findings).toEqual([]);
    expect(result.document?.messages.map(m => Object.keys(m)[1])).toEqual([
      'createSurface',
      'updateComponents',
    ]);
    expect(fake.requests.map(r => [r.binding, r.reached])).toEqual([[path.binding, path.version]]);
  });

  test('an interface no connection could be opened to is a note, the paint captured at the next', async () => {
    const fake = await startPaths([{binding: 'JSONRPC', version: '0.3'}]);
    const grpc = `127.0.0.1:${await closedPort()}`;
    const result = await previewAhead(fake, [
      {url: grpc, protocolBinding: 'GRPC', protocolVersion: '1.0'},
    ]);
    expect(result.findings).toEqual([]);
    expect(result.document).not.toBeNull();
    expect(result.notes).toEqual([
      `GRPC at A2A 1.0 (${grpc}) was not reached: no connection could be opened; the request went to JSONRPC at A2A 0.3`,
    ]);
  });

  test('an interface that does not serve it is a note', async () => {
    const fake = await startPaths([{binding: 'HTTP+JSON', version: '1.0'}]);
    const absent = `${fake.url}/nowhere`;
    const result = await previewAhead(fake, [
      {url: absent, protocolBinding: 'JSONRPC', protocolVersion: '1.0'},
    ]);
    expect(result.findings).toEqual([]);
    expect(result.notes).toEqual([
      `JSONRPC at A2A 1.0 (${absent}) was not reached: what answered there does not serve it; the request went to HTTP+JSON at A2A 1.0`,
    ]);
  });

  test('a gRPC interface the credential’s header cannot ride is passed over, and said so', async () => {
    const fake = await startPaths(
      [
        {binding: 'GRPC', version: '1.0'},
        {binding: 'JSONRPC', version: '1.0'},
      ],
      {card: KEY_CARD},
    );
    const result = await preview({
      appId: 'star',
      cardUrl: fake.cardUrl,
      catalogs: [star],
      credential: 'k-1',
    });
    expect(result.findings).toEqual([]);
    expect(result.notes).toEqual([
      `GRPC at A2A 1.0 (${fake.urls.GRPC}) was passed over: the credential's header "X-Star~Key" is not a name gRPC can carry; the request went to JSONRPC at A2A 1.0`,
    ]);
    expect(fake.requests.map(r => [r.binding, r.headers['x-star~key']])).toEqual([
      ['JSONRPC', 'k-1'],
    ]);
  });

  test('a credential gRPC refuses: the finding names UNAUTHENTICATED', async () => {
    const fake = await startPaths([{binding: 'GRPC', version: '0.3'}], {
      card: {
        securitySchemes: {key: {apiKeySecurityScheme: {location: 'header', name: 'X-Star-Key'}}},
        securityRequirements: [{schemes: {key: {list: []}}}],
      },
    });
    const result = await preview({
      appId: 'star',
      cardUrl: fake.cardUrl,
      catalogs: [star],
      credential: 'wrong',
    });
    expect(result.findings).toEqual(['the agent refused the credential: UNAUTHENTICATED']);
  });

  test('no interface reached: nothing captured, one finding', async () => {
    const fake = await startPaths([]);
    const grpc = `127.0.0.1:${await closedPort()}`;
    const result = await previewAhead(fake, [
      {url: grpc, protocolBinding: 'GRPC', protocolVersion: '1.0'},
    ]);
    expect(result.document).toBeNull();
    expect(result.findings).toEqual([
      `no interface the card lists was reached: GRPC at A2A 1.0 (${grpc}): no connection could be opened`,
    ]);
  });
});

describe('preview of an app whose card requires sign-in', () => {
  test('the credential rides as the header the card names; the document is the paint', async () => {
    agent = await startFakeAgent({signIn: 'apiKey'});
    const result = await preview({
      appId: 'star',
      cardUrl: agent.cardUrl,
      catalogs: [star],
      credential: 'secret-key',
    });
    expect(result.findings).toEqual([]);
    expect(result.signIn).toBe(true);
    expect(result.document?.capturedBy).toBe('publisher');
    expect(agent.requests[0]?.headers['x-star-key']).toBe('secret-key');
  });

  test('no credential: refused before any request', async () => {
    agent = await startFakeAgent({signIn: 'oauth'});
    const result = await preview({appId: 'star', cardUrl: agent.cardUrl, catalogs: [star]});
    expect(result.document).toBeNull();
    expect(result.findings).toEqual([
      'the card requires sign-in: set STELLIFY_CREDENTIAL to a credential of your own for this agent',
    ]);
    expect(agent.requests).toEqual([]);
  });

  test('a scheme the platform does not support: refused before any request', async () => {
    agent = await startFakeAgent({signIn: 'unsupported'});
    const result = await preview({
      appId: 'star',
      cardUrl: agent.cardUrl,
      catalogs: [star],
      credential: 'x',
    });
    expect(result.findings).toEqual([UNSUPPORTED_SCHEME]);
    expect(agent.requests).toEqual([]);
  });

  test('the agent refuses the credential', async () => {
    agent = await startFakeAgent({signIn: 'bearer', admit: () => false});
    const result = await preview({
      appId: 'star',
      cardUrl: agent.cardUrl,
      catalogs: [star],
      credential: 'bad',
    });
    expect(result.findings).toEqual(['the agent refused the credential: 401']);
  });

  test('the agent asks to sign in although a credential was sent', async () => {
    agent = await startFakeAgent({
      signIn: 'oauth',
      script: authRequiredScript('signIn', ['write']),
    });
    const result = await preview({
      appId: 'star',
      cardUrl: agent.cardUrl,
      catalogs: [star],
      credential: 'tok',
    });
    expect(result.findings).toEqual([
      'the agent asked to sign in although a credential was sent: signIn (write)',
    ]);
  });

  test("the agent asks to sign in in A2A 1.0's requirement shape: the same finding (task-20.4 decision 9)", async () => {
    agent = await startFakeAgent({
      signIn: 'oauth',
      script: ({ctx}) => [
        finalUpdate(ctx, 'auth-required', [
          {kind: 'data', data: authRequiredBody('1.0', 'signIn', ['write'])},
        ]),
      ],
    });
    const result = await preview({
      appId: 'star',
      cardUrl: agent.cardUrl,
      catalogs: [star],
      credential: 'tok',
    });
    expect(result.findings).toEqual([
      'the agent asked to sign in although a credential was sent: signIn (write)',
    ]);
  });

  test('a stream closing on auth-required, set by an update not marked final, has ended asking to sign in (task-20.2 decision 6)', async () => {
    agent = await startFakeAgent({
      signIn: 'oauth',
      script: ({ctx}) => [
        firstTurnTask(ctx),
        statusUpdate(
          ctx,
          'auth-required',
          [{kind: 'data', data: authRequiredBody('0.3', 'signIn', ['write'])}],
          false,
        ),
      ],
    });
    const result = await preview({
      appId: 'star',
      cardUrl: agent.cardUrl,
      catalogs: [star],
      credential: 'tok',
    });
    expect(result.findings).toEqual([
      'the agent asked to sign in although a credential was sent: signIn (write)',
    ]);
  });
});

describe('what refuses a preview', () => {
  /** A preview whose card URL answers `served` in place of the agent's own card. */
  const previewOf = (served: unknown, cardUrl: string) =>
    previewWith(
      {appId: 'star', cardUrl, catalogs: [star]},
      {
        fetchImpl: async (input, init) =>
          String(input) === cardUrl ? Response.json(served) : fetch(input, init),
      },
    );

  test('a card the reading refuses: one finding in the A2A SDK’s own words, nothing sent (task-20.3 decision 8)', async () => {
    agent = await startFakeAgent();
    const {skills: _skills, ...noSkills} = agent.card;
    const result = await previewOf(noSkills, agent.cardUrl);
    expect(result.document).toBeNull();
    expect(result.findings).toHaveLength(1);
    expect(result.findings[0]).toMatch(
      new RegExp(`^the card at ${agent.cardUrl} could not be read: .*agentCard\\.skills`),
    );
    expect(agent.requests).toEqual([]);
  });

  test('a card with no name is not an agent card', async () => {
    agent = await startFakeAgent();
    const result = await previewOf({url: agent.url}, agent.cardUrl);
    expect(result.findings).toEqual([
      `the card at ${agent.cardUrl} could not be read: not an agent card: no name`,
    ]);
    expect(agent.requests).toEqual([]);
  });

  test('a card listing no interface the platform speaks: the finding names both, nothing captured, nothing sent (task-20.3 decision 15)', async () => {
    agentV1 = await startFakeAgentV1({
      script: completingScriptV1(paintPartsV1(STAR_CATALOG_ID, {component: 'StarText'})),
      card: interfaces => cardForV1(interfaces, {catalogs: [STAR_CATALOG_ID]}),
    });
    const served = {
      ...(agentV1.served as object),
      supportedInterfaces: [
        {url: `${agentV1.url}/acme`, protocolBinding: 'ACME-RPC', protocolVersion: '1.0'},
      ],
    };
    const result = await previewOf(served, agentV1.cardUrl);
    expect(result.document).toBeNull();
    expect(result.findings).toEqual([
      'the card lists no interface A2UIVerse speaks: it lists ACME-RPC at A2A 1.0; A2UIVerse speaks JSONRPC, HTTP+JSON and GRPC at A2A 0.3 and 1.x',
    ]);
    expect(agentV1.requests).toEqual([]);
  });

  test('the card cannot be fetched', async () => {
    const result = await preview({
      appId: 'star',
      cardUrl: 'http://127.0.0.1:1/.well-known/agent-card.json',
      catalogs: [star],
    });
    expect(result.document).toBeNull();
    expect(result.findings[0]).toMatch(
      /^the card at http:\/\/127\.0\.0\.1:1\/\.well-known\/agent-card\.json could not be fetched: /,
    );
  });

  test('a handed artifact failing the gate, before any request', async () => {
    agent = await startFakeAgent();
    const broken = new Map(star);
    broken.set('extra.txt', new TextEncoder().encode('x'));
    const result = await preview({appId: 'star', cardUrl: agent.cardUrl, catalogs: [broken]});
    expect(result.findings).toEqual([
      `catalog artifact 1 (${STAR_CATALOG_ID}): extra.txt: present but not listed in the descriptor`,
    ]);
    expect(agent.requests).toEqual([]);
  });

  test('a paint that does not validate against its catalog', async () => {
    agent = await startFakeAgent({script: invalidPaintScript()});
    const result = await preview({appId: 'star', cardUrl: agent.cardUrl, catalogs: [star]});
    expect(result.document).toBeNull();
    expect(result.findings).toHaveLength(1);
    expect(result.findings[0]).toMatch(/^surface "s1": /);
  });

  test('the preview advertises the entitlement as one list read from the card', async () => {
    const advertised: unknown[] = [];
    const spy: SmokeRunner = request => {
      advertised.push(request.entitlement);
      return a2aSmokeRunner()(request);
    };
    agent = await startFakeAgent();
    const result = await previewWith(
      {appId: 'star', cardUrl: agent.cardUrl, catalogs: [star]},
      {smoke: spy},
    );
    expect(result.findings).toEqual([]);
    expect(advertised).toEqual([[BASIC_CATALOG_ID, STAR_CATALOG_ID]]);
  });

  test('a paint outside the entitlement', async () => {
    agent = await startFakeAgent({script: paintingScript('https://example.com/other.json')});
    const result = await preview({appId: 'star', cardUrl: agent.cardUrl, catalogs: [star]});
    expect(result.findings).toEqual([
      'surface "s1": its createSurface names catalog "https://example.com/other.json", outside its entitlement (/0/createSurface/catalogId)',
    ]);
  });

  test('the agent ends the task as failed, in its words', async () => {
    agent = await startFakeAgent({script: failedScript});
    const result = await preview({appId: 'star', cardUrl: agent.cardUrl, catalogs: [star]});
    expect(result.findings).toEqual(['the agent ended the task as failed: boom']);
  });

  test('the stream closes on a task that has not ended: never finished, the finding naming the last state', async () => {
    agent = await startFakeAgent({script: submittedOnlyScript});
    const result = await preview({appId: 'star', cardUrl: agent.cardUrl, catalogs: [star]});
    expect(result.findings).toEqual([
      'the agent never finished: the stream ended with its task still submitted',
    ]);
  });

  test('a status update marked final while its task is still working does not end the answer (task-20.2 decision 6)', async () => {
    agent = await startFakeAgent({
      script: ({ctx}) => [
        firstTurnTask(ctx),
        finalUpdate(ctx, 'working', paintParts(STAR_CATALOG_ID, {component: 'StarText'})),
      ],
    });
    const result = await preview({appId: 'star', cardUrl: agent.cardUrl, catalogs: [star]});
    expect(result.document).toBeNull();
    expect(result.findings).toEqual([
      'the agent never finished: the stream ended with its task still working',
    ]);
  });

  test('a stream that carried nothing never finished, before any answer', async () => {
    agent = await startFakeAgent();
    const result = await previewWith(
      {appId: 'star', cardUrl: agent.cardUrl, catalogs: [star]},
      {
        smoke: async ({card}) => ({
          kind: 'unfinished',
          messages: [],
          taken: card.supportedInterfaces[0]!,
          notReached: [],
        }),
      },
    );
    expect(result.findings).toEqual([
      'the agent never finished: the stream ended before any answer',
    ]);
  });

  test('the agent does not answer within the smoke timeout', async () => {
    agent = await startFakeAgent({script: hangingScript});
    const result = await preview({
      appId: 'star',
      cardUrl: agent.cardUrl,
      catalogs: [star],
      smokeTimeoutMs: 300,
    });
    expect(result.findings).toEqual([
      'the smoke request failed: the agent did not answer within 0.3 s',
    ]);
  });
});

describe('a catalog the marketplace holds', () => {
  test('its schema is fetched from the marketplace when no directory is handed; the notices come with it', async () => {
    agent = await startFakeAgent();
    marketplace = await startFakeMarketplace({
      entries: [
        entryFor('star', {publisher: 'acme', catalogs: {[STAR_CATALOG_ID]: starId}}),
        entryFor('moon', {
          publisher: 'acme',
          aheadOfStore: {
            catalogIds: ['https://example.com/moon/catalog.json'],
            version: '0.2.0',
            seenAt: '2026-10-10T01:00:00.000Z',
          },
        }),
        entryFor('other', {
          publisher: 'someone-else',
          aheadOfStore: {catalogIds: ['x'], seenAt: '2026-10-10T01:00:00.000Z'},
        }),
      ],
      artifacts: [star],
    });
    const result = await preview({
      appId: 'star',
      cardUrl: agent.cardUrl,
      catalogs: [],
      marketplace: marketplace.url,
      publisher: 'acme',
    });
    expect(result.findings).toEqual([]);
    expect(result.document).not.toBeNull();
    expect(result.notices).toEqual([
      {
        appId: 'moon',
        catalogIds: ['https://example.com/moon/catalog.json'],
        version: '0.2.0',
        seenAt: '2026-10-10T01:00:00.000Z',
      },
    ]);
    expect(marketplace.requests.map(r => r.path)).toEqual([
      'index.json',
      `artifacts/${starId}/artifact.json`,
      `artifacts/${starId}/catalog.json`,
    ]);
  });

  test('a marketplace that cannot be reached is a note, the run going on', async () => {
    agent = await startFakeAgent();
    const result = await preview({
      appId: 'star',
      cardUrl: agent.cardUrl,
      catalogs: [],
      marketplace: 'http://127.0.0.1:1',
      publisher: 'acme',
    });
    expect(result.notes).toHaveLength(1);
    expect(result.notes[0]).toMatch(/^cannot reach the marketplace at http:\/\/127\.0\.0\.1:1/);
    expect(result.findings).toEqual([
      `surface "s1": no schema for catalog ${JSON.stringify(STAR_CATALOG_ID)}`,
    ]);
  });
});

describe('preview of an agent that serves your account a card of its own (task-20.8 decision 14)', () => {
  const KEY = 'X-Star-Key';
  const signInCard = {
    securitySchemes: {key: {apiKeySecurityScheme: {location: 'header', name: KEY}}},
    securityRequirements: [{schemes: {key: {list: []}}}],
  };
  /** The agent answers JSON-RPC and HTTP+JSON at A2A 1.0; its public card lists JSON-RPC alone. */
  const startOwn = async (own: (fake: FakeAgentV1) => AgentCard | object | undefined) => {
    const paths: FakePath[] = [
      {binding: 'JSONRPC', version: '1.0'},
      {binding: 'HTTP+JSON', version: '1.0'},
    ];
    const fake: FakeAgentV1 = await startFakeAgentV1({
      script: completingScriptV1(paintPartsV1(STAR_CATALOG_ID, {component: 'StarText'})),
      card: interfaces =>
        cardForV1(interfaces, {
          name: 'Star Agent',
          catalogs: [STAR_CATALOG_ID],
          paths,
          extendedCard: true,
          card: signInCard,
        }),
      serve: card => {
        const json = AgentCard.toJSON(card) as {supportedInterfaces: object[]};
        return {...json, supportedInterfaces: json.supportedInterfaces.slice(0, 1)};
      },
      admit: request => request.header(KEY) !== 'wrong',
      extendedCard: () => {
        const card = own(fake);
        return card === undefined || 'supportedInterfaces' in card
          ? (card as AgentCard | undefined)
          : AgentCard.fromJSON(card);
      },
    });
    agentV1 = fake;
    return fake;
  };
  const ownCard = (fake: FakeAgentV1, options: CardV1Options = {}) =>
    cardForV1(fake.urls, {
      name: 'Star Agent',
      catalogs: [STAR_CATALOG_ID],
      paths: [{binding: 'HTTP+JSON', version: '1.0'}],
      extendedCard: true,
      card: signInCard,
      ...options,
    });
  const run = (fake: FakeAgentV1, credential = 'k-1') =>
    preview({appId: 'star', cardUrl: fake.cardUrl, catalogs: [star], credential});

  test('the account’s card is read, and the request walks it', async () => {
    const fake = await startOwn(fake => ownCard(fake));
    const result = await run(fake);
    expect(result.findings).toEqual([]);
    expect(result.notes).toContain(
      'the agent serves your account a card of its own: the request walks its interfaces, as a dispatch to your account will',
    );
    expect(result.document?.messages).toHaveLength(2);
    const sent = fake.requests.filter(({method}) => method.includes('message'));
    expect(sent.map(({binding}) => binding)).toEqual(['HTTP+JSON']);
  });

  test('a note for each sign-in scheme, scope and catalog id it names that the public card lacks', async () => {
    const fake = await startOwn(fake =>
      ownCard(fake, {
        catalogs: [STAR_CATALOG_ID, 'https://star.example/catalogs/other/v1'],
        card: {
          securitySchemes: {
            ...signInCard.securitySchemes,
            staff: {httpAuthSecurityScheme: {scheme: 'bearer'}},
          },
          securityRequirements: [{schemes: {key: {list: ['orders']}}}],
        },
      }),
    );
    const result = await run(fake);
    expect(result.findings).toEqual([]);
    expect(result.notes).toEqual(
      expect.arrayContaining([
        `your account's card names the sign-in scheme "staff", which the public card does not declare: A2UIVerse never signs in from an account's card`,
        `your account's card asks the scope "orders" of "key", which the public card does not ask: A2UIVerse asks only what the card as installed asks`,
        `your account's card names the catalog id "https://star.example/catalogs/other/v1", which the public card does not: A2UIVerse paints your app in the catalogs the public card names`,
      ]),
    );
  });

  test('no card of its own: a note, and the preview goes ahead on the public card', async () => {
    const fake = await startOwn(() => undefined);
    fake.serveExtendedCard(undefined);
    const result = await run(fake);
    expect(result.findings).toEqual([]);
    expect(result.notes).toContain(
      'the agent served your account no card of its own (it has none): the preview went ahead on the public card',
    );
    const sent = fake.requests.filter(({method}) => method.includes('Message'));
    expect(sent.map(({binding}) => binding)).toEqual(['JSONRPC']);
  });

  test('a card that does not read: the same note, saying why', async () => {
    const fake = await startOwn(() => undefined);
    fake.serveExtendedCard({raw: {hello: 'world'}});
    const result = await run(fake);
    expect(result.findings).toEqual([]);
    expect(result.notes).toContain(
      'the agent served your account no card of its own (it could not be read: not an agent card: no name): the preview went ahead on the public card',
    );
  });

  test('a card listing no interface the platform speaks is a finding, and nothing is captured', async () => {
    const fake = await startOwn(fake => ({
      ...(AgentCard.toJSON(ownCard(fake)) as object),
      supportedInterfaces: [
        {url: 'https://star.example/acme', protocolBinding: 'ACME-RPC', protocolVersion: '1.0'},
      ],
    }));
    const result = await run(fake);
    expect(result.document).toBeNull();
    expect(result.findings).toEqual([
      "your account's card lists no interface A2UIVerse speaks: it lists ACME-RPC at A2A 1.0; A2UIVerse speaks JSONRPC, HTTP+JSON and GRPC at A2A 0.3 and 1.x",
    ]);
    expect(fake.requests.filter(({method}) => method.includes('essage'))).toEqual([]);
  });

  test('no credential given: no card of its own is asked for', async () => {
    const fake = await startOwn(fake => ownCard(fake));
    await preview({appId: 'star', cardUrl: fake.cardUrl, catalogs: [star]});
    expect(fake.requests).toEqual([]);
  });
});

/** A card fixture of the sdk: upstream's sample agents' cards as served (task-21.10 decision 23.3). */
const upstreamCard = (name: string): Record<string, unknown> =>
  JSON.parse(
    readFileSync(new URL(`../../sdk/js/test/fixtures/cards/${name}`, import.meta.url), 'utf8'),
  );

/** A card's A2UI entries, one per URI, written by hand. */
const declaring = (...uris: string[]) =>
  uris.map(uri => ({uri, params: {supportedCatalogIds: [STAR_CATALOG_ID]}}));
const A2UI_V09 = 'https://a2ui.org/a2a-extension/a2ui/v0.9';
const A2UI_V11 = 'https://a2ui.org/a2a-extension/a2ui/v1.1';

/** The star paint, every message stamped `version`: written to be refused. */
const stampedScript = (version: string) =>
  completingScript(
    paintParts(STAR_CATALOG_ID, {component: 'StarText'}).map(part =>
      part.kind === 'data' ? {...part, data: {...(part.data as object), version}} : part,
    ),
  );

/** A smoke runner that records each request it is handed and sends none. */
const noSmoke = () => {
  const sent: unknown[] = [];
  const smoke: SmokeRunner = async request => {
    sent.push(request);
    throw new Error('the agent was called');
  };
  return {smoke, sent};
};

describe('preview of an agent on another A2UI version (task-21.15 decisions 1, 2, 3)', () => {
  test("upstream's ADK restaurant finder, declaring v0.8 and v0.9: refused alone, nothing sent", async () => {
    const cardUrl = 'http://127.0.0.1:1/.well-known/agent-card.json';
    const {smoke, sent} = noSmoke();
    const result = await previewWith(
      {appId: 'finder', cardUrl, catalogs: [], credential: 'tok'},
      {smoke, fetchImpl: async () => Response.json(upstreamCard('adk-restaurant-finder.json'))},
    );
    expect(result).toEqual({
      document: null,
      findings: [
        'the card declares A2UI v0.8 and v0.9, which A2UIVerse no longer supports: A2UIVerse speaks A2UI v1.0',
      ],
      notices: [],
      notes: [],
    });
    expect(sent).toEqual([]);
  });

  test('a card declaring only a newer version, and one declaring an older and a newer, each refused alone', async () => {
    agent = await startFakeAgent({extensions: declaring(A2UI_V11)});
    const newer = await preview({appId: 'star', cardUrl: agent.cardUrl, catalogs: [star]});
    expect(newer.findings).toEqual([
      'the card declares A2UI v1.1, which is newer than this A2UIVerse supports: A2UIVerse speaks A2UI v1.0',
    ]);
    expect(agent.requests).toEqual([]);
    await agent.close();
    agent = await startFakeAgent({extensions: declaring(A2UI_V09, A2UI_V11)});
    const both = await preview({appId: 'star', cardUrl: agent.cardUrl, catalogs: [star]});
    expect(both.findings).toEqual([
      'the card declares A2UI v0.9 and v1.1, not v1.0: v1.1 is newer than this A2UIVerse supports, and A2UIVerse speaks A2UI v1.0',
    ]);
    expect(agent.requests).toEqual([]);
  });

  test('a malformed v1.0 declaration is collected beside the other findings', async () => {
    agent = await startFakeAgent({
      extensions: [
        {uri: A2UI_EXTENSION_URI, params: {'1.0': {supportedCatalogIds: [STAR_CATALOG_ID]}}},
      ],
      signIn: 'bearer',
    });
    const result = await preview({appId: 'star', cardUrl: agent.cardUrl, catalogs: [star]});
    expect(result.findings).toEqual([
      'the card\'s A2UI v1.0 extension params: keyed under "1.0"; v1.0 params are read flat',
      'the card requires sign-in: set STELLIFY_CREDENTIAL to a credential of your own for this agent',
    ]);
    expect(agent.requests).toEqual([]);
  });

  test("upstream's Node restaurant finder, with no A2UI entry, previewed on the basic catalog against a scripted agent", async () => {
    const parts = paintParts(BASIC_CATALOG_ID);
    authored(
      BASIC_CATALOG_ID,
      parts.map(part => (part.kind === 'data' ? part.data : undefined)),
    );
    agent = await startFakeAgent({catalogs: [], script: completingScript(parts)});
    const node = {...upstreamCard('node-restaurant-finder.json'), url: agent.url};
    const result = await previewWith(
      {appId: 'finder', cardUrl: agent.cardUrl, catalogs: []},
      {
        fetchImpl: async (input, init) =>
          String(input) === agent!.cardUrl ? Response.json(node) : fetch(input, init),
      },
    );
    expect(result.findings).toEqual([]);
    expect(result.document?.words).toBe('Find me the top 10 chinese restaurants in the US');
    expect(result.document?.messages).toHaveLength(2);
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
      agent = await startFakeAgent({script: stampedScript(stamp)});
      const result = await preview({appId: 'star', cardUrl: agent.cardUrl, catalogs: [star]});
      expect(result.document).toBeNull();
      expect(result.findings).toEqual([finding]);
    },
  );

  test('an answer in v0.8, whose messages carry no version, refused as painting nothing', async () => {
    agent = await startFakeAgent({
      script: completingScript([
        {kind: 'data', data: {beginRendering: {surfaceId: 's1', root: 'root'}}},
        {kind: 'data', data: {surfaceUpdate: {surfaceId: 's1', components: []}}},
      ]),
    });
    const result = await preview({appId: 'star', cardUrl: agent.cardUrl, catalogs: [star]});
    expect(result.findings).toEqual(['the answer paints nothing: no createSurface']);
  });
});

/** The star artifact as `main` packed it for host-module interface `0.16.1`: its descriptor alone changed. */
const packedForOld = (files: ReadonlyMap<string, Uint8Array>): Map<string, Uint8Array> => {
  const descriptor = JSON.parse(new TextDecoder().decode(files.get(ARTIFACT_DESCRIPTOR_FILE)!));
  return new Map(files).set(
    ARTIFACT_DESCRIPTOR_FILE,
    new TextEncoder().encode(
      `${JSON.stringify({...descriptor, hostInterface: '0.16.1'}, null, 2)}\n`,
    ),
  );
};

describe('a catalog held, or handed, at a build packed for 0.16.1 (task-21.15 decision 4)', () => {
  test('an artifact packed for 0.16.1 is refused by name, nothing sent', async () => {
    agent = await startFakeAgent();
    const result = await preview({
      appId: 'star',
      cardUrl: agent.cardUrl,
      catalogs: [packedForOld(star)],
    });
    expect(result.findings).toEqual([
      `catalog artifact 1 (${STAR_CATALOG_ID}): host interface "0.16.1" is not one the platform supplies (it supplies "0.16.1-v1.0")`,
    ]);
    expect(agent.requests).toEqual([]);
  });

  test('a held row at a build packed for 0.16.1 is not resolved, a note saying why', async () => {
    const old = packedForOld(star);
    const oldId = await artifactIdOf(old.get(ARTIFACT_DESCRIPTOR_FILE)!);
    agent = await startFakeAgent();
    marketplace = await startFakeMarketplace({
      entries: [entryFor('star', {publisher: 'acme', catalogs: {[STAR_CATALOG_ID]: oldId}})],
      artifacts: [old],
    });
    const result = await preview({
      appId: 'star',
      cardUrl: agent.cardUrl,
      catalogs: [],
      marketplace: marketplace.url,
      publisher: 'acme',
    });
    expect(result.notes).toEqual([heldElsewhereNote(STAR_CATALOG_ID, '0.16.1')]);
    expect(result.notes[0]).toBe(
      `the marketplace holds catalog "${STAR_CATALOG_ID}" at a build packed for host interface "0.16.1", while the platform supplies "0.16.1-v1.0": it is not resolved, and publish takes a new build of it`,
    );
    expect(result.findings).toEqual([
      `surface "s1": no schema for catalog ${JSON.stringify(STAR_CATALOG_ID)}`,
    ]);
    expect(marketplace.requests.map(r => r.path)).toEqual([
      'index.json',
      `artifacts/${oldId}/artifact.json`,
    ]);
  });
});
