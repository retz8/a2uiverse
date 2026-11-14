/** The card's one reading over real cards, and what it refuses (task-20.3 decisions 1, 8, 21). */
import {describe, expect, test} from 'vitest';
import {cardReadError, readCard} from './readCard.js';
import {signInAlternatives} from './requirements.js';
import {fixture, trackedLegacyCards} from './trackedCards.js';

describe('a card written for A2A 0.3', () => {
  const tracked = trackedLegacyCards();

  test('the eleven tracked cards are the ones read', () => {
    expect(tracked).toHaveLength(11);
  });

  test.each(tracked)(
    '%s reads, its one interface JSON-RPC at its own A2A version',
    (_name, raw) => {
      const served = raw as {name: string; version: string; url: string; protocolVersion: string};
      const card = readCard(served);
      expect(card.name).toBe(served.name);
      expect(card.version).toBe(served.version);
      expect(card.supportedInterfaces).toEqual([
        {
          url: served.url,
          protocolBinding: 'JSONRPC',
          tenant: '',
          protocolVersion: served.protocolVersion,
        },
      ]);
    },
  );

  test('its further interfaces are at the A2A version the card spells, as its first is', () => {
    const served = {
      ...(fixture('python-as-0.3.json') as object),
      protocolVersion: '0.3.0',
      url: 'grpc.shop-b.example:443',
      preferredTransport: 'GRPC',
      additionalInterfaces: [
        {url: 'http://127.0.0.1:18731/', transport: 'JSONRPC'},
        {url: 'http://127.0.0.1:18731/rest', transport: 'HTTP+JSON'},
      ],
    };
    expect(
      readCard(served).supportedInterfaces.map(i => [i.protocolBinding, i.protocolVersion]),
    ).toEqual([
      ['GRPC', '0.3.0'],
      ['JSONRPC', '0.3.0'],
      ['HTTP+JSON', '0.3.0'],
    ]);
  });

  test('its sign-in is read into A2A 1.0’s shape', () => {
    const card = readCard(fixture('python-as-0.3.json'));
    expect(signInAlternatives(card)).toEqual([{signIn: ['things.read']}]);
    expect(card.securitySchemes.signIn?.scheme).toEqual({
      $case: 'oauth2SecurityScheme',
      value: expect.objectContaining({
        flows: {
          flow: {
            $case: 'authorizationCode',
            value: expect.objectContaining({
              authorizationUrl: 'http://127.0.0.1:18731/authorize',
              scopes: {'things.read': 'Read your things'},
            }),
          },
        },
      }),
    });
    expect(card.securitySchemes.key?.scheme).toEqual({
      $case: 'apiKeySecurityScheme',
      value: {description: 'Paste your key', location: 'header', name: 'X-Api-Key'},
    });
  });
});

describe('a card written in A2A 1.0’s shape', () => {
  test('Python’s a2a-sdk card reads with its interface and its sign-in', () => {
    const card = readCard(fixture('python-1.0.json'));
    expect(card.name).toBe('Fake Agent');
    expect(card.supportedInterfaces).toEqual([
      {
        url: 'http://127.0.0.1:18731/',
        protocolBinding: 'JSONRPC',
        tenant: '',
        protocolVersion: '1.0',
      },
    ]);
    expect(signInAlternatives(card)).toEqual([{signIn: ['things.read']}]);
    expect(card.securitySchemes.signIn?.scheme?.$case).toBe('oauth2SecurityScheme');
    expect(card.capabilities?.extensions).toEqual([
      {
        uri: 'https://a2ui.org/a2a-extension/a2ui/v0.9.1',
        description: '',
        required: false,
        params: {supportedCatalogIds: ['https://example.com/catalogs/fake/v1/catalog.json']},
      },
    ]);
  });

  test('a card listing both A2A versions keeps its interfaces in its own order', () => {
    const card = readCard(fixture('python-1.0-then-0.3.json'));
    expect(card.supportedInterfaces.map(i => i.protocolVersion)).toEqual(['1.0', '0.3']);
    expect(signInAlternatives(card)).toEqual([{signIn: ['things.read']}]);
  });

  test('the @a2a-js/sdk server’s card reads', () => {
    const card = readCard(fixture('javascript-1.0.json'));
    expect(card.name).toBe('Fake Agent');
    expect(card.skills.map(skill => skill.examples)).toEqual([['show my things']]);
    expect(card.supportedInterfaces.map(i => i.protocolVersion)).toEqual(['1.0', '0.3']);
  });

  test('a scheme the @a2a-js/sdk server serves in its in-memory form is dropped, as its own reader drops it', () => {
    const card = readCard(fixture('javascript-1.0-sign-in.json'));
    expect(signInAlternatives(card)).toEqual([{signIn: ['things.read']}]);
    expect(card.securitySchemes.signIn?.scheme).toBeUndefined();
  });

  test('the card that server serves to a caller naming no A2A version reads as asking no sign-in', () => {
    const served = fixture('javascript-no-version-named.json') as {security: unknown};
    expect(served.security).toEqual([{signIn: ['things.read']}]);
    expect(signInAlternatives(readCard(served))).toEqual([]);
  });
});

describe('a card that does not read', () => {
  test.each([[7], ['a card'], [null], [undefined], [[{name: 'Shop'}]]])(
    '%j is not an agent card',
    served => {
      expect(() => readCard(served)).toThrow(/^not an agent card$/);
    },
  );

  test('an object with no name is not an agent card', () => {
    expect(() => readCard({url: 'http://127.0.0.1:1'})).toThrow(/^not an agent card: no name$/);
    expect(() => readCard({name: 7})).toThrow(/^not an agent card: no name$/);
  });

  test('a 0.3 card the A2A SDK refuses is refused in the A2A SDK’s own words', () => {
    const served = {name: 'Shop', url: 'http://127.0.0.1:1', version: '0.1.0'};
    expect(() => readCard(served)).toThrow('agentCard.capabilities');
    expect(cardReadError(served)).toContain('agentCard.capabilities');
  });

  test('a card that reads has no read error', () => {
    expect(cardReadError(fixture('python-1.0.json'))).toBeUndefined();
  });
});
