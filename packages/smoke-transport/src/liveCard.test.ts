/** The live card fetched under its timeout and kept as served (task-20.2 decisions 4, 5). */
import {createServer, type Server} from 'node:http';
import {afterEach, describe, expect, test} from 'vitest';
import {fetchLiveCard} from './liveCard.js';
import {cardFor, completingScript, startFakeAgent, type FakeAgent} from './testing/fakeAgent.js';

let agent: FakeAgent | undefined;
let server: Server | undefined;
afterEach(async () => {
  await agent?.close();
  agent = undefined;
  await new Promise<void>(resolve => (server ? server.close(() => resolve()) : resolve()));
  server = undefined;
});

async function serve(handler: Parameters<typeof createServer>[1]) {
  server = createServer(handler);
  await new Promise<void>(resolve => server!.listen(0, '127.0.0.1', resolve));
  const address = server.address();
  if (!address || typeof address === 'string') throw new Error('no port');
  return `http://127.0.0.1:${address.port}/card.json`;
}

const start = (noCard = false) =>
  startFakeAgent({
    script: completingScript([]),
    card: url => cardFor(url, {name: 'Shop', version: '0.3.0'}),
    noCard,
  });

describe('fetchLiveCard', () => {
  test('the card at its URL, as its agent served it', async () => {
    agent = await start();
    const card = await fetchLiveCard(agent.cardUrl, {timeoutMs: 5000});
    expect(card).toEqual(agent.card);
  });

  test('a URL that answers 404', async () => {
    agent = await start(true);
    await expect(fetchLiveCard(agent.cardUrl, {timeoutMs: 5000})).rejects.toThrow('HTTP 404');
  });

  test('a body that is not JSON', async () => {
    const url = await serve((_req, res) => res.end('<html>'));
    await expect(fetchLiveCard(url, {timeoutMs: 5000})).rejects.toThrow('not JSON');
  });

  test('a body that is no object', async () => {
    const url = await serve((_req, res) => res.end('7'));
    await expect(fetchLiveCard(url, {timeoutMs: 5000})).rejects.toThrow('not an agent card');
  });

  test("a card written in A2A 1.0's shape, with no url of its own, is refused (task-20.2 decision 5)", async () => {
    const url = await serve((_req, res) =>
      res.end(
        JSON.stringify({
          name: 'Shop',
          supportedInterfaces: [
            {url: 'http://127.0.0.1:1', protocolBinding: 'JSONRPC', protocolVersion: '1.0'},
          ],
        }),
      ),
    );
    await expect(fetchLiveCard(url, {timeoutMs: 5000})).rejects.toThrow(
      'not an agent card: no url or name',
    );
  });

  test('a server that never answers: an error naming the timeout', async () => {
    const url = await serve(() => {});
    await expect(fetchLiveCard(url, {timeoutMs: 200})).rejects.toThrow(
      'did not answer within 0.2 s',
    );
  });

  test('nothing listening', async () => {
    await expect(
      fetchLiveCard('http://127.0.0.1:1/card.json', {timeoutMs: 5000}),
    ).rejects.toThrow();
  });
});
