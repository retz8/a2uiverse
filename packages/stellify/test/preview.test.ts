/** `preview` (task-13.4 decisions 5–8, 12): the paint captured on the publisher's machine. */
import {ARTIFACT_DESCRIPTOR_FILE, artifactIdOf, SMOKE_GREETING} from '@a2uiverse/sdk';
import {afterEach, beforeAll, describe, expect, test} from 'vitest';
import {UNSUPPORTED_SCHEME} from '../src/credential.js';
import {artifactFiles, preview, stellify} from '../src/index.js';
import {
  authRequiredScript,
  failedScript,
  hangingScript,
  invalidPaintScript,
  noFinalScript,
  paintingScript,
  STAR_CATALOG_ID,
  startFakeAgent,
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
let marketplace: FakeMarketplace | undefined;
afterEach(async () => {
  await agent?.close();
  await marketplace?.close();
  agent = marketplace = undefined;
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
        {version: 'v0.9', createSurface: {surfaceId: 's1', catalogId: STAR_CATALOG_ID}},
        {
          version: 'v0.9',
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
});

describe('what refuses a preview', () => {
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

  test('a paint outside the entitlement', async () => {
    agent = await startFakeAgent({script: paintingScript('https://example.com/other.json')});
    const result = await preview({appId: 'star', cardUrl: agent.cardUrl, catalogs: [star]});
    expect(result.findings).toEqual([
      'surface "s1" is painted in catalog "https://example.com/other.json", outside the entitlement',
    ]);
  });

  test('the agent ends the task as failed, in its words', async () => {
    agent = await startFakeAgent({script: failedScript});
    const result = await preview({appId: 'star', cardUrl: agent.cardUrl, catalogs: [star]});
    expect(result.findings).toEqual(['the agent ended the task as failed: boom']);
  });

  test('the stream ends with no final event', async () => {
    agent = await startFakeAgent({script: noFinalScript});
    const result = await preview({appId: 'star', cardUrl: agent.cardUrl, catalogs: [star]});
    expect(result.findings).toEqual([
      'the agent never finished: the stream ended without a final event',
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
