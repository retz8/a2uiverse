/**
 * The check of a signed card (task-20.7 decisions 1 to 7): a signature on a card read as A2A 1.0
 * checked against the key it names, in the key set its protected header names on the card URL's
 * own origin, under a fixed list of public-key algorithms, over the payload the A2A SDK's own
 * canonical form makes from the card as served. A pass says the card is intact against the keys
 * at its agent's own origin and nothing about who its publisher is.
 *
 * The check is handed a card and the card URL whose origin its key sets must be on, so it can be
 * given a card that did not come from that URL (task-20.7 decision 16).
 */
import {AgentCard, canonicalizeAgentCard} from '@a2a-js/sdk';
import {isLegacyAgentCard} from '@a2a-js/sdk/compat/v0_3/client';
import {
  base64url,
  createLocalJWKSet,
  decodeProtectedHeader,
  errors,
  flattenedVerify,
  type CryptoKey,
  type JSONWebKeySet,
  type ProtectedHeaderParameters,
} from 'jose';
import type {ServedCard} from './readCard.js';

/**
 * The algorithms a signature passes under (task-20.7 decision 4): public-key algorithms alone, so
 * `none` and the shared-secret HMAC algorithms never pass.
 */
export const SIGNATURE_ALGORITHMS: readonly string[] = [
  'RS256',
  'RS384',
  'RS512',
  'PS256',
  'PS384',
  'PS512',
  'ES256',
  'ES384',
  'ES512',
  'EdDSA',
];

/** The hosts that name the local machine, where a key set over `http` is taken. */
const LOCAL_HOSTS: ReadonlySet<string> = new Set(['localhost', '127.0.0.1', '::1']);

/** Whether a host names the local machine; an IPv6 literal with or without its brackets. */
export function isLocalMachine(host: string): boolean {
  const bare = host.startsWith('[') && host.endsWith(']') ? host.slice(1, -1) : host;
  return LOCAL_HOSTS.has(bare);
}

/** The signature that passed: the key it was checked against, as its protected header names it. */
export interface PassedSignature {
  kid: string;
  jku: string;
  alg: string;
}

/**
 * A signed card none of whose signatures passed: the card was fetched and is refused (task-20.7
 * decision 9). The message is the publisher's finding.
 */
export class UnconfirmedCardError extends Error {
  override readonly name = 'UnconfirmedCardError';
}

export interface CheckSignaturesOptions {
  /** The card URL as the platform holds it: every key set must be on its origin. */
  cardUrl: string;
  /** The card's own time limit, shared with the card's fetch (task-20.7 decision 2). */
  signal: AbortSignal;
  /** That limit, for the words of a key set that did not answer within it. */
  timeoutMs: number;
  fetchImpl?: typeof fetch;
}

/**
 * The card's signatures checked: none for a card taken as an unsigned card is — one with no
 * signature, or one read as written for A2A 0.3 whatever its signatures hold (task-20.7 decision
 * 6) — else the first signature that passes. Throws an {@link UnconfirmedCardError} when none
 * passes, and a plain error, in a finding's words, when a key set did not answer within the time
 * limit and nothing passed: that is the card not answering (task-20.7 decision 10).
 */
export async function checkSignatures(
  served: ServedCard,
  options: CheckSignaturesOptions,
): Promise<PassedSignature | undefined> {
  if (isLegacyAgentCard(served)) return undefined;
  const {signatures} = AgentCard.fromJSON(served);
  if (signatures.length === 0) return undefined;
  const payload = base64url.encode(canonicalizeAgentCard(served as AgentCard));
  const keySets = new KeySets(options);
  const reasons: string[] = [];
  let unanswered: string | undefined;
  for (const signature of signatures) {
    const judged = await judge(signature, payload, keySets, options.cardUrl);
    if ('passed' in judged) return judged.passed;
    if ('unanswered' in judged) unanswered ??= judged.unanswered;
    reasons.push(judged.reason);
  }
  if (unanswered !== undefined) throw new Error(unanswered);
  throw new UnconfirmedCardError(
    reasons.length === 1
      ? `the card's signature did not pass: ${reasons[0]}`
      : `none of the card's ${reasons.length} signatures passed: ${reasons.map((reason, i) => `${i + 1}: ${reason}`).join('; ')}`,
  );
}

/** What a publisher reads of a pass, at publish and at `stellify preview`. */
export function passedNote({kid, jku, alg}: PassedSignature): string {
  return `the card's signature passed: key ${JSON.stringify(kid)} (${alg}) in the key set at ${jku}`;
}

type Judged = {passed: PassedSignature} | {reason: string} | {reason: string; unanswered: string};

type Signature = AgentCard['signatures'][number];

async function judge(
  signature: Signature,
  payload: string,
  keySets: KeySets,
  cardUrl: string,
): Promise<Judged> {
  let header: ProtectedHeaderParameters;
  try {
    header = decodeProtectedHeader({protected: signature.protected});
  } catch {
    return {reason: 'its protected header could not be read'};
  }
  // `kid` and `jku` from the protected header alone (task-20.7 decision 3).
  for (const parameter of ['alg', 'typ', 'kid', 'jku'] as const) {
    const value = header[parameter];
    if (typeof value !== 'string' || value === '') {
      return {reason: `its protected header names no ${parameter}`};
    }
  }
  const {alg, kid, jku} = header as {alg: string; kid: string; jku: string};
  if (!SIGNATURE_ALGORITHMS.includes(alg)) {
    return {
      reason: `it is signed with ${alg}, which A2UIVerse does not take: it takes ${SIGNATURE_ALGORITHMS.slice(0, -1).join(', ')} and ${SIGNATURE_ALGORITHMS.at(-1)}`,
    };
  }
  const where = keySetPlace(jku, cardUrl);
  if (where !== undefined) return {reason: where};
  const keySet = await keySets.fetch(jku);
  if ('reason' in keySet) return keySet;
  let keys: CryptoKey[];
  try {
    keys = [await createLocalJWKSet(keySet.jwks)({alg, kid})];
  } catch (err) {
    if (err instanceof errors.JWKSNoMatchingKey) {
      return {
        reason: `the key set at ${jku} holds no key under kid ${JSON.stringify(kid)} for ${alg}`,
      };
    }
    if (!(err instanceof errors.JWKSMultipleMatchingKeys)) {
      return {
        reason: `the key set at ${jku} holds no usable key under kid ${JSON.stringify(kid)}: ${(err as Error).message}`,
      };
    }
    // Several keys under one kid for the algorithm: each tried, as a rotation may list them.
    keys = [];
    for await (const key of err) keys.push(key);
    if (keys.length === 0) {
      return {reason: `the key set at ${jku} holds no usable key under kid ${JSON.stringify(kid)}`};
    }
  }
  const jws = {
    payload,
    protected: signature.protected,
    signature: signature.signature,
    ...(signature.header !== undefined ? {header: signature.header} : {}),
  };
  let last: unknown;
  for (const key of keys) {
    try {
      await flattenedVerify(jws, key, {algorithms: [...SIGNATURE_ALGORITHMS]});
      return {passed: {kid, jku, alg}};
    } catch (err) {
      last = err;
    }
  }
  if (last instanceof errors.JWSSignatureVerificationFailed) {
    return {
      reason: `it does not match the card, checked against key ${JSON.stringify(kid)} at ${jku}`,
    };
  }
  return {
    reason: `it could not be checked against key ${JSON.stringify(kid)} at ${jku}: ${(last as Error).message}`,
  };
}

/**
 * Why a key set's URL is not one the check fetches (task-20.7 decision 2): not a URL, not on the
 * card URL's own origin — its scheme, host and port — or not `https` off the local machine.
 * Undefined for a URL it fetches.
 */
function keySetPlace(jku: string, cardUrl: string): string | undefined {
  let keySet: URL;
  try {
    keySet = new URL(jku);
  } catch {
    return `its jku ${jku} is not a URL`;
  }
  const origin = new URL(cardUrl).origin;
  if (keySet.origin !== origin) {
    return `its key set ${jku} is not on the card URL's origin, ${origin}`;
  }
  if (
    keySet.protocol !== 'https:' &&
    !(keySet.protocol === 'http:' && isLocalMachine(keySet.hostname))
  ) {
    return `its key set ${jku} is not fetched over https`;
  }
  return undefined;
}

type FetchedKeySet =
  {jwks: JSONWebKeySet} | {reason: string} | {reason: string; unanswered: string};

/**
 * The key sets one check fetches, each once, under the card's time limit, following no redirect
 * (task-20.7 decision 2). Nothing is kept past the check.
 */
class KeySets {
  readonly #options: CheckSignaturesOptions;
  readonly #fetched = new Map<string, Promise<FetchedKeySet>>();

  constructor(options: CheckSignaturesOptions) {
    this.#options = options;
  }

  fetch(jku: string): Promise<FetchedKeySet> {
    let pending = this.#fetched.get(jku);
    if (!pending) {
      pending = this.#fetch(jku);
      this.#fetched.set(jku, pending);
    }
    return pending;
  }

  async #fetch(jku: string): Promise<FetchedKeySet> {
    const {signal, timeoutMs, fetchImpl = fetch} = this.#options;
    const unanswered = (): FetchedKeySet => {
      const words = `the key set at ${jku} did not answer within ${timeoutMs / 1000} s`;
      return {reason: words, unanswered: words};
    };
    let response: Response;
    try {
      response = await fetchImpl(jku, {
        signal,
        redirect: 'manual',
        headers: {accept: 'application/json'},
      });
    } catch (err) {
      if (signal.aborted) return unanswered();
      const words = `the key set at ${jku} did not answer: ${(err as Error).message}`;
      return {reason: words, unanswered: words};
    }
    if (response.type === 'opaqueredirect' || (response.status >= 300 && response.status < 400)) {
      return {reason: `the key set at ${jku} answered with a redirect, which is not followed`};
    }
    if (!response.ok) return {reason: `the key set at ${jku} answered HTTP ${response.status}`};
    let body: unknown;
    try {
      body = await response.json();
    } catch {
      if (signal.aborted) return unanswered();
      return {reason: `the key set at ${jku} is not JSON`};
    }
    if (!isKeySet(body)) return {reason: `the key set at ${jku} is no JSON Web Key Set`};
    return {jwks: body};
  }
}

function isKeySet(value: unknown): value is JSONWebKeySet {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return false;
  const {keys} = value as {keys?: unknown};
  return (
    Array.isArray(keys) &&
    keys.every(key => typeof key === 'object' && key !== null && !Array.isArray(key))
  );
}
