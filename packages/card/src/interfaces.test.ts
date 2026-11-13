/** Which interface the platform takes, and what a publisher reads (task-20.3 decisions 10, 15). */
import type {AgentCard, AgentInterface} from '@a2a-js/sdk';
import {describe, expect, test} from 'vitest';
import {
  a2aVersionOf,
  cardToDial,
  noInterfaceFinding,
  SPOKEN_BINDINGS,
  spokenInterfaces,
} from './interfaces.js';
import {readCard} from './readCard.js';
import {fixture} from './trackedCards.js';

const at = (
  protocolBinding: string,
  protocolVersion: string,
  url = `http://127.0.0.1:1/${protocolBinding}/${protocolVersion}`,
): AgentInterface => ({url, protocolBinding, protocolVersion, tenant: ''});

const cardListing = (...supportedInterfaces: AgentInterface[]): AgentCard => ({
  ...readCard(fixture('javascript-1.0.json')),
  supportedInterfaces,
});

describe('spokenInterfaces', () => {
  test('JSON-RPC is the one binding spoken', () => {
    expect(SPOKEN_BINDINGS).toEqual(['JSONRPC']);
  });

  test('a custom binding alone is not spoken', () => {
    expect(spokenInterfaces(cardListing(at('ACME-RPC', '1.0')))).toEqual([]);
  });

  test.each(['HTTP+JSON', 'GRPC'])('%s alone is not spoken', binding => {
    expect(spokenInterfaces(cardListing(at(binding, '1.0')))).toEqual([]);
    expect(spokenInterfaces(cardListing(at(binding, '0.3')))).toEqual([]);
  });

  test.each(['2.0', '0.2', '0.2.9', '10', 'one', '1.x'])(
    'an A2A version of %s is not spoken',
    version => {
      expect(spokenInterfaces(cardListing(at('JSONRPC', version)))).toEqual([]);
    },
  );

  test.each(['0.3', '0.3.0', '0.4', '0.9.2', '1.0', '1.0.0', '1.1', '1', ' 1.0 '])(
    'an A2A version of %s is spoken',
    version => {
      const listed = at('JSONRPC', version);
      expect(spokenInterfaces(cardListing(listed))).toEqual([listed]);
    },
  );

  test('an absent A2A version counts as 0.3', () => {
    const listed = at('JSONRPC', '');
    expect(spokenInterfaces(cardListing(listed))).toEqual([listed]);
    expect(a2aVersionOf(listed)).toBe('0.3');
    expect(a2aVersionOf(at('JSONRPC', '0.3.0'))).toBe('0.3.0');
  });

  test('a binding is matched whatever its case, as the A2A SDK matches it', () => {
    const listed = at('jsonrpc', '1.0');
    expect(spokenInterfaces(cardListing(listed))).toEqual([listed]);
  });

  test('two interfaces on JSON-RPC are taken in the card’s order, each way', () => {
    const legacy = at('JSONRPC', '0.3');
    const current = at('JSONRPC', '1.0');
    expect(spokenInterfaces(cardListing(legacy, current))).toEqual([legacy, current]);
    expect(spokenInterfaces(cardListing(current, legacy))).toEqual([current, legacy]);
  });

  test('an interface the platform does not speak ahead of one it does is passed over', () => {
    const current = at('JSONRPC', '1.0');
    expect(spokenInterfaces(cardListing(at('GRPC', '1.0'), current))).toEqual([current]);
  });

  test('an interface naming no URL is not spoken: a card written for A2A 0.3 with no `url`', () => {
    const legacy = fixture('python-as-0.3.json') as {url?: string};
    const {url: _url, ...noUrl} = legacy;
    const card = readCard(noUrl);
    expect(card.supportedInterfaces).toHaveLength(1);
    expect(spokenInterfaces(card)).toEqual([]);
    expect(noInterfaceFinding(card)).toBe(
      'the card lists no interface A2UIVerse speaks: it lists JSONRPC at A2A 0.3 with no URL; A2UIVerse speaks JSONRPC at A2A 0.3 and 1.x',
    );
  });

  test('a card listing no interface is unreachable', () => {
    expect(spokenInterfaces(cardListing())).toEqual([]);
  });

  test('a card from Python’s a2a-sdk listing JSON-RPC at 1.0 then 0.3 takes 1.0', () => {
    const [taken] = spokenInterfaces(readCard(fixture('python-1.0-then-0.3.json')));
    expect(taken?.protocolVersion).toBe('1.0');
  });
});

describe('cardToDial', () => {
  test('the read card listing the one interface taken, the card itself unchanged', () => {
    const legacy = at('JSONRPC', '0.3');
    const card = cardListing(legacy, at('JSONRPC', '1.0'));
    const dialed = cardToDial(card, legacy);
    expect(dialed.supportedInterfaces).toEqual([legacy]);
    expect(dialed.name).toBe(card.name);
    expect(card.supportedInterfaces).toHaveLength(2);
  });
});

describe('noInterfaceFinding', () => {
  test('names what the card lists, as it spells it, and what the platform speaks', () => {
    expect(noInterfaceFinding(readCard(fixture('python-1.0-grpc-and-rest.json')))).toBe(
      'the card lists no interface A2UIVerse speaks: it lists GRPC at A2A 1.0 and HTTP+JSON at A2A 1.0; A2UIVerse speaks JSONRPC at A2A 0.3 and 1.x',
    );
  });

  test('an interface with no A2A version says so', () => {
    expect(noInterfaceFinding(cardListing(at('grpc', ''), at('JSONRPC', '2.0')))).toBe(
      'the card lists no interface A2UIVerse speaks: it lists grpc with no A2A version and JSONRPC at A2A 2.0; A2UIVerse speaks JSONRPC at A2A 0.3 and 1.x',
    );
  });

  test('a card listing no interface at all', () => {
    expect(noInterfaceFinding(cardListing())).toBe('the card lists no interface');
  });
});
