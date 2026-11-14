/**
 * The live card fetched under its time limit and kept as served (task-20.3 decisions 3, 4), a
 * signed card checked as it is fetched, the key set under the same limit (task-20.7 decisions 2, 8).
 */
import {createServer, type IncomingMessage, type Server, type ServerResponse} from 'node:http';
import {afterEach, describe, expect, test} from 'vitest';
import {fetchLiveCard} from './liveCard.js';
import {UnconfirmedCardError} from './signatures.js';
import {keySetOf, signServed, testSigner} from './testing/signer.js';
import {fixture} from './trackedCards.js';

let server: Server | undefined;
afterEach(async () => {
  server?.closeAllConnections();
  await new Promise<void>(resolve => (server ? server.close(() => resolve()) : resolve()));
  server = undefined;
});

async function serve(handler: (req: IncomingMessage, res: ServerResponse) => void) {
  server = createServer(handler);
  await new Promise<void>(resolve => server!.listen(0, '127.0.0.1', resolve));
  const address = server.address();
  if (!address || typeof address === 'string') throw new Error('no port');
  return `http://127.0.0.1:${address.port}/card.json`;
}

describe('fetchLiveCard', () => {
  test('the card at its URL, as its agent served it', async () => {
    const served = fixture('python-1.0-then-0.3.json');
    const url = await serve((_req, res) => res.end(JSON.stringify(served)));
    expect(await fetchLiveCard(url, {timeoutMs: 5000})).toEqual({served});
  });

  test('the request names A2A 1.0 and asks for JSON', async () => {
    const seen: IncomingMessage['headers'][] = [];
    const url = await serve((req, res) => {
      seen.push(req.headers);
      res.end('{}');
    });
    await fetchLiveCard(url, {timeoutMs: 5000});
    expect(seen).toHaveLength(1);
    expect(seen[0]!['a2a-version']).toBe('1.0');
    expect(seen[0]!.accept).toBe('application/json');
  });

  test('a card written for A2A 0.3 is kept as served too', async () => {
    const served = fixture('python-as-0.3.json');
    const url = await serve((_req, res) => res.end(JSON.stringify(served)));
    expect(await fetchLiveCard(url, {timeoutMs: 5000})).toEqual({served});
  });

  test('an injected fetch is the one used', async () => {
    const calls: string[] = [];
    const fetchImpl: typeof fetch = async input => {
      calls.push(String(input));
      return new Response('{"name":"Shop"}');
    };
    expect(
      await fetchLiveCard('http://shop.example/card.json', {timeoutMs: 5000, fetchImpl}),
    ).toEqual({served: {name: 'Shop'}});
    expect(calls).toEqual(['http://shop.example/card.json']);
  });

  test('a URL that answers 404', async () => {
    const url = await serve((_req, res) => {
      res.statusCode = 404;
      res.end();
    });
    await expect(fetchLiveCard(url, {timeoutMs: 5000})).rejects.toThrow(/^HTTP 404$/);
  });

  test('a body that is not JSON', async () => {
    const url = await serve((_req, res) => res.end('<html>'));
    await expect(fetchLiveCard(url, {timeoutMs: 5000})).rejects.toThrow('not JSON');
  });

  test.each(['7', 'null', '"a card"', '[{"name":"Shop"}]'])(
    'a body of %s is not an agent card',
    async body => {
      const url = await serve((_req, res) => res.end(body));
      await expect(fetchLiveCard(url, {timeoutMs: 5000})).rejects.toThrow(/^not an agent card$/);
    },
  );

  test('a server that never answers: an error naming the time limit', async () => {
    const url = await serve(() => {});
    await expect(fetchLiveCard(url, {timeoutMs: 200})).rejects.toThrow(
      /^did not answer within 0.2 s$/,
    );
  });

  test('nothing listening', async () => {
    await expect(
      fetchLiveCard('http://127.0.0.1:1/card.json', {timeoutMs: 5000}),
    ).rejects.toThrow();
  });
});

describe('a signed card fetched (task-20.7 decisions 2, 8, 10)', () => {
  /** An agent at a local port serving `card(origin)` at /card.json and its key set at /jwks.json. */
  async function signedAgent(
    keySet: (req: IncomingMessage, res: ServerResponse, keys: object) => void = (_req, res, keys) =>
      res.end(JSON.stringify(keys)),
  ) {
    const signer = await testSigner();
    // Signed once the port is known, since the key set's URL names it.
    const signed: {card?: object} = {};
    const url = await serve((req, res) => {
      if (req.url === '/jwks.json') return keySet(req, res, keySetOf(signer));
      res.end(JSON.stringify(signed.card));
    });
    const origin = new URL(url).origin;
    signed.card = await signServed(cardAt(origin), signer, {jku: `${origin}/jwks.json`});
    return {url, origin, card: signed.card};
  }

  test('a card that passes: as served, with the signature that passed', async () => {
    const {url, origin, card} = await signedAgent();
    expect(await fetchLiveCard(url, {timeoutMs: 5000})).toEqual({
      served: card,
      signature: {kid: 'test-1', jku: `${origin}/jwks.json`, alg: 'ES256'},
    });
  });

  test('a card that does not pass: refused as fetched', async () => {
    const {url} = await signedAgent((_req, res) => res.end('{"keys": []}'));
    const failure = await fetchLiveCard(url, {timeoutMs: 5000}).catch((err: unknown) => err);
    expect(failure).toBeInstanceOf(UnconfirmedCardError);
    expect((failure as Error).message).toMatch(/holds no key under kid "test-1"/);
  });

  test('the card’s time limit covers its key set: one that never answers is the card not answering', async () => {
    const {url, origin} = await signedAgent(() => {});
    const failure = await fetchLiveCard(url, {timeoutMs: 300}).catch((err: unknown) => err);
    expect(failure).not.toBeInstanceOf(UnconfirmedCardError);
    expect((failure as Error).message).toBe(
      `the key set at ${origin}/jwks.json did not answer within 0.3 s`,
    );
  });

  test('a key set that redirects is not followed, even to a key set that would pass', async () => {
    const asked: string[] = [];
    const {url} = await signedAgent((req, res) => {
      asked.push(req.url ?? '');
      res.statusCode = 302;
      res.setHeader('location', '/jwks.json?again');
      res.end();
    });
    await expect(fetchLiveCard(url, {timeoutMs: 5000})).rejects.toThrow(
      /answered with a redirect, which is not followed/,
    );
    expect(asked).toEqual(['/jwks.json']);
  });
});

/** A card in A2A 1.0's JSON served at `origin`. */
function cardAt(origin: string): object {
  return {
    name: 'Shop',
    description: 'a shop',
    version: '1.0.0',
    supportedInterfaces: [
      {url: `${origin}/a2a`, protocolBinding: 'JSONRPC', protocolVersion: '1.0'},
    ],
    skills: [{id: 'shop', name: 'Shop', description: 'shops', tags: []}],
  };
}
