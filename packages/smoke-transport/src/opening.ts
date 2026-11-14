/**
 * Opening a connection to an interface (task-20.5 decisions 3, 4): the name resolved, the
 * connection accepted and, with TLS, the handshake done, within a time limit. A TLS dial checks the
 * agent's certificate against the authorities Node trusts, and offers the application protocol
 * its binding speaks: HTTP/2 for gRPC, HTTP/1.1 for JSON-RPC and HTTP+JSON. The connection is let
 * go once open: the A2A SDK opens its own for the request, so a dial that opens one here has
 * reached an agent that accepts connections, and a request that fails after it never moves the
 * walk on.
 */
import {connect as connectTcp, isIP, type Socket} from 'node:net';
import {connect as connectTls} from 'node:tls';
import type {InterfaceAddress} from './address.js';

export interface OpenConnectionOptions {
  timeoutMs: number;
  /** The application protocol a TLS connection offers. */
  alpn: 'h2' | 'http/1.1';
  signal?: AbortSignal;
}

/**
 * Opens a connection and lets it go: true once it opened, false when it could not be opened in
 * time. Rejects with the signal's reason once the signal is aborted.
 */
export type OpenConnection = (
  address: InterfaceAddress,
  options: OpenConnectionOptions,
) => Promise<boolean>;

export const openConnection: OpenConnection = (address, {timeoutMs, alpn, signal}) =>
  new Promise<boolean>((resolve, reject) => {
    if (signal?.aborted) return reject(signal.reason);
    const socket: Socket = address.tls
      ? connectTls({
          host: address.host,
          port: address.port,
          ALPNProtocols: [alpn],
          ...(isIP(address.host) === 0 ? {servername: address.host} : {}),
        })
      : connectTcp({host: address.host, port: address.port});
    const settle = (outcome: () => void) => {
      clearTimeout(timer);
      signal?.removeEventListener('abort', onAbort);
      socket.removeAllListeners();
      socket.on('error', () => {});
      socket.destroy();
      outcome();
    };
    const onAbort = () => settle(() => reject(signal?.reason));
    const timer = setTimeout(() => settle(() => resolve(false)), timeoutMs);
    signal?.addEventListener('abort', onAbort, {once: true});
    socket.once(address.tls ? 'secureConnect' : 'connect', () => settle(() => resolve(true)));
    socket.once('error', () => settle(() => resolve(false)));
  });
