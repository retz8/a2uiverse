/** The `marketplace` script's one command (task-13.3 decision 12): `search <words>`. */
import {createServer, type Server} from 'node:http';
import {afterEach, describe, expect, test} from 'vitest';
import express from 'express';
import {runMarketplaceCommand, USAGE, type CommandIo} from '../src/command.js';
import {cardFor, entryFor} from './fixture.js';

const entry = (appId: string, name: string) =>
  entryFor(appId, cardFor(`http://127.0.0.1:1/${appId}`, {name}), {});

let server: Server | undefined;
afterEach(async () => {
  await new Promise<void>(resolve => (server ? server.close(() => resolve()) : resolve()));
  server = undefined;
});

async function serveSearch(results: unknown[]) {
  const app = express();
  const queries: string[] = [];
  app.get('/search', (req, res) => {
    queries.push(String(req.query.q));
    res.json({results});
  });
  server = createServer(app);
  await new Promise<void>(resolve => server!.listen(0, '127.0.0.1', resolve));
  const address = server.address();
  if (!address || typeof address === 'string') throw new Error('no port');
  return {url: `http://127.0.0.1:${address.port}`, queries};
}

function io(env: Record<string, string | undefined> = {}) {
  const out: string[] = [];
  const err: string[] = [];
  const lines: CommandIo = {env, out: line => out.push(line), err: line => err.push(line)};
  return {lines, out, err};
}

describe('marketplace search', () => {
  test('prints each result: the app id, its name and its score, in rank order', async () => {
    const {url, queries} = await serveSearch([
      {entry: entry('sky', 'Sky'), score: 0.91234},
      {entry: entry('shop', 'Shop'), score: 0.1},
    ]);
    const {lines, out, err} = io({MARKETPLACE_URL: url});
    expect(await runMarketplaceCommand(['search', 'weather', 'forecast'], lines)).toBe(0);
    expect(queries).toEqual(['weather forecast']);
    expect(out).toEqual(['sky  Sky  0.912', 'shop  Shop  0.100']);
    expect(err).toEqual([]);
  });

  test('no results', async () => {
    const {url} = await serveSearch([]);
    const {lines, out} = io({MARKETPLACE_URL: url});
    expect(await runMarketplaceCommand(['search', 'x'], lines)).toBe(0);
    expect(out).toEqual(['no apps published']);
  });

  test('reaches the marketplace at MARKETPLACE_URL, else localhost on PORT, else 10002', async () => {
    const {lines, err} = io({});
    expect(await runMarketplaceCommand(['search', 'x'], lines)).toBe(1);
    expect(err[0]).toContain('http://localhost:10002');
    const {lines: onPort, err: portErr} = io({PORT: '1'});
    expect(await runMarketplaceCommand(['search', 'x'], onPort)).toBe(1);
    expect(portErr[0]).toContain('http://localhost:1');
  });

  test('usage for anything else', async () => {
    const {lines, err} = io({});
    expect(await runMarketplaceCommand([], lines)).toBe(1);
    expect(err).toEqual(USAGE);
    const {lines: bad, err: badErr} = io({});
    expect(await runMarketplaceCommand(['search'], bad)).toBe(1);
    expect(badErr).toEqual(USAGE);
  });
});
