/**
 * The credential on each binding (task-20.5 decision 9). On JSON-RPC and HTTP+JSON it rides as
 * the HTTP header its scheme names. On gRPC it rides as one plain metadata entry under that
 * header's name in lowercase, A2A naming no key of its own for it: section 7.3 of the A2A 1.0
 * specification sends credentials "in protocol-appropriate headers or metadata", and section 10.2
 * has service parameters ride as gRPC metadata with lowercase keys. A name gRPC cannot carry as a
 * plain entry ("gRPC over HTTP2": a key of `0-9 a-z _ - .`, `grpc-` reserved, `-bin` for binary
 * values) cannot ride on a gRPC interface.
 */
import {isGrpc} from './address.js';
import type {AgentInterface} from '@a2a-js/sdk';

/** The credential as a request to the interface carries it, or the header gRPC cannot carry. */
export type CredentialOnBinding =
  {kind: 'rides'; serviceParameters: Record<string, string>} | {kind: 'cannot'; header: string};

/** The credential, as the HTTP header its scheme names, on the interface's binding. */
export function credentialOn(
  agentInterface: AgentInterface,
  credential: Readonly<Record<string, string>> = {},
): CredentialOnBinding {
  if (!isGrpc(agentInterface)) return {kind: 'rides', serviceParameters: {...credential}};
  const serviceParameters: Record<string, string> = {};
  for (const [header, value] of Object.entries(credential)) {
    const key = header.toLowerCase();
    if (!isPlainGrpcKey(key)) return {kind: 'cannot', header};
    serviceParameters[key] = value;
  }
  return {kind: 'rides', serviceParameters};
}

/** A key gRPC carries as a plain metadata entry, already in lowercase. */
function isPlainGrpcKey(key: string): boolean {
  return /^[0-9a-z_.-]+$/.test(key) && !key.startsWith('grpc-') && !key.endsWith('-bin');
}
