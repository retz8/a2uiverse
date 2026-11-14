/**
 * Where an interface is (task-20.5 decision 10): the host and port a connection is opened to,
 * whether it is opened with TLS, and the URL the A2A SDK is handed. JSON-RPC and HTTP+JSON name a
 * URL, its scheme saying TLS. gRPC is read in both spellings: a bare `host:port`, as the A2A SDK's
 * own sample agent writes it, and a URL with a scheme, as the A2A specification's example card
 * writes it. The A2A SDK is handed `host:port`, the URL's path left out, since `@grpc/grpc-js`
 * reads a target with a scheme as a name it cannot resolve.
 */
import type {AgentInterface} from '@a2a-js/sdk';
import {isLocalMachine} from '@a2uiverse/card';

export interface InterfaceAddress {
  host: string;
  port: number;
  tls: boolean;
  /** The interface's URL as the A2A SDK is handed it. */
  dialUrl: string;
}

const DEFAULT_PORTS: Record<string, number> = {'http:': 80, 'https:': 443};
const GRPC_DEFAULT_PORT = 443;

/** Whether a binding is gRPC, compared as the A2A SDK compares bindings: whatever its case. */
export function isGrpc(agentInterface: AgentInterface): boolean {
  return agentInterface.protocolBinding.toUpperCase() === 'GRPC';
}

/** The interface's address; undefined when its URL is no address the platform can open. */
export function addressOf(agentInterface: AgentInterface): InterfaceAddress | undefined {
  const url = agentInterface.url.trim();
  if (!isGrpc(agentInterface)) return fromUrl(url, {keepUrl: true});
  if (/^[a-z][a-z0-9+.-]*:\/\//i.test(url)) return fromUrl(url, {keepUrl: false});
  return fromBareHostPort(url);
}

function fromUrl(url: string, {keepUrl}: {keepUrl: boolean}): InterfaceAddress | undefined {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return undefined;
  }
  const defaultPort = DEFAULT_PORTS[parsed.protocol];
  if (defaultPort === undefined || parsed.hostname === '') return undefined;
  const port = parsed.port === '' ? defaultPort : Number(parsed.port);
  return {
    host: unbracketed(parsed.hostname),
    port,
    tls: parsed.protocol === 'https:',
    dialUrl: keepUrl ? url : `${parsed.hostname}:${port}`,
  };
}

/**
 * A bare `host:port`, with TLS unless the host is the local machine. A host with no port is on
 * 443, as `@grpc/grpc-js` reads it.
 */
function fromBareHostPort(hostPort: string): InterfaceAddress | undefined {
  let parsed: URL;
  try {
    parsed = new URL(`placeholder://${hostPort}`);
  } catch {
    return undefined;
  }
  if (parsed.hostname === '' || parsed.host !== hostPort) return undefined;
  const host = unbracketed(parsed.hostname);
  const port = parsed.port === '' ? GRPC_DEFAULT_PORT : Number(parsed.port);
  // The local machine as the card package names it, where a key set over `http` is taken too.
  return {host, port, tls: !isLocalMachine(host), dialUrl: `${parsed.hostname}:${port}`};
}

/** An IPv6 literal without the brackets a URL writes it in. */
function unbracketed(hostname: string): string {
  return hostname.startsWith('[') && hostname.endsWith(']') ? hostname.slice(1, -1) : hostname;
}
