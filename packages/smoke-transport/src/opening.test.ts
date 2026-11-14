/** Opening a connection within a time limit (task-20.5 decisions 3, 4). */
import {createServer, type Server, type Socket} from 'node:net';
import {afterEach, describe, expect, test} from 'vitest';
import {openConnection} from './opening.js';

const servers: Array<{server: Server; sockets: Set<Socket>}> = [];
afterEach(async () => {
  for (const {sockets} of servers) for (const socket of sockets) socket.destroy();
  await Promise.all(
    servers
      .splice(0)
      .map(({server}) => new Promise<void>(resolve => server.close(() => resolve()))),
  );
});

/** A TCP server that takes connections and writes nothing. */
async function listening(): Promise<number> {
  const sockets = new Set<Socket>();
  const server = createServer(socket => {
    sockets.add(socket);
    socket.on('error', () => {});
  });
  await new Promise<void>(resolve => server.listen(0, '127.0.0.1', resolve));
  servers.push({server, sockets});
  return (server.address() as {port: number}).port;
}

async function closedPort(): Promise<number> {
  const server = createServer();
  await new Promise<void>(resolve => server.listen(0, '127.0.0.1', resolve));
  const {port} = server.address() as {port: number};
  await new Promise<void>(resolve => server.close(() => resolve()));
  return port;
}

const at = (port: number, tls = false) => ({host: '127.0.0.1', port, tls, dialUrl: ''});
const options = {timeoutMs: 300, alpn: 'http/1.1' as const};

describe('openConnection', () => {
  test('a connection accepted is opened', async () => {
    expect(await openConnection(at(await listening()), options)).toBe(true);
  });

  test('a connection refused is not', async () => {
    expect(await openConnection(at(await closedPort()), options)).toBe(false);
  });

  test('a name that does not resolve is not', async () => {
    const address = {host: 'agent.invalid', port: 443, tls: true, dialUrl: ''};
    expect(await openConnection(address, options)).toBe(false);
  });

  test('a TLS handshake that never ends is not, once the time limit passes', async () => {
    const started = Date.now();
    expect(await openConnection(at(await listening(), true), options)).toBe(false);
    expect(Date.now() - started).toBeGreaterThanOrEqual(290);
  });

  test('an aborted signal rejects with its reason', async () => {
    const controller = new AbortController();
    const opening = openConnection(at(await listening(), true), {
      ...options,
      timeoutMs: 5000,
      signal: controller.signal,
    });
    controller.abort(new Error('left'));
    await expect(opening).rejects.toThrow('left');
  });
});
