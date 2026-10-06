/**
 * Signing an orchestrator in through the real flow (task-12.12 decisions 5 and 7), as the popup
 * does but as a plain HTTP client: the orchestrator's start route, which sets its cookie and sends
 * the browser on to the agent's sign-in page; the kit's non-interactive entry naming a fake account
 * added to that address, in place of the chooser's press; the agent's return to the vault's
 * callback, with the cookie; the attempt polled to its outcome. An app on an API key is given its
 * demo key on the orchestrator's key page. The start route signs in from a canvas the orchestrator
 * holds, so a canvas is opened first, with a question about the platform that dispatches no app.
 *
 * The same entry signs a script in straight at an agent, the hub left out: the transparency check's
 * direct side, as the account the hub's slot holds.
 */
import {randomBytes, createHash} from 'node:crypto';
import type {A2AMessageSender} from '../../src/a2a/client';
import {driveTurn} from './drive';
import {installedApps} from './registry';

/** The non-interactive entry on the kit's sign-in page (task-12.9 decision 12). */
export const FAKE_ACCOUNT_PARAM = 'fake_account';
/** The orchestrator's binding cookie, one per attempt (`vault/routes.ts`). */
const COOKIE_PREFIX = 'a2uiverse_signin_';
const OPENING_QUESTION = 'What is A2UIVerse?';
const OUTCOME_TIMEOUT_MS = 15_000;

/** The fake account each app signs in as unless a beat names its own: one per app. */
export const SIGN_IN_AS: Readonly<Record<string, string>> = {
  github: 'retz8',
  gmail: 'you',
  calendar: 'you',
  linear: 'me',
  circleci: 'retz8',
};

/** The demo key of each app on an API key (its README's). */
export const DEMO_KEYS: Readonly<Record<string, string>> = {
  'shop-b': 'northlight-demo-key-4f7c2a',
};

/** An app id → its fake accounts, in account order: the first is `<app>.1`. */
export type Accounts = Record<string, string[]>;

/** One account signed in: its source, and what it signed in as. */
export interface SignedIn {
  source: string;
  as: string;
  label: string;
}

/** The accounts each app signs in as: the beat's own, otherwise the app's one account. */
export function accountsFor(app: string, named: Accounts = {}): string[] {
  if (named[app]) return named[app];
  if (SIGN_IN_AS[app]) return [SIGN_IN_AS[app]];
  if (DEMO_KEYS[app]) return [DEMO_KEYS[app]];
  throw new Error(`no fake account named for '${app}' — add it to SIGN_IN_AS`);
}

/** The agent's sign-in address with the non-interactive entry naming `account`. */
export function withFakeAccount(url: string, account: string): string {
  const signIn = new URL(url);
  signIn.searchParams.set(FAKE_ACCOUNT_PARAM, account);
  return signIn.toString();
}

/** The start route's binding for `attempt`, as a `Cookie` header, from its `Set-Cookie`s. */
export function bindingCookie(setCookies: readonly string[], attempt: string): string | undefined {
  const name = `${COOKIE_PREFIX}${attempt}`;
  const pair = setCookies.map(c => c.split(';')[0]!.trim()).find(p => p.startsWith(`${name}=`));
  return pair;
}

/**
 * The agent's return, sent to the orchestrator the script talks to: the vault's callback names the
 * orchestrator's public address, which behind a tunnel is not the one in hand.
 */
export function onOrchestrator(location: string, orchestrator: string): string {
  const back = new URL(location);
  return `${orchestrator}${back.pathname}${back.search}`;
}

/** An attempt id as the client mints one. */
export const newAttempt = () => randomBytes(24).toString('base64url');

/** Open a canvas to sign in from: a question about the platform, which dispatches no app. */
export async function openCanvas(sender: A2AMessageSender, catalogIds: string[]): Promise<string> {
  const {contextId} = await driveTurn(sender, OPENING_QUESTION, undefined, catalogIds);
  if (!contextId) throw new Error('the orchestrator opened no canvas to sign in from');
  return contextId;
}

interface Card {
  url: string;
  security?: Record<string, string[]>[];
}

async function cardOf(url: string): Promise<Card> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`${url} answered ${res.status}`);
  return (await res.json()) as Card;
}

const sleep = (ms: number) => new Promise<void>(r => setTimeout(r, ms));

const locationOf = (res: Response, what: string): string => {
  const location = res.headers.get('location');
  if (res.status < 300 || res.status >= 400 || !location) {
    throw new Error(`${what} answered ${res.status}, not a redirect`);
  }
  return location;
};

/**
 * Sign every installed app that asks sign-in into the orchestrator at `orchestrator`, from
 * `canvas`, as `named` says or as its one account. An account already held is left as it is.
 */
export async function signIn(
  orchestrator: string,
  canvas: string,
  named: Accounts = {},
): Promise<SignedIn[]> {
  const origin = new URL((await cardOf(`${orchestrator}/.well-known/agent-card.json`)).url).origin;
  const signedIn: SignedIn[] = [];
  for (const app of await installedApps(orchestrator)) {
    const card = await cardOf(app.cardUrl);
    if (!card.security?.length) continue;
    const accounts = accountsFor(app.id, named);
    for (const [i, as] of accounts.entries()) {
      signedIn.push(await signInOne(orchestrator, origin, canvas, `${app.id}.${i + 1}`, as));
    }
  }
  return signedIn;
}

async function signInOne(
  orchestrator: string,
  origin: string,
  canvas: string,
  source: string,
  as: string,
): Promise<SignedIn> {
  const attempt = newAttempt();
  const query = new URLSearchParams({attempt, canvas, source});
  const started = await fetch(`${orchestrator}/auth/start?${query}`, {redirect: 'manual'});
  // 200: the account is held already, and the window says so.
  if (started.status !== 200) {
    const toSignIn = locationOf(started, `starting ${source}'s sign-in`);
    const cookie = bindingCookie(started.headers.getSetCookie(), attempt);
    if (!cookie) throw new Error(`starting ${source}'s sign-in set no binding cookie`);
    if (toSignIn.startsWith('/auth/key')) {
      const keyed = await fetch(`${orchestrator}/auth/key`, {
        method: 'POST',
        headers: {cookie, origin, 'content-type': 'application/x-www-form-urlencoded'},
        body: new URLSearchParams({attempt, key: as}),
      });
      if (!keyed.ok) throw new Error(`${source}'s key page answered ${keyed.status}`);
    } else {
      const chosen = await fetch(withFakeAccount(toSignIn, as), {redirect: 'manual'});
      if (chosen.status === 200) {
        throw new Error(
          `${source}'s sign-in page did not take '${FAKE_ACCOUNT_PARAM}=${as}' — is the agent in live mode?`,
        );
      }
      const back = locationOf(chosen, `${source}'s sign-in page`);
      const returned = await fetch(onOrchestrator(back, orchestrator), {
        redirect: 'manual',
        headers: {cookie},
      });
      if (!returned.ok) throw new Error(`${source}'s callback answered ${returned.status}`);
    }
  }
  const outcome = await outcomeOf(orchestrator, attempt);
  if (outcome.state !== 'signedIn') {
    throw new Error(`signing ${source} in as ${maskKey(as)} ${outcome.state}`);
  }
  return {source: outcome.source ?? source, as: maskKey(as), label: outcome.label ?? ''};
}

interface Outcome {
  state: string;
  source?: string;
  label?: string;
}

async function outcomeOf(orchestrator: string, attempt: string): Promise<Outcome> {
  const deadline = Date.now() + OUTCOME_TIMEOUT_MS;
  for (;;) {
    const res = await fetch(`${orchestrator}/auth/attempts/${attempt}`);
    const outcome = (await res.json()) as Outcome;
    if (outcome.state !== 'pending' && outcome.state !== 'unknown') return outcome;
    if (Date.now() > deadline) return {state: 'did not finish'};
    await sleep(200);
  }
}

/** A demo key is a credential: logs name it by its digest, never its value. */
function maskKey(as: string): string {
  return Object.values(DEMO_KEYS).includes(as)
    ? `key ${createHash('sha256').update(as).digest('hex').slice(0, 8)}`
    : as;
}

// ---- straight at an agent ----------------------------------------------------------------------

/** The headers a direct send carries for `app` signed in as `as`: its key, or a token. */
export async function agentHeaders(cardUrl: string, as: string): Promise<Record<string, string>> {
  const card = (await cardOf(cardUrl)) as Card & {securitySchemes?: Record<string, Scheme>};
  const requirement = card.security?.[0];
  if (!requirement) return {};
  const key = Object.keys(requirement)[0]!;
  const scheme = card.securitySchemes?.[key];
  if (scheme?.type === 'apiKey' && scheme.in === 'header') return {[scheme.name!]: as};
  if (scheme?.type !== 'oauth2' || !scheme.oauth2MetadataUrl) {
    throw new Error(`${cardUrl} signs in with a scheme the script cannot drive`);
  }
  // What the vault asks at the first sign-in, so both sides hold the same grant.
  const token = await agentToken(scheme.oauth2MetadataUrl, requirement[key] ?? [], as);
  return {authorization: `Bearer ${token}`};
}

interface Scheme {
  type: string;
  in?: string;
  name?: string;
  oauth2MetadataUrl?: string;
}

/** The return a direct sign-in names: nothing listens, the code is read off the redirect. */
const DIRECT_REDIRECT = 'http://127.0.0.1:8765/callback';

/** A token straight from the agent: register, the entry naming `as` for `scopes`, the exchange. */
async function agentToken(metadataUrl: string, scopes: string[], as: string): Promise<string> {
  const metadata = (await (await fetch(metadataUrl)).json()) as {
    authorization_endpoint: string;
    token_endpoint: string;
    registration_endpoint: string;
  };
  const registered = await fetch(metadata.registration_endpoint, {
    method: 'POST',
    headers: {'content-type': 'application/json'},
    body: JSON.stringify({
      redirect_uris: [DIRECT_REDIRECT],
      token_endpoint_auth_method: 'none',
      grant_types: ['authorization_code', 'refresh_token'],
      response_types: ['code'],
      client_name: 'A2UIVerse transparency check',
    }),
  });
  if (registered.status !== 201) throw new Error(`registering answered ${registered.status}`);
  const {client_id: clientId} = (await registered.json()) as {client_id: string};
  const verifier = randomBytes(48).toString('base64url');
  const challenge = createHash('sha256').update(verifier).digest('base64url');
  const authorize = new URL(metadata.authorization_endpoint);
  for (const [k, v] of Object.entries({
    response_type: 'code',
    client_id: clientId,
    redirect_uri: DIRECT_REDIRECT,
    scope: scopes.join(' '),
    state: newAttempt(),
    code_challenge: challenge,
    code_challenge_method: 'S256',
    [FAKE_ACCOUNT_PARAM]: as,
  })) {
    authorize.searchParams.set(k, v);
  }
  const chosen = await fetch(authorize, {redirect: 'manual'});
  const code = new URL(locationOf(chosen, 'the agent sign-in page')).searchParams.get('code');
  if (!code) throw new Error(`the agent did not sign in as '${as}'`);
  const token = await fetch(metadata.token_endpoint, {
    method: 'POST',
    headers: {'content-type': 'application/x-www-form-urlencoded'},
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      redirect_uri: DIRECT_REDIRECT,
      client_id: clientId,
      code_verifier: verifier,
    }),
  });
  if (!token.ok) throw new Error(`the token exchange answered ${token.status}`);
  return ((await token.json()) as {access_token: string}).access_token;
}
