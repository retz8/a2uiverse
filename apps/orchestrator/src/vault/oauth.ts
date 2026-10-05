/**
 * The vault's OAuth client (phase-12 decision 8): it follows the authorization server a card's
 * scheme names — its metadata (RFC 8414, or OpenID Connect discovery), a client ID metadata
 * document where the server takes one and can reach it, otherwise dynamic registration
 * (RFC 7591) — the authorization-code flow with S256 PKCE, refresh, revocation (RFC 7009), and
 * the ID token checked against the server's keys. A public client: no secret. No per-vendor code.
 */
import {createHash, createPublicKey, randomBytes, verify, type JsonWebKey} from 'node:crypto';

const FETCH_TIMEOUT_MS = 10_000;

export interface ServerMetadata {
  issuer: string;
  authorization_endpoint: string;
  token_endpoint: string;
  registration_endpoint?: string;
  revocation_endpoint?: string;
  jwks_uri?: string;
  scopes_supported?: string[];
  code_challenge_methods_supported?: string[];
  client_id_metadata_document_supported?: boolean;
}

export interface TokenResponse {
  access_token: string;
  token_type?: string;
  expires_in?: number;
  refresh_token?: string;
  scope?: string;
  id_token?: string;
}

/** A failure the server answered with: its `error`, or the HTTP status. */
export class OAuthError extends Error {
  constructor(
    readonly code: string,
    message: string,
  ) {
    super(message);
  }
}

export type Fetch = typeof fetch;

async function request(fetchImpl: Fetch, url: string, init?: RequestInit): Promise<Response> {
  return fetchImpl(url, {
    ...init,
    signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    redirect: 'manual',
  });
}

async function json(response: Response): Promise<Record<string, unknown>> {
  const text = await response.text();
  try {
    const parsed = JSON.parse(text) as unknown;
    return typeof parsed === 'object' && parsed !== null ? (parsed as Record<string, unknown>) : {};
  } catch {
    return {};
  }
}

/** The server's metadata, read from the scheme's metadata address. */
export async function discover(fetchImpl: Fetch, url: string): Promise<ServerMetadata> {
  const response = await request(fetchImpl, url, {headers: {Accept: 'application/json'}});
  if (!response.ok)
    throw new OAuthError('discovery', `metadata at ${url}: HTTP ${response.status}`);
  const body = await json(response);
  for (const field of ['issuer', 'authorization_endpoint', 'token_endpoint'] as const) {
    if (typeof body[field] !== 'string') {
      throw new OAuthError('discovery', `metadata at ${url} lacks ${field}`);
    }
  }
  return body as unknown as ServerMetadata;
}

/** A host the vault counts as this machine: localhost and the loopback addresses. */
export function isLocal(url: string): boolean {
  try {
    const host = new URL(url).hostname;
    return host === 'localhost' || host === '127.0.0.1' || host === '[::1]' || host === '::1';
  } catch {
    return false;
  }
}

/** https, or a local address: what the vault opens, and accepts an address on. */
export function isSecureOrLocal(url: string): boolean {
  try {
    return new URL(url).protocol === 'https:' || isLocal(url);
  } catch {
    return false;
  }
}

/** The client this orchestrator is, as its metadata document and its registrations say. */
export interface ClientIdentity {
  /** The metadata document's address: the client id where the server takes one. */
  documentUrl: string;
  redirectUri: string;
  name: string;
}

export function clientDocument(identity: ClientIdentity): Record<string, unknown> {
  return {
    client_id: identity.documentUrl,
    client_name: identity.name,
    redirect_uris: [identity.redirectUri],
    grant_types: ['authorization_code', 'refresh_token'],
    response_types: ['code'],
    token_endpoint_auth_method: 'none',
  };
}

/**
 * Which registration the server allows the vault (task-12.5 decision 3): a client ID metadata
 * document when advertised and reachable — our document's address is https, or the server is on
 * this machine — otherwise dynamic registration where advertised; else none.
 */
export function registrationFor(
  metadata: ServerMetadata,
  identity: ClientIdentity,
): 'document' | 'dynamic' | undefined {
  const reachable =
    identity.documentUrl.startsWith('https://') ||
    isLocal(metadata.issuer || metadata.authorization_endpoint);
  if (metadata.client_id_metadata_document_supported === true && reachable) return 'document';
  if (metadata.registration_endpoint) return 'dynamic';
  return undefined;
}

export async function registerDynamically(
  fetchImpl: Fetch,
  metadata: ServerMetadata,
  identity: ClientIdentity,
): Promise<string> {
  const response = await request(fetchImpl, metadata.registration_endpoint!, {
    method: 'POST',
    headers: {'Content-Type': 'application/json', Accept: 'application/json'},
    body: JSON.stringify({
      client_name: identity.name,
      redirect_uris: [identity.redirectUri],
      grant_types: ['authorization_code', 'refresh_token'],
      response_types: ['code'],
      token_endpoint_auth_method: 'none',
    }),
  });
  const body = await json(response);
  if (!response.ok || typeof body.client_id !== 'string') {
    throw new OAuthError(
      String(body.error ?? 'registration'),
      `registration refused: HTTP ${response.status}`,
    );
  }
  return body.client_id;
}

/** A fresh PKCE pair, `state` and `nonce` for one sign-in. */
export function freshSecrets(): {
  verifier: string;
  challenge: string;
  state: string;
  nonce: string;
} {
  const verifier = randomBytes(48).toString('base64url');
  return {
    verifier,
    challenge: createHash('sha256').update(verifier).digest('base64url'),
    state: randomBytes(24).toString('base64url'),
    nonce: randomBytes(24).toString('base64url'),
  };
}

export function authorizationUrl(
  metadata: ServerMetadata,
  params: {
    clientId: string;
    redirectUri: string;
    scopes: readonly string[];
    state: string;
    challenge: string;
    nonce?: string;
    loginHint?: string;
  },
): string {
  const url = new URL(metadata.authorization_endpoint);
  url.searchParams.set('response_type', 'code');
  url.searchParams.set('client_id', params.clientId);
  url.searchParams.set('redirect_uri', params.redirectUri);
  if (params.scopes.length > 0) url.searchParams.set('scope', params.scopes.join(' '));
  url.searchParams.set('state', params.state);
  url.searchParams.set('code_challenge', params.challenge);
  url.searchParams.set('code_challenge_method', 'S256');
  if (params.nonce) url.searchParams.set('nonce', params.nonce);
  if (params.loginHint) url.searchParams.set('login_hint', params.loginHint);
  return url.toString();
}

async function tokenRequest(
  fetchImpl: Fetch,
  endpoint: string,
  form: Record<string, string>,
): Promise<TokenResponse> {
  const response = await request(fetchImpl, endpoint, {
    method: 'POST',
    headers: {'Content-Type': 'application/x-www-form-urlencoded', Accept: 'application/json'},
    body: new URLSearchParams(form).toString(),
  });
  const body = await json(response);
  if (!response.ok || typeof body.access_token !== 'string') {
    throw new OAuthError(String(body.error ?? 'token'), `token endpoint: HTTP ${response.status}`);
  }
  return body as unknown as TokenResponse;
}

export function exchangeCode(
  fetchImpl: Fetch,
  tokenEndpoint: string,
  params: {code: string; clientId: string; redirectUri: string; verifier: string},
): Promise<TokenResponse> {
  return tokenRequest(fetchImpl, tokenEndpoint, {
    grant_type: 'authorization_code',
    code: params.code,
    client_id: params.clientId,
    redirect_uri: params.redirectUri,
    code_verifier: params.verifier,
  });
}

export function refreshTokens(
  fetchImpl: Fetch,
  tokenEndpoint: string,
  params: {refreshToken: string; clientId: string},
): Promise<TokenResponse> {
  return tokenRequest(fetchImpl, tokenEndpoint, {
    grant_type: 'refresh_token',
    refresh_token: params.refreshToken,
    client_id: params.clientId,
  });
}

/** RFC 7009, best-effort: true when the server answered 200. */
export async function revoke(
  fetchImpl: Fetch,
  endpoint: string,
  params: {token: string; hint: 'refresh_token' | 'access_token'; clientId: string},
): Promise<boolean> {
  const response = await request(fetchImpl, endpoint, {
    method: 'POST',
    headers: {'Content-Type': 'application/x-www-form-urlencoded'},
    body: new URLSearchParams({
      token: params.token,
      token_type_hint: params.hint,
      client_id: params.clientId,
    }).toString(),
  });
  return response.ok;
}

export interface IdClaims {
  sub: string;
  email?: string;
  preferred_username?: string;
  name?: string;
}

const ALGORITHMS: Record<string, {hash: string; dsa?: 'ieee-p1363'; pss?: boolean}> = {
  RS256: {hash: 'sha256'},
  RS384: {hash: 'sha384'},
  RS512: {hash: 'sha512'},
  PS256: {hash: 'sha256', pss: true},
  ES256: {hash: 'sha256', dsa: 'ieee-p1363'},
  ES384: {hash: 'sha384', dsa: 'ieee-p1363'},
};

/**
 * The ID token checked (task-12.5 decision 5): its signature against the server's keys, its
 * issuer, its audience, its nonce and its expiry. Throws when any fails.
 */
export async function verifyIdToken(
  fetchImpl: Fetch,
  token: string,
  expected: {issuer: string; clientId: string; nonce: string; jwksUri: string | undefined},
): Promise<IdClaims> {
  const [head, body, signature] = token.split('.');
  if (!head || !body || !signature) throw new OAuthError('id_token', 'the ID token is not a JWS');
  const header = JSON.parse(Buffer.from(head, 'base64url').toString('utf8')) as {
    alg?: string;
    kid?: string;
  };
  const algorithm = header.alg ? ALGORITHMS[header.alg] : undefined;
  if (!algorithm)
    throw new OAuthError('id_token', `the ID token's algorithm ${header.alg} is not taken`);
  if (!expected.jwksUri) throw new OAuthError('id_token', 'the server publishes no keys');
  const response = await request(fetchImpl, expected.jwksUri, {
    headers: {Accept: 'application/json'},
  });
  const keys = ((await json(response)).keys ?? []) as (JsonWebKey & {kid?: string; use?: string})[];
  const candidates = keys.filter(
    key =>
      (header.kid === undefined || key.kid === header.kid) &&
      (key.use === undefined || key.use === 'sig'),
  );
  const signed = Buffer.from(`${head}.${body}`);
  const raw = Buffer.from(signature, 'base64url');
  const valid = candidates.some(jwk => {
    try {
      const key = createPublicKey({key: jwk, format: 'jwk'});
      return verify(
        algorithm.hash,
        signed,
        {
          key,
          ...(algorithm.dsa ? {dsaEncoding: algorithm.dsa} : {}),
          ...(algorithm.pss ? {padding: 6 /* RSA_PKCS1_PSS_PADDING */, saltLength: 32} : {}),
        },
        raw,
      );
    } catch {
      return false;
    }
  });
  if (!valid) throw new OAuthError('id_token', "the ID token's signature does not hold");
  const claims = JSON.parse(Buffer.from(body, 'base64url').toString('utf8')) as Record<
    string,
    unknown
  >;
  const audience = Array.isArray(claims.aud) ? claims.aud : [claims.aud];
  if (claims.iss !== expected.issuer)
    throw new OAuthError('id_token', 'the ID token names another issuer');
  if (!audience.includes(expected.clientId))
    throw new OAuthError('id_token', 'the ID token is for another client');
  if (claims.nonce !== expected.nonce)
    throw new OAuthError('id_token', "the ID token's nonce does not match");
  if (typeof claims.exp !== 'number' || claims.exp * 1000 < Date.now() - 60_000) {
    throw new OAuthError('id_token', 'the ID token has expired');
  }
  if (typeof claims.sub !== 'string' || claims.sub === '') {
    throw new OAuthError('id_token', 'the ID token names no subject');
  }
  const text = (field: string) =>
    typeof claims[field] === 'string' && claims[field] !== ''
      ? (claims[field] as string)
      : undefined;
  return {
    sub: claims.sub,
    ...(text('email') ? {email: text('email')} : {}),
    ...(text('preferred_username') ? {preferred_username: text('preferred_username')} : {}),
    ...(text('name') ? {name: text('name')} : {}),
  };
}

/** The label from the sign-in (task-12.5 decision 12): email, then username, then name. */
export function labelFrom(claims: IdClaims | undefined): string | undefined {
  return claims?.email ?? claims?.preferred_username ?? claims?.name;
}

export function hashKey(key: string): string {
  return createHash('sha256').update(key).digest('hex');
}
