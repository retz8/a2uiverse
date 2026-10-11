/**
 * Browser writes (task-14.3 decisions 1, 2): the allowed origins read from the orchestrator's own
 * address, and the guard every write passes — the JSON content type first, then the token or an
 * allowed origin, saying who made the write.
 */
import {createServer, type Server} from 'node:http';
import {afterEach, describe, expect, test} from 'vitest';
import express from 'express';
import {callerOf, originAllowed, writeGuard} from '../src/writeGuard.js';

describe('the allowed origins', () => {
  test('a tunnelled orchestrator admits its own tunnel on any port, and localhost', () => {
    const allowed = originAllowed('https://vnw20xbg-10001.asse.devtunnels.ms');
    for (const origin of [
      'https://vnw20xbg-5173.asse.devtunnels.ms',
      'https://vnw20xbg-10001.asse.devtunnels.ms',
      'http://localhost:5173',
      'http://127.0.0.1:5173',
      'http://localhost',
    ]) {
      expect(allowed(origin), origin).toBe(true);
    }
    for (const origin of [
      'https://other123-5173.asse.devtunnels.ms',
      'https://vnw20xbg-5173.usw2.devtunnels.ms',
      'http://vnw20xbg-5173.asse.devtunnels.ms',
      'https://vnw20xbg-5173.asse.devtunnels.ms.evil.example',
      'https://evil.example',
      'null',
    ]) {
      expect(allowed(origin), origin).toBe(false);
    }
  });

  test('an orchestrator on localhost admits localhost alone', () => {
    const allowed = originAllowed('http://localhost:10001');
    expect(allowed('http://localhost:5173')).toBe(true);
    expect(allowed('https://vnw20xbg-5173.asse.devtunnels.ms')).toBe(false);
  });
});

let server: Server | undefined;
afterEach(async () => {
  await new Promise<void>(resolve => (server ? server.close(() => resolve()) : resolve()));
  server = undefined;
});

const TOKEN = 'the-write-token';

async function serve() {
  const app = express();
  const guard = writeGuard({
    token: () => TOKEN,
    allowed: originAllowed('https://vnw20xbg-10001.asse.devtunnels.ms'),
  });
  app.post('/write', guard, express.json(), (req, res) => {
    res.json({by: callerOf(res), body: req.body as unknown});
  });
  server = createServer(app);
  await new Promise<void>(resolve => server!.listen(0, '127.0.0.1', resolve));
  const address = server.address();
  if (!address || typeof address === 'string') throw new Error('no port');
  return `http://127.0.0.1:${address.port}/write`;
}

const write = (url: string, headers: Record<string, string>, body = JSON.stringify({a: 1})) =>
  fetch(url, {method: 'POST', headers, body});

describe('the write guard', () => {
  test('a JSON write from an allowed origin needs no token, and is the page’s', async () => {
    const url = await serve();
    const res = await write(url, {
      'content-type': 'application/json',
      origin: 'https://vnw20xbg-5173.asse.devtunnels.ms',
    });
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({by: 'page', body: {a: 1}});
  });

  test('a JSON write with the token is the token caller’s', async () => {
    const url = await serve();
    const res = await write(url, {
      'content-type': 'application/json',
      authorization: `Bearer ${TOKEN}`,
    });
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({by: 'token', body: {a: 1}});
  });

  test('a JSON write from an origin outside the list is refused', async () => {
    const url = await serve();
    const res = await write(url, {
      'content-type': 'application/json',
      origin: 'https://other123-5173.asse.devtunnels.ms',
    });
    expect(res.status).toBe(403);
    expect(await res.json()).toMatchObject({ok: false});
  });

  test('a form-style post with a localhost origin is refused before any other check', async () => {
    const url = await serve();
    for (const type of ['application/x-www-form-urlencoded', 'text/plain', 'multipart/form-data']) {
      const res = await write(url, {'content-type': type, origin: 'http://localhost:10001'}, 'a=1');
      expect(res.status, type).toBe(415);
    }
    const tokened = await write(
      url,
      {'content-type': 'text/plain', authorization: `Bearer ${TOKEN}`},
      'a=1',
    );
    expect(tokened.status).toBe(415);
  });

  test('a write with neither an origin nor the token, or with a wrong token, is refused', async () => {
    const url = await serve();
    expect((await write(url, {'content-type': 'application/json'})).status).toBe(401);
    const wrong = await write(url, {
      'content-type': 'application/json',
      authorization: 'Bearer nope',
      origin: 'http://localhost:5173',
    });
    expect(wrong.status).toBe(401);
  });
});
