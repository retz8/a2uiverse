/**
 * A signer for tests (task-20.7 decision 19): a key pair, a card as served signed over the A2A
 * SDK's own canonical form, and the key set that holds the public halves. What a fake agent signs
 * its card with; the fixtures under `test/fixtures` come from a signer the platform did not write.
 */
import {AgentCard, canonicalizeAgentCard} from '@a2a-js/sdk';
import {exportJWK, FlattenedSign, generateKeyPair, type CryptoKey, type JWK} from 'jose';

export interface TestSigner {
  kid: string;
  alg: string;
  privateKey: CryptoKey;
  /** The public half as its key set lists it: `kid`, `alg` and `use` set. */
  publicJwk: JWK;
}

/** A fresh key pair under `kid` for `alg`, ES256 unless said. */
export async function testSigner({
  kid = 'test-1',
  alg = 'ES256',
}: {kid?: string; alg?: string} = {}): Promise<TestSigner> {
  const {privateKey, publicKey} = await generateKeyPair(alg, {extractable: true});
  return {kid, alg, privateKey, publicJwk: {...(await exportJWK(publicKey)), kid, alg, use: 'sig'}};
}

/** The key set listing each signer's public half, as an agent serves it. */
export function keySetOf(...signers: readonly TestSigner[]): {keys: JWK[]} {
  return {keys: signers.map(signer => signer.publicJwk)};
}

export interface SignOptions {
  /** The key set's URL the protected header names; left out when undefined. */
  jku: string | undefined;
  /** The protected header's `typ`, "JOSE" unless said; left out when undefined. */
  typ?: string | undefined;
  /** The protected header's `kid`, the signer's unless said; left out when undefined. */
  kid?: string | undefined;
  /** Parameters for the unprotected header. */
  header?: Record<string, string>;
}

/**
 * The card as served with one more signature by `signer` over the A2A SDK's canonical form of it,
 * as the A2A SDK's own signer makes it.
 */
export async function signServed<T extends object>(
  served: T,
  signer: TestSigner,
  options: SignOptions,
): Promise<T & {signatures: object[]}> {
  const kid = 'kid' in options ? options.kid : signer.kid;
  const typ = 'typ' in options ? options.typ : 'JOSE';
  const protectedHeader = {
    alg: signer.alg,
    ...(typ !== undefined ? {typ} : {}),
    ...(kid !== undefined ? {kid} : {}),
    ...(options.jku !== undefined ? {jku: options.jku} : {}),
  };
  const sign = new FlattenedSign(
    new TextEncoder().encode(canonicalizeAgentCard(served as AgentCard)),
  ).setProtectedHeader(protectedHeader);
  if (options.header) sign.setUnprotectedHeader(options.header);
  const jws = await sign.sign(signer.privateKey);
  const signature = {
    protected: jws.protected,
    signature: jws.signature,
    ...(jws.header ? {header: jws.header} : {}),
  };
  const earlier = (served as {signatures?: unknown}).signatures;
  return {...served, signatures: [...(Array.isArray(earlier) ? earlier : []), signature]};
}
