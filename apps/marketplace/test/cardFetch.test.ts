/** The live card fetched under the card timeout (task-13.3 decision 6). */
import {createServer, type Server} from 'node:http';
import {afterEach, describe, expect, test} from 'vitest';
import {cardFetcher} from '../src/cardFetch.js';
import {startFakeAgent, type FakeAgent} from './fakeAgent.js';

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

describe('cardFetcher', () => {
  test('fetches the card at its URL', async () => {
    agent = await startFakeAgent({name: 'Shop'});
    const card = await cardFetcher({timeoutMs: 5000})(agent.cardUrl);
    expect(card.name).toBe('Shop');
    expect(card.url).toBe(agent.url);
  });

  test('a URL that answers 404', async () => {
    agent = await startFakeAgent({noCard: true});
    await expect(cardFetcher({timeoutMs: 5000})(agent.cardUrl)).rejects.toThrow('404');
  });

  test('a body that is not a card', async () => {
    const url = await serve((_req, res) => res.end('{"hello": 1}'));
    await expect(cardFetcher({timeoutMs: 5000})(url)).rejects.toThrow('not an agent card');
  });

  test('a server that never answers: an error naming the timeout', async () => {
    const url = await serve(() => {});
    await expect(cardFetcher({timeoutMs: 200})(url)).rejects.toThrow('0.2 s');
  });
});
