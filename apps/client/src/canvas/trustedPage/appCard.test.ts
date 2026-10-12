/**
 * What the trusted page says of an app, from its card and its listing (task 14.7): the tile, the
 * questions to try, what signing in will be, the listing's press, the sample's caption.
 */
import {describe, expect, it} from 'vitest';
import type {IndexEntry, PublishedCard, UpdateState} from '@a2uiverse/sdk';
import {
  bringsNewLook,
  dayOf,
  listingAct,
  newScopeWords,
  sampleCaption,
  signInOf,
  tileLetter,
  tryAsking,
} from './appCard';

const card = (more: Partial<PublishedCard> = {}): PublishedCard => ({
  name: 'Linear',
  description: 'Shows the user’s Linear issues.',
  url: 'http://127.0.0.1:11005',
  version: '1.0.0',
  ...more,
});

const LINEAR_SCHEMES = {
  linear: {
    type: 'oauth2',
    flows: {
      authorizationCode: {
        authorizationUrl: 'https://linear.example/authorize',
        tokenUrl: 'https://linear.example/token',
        scopes: {read: 'See your issues', write: 'Create, change and comment on your issues'},
      },
    },
  },
};

const entry = (c: PublishedCard = card()): IndexEntry => ({
  appId: 'linear',
  publisher: 'a2uiverse-apps',
  cardUrl: 'http://127.0.0.1:11005/.well-known/agent-card.json',
  card: c,
  catalogs: {},
  versions: [c.version],
  publishedAt: '2026-10-03T10:00:00Z',
  retired: [],
});

describe('the tile and the questions to try (task-14.7 decisions 8, 9)', () => {
  it('draws the first letter of the name', () => {
    expect(tileLetter('Google Calendar')).toBe('G');
    expect(tileLetter('shop A')).toBe('S');
  });

  it('takes the first example of each skill, up to three', () => {
    const skills = [
      {name: 'a', description: '', examples: ['What’s assigned to me?', 'second']},
      {name: 'b', description: ''},
      {name: 'c', description: '', examples: ['What am I working on?']},
      {name: 'd', description: '', examples: ['Which issues are in progress?']},
      {name: 'e', description: '', examples: ['never']},
    ];
    expect(tryAsking(card({skills}))).toEqual([
      'What’s assigned to me?',
      'What am I working on?',
      'Which issues are in progress?',
    ]);
  });
});

describe('what signing in will be (task-14.7 decision 10)', () => {
  it('asks nothing with no security, or an empty alternative', () => {
    expect(signInOf(card())).toEqual({kind: 'none'});
    expect(signInOf(card({security: [{}, {linear: ['read']}]}))).toEqual({kind: 'none'});
  });

  it('names what the app will be able to do, in the card’s words', () => {
    expect(
      signInOf(card({securitySchemes: LINEAR_SCHEMES, security: [{linear: ['read', 'write']}]})),
    ).toEqual({
      kind: 'signIn',
      words: ['See your issues', 'Create, change and comment on your issues'],
    });
  });

  it('says connect with a key for a bearer token or a header key', () => {
    expect(
      signInOf(
        card({
          securitySchemes: {k: {type: 'apiKey', in: 'header', name: 'X-Key'}},
          security: [{k: []}],
        }),
      ),
    ).toEqual({kind: 'key'});
    expect(
      signInOf(card({securitySchemes: {b: {type: 'http', scheme: 'Bearer'}}, security: [{b: []}]})),
    ).toEqual({kind: 'key'});
  });

  it('is not supported for a scheme the platform cannot sign in with', () => {
    expect(
      signInOf(card({securitySchemes: {m: {type: 'mutualTLS'}}, security: [{m: []}]})),
    ).toEqual({kind: 'unsupported'});
  });

  it('words a card update’s new permissions from the published card', () => {
    expect(
      newScopeWords(card({securitySchemes: LINEAR_SCHEMES}), [
        {scheme: 'linear', scopes: ['write']},
      ]),
    ).toEqual(['Create, change and comment on your issues']);
  });
});

describe('the press a listing carries (task-14.2 decision 8)', () => {
  const update = (state: UpdateState): UpdateState => state;
  it('is Install for an app not installed, Installed with nothing waiting', () => {
    expect(listingAct({entry: entry(), installed: false})).toEqual({kind: 'install'});
    expect(listingAct({entry: entry(), installed: true})).toEqual({kind: 'installed'});
    expect(
      listingAct({
        entry: entry(),
        installed: true,
        update: update({
          appId: 'linear',
          installedVersion: '1.0.0',
          state: 'up-to-date',
          publishedVersion: '1.0.0',
        }),
      }),
    ).toEqual({kind: 'installed'});
  });

  it('is Update in the App Library’s words, the card update through the consent card', () => {
    const major = listingAct({
      entry: entry(),
      installed: true,
      update: update({
        appId: 'linear',
        installedVersion: '1.0.0',
        state: 'major-update',
        publishedVersion: '2.0.0',
        newCatalogIds: [],
        builds: [],
      }),
    });
    expect(major).toMatchObject({
      kind: 'update',
      words: 'A new version is available',
      consent: false,
    });
    const asks = listingAct({
      entry: entry(),
      installed: true,
      update: update({
        appId: 'linear',
        installedVersion: '1.0.0',
        state: 'card-update',
        publishedVersion: '1.1.0',
        newScopes: [{scheme: 'linear', scopes: ['write']}],
        builds: [{catalogId: 'urn:c', installed: 'sha256-a', published: 'sha256-b'}],
      }),
    });
    expect(asks).toMatchObject({
      kind: 'update',
      words: 'An update that asks for more',
      consent: true,
    });
    if (asks.kind === 'update') expect(bringsNewLook(asks.state)).toBe(true);
  });

  it('says an update on its way from the publisher, with no press', () => {
    expect(
      listingAct({
        entry: entry(),
        installed: true,
        update: update({
          appId: 'linear',
          installedVersion: '1.0.0',
          state: 'ahead-of-store',
          publishedVersion: '1.0.0',
          catalogIds: ['urn:c'],
        }),
      }),
    ).toEqual({kind: 'waiting', words: 'A newer version is on its way from the publisher'});
  });
});

describe('the sample’s caption (task-14.7 decision 11)', () => {
  const now = new Date('2026-10-12T00:00:00Z');
  it('says the Store made it when the app was published, or the publisher with their account', () => {
    expect(
      sampleCaption({capturedBy: 'marketplace', capturedAt: '2026-10-03T10:00:00Z'}, 'Shop A', now),
    ).toBe('Made by the Store when Shop A was published, Oct 3');
    expect(
      sampleCaption({capturedBy: 'publisher', capturedAt: '2026-10-03T10:00:00Z'}, 'Linear', now),
    ).toBe('Made by the publisher with their own account, Oct 3');
  });

  it('adds the year when it is not this year’s', () => {
    expect(dayOf('2025-12-24T10:00:00Z', now)).toBe('Dec 24, 2025');
  });
});
