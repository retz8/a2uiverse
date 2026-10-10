/**
 * Each sign-in app's preview credential under `--publish` (task-13.6 decision 8). For an app on the
 * agent kit's sign-in, a token straight from the agent through the kit's non-interactive entry —
 * register a client, the authorize address naming the roster entry's fake account in place of the
 * chooser's press, the code exchanged — for the scopes the card's first `security` alternative
 * asks, what the vault asks at a first sign-in; the client's transparency check signs in the same
 * way. For an app on an API key, the roster entry's demo key. Each credential is used for its one
 * preview and never written, printed, or sent to the marketplace: Stellify's `preview` puts it in
 * the header the card names and sends it to the agent alone.
 *
 * The entry is refused in live mode, which is why `--publish` is (decision 8). Each sign-in leaves a
 * registered client and an issued token in the agent's own sign-in store, unrevoked.
 */
import {createHash, randomBytes} from 'node:crypto';

/** The non-interactive entry on the kit's sign-in page (task-12.9 decision 12). */
const FAKE_ACCOUNT_PARAM = 'fake_account';

/** The return a direct sign-in names: nothing listens, the code is read off the redirect. */
const DIRECT_REDIRECT = 'http://127.0.0.1:8765/callback';

const TIMEOUT_MS = 10_000;

/** Whether the card requires sign-in: an OR of ANDs, an empty requirement meaning none (SPEC §8). */
export function requiresSignIn(card) {
  const security = card?.security;
  return (
    Array.isArray(security) &&
    security.length > 0 &&
    security.every(
      alternative =>
        typeof alternative === 'object' &&
        alternative !== null &&
        Object.keys(alternative).length > 0,
    )
  );
}

/**
 * The credential `entry`'s preview sends, for a card that requires sign-in: `{credential}`, or
 * `{reason}` the app is left out for. The card's first `security` alternative names the scheme.
 */
export async function previewCredential(card, entry, {fetchImpl = fetch} = {}) {
  const requirement = card.security[0];
  const key = Object.keys(requirement)[0];
  const scheme = card.securitySchemes?.[key];
  if (scheme?.type === 'apiKey' && scheme.in === 'header') {
    return entry.previewKey
      ? {credential: entry.previewKey}
      : {reason: 'its card asks an API key, and its roster entry names no previewKey'};
  }
  if (scheme?.type === 'oauth2' && scheme.oauth2MetadataUrl) {
    if (!entry.previewAs) {
      return {reason: 'its card asks sign-in, and its roster entry names no previewAs account'};
    }
    try {
      const token = await agentToken(
        scheme.oauth2MetadataUrl,
        requirement[key] ?? [],
        entry.previewAs,
        fetchImpl,
      );
      return {credential: token};
    } catch (err) {
      return {reason: `its preview could not sign in as ${entry.previewAs}: ${err.message}`};
    }
  }
  return {
    reason: `its card signs in with ${key}, a scheme the launcher cannot sign a preview in with`,
  };
}

/** A token straight from the agent: register, the entry naming `as` for `scopes`, the exchange. */
async function agentToken(metadataUrl, scopes, as, fetchImpl) {
  const signal = () => AbortSignal.timeout(TIMEOUT_MS);
  const metadataAnswer = await fetchImpl(metadataUrl, {signal: signal()});
  if (!metadataAnswer.ok) throw new Error(`its sign-in metadata answered ${metadataAnswer.status}`);
  const metadata = await metadataAnswer.json();
  const registered = await fetchImpl(metadata.registration_endpoint, {
    method: 'POST',
    headers: {'content-type': 'application/json'},
    body: JSON.stringify({
      redirect_uris: [DIRECT_REDIRECT],
      token_endpoint_auth_method: 'none',
      grant_types: ['authorization_code', 'refresh_token'],
      response_types: ['code'],
      client_name: 'A2UIVerse launcher preview',
    }),
    signal: signal(),
  });
  if (registered.status !== 201) throw new Error(`registering answered ${registered.status}`);
  const {client_id: clientId} = await registered.json();
  const verifier = randomBytes(48).toString('base64url');
  const challenge = createHash('sha256').update(verifier).digest('base64url');
  const authorize = new URL(metadata.authorization_endpoint);
  for (const [k, v] of Object.entries({
    response_type: 'code',
    client_id: clientId,
    redirect_uri: DIRECT_REDIRECT,
    scope: scopes.join(' '),
    state: randomBytes(24).toString('base64url'),
    code_challenge: challenge,
    code_challenge_method: 'S256',
    [FAKE_ACCOUNT_PARAM]: as,
  })) {
    authorize.searchParams.set(k, v);
  }
  const chosen = await fetchImpl(authorize, {redirect: 'manual', signal: signal()});
  const location = chosen.headers.get('location');
  if (chosen.status < 300 || chosen.status >= 400 || !location) {
    throw new Error(`the sign-in page answered ${chosen.status} with no redirect`);
  }
  const code = new URL(location, authorize).searchParams.get('code');
  if (!code) throw new Error(`the agent did not sign in as '${as}'`);
  const token = await fetchImpl(metadata.token_endpoint, {
    method: 'POST',
    headers: {'content-type': 'application/x-www-form-urlencoded'},
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      redirect_uri: DIRECT_REDIRECT,
      client_id: clientId,
      code_verifier: verifier,
    }),
    signal: signal(),
  });
  if (!token.ok) throw new Error(`the token exchange answered ${token.status}`);
  return (await token.json()).access_token;
}
