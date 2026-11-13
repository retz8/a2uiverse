/**
 * The AuthVault (SPEC §10, phase-12 decisions 5, 8–12, 21): credentials by (app, account) in an
 * owner-only file, a generic OAuth client, and the sign-ins that fill it. It is the accounts seam
 * of task 12.4; it checks a card before dispatch, hands the AgentsPool the header a dispatch
 * carries, refreshes silently — one refresh at a time per account — and reads what an agent asks
 * for mid-task. It never paints: the slot's authority is the executor's, the consent the
 * shell's. No credential leaves it except as the header of a dispatch to the app that issued it.
 */
import {randomBytes} from 'node:crypto';
import type {AgentCard} from '@a2a-js/sdk';
import {parseSourceId, sourceId, type AuthRequired} from '@a2uiverse/sdk';
import type {Account, AccountStore} from '../accounts/accounts.js';
import {logLine} from '../log.js';
import type {SignedOutAccount} from '../registry/registry.js';
import type {WriteCaller} from '../writeGuard.js';
import {
  authorizationUrl,
  discover,
  exchangeCode,
  freshSecrets,
  hashKey,
  labelFrom,
  OAuthError,
  refreshTokens,
  registerDynamically,
  registrationFor,
  revoke,
  verifyIdToken,
  type ClientIdentity,
  type Fetch,
  type IdClaims,
  type ServerMetadata,
  type TokenResponse,
} from './oauth.js';
import {cardNeed, schemeOf, wordsFor, type SupportedScheme} from './schemes.js';
import type {VaultAccount, VaultStore} from './store.js';

/** Why a sign-in bound to an account fails once that account was signed out (task-14.3 decision 11). */

/** The day a key account was connected, in its default label: "Oct 17" (task-14.11 decision 36). */
const CONNECTED_DAY = new Intl.DateTimeFormat('en-US', {month: 'short', day: 'numeric'});
/** The longest name the token page takes for a key account. */
export const KEY_NAME_MAX = 60;
export const SIGNED_OUT = 'this account was signed out';
/** A refresh is due when the token has less than this left (task-12.5 decision 8). */
export const REFRESH_MARGIN_MS = 60_000;
/** A sign-in attempt lives this long (task-12.5 decision 5). */
export const ATTEMPT_LIFETIME_MS = 10 * 60_000;

/** Why a slot cannot be dispatched: the authority it takes. */
export type AuthorityNeed =
  /**
   * No usable account, or one short of scopes: sign in, asking `keys` in the card's `words`;
   * `connect` when the scheme is a pasted key or token (task-12.13 decision 30); `more` when the
   * account is held and asks only for more access (task-12.13 decision 50).
   */
  | {
      cause: 'signIn';
      scheme: string;
      keys: string[];
      words: string[];
      connect?: boolean;
      more?: boolean;
    }
  /** The account's credential stopped working and could not be renewed. */
  | {cause: 'again'}
  /** No alternative of the card names a scheme the vault can do. */
  | {cause: 'unsupported'};

/** Whether a dispatch to the source may go, and what it carries. */
export type Standing = {kind: 'open'} | {kind: 'ready'} | {kind: 'need'; need: AuthorityNeed};

export type Prepared = {headers: Record<string, string>} | {need: AuthorityNeed};

/** What an in-task `auth-required` asks, read against the installed card (phase-12 decision 6). */
export type Request =
  /** More scopes for the signed-in account: only the missing ones. */
  | {kind: 'escalate'; scheme: string; keys: string[]; words: string[]}
  /** Names nothing — plain A2A — or nothing missing: a 401 (task-12.5 decision 1). */
  | {kind: 'unauthorized'}
  /** A key the card does not declare, or scopes from a key-only card: invalid. */
  | {kind: 'invalid'; reason: string}
  /** The card declares no `security`: there is nothing to sign in with. */
  | {kind: 'unsigned'};

export type SignInPurpose = 'first' | 'again' | 'escalation' | 'addAccount';

/** What the executor knows of a source on a canvas: the scopes its slot or its escalation asks. */
export interface SlotAsk {
  /** Whether the canvas holds a slot for the source. */
  slot: boolean;
  /** The scheme and the missing scope keys the slot or its escalation asks, when it asks. */
  ask?: {scheme: string; keys: string[]};
}

export interface SignInRecord {
  event:
    | 'started'
    | 'signedIn'
    | 'failed'
    | 'expired'
    | 'refreshed'
    | 'refreshFailed'
    | 'revoked'
    | 'escalationRequested'
    | 'notNow'
    /** A request for more access dropped by a later press in its fragment (task-12.13 decision 39). */
    | 'superseded'
    /** An account signed out from the App Library, with what became of its access (task 14.3). */
    | 'signedOut'
    /** An account renamed from the App Library, from its old label to its new (task 14.3). */
    | 'renamed';
  appId: string;
  source?: string;
  canvas?: string;
  purpose?: SignInPurpose;
  schemeKind?: SupportedScheme['kind'];
  scopes?: string[];
  account?: 'new' | 'existing';
  reason?: string;
  revocation?: 'revoked' | 'nowhere' | 'failed';
  /** Signed in again as another identity: the account re-bound to it. */
  rebound?: boolean;
  /** An escalation request: whether its keys are the installed card's (phase-12 decision 6). */
  valid?: boolean;
  /** A rename's labels. */
  from?: string;
  to?: string;
  /** Who made the write: the trusted page, or a caller with the token (task-14.3 decision 13). */
  by?: WriteCaller;
}

export interface VaultDeps {
  store: VaultStore;
  /** The app's card as installed: what access is judged against (task-15.5 decision 3). */
  cardOf(appId: string): AgentCard | null | undefined;
  /** This run's live card, read only to see that the app has changed; none when not held. */
  liveCardOf?(appId: string): AgentCard | null | undefined;
  displayName(appId: string): string;
  identity: ClientIdentity;
  journal(record: SignInRecord): void;
  fetchImpl?: Fetch;
}

export interface Attempt {
  id: string;
  /** The cookie's value: binds the browser that started it. */
  binding: string;
  /** The canvas it was pressed on; none from the App Library (task-14.3 decision 6). */
  canvas?: string;
  source: string;
  appId: string;
  n: number;
  purpose: SignInPurpose;
  scheme: SupportedScheme;
  keys: string[];
  expiresAt: number;
  state: 'pending' | 'signedIn' | 'failed' | 'expired';
  /** The source the sign-in ended as, its label and whether it was held; the reason it failed. */
  result?: string;
  label?: string;
  existing?: boolean;
  /** Signed in again as another identity, the account re-bound to it. */
  rebound?: boolean;
  /**
   * A slot's sign-in to an account signed out since: the account comes back under its own number
   * (task-14.3 decision 5).
   */
  restore?: boolean;
  reason?: string;
  oauth?: {
    metadata: ServerMetadata;
    clientId: string;
    verifier: string;
    state: string;
    nonce?: string;
    sub?: string;
  };
}

export type Started =
  | {kind: 'redirect'; attempt: Attempt; url: string}
  | {kind: 'keyPage'; attempt: Attempt}
  /** The account is signed in already: nothing to ask. */
  | {kind: 'signedIn'; attempt: Attempt}
  | {kind: 'refused'; reason: string};

/**
 * What the client polls. Signed in, the source the sign-in ended as, the account's label, the
 * app's name and whether the account was already held (task-12.8 decision 6).
 */
export type Outcome = {
  state: Attempt['state'];
  source?: string;
  reason?: string;
  label?: string;
  app?: string;
  existing?: boolean;
  rebound?: boolean;
};

export type Revocation = SignedOutAccount['revocation'];

const NO_SUCH_ACCOUNT = 'there is no such account';

/** An app as the App Library reads it (task-14.3 decision 9). */
export interface LibraryApp {
  appId: string;
  /** Whether it asks no sign-in, signs in, or asks one the vault cannot run. */
  signIn: 'none' | 'supported' | 'unsupported';
  accounts: {
    source: string;
    label: string;
    kind: 'oauth' | 'key';
    /** The scopes it holds in the card's words; none for a key, or a card that gives none. */
    permissions: string[];
    /** It must sign in again. */
    lapsed: boolean;
  }[];
}

export type Renamed =
  | {ok: true; source: string; label: string}
  | {ok: false; kind: 'unknown' | 'refused'; reason: string};

export type SignedOut = ({ok: true} & SignedOutAccount) | {ok: false; reason: string};

export class AuthVault implements AccountStore {
  readonly #deps: VaultDeps;
  readonly #fetch: Fetch;
  readonly #attempts = new Map<string, Attempt>();
  readonly #byState = new Map<string, string>();
  readonly #refreshing = new Map<string, Promise<boolean>>();
  /** Per page-load session, the apps whose full tile was shown (task-12.5 decision 6). */
  readonly #fullTileShown = new Map<string, Set<string>>();

  constructor(deps: VaultDeps) {
    this.#deps = deps;
    this.#fetch = deps.fetchImpl ?? fetch;
  }

  // ---- the accounts seam (task-12.4 decision 3) -------------------------------------------

  accountsOf(appId: string): readonly Account[] {
    const app = this.#deps.store.data.apps[appId];
    return (app?.accounts ?? []).map(({n, label}) => ({n, label}));
  }

  nextAccount(appId: string): number {
    return this.#deps.store.data.apps[appId]?.next ?? 1;
  }

  #account(appId: string, n: number | undefined): VaultAccount | undefined {
    if (n === undefined) return undefined;
    return this.#deps.store.data.apps[appId]?.accounts.find(account => account.n === n);
  }

  // ---- before dispatch (phase-12 decision 5) ------------------------------------------------

  /**
   * The card as installed checked against the vault for the source, with no network: open when the
   * card asks nothing; ready when the account meets an alternative; otherwise what the slot needs.
   */
  standing(source: string): Standing {
    const appId = parseSourceId(source)?.appId ?? source;
    return this.#standingOn(this.#deps.cardOf(appId), source);
  }

  /**
   * Whether the app's live card asks more than the account meets where the card as installed asks
   * nothing more (task-15.5 decision 3): judged only once the installed card is met, never when no
   * live card is held — the slot's update, not its sign-in.
   */
  liveShort(source: string): boolean {
    const appId = parseSourceId(source)?.appId ?? source;
    const live = this.#deps.liveCardOf?.(appId);
    if (!live) return false;
    const installed = this.standing(source).kind;
    if (installed !== 'open' && installed !== 'ready') return false;
    return this.#standingOn(live, source).kind === 'need';
  }

  #standingOn(card: AgentCard | null | undefined, source: string): Standing {
    const {appId, account: n} = parseSourceId(source) ?? {appId: source};
    const need = cardNeed(card);
    if (need.kind === 'none') return {kind: 'open'};
    if (need.kind === 'unsupported') return {kind: 'need', need: {cause: 'unsupported'}};
    const account = this.#account(appId, n);
    const first = need.alternatives[0]!;
    const firstKeys = first.requirement[first.scheme.key] ?? [];
    if (!account) {
      return {
        kind: 'need',
        need: {
          cause: 'signIn',
          scheme: first.scheme.key,
          keys: firstKeys,
          words: wordsFor(first.scheme, firstKeys),
          connect: first.scheme.kind !== 'oauth',
        },
      };
    }
    if (account.again) return {kind: 'need', need: {cause: 'again'}};
    const granted = new Set(account.scopes);
    const met = need.alternatives.some(
      ({requirement, scheme}) =>
        scheme.key === account.scheme &&
        (requirement[scheme.key] ?? []).every(scope => granted.has(scope)),
    );
    if (met) return {kind: 'ready'};
    const own = need.alternatives.find(({scheme}) => scheme.key === account.scheme);
    if (!own) return {kind: 'need', need: {cause: 'again'}};
    const missing = (own.requirement[own.scheme.key] ?? []).filter(scope => !granted.has(scope));
    return {
      kind: 'need',
      need: {
        cause: 'signIn',
        scheme: own.scheme.key,
        keys: missing,
        words: wordsFor(own.scheme, missing),
        connect: own.scheme.kind !== 'oauth',
        more: true,
      },
    };
  }

  /** Whether this session already saw the app's full tile; the first ask marks it shown. */
  quietFor(session: string | undefined, appId: string): boolean {
    if (session === undefined) return false;
    let shown = this.#fullTileShown.get(session);
    if (!shown) this.#fullTileShown.set(session, (shown = new Set()));
    if (shown.has(appId)) return true;
    shown.add(appId);
    return false;
  }

  /** The header a dispatch to the source carries: refreshed first when due (decision 8). */
  async prepare(source: string): Promise<Prepared | undefined> {
    const standing = this.standing(source);
    if (standing.kind === 'open') return undefined;
    if (standing.kind === 'need') return {need: standing.need};
    const {appId, account: n} = parseSourceId(source)!;
    let account = this.#account(appId, n)!;
    if (
      account.kind === 'oauth' &&
      account.refresh &&
      account.expiresAt !== undefined &&
      account.expiresAt - Date.now() < REFRESH_MARGIN_MS
    ) {
      if (!(await this.#refresh(appId, account.n))) return {need: {cause: 'again'}};
      account = this.#account(appId, n)!;
    }
    return {headers: headersOf(account)};
  }

  /**
   * A dispatch was refused 401 with `sent` (decision 8): a refresh already made since is used;
   * otherwise one refresh, shared; a credential that cannot refresh signs in again.
   */
  async unauthorized(source: string, sent: Record<string, string>): Promise<Prepared> {
    const {appId, account: n} = parseSourceId(source) ?? {appId: source};
    const account = this.#account(appId, n);
    if (!account) return {need: this.#needOrAgain(source)};
    if (!sameHeaders(headersOf(account), sent) && !account.again)
      return {headers: headersOf(account)};
    if (account.kind === 'oauth' && account.refresh && (await this.#refresh(appId, account.n))) {
      return {headers: headersOf(this.#account(appId, n)!)};
    }
    await this.markAgain(source, 'refused');
    return {need: {cause: 'again'}};
  }

  #needOrAgain(source: string): AuthorityNeed {
    const standing = this.standing(source);
    return standing.kind === 'need' ? standing.need : {cause: 'again'};
  }

  /** The account must sign in again: its credential stopped working. */
  async markAgain(source: string, reason: string): Promise<void> {
    const {appId, account: n} = parseSourceId(source) ?? {appId: source};
    const account = this.#account(appId, n);
    if (!account || account.again) return;
    account.again = true;
    await this.#deps.store.save();
    this.#deps.journal({event: 'refreshFailed', appId, source, reason});
  }

  /** One refresh at a time per account; true when it renewed the tokens. */
  #refresh(appId: string, n: number): Promise<boolean> {
    const key = sourceId(appId, n);
    let running = this.#refreshing.get(key);
    if (!running) {
      running = this.#refreshNow(appId, n).finally(() => this.#refreshing.delete(key));
      this.#refreshing.set(key, running);
    }
    return running;
  }

  async #refreshNow(appId: string, n: number): Promise<boolean> {
    const account = this.#account(appId, n);
    const source = sourceId(appId, n);
    if (!account?.refresh || !account.tokenEndpoint || !account.clientId) return false;
    try {
      const tokens = await refreshTokens(this.#fetch, account.tokenEndpoint, {
        refreshToken: account.refresh,
        clientId: account.clientId,
      });
      applyTokens(account, tokens, account.scopes);
      delete account.again;
      // The new refresh token is on disk before the new access token is used (decision 8).
      await this.#deps.store.save();
      this.#deps.journal({event: 'refreshed', appId, source});
      return true;
    } catch (err) {
      if (err instanceof OAuthError && err.code === 'invalid_client' && account.issuer) {
        await this.#dropRegistration(account.issuer, account.clientId);
      }
      account.again = true;
      await this.#deps.store.save();
      this.#deps.journal({event: 'refreshFailed', appId, source, reason: reasonOf(err)});
      return false;
    }
  }

  // ---- in the task (phase-12 decisions 4, 6) --------------------------------------------------

  /**
   * An in-task `auth-required`, read against the installed card; a request for more access is
   * journaled, valid or invalid (task-12.5 decision 11).
   */
  requested(source: string, request: AuthRequired | undefined): Request {
    const read = this.#read(source, request);
    const appId = parseSourceId(source)?.appId ?? source;
    if (read.kind === 'escalate') {
      this.#deps.journal({
        event: 'escalationRequested',
        appId,
        source,
        scopes: read.keys,
        valid: true,
      });
    } else if (read.kind === 'invalid') {
      const scopes = (request?.security ?? []).flatMap(alternative =>
        Object.values(alternative).flat(),
      );
      this.#deps.journal({
        event: 'escalationRequested',
        appId,
        source,
        scopes,
        valid: false,
        reason: read.reason,
      });
    }
    return read;
  }

  #read(source: string, request: AuthRequired | undefined): Request {
    const {appId, account: n} = parseSourceId(source) ?? {appId: source};
    const card = this.#deps.cardOf(appId);
    const need = cardNeed(card);
    if (need.kind === 'none') return {kind: 'unsigned'};
    if (!request) return {kind: 'unauthorized'};
    for (const alternative of request.security) {
      for (const [key, scopes] of Object.entries(alternative)) {
        const declared = card?.securitySchemes?.[key];
        if (!declared) return {kind: 'invalid', reason: `the card declares no scheme ${key}`};
        const scheme = schemeOf(card, key);
        if (scopes.length === 0) continue;
        if (!scheme || scheme.kind !== 'oauth' || scheme.openId) {
          return {kind: 'invalid', reason: `scheme ${key} declares no scopes`};
        }
        const unknown = scopes.filter(scope => !(scope in scheme.words));
        if (unknown.length > 0) {
          return {kind: 'invalid', reason: `the card declares no scope ${unknown.join(', ')}`};
        }
      }
    }
    const account = this.#account(appId, n);
    for (const alternative of request.security) {
      const keys = Object.keys(alternative);
      if (keys.length !== 1) continue;
      const key = keys[0]!;
      const scheme = schemeOf(card, key);
      if (!scheme) continue;
      const granted = new Set(account?.scheme === key ? account.scopes : []);
      const missing = (alternative[key] ?? []).filter(scope => !granted.has(scope));
      if (account?.scheme === key && missing.length === 0) return {kind: 'unauthorized'};
      return {kind: 'escalate', scheme: key, keys: missing, words: wordsFor(scheme, missing)};
    }
    return {kind: 'invalid', reason: 'it names no scheme the vault can sign in with'};
  }

  // ---- signing in (task-12.5 decisions 5, 9, 10) ----------------------------------------------

  /**
   * A sign-in started from the popup; what the browser is sent to. With no canvas it is the App
   * Library's (task-14.3 decision 6): add account, or sign in again on a lapsed account, alone.
   */
  async start(params: {
    attempt: string;
    canvas?: string;
    source: string;
    ask: (canvas: string, source: string) => SlotAsk | undefined;
  }): Promise<Started> {
    this.#expire();
    const {attempt: id, canvas} = params;
    if (!/^[A-Za-z0-9_-]{16,128}$/.test(id) || this.#attempts.has(id)) {
      return {kind: 'refused', reason: 'this sign-in was already used'};
    }
    const named = parseSourceId(params.source);
    if (!named) return {kind: 'refused', reason: 'this app needs no sign-in'};
    // The bare app id is add-account's: the app's next account, as it stands when the window
    // opens (task-12.8 decision 5).
    const {appId} = named;
    const n = named.account ?? this.nextAccount(appId);
    const source = sourceId(appId, n);
    const slot = canvas === undefined ? undefined : params.ask(canvas, source);
    if (canvas !== undefined && !slot) return {kind: 'refused', reason: 'there is no such canvas'};
    const card = this.#deps.cardOf(appId);
    const need = cardNeed(card);
    if (need.kind === 'none') return {kind: 'refused', reason: 'this app needs no sign-in'};
    if (need.kind === 'unsupported')
      return {kind: 'refused', reason: 'this sign-in is not supported here'};
    const account = this.#account(appId, n);
    const first = need.alternatives[0]!;
    let purpose: SignInPurpose;
    let scheme: SupportedScheme;
    let keys: string[];
    if (account?.again) {
      purpose = 'again';
      scheme = schemeOf(card, account.scheme) ?? first.scheme;
      const required =
        need.alternatives.find(a => a.scheme.key === scheme.key)?.requirement[scheme.key] ?? [];
      keys = union(account.scheme === scheme.key ? account.scopes : [], required);
    } else if (account) {
      if (!slot) return {kind: 'refused', reason: 'this account is signed in'};
      const asked = slot.ask;
      const standing = this.standing(source);
      const own =
        standing.kind === 'need' && standing.need.cause === 'signIn' ? standing.need : undefined;
      const schemeKey = asked?.scheme ?? own?.scheme ?? account.scheme;
      scheme = schemeOf(card, schemeKey) ?? first.scheme;
      keys = (asked?.keys ?? own?.keys ?? []).filter(scope => !account.scopes.includes(scope));
      // Signed in already — from another page, or since the canvas painted its tile: the window
      // says so and the slot resumes (task-12.8 decision 4).
      if (keys.length === 0)
        return this.#alreadySignedIn({id, canvas, source, appId, scheme}, account);
      purpose = 'escalation';
    } else if (n === this.nextAccount(appId) || (n < this.nextAccount(appId) && slot?.slot)) {
      purpose = slot?.slot ? 'first' : 'addAccount';
      scheme = first.scheme;
      keys = first.requirement[first.scheme.key] ?? [];
    } else {
      return {kind: 'refused', reason: 'there is no such account'};
    }
    const attempt: Attempt = {
      id,
      binding: randomBytes(24).toString('base64url'),
      ...(canvas !== undefined ? {canvas} : {}),
      source,
      appId,
      n,
      purpose,
      scheme,
      keys,
      // A number held before and signed out since, signed in from a slot that holds it.
      ...(n < this.nextAccount(appId) && !account ? {restore: true} : {}),
      expiresAt: Date.now() + ATTEMPT_LIFETIME_MS,
      state: 'pending',
    };
    this.#deps.journal({
      event: 'started',
      appId,
      source,
      canvas,
      purpose,
      schemeKind: scheme.kind,
      scopes: keys,
    });
    if (scheme.kind !== 'oauth') {
      this.#attempts.set(id, attempt);
      return {kind: 'keyPage', attempt};
    }
    try {
      const metadata = await discover(this.#fetch, scheme.metadataUrl);
      const clientId = await this.#clientFor(metadata);
      if (!clientId) return this.#refuse(attempt, 'this sign-in is not supported here');
      const secrets = freshSecrets();
      const openId = scheme.openId || (metadata.scopes_supported ?? []).includes('openid');
      const scopes = openId ? ['openid', ...keys.filter(key => key !== 'openid')] : keys;
      const sub = purpose === 'again' || purpose === 'escalation' ? account?.sub : undefined;
      attempt.oauth = {
        metadata,
        clientId,
        verifier: secrets.verifier,
        state: secrets.state,
        ...(openId ? {nonce: secrets.nonce} : {}),
        ...(sub ? {sub} : {}),
      };
      this.#attempts.set(id, attempt);
      this.#byState.set(secrets.state, id);
      const url = authorizationUrl(metadata, {
        clientId,
        redirectUri: this.#deps.identity.redirectUri,
        scopes,
        state: secrets.state,
        challenge: secrets.challenge,
        ...(openId ? {nonce: secrets.nonce} : {}),
        ...(sub ? {loginHint: sub} : {}),
      });
      return {kind: 'redirect', attempt, url};
    } catch (err) {
      return this.#refuse(attempt, reasonOf(err));
    }
  }

  #alreadySignedIn(
    started: Pick<Attempt, 'id' | 'canvas' | 'source' | 'appId' | 'scheme'>,
    account: VaultAccount,
  ): Started {
    const attempt: Attempt = {
      ...started,
      binding: randomBytes(24).toString('base64url'),
      n: account.n,
      purpose: 'first',
      keys: [],
      expiresAt: Date.now() + ATTEMPT_LIFETIME_MS,
      state: 'pending',
    };
    this.#attempts.set(attempt.id, attempt);
    return {kind: 'signedIn', attempt: this.#signedIn(attempt, account, true)};
  }

  #refuse(attempt: Attempt, reason: string): Started {
    this.#deps.journal({event: 'failed', appId: attempt.appId, source: attempt.source, reason});
    return {kind: 'refused', reason};
  }

  /** The client id at this server: its metadata document, or a registration kept per server. */
  async #clientFor(metadata: ServerMetadata): Promise<string | undefined> {
    const identity = this.#deps.identity;
    const how = registrationFor(metadata, identity);
    if (how === 'document') return identity.documentUrl;
    if (how !== 'dynamic') return undefined;
    const key = registrationKey(metadata.issuer, identity.redirectUri);
    const held = this.#deps.store.data.registrations[key];
    if (held) return held.clientId;
    const clientId = await registerDynamically(this.#fetch, metadata, identity);
    this.#deps.store.data.registrations[key] = {clientId, registeredAt: new Date().toISOString()};
    await this.#deps.store.save();
    return clientId;
  }

  attempt(id: string): Attempt | undefined {
    this.#expire();
    return this.#attempts.get(id);
  }

  attemptByState(state: string): Attempt | undefined {
    const id = this.#byState.get(state);
    return id === undefined ? undefined : this.attempt(id);
  }

  /**
   * The authorization server's answer, for an attempt the browser is bound to. An attempt already
   * ended answers as it ended, exchanging nothing: the same return can arrive twice — a stalled
   * request the tunnel delivers late, a window reloaded (task 12.12).
   */
  async callback(attempt: Attempt, query: {code?: string; error?: string}): Promise<Attempt> {
    const oauth = attempt.oauth;
    if (attempt.state !== 'pending' || !oauth) return attempt;
    if (query.error || !query.code) return this.#fail(attempt, query.error ?? 'no code came back');
    try {
      const tokens = await exchangeCode(this.#fetch, oauth.metadata.token_endpoint, {
        code: query.code,
        clientId: oauth.clientId,
        redirectUri: this.#deps.identity.redirectUri,
        verifier: oauth.verifier,
      });
      let claims: IdClaims | undefined;
      if (tokens.id_token && oauth.nonce) {
        claims = await verifyIdToken(this.#fetch, tokens.id_token, {
          issuer: oauth.metadata.issuer,
          clientId: oauth.clientId,
          nonce: oauth.nonce,
          jwksUri: oauth.metadata.jwks_uri,
        });
      }
      const apps = this.#deps.store.app(attempt.appId);
      // Signing in again to a server that lost the account comes back as another identity: the
      // account is re-bound to it and the outcome says so — never onto an account the app holds
      // already. A request for more access stays bound (task-12.13 decision 24).
      let rebound = false;
      if (oauth.sub && claims && claims.sub !== oauth.sub) {
        if (attempt.purpose !== 'again') {
          return this.#fail(attempt, 'signed in as a different account');
        }
        if (apps.accounts.some(held => held.sub === claims!.sub && held.n !== attempt.n)) {
          return this.#fail(attempt, 'that account is already added');
        }
        rebound = true;
      }
      const bound = attempt.purpose === 'again' || attempt.purpose === 'escalation';
      let account = bound ? this.#account(attempt.appId, attempt.n) : undefined;
      if (bound && !account) return this.#fail(attempt, SIGNED_OUT);
      if (!bound && claims) {
        const held = apps.accounts.find(other => other.sub === claims!.sub);
        // A signed-out number comes back as itself, never onto another account (decision 5).
        if (attempt.restore && held && held.n !== attempt.n) {
          return this.#fail(attempt, 'that account is already added');
        }
        account = held ?? (attempt.restore ? this.#account(attempt.appId, attempt.n) : undefined);
      }
      const existing = account !== undefined;
      const granted = tokens.scope
        ? tokens.scope.split(' ').filter(scope => scope !== '' && scope !== 'openid')
        : union(account?.scheme === attempt.scheme.key ? account.scopes : [], attempt.keys);
      if (!account) {
        account = {
          n: 0,
          label: '',
          scheme: attempt.scheme.key,
          kind: 'oauth',
          secret: '',
          scopes: [],
        };
        this.#add(attempt, account);
      }
      account.scheme = attempt.scheme.key;
      account.kind = 'oauth';
      account.issuer = oauth.metadata.issuer;
      account.clientId = oauth.clientId;
      account.tokenEndpoint = oauth.metadata.token_endpoint;
      if (oauth.metadata.revocation_endpoint)
        account.revocationEndpoint = oauth.metadata.revocation_endpoint;
      applyTokens(account, tokens, granted);
      if (claims) account.sub = claims.sub;
      // A label the person chose stays theirs, whatever the identity says (task-14.3 decision 3).
      if (!account.named) {
        account.label =
          labelFrom(claims) ||
          account.label ||
          `${this.#deps.displayName(attempt.appId)} account ${account.n}`;
      }
      delete account.again;
      await this.#deps.store.save();
      if (rebound) attempt.rebound = true;
      return this.#signedIn(attempt, account, existing);
    } catch (err) {
      // A registration the server no longer knows is let go: the next sign-in registers again
      // (task-12.5 decision 3).
      if (err instanceof OAuthError && err.code === 'invalid_client') {
        await this.#dropRegistration(oauth.metadata.issuer, oauth.clientId);
      }
      return this.#fail(attempt, reasonOf(err));
    }
  }

  async #dropRegistration(issuer: string, clientId: string): Promise<void> {
    const key = registrationKey(issuer, this.#deps.identity.redirectUri);
    if (this.#deps.store.data.registrations[key]?.clientId !== clientId) return;
    delete this.#deps.store.data.registrations[key];
    await this.#deps.store.save();
  }

  /**
   * The label a new key account of `appId` gets (task-14.11 decision 36): the name the person
   * typed on the token page, else the app's name, else with the day it was connected, else with its
   * number too — the first of them no other of the app's accounts holds, ignoring case.
   */
  #keyLabel(appId: string, n: number, typed?: string, account?: VaultAccount): string {
    const taken = new Set(
      this.#deps.store
        .app(appId)
        .accounts.filter(held => held !== account)
        .map(held => held.label.toLowerCase()),
    );
    const app = this.#deps.displayName(appId);
    const day = `${app} · connected ${CONNECTED_DAY.format(new Date())}`;
    return (
      [typed, app, day].find(label => label && !taken.has(label.toLowerCase())) ?? `${day} (${n})`
    );
  }

  /** What a key account connected now would be called, with no name of the person's: the token page's hint. */
  newKeyLabel(appId: string): string {
    return this.#keyLabel(appId, this.nextAccount(appId));
  }

  /** A key pasted on the token page (task-12.5 decision 9), with the name the person gave it, if any. */
  async submitKey(attempt: Attempt, key: string, name?: string): Promise<Attempt> {
    if (attempt.state !== 'pending' || attempt.scheme.kind === 'oauth') return attempt;
    const secret = key.trim();
    if (secret === '') return this.#fail(attempt, 'no key was pasted');
    const keyHash = hashKey(secret);
    const apps = this.#deps.store.app(attempt.appId);
    let account: VaultAccount | undefined;
    if (attempt.purpose === 'again') {
      account = this.#account(attempt.appId, attempt.n);
      if (!account) return this.#fail(attempt, SIGNED_OUT);
    } else {
      account = apps.accounts.find(held => held.keyHash === keyHash);
      if (attempt.restore && account && account.n !== attempt.n) {
        return this.#fail(attempt, 'that account is already added');
      }
      if (!account && attempt.restore) account = this.#account(attempt.appId, attempt.n);
    }
    const existing = account !== undefined;
    if (!account) {
      account = {
        n: 0,
        label: '',
        scheme: attempt.scheme.key,
        kind: attempt.scheme.kind,
        secret: '',
        scopes: [],
      };
      this.#add(attempt, account);
      const typed = name?.trim().slice(0, KEY_NAME_MAX) || undefined;
      account.label = this.#keyLabel(attempt.appId, account.n, typed, account);
      // The person's own name stays theirs, as a rename does (task-14.3 decision 3).
      if (typed && account.label === typed) account.named = true;
    }
    account.scheme = attempt.scheme.key;
    account.kind = attempt.scheme.kind;
    account.secret = secret;
    account.keyHash = keyHash;
    if (attempt.scheme.kind === 'apiKey' && attempt.scheme.header)
      account.header = attempt.scheme.header;
    delete account.again;
    await this.#deps.store.save();
    return this.#signedIn(attempt, account, existing);
  }

  /**
   * A new account into the app's list, in number order: the next number, or for a slot's sign-in
   * to a signed-out account its own (task-14.3 decision 5).
   */
  #add(attempt: Attempt, account: VaultAccount): void {
    const apps = this.#deps.store.app(attempt.appId);
    if (attempt.restore) {
      account.n = attempt.n;
    } else {
      account.n = apps.next;
      apps.next += 1;
    }
    const at = apps.accounts.findIndex(held => held.n > account.n);
    apps.accounts.splice(at < 0 ? apps.accounts.length : at, 0, account);
  }

  #signedIn(attempt: Attempt, account: VaultAccount, existing: boolean): Attempt {
    attempt.state = 'signedIn';
    attempt.result = sourceId(attempt.appId, account.n);
    attempt.label = account.label;
    attempt.existing = existing;
    delete attempt.oauth;
    this.#deps.journal({
      event: 'signedIn',
      appId: attempt.appId,
      source: attempt.result,
      canvas: attempt.canvas,
      purpose: attempt.purpose,
      account: existing ? 'existing' : 'new',
      ...(attempt.rebound ? {rebound: true} : {}),
    });
    logLine(`🔑 ${attempt.result} signed in (${attempt.purpose})`);
    return attempt;
  }

  #fail(attempt: Attempt, reason: string): Attempt {
    attempt.state = 'failed';
    attempt.reason = reason;
    delete attempt.oauth;
    this.#deps.journal({event: 'failed', appId: attempt.appId, source: attempt.source, reason});
    return attempt;
  }

  outcome(id: string): Outcome | undefined {
    const attempt = this.attempt(id);
    if (!attempt) return undefined;
    // The app is named from the first answer: the client says an add-account window by it while
    // the sign-in runs (task-12.13 decision 21).
    return {
      state: attempt.state,
      ...(attempt.result
        ? {
            source: attempt.result,
            label: attempt.label ?? '',
            app: this.#deps.displayName(attempt.appId),
            existing: attempt.existing === true,
            ...(attempt.rebound ? {rebound: true} : {}),
          }
        : {app: this.#deps.displayName(attempt.appId)}),
      ...(attempt.reason ? {reason: attempt.reason} : {}),
    };
  }

  #expire(): void {
    const now = Date.now();
    for (const attempt of this.#attempts.values()) {
      if (attempt.state === 'pending' && attempt.expiresAt <= now) {
        attempt.state = 'expired';
        if (attempt.oauth) this.#byState.delete(attempt.oauth.state);
        delete attempt.oauth;
        this.#deps.journal({event: 'expired', appId: attempt.appId, source: attempt.source});
      }
      // A finished attempt stays readable for the client's next poll and a return arriving again,
      // then goes.
      if (attempt.expiresAt + ATTEMPT_LIFETIME_MS <= now) {
        this.#attempts.delete(attempt.id);
        for (const [state, id] of this.#byState) if (id === attempt.id) this.#byState.delete(state);
      }
    }
  }

  // ---- uninstall (phase-12 decision 12) -------------------------------------------------------

  /**
   * The app's accounts deleted, each revoked where its server advertises it, best-effort; what
   * became of each one's access is the answer (task-14.3 decision 12).
   */
  async forgetApp(appId: string): Promise<SignedOutAccount[]> {
    const app = this.#deps.store.data.apps[appId];
    if (!app || app.accounts.length === 0) return [];
    const accounts = app.accounts;
    app.accounts = [];
    await this.#deps.store.save();
    const signedOut: SignedOutAccount[] = [];
    for (const account of accounts) {
      const source = sourceId(appId, account.n);
      this.#endAttempts(appId, account.n);
      const revocation = await this.#revoke(account);
      this.#deps.journal({event: 'revoked', appId, source, revocation});
      signedOut.push({source, label: account.label, revocation});
    }
    return signedOut;
  }

  // ---- the App Library (task 14.3) ----------------------------------------------------------

  /**
   * Every app named, with whether it signs in, and each account: its label, its permissions in
   * the card's own words — never a scope's name — and whether it must sign in again (decision 9).
   */
  library(appIds: readonly string[]): LibraryApp[] {
    return appIds.map(appId => {
      const card = this.#deps.cardOf(appId);
      const need = cardNeed(card);
      const signIn =
        need.kind === 'none' ? 'none' : need.kind === 'unsupported' ? 'unsupported' : 'supported';
      const accounts = (this.#deps.store.data.apps[appId]?.accounts ?? []).map(account => {
        const scheme = account.kind === 'oauth' ? schemeOf(card, account.scheme) : undefined;
        return {
          source: sourceId(appId, account.n),
          label: account.label,
          kind: account.kind === 'oauth' ? ('oauth' as const) : ('key' as const),
          permissions: scheme ? wordsFor(scheme, account.scopes) : [],
          lapsed: account.again === true,
        };
      });
      return {appId, signIn, accounts};
    });
  }

  /**
   * The person's own label for an account (decisions 3, 4): trimmed, not empty, no other of the
   * app's accounts' labels ignoring case; kept through every later sign-in.
   */
  async rename(source: string, label: string, by?: WriteCaller): Promise<Renamed> {
    const named = parseSourceId(source);
    const account = named ? this.#account(named.appId, named.account) : undefined;
    if (!named || !account) return {ok: false, kind: 'unknown', reason: NO_SUCH_ACCOUNT};
    const next = label.trim();
    if (next === '') return {ok: false, kind: 'refused', reason: 'a name cannot be empty'};
    const others = this.#deps.store.app(named.appId).accounts.filter(held => held !== account);
    if (others.some(held => held.label.toLowerCase() === next.toLowerCase())) {
      const app = this.#deps.displayName(named.appId);
      return {ok: false, kind: 'refused', reason: `another ${app} account already has that name`};
    }
    if (next !== account.label) {
      const from = account.label;
      account.label = next;
      account.named = true;
      await this.#deps.store.save();
      this.#deps.journal({
        event: 'renamed',
        appId: named.appId,
        source,
        from,
        to: next,
        ...(by ? {by} : {}),
      });
    }
    return {ok: true, source, label: next};
  }

  /**
   * One account signed out (phase-14 decision 16): dropped, its access revoked where the server
   * advertises it, and the answer saying what became of it (decision 11). A sign-in still open
   * for it fails on its return.
   */
  async signOut(source: string, by?: WriteCaller): Promise<SignedOut> {
    const named = parseSourceId(source);
    const account = named ? this.#account(named.appId, named.account) : undefined;
    if (!named || !account) return {ok: false, reason: NO_SUCH_ACCOUNT};
    const apps = this.#deps.store.app(named.appId);
    apps.accounts = apps.accounts.filter(held => held !== account);
    await this.#deps.store.save();
    this.#endAttempts(named.appId, account.n);
    const revocation = await this.#revoke(account);
    this.#deps.journal({
      event: 'signedOut',
      appId: named.appId,
      source,
      revocation,
      ...(by ? {by} : {}),
    });
    logLine(`🔑 ${source} signed out (${revocation})`);
    return {ok: true, source, label: account.label, revocation};
  }

  /** Every sign-in still open for the account fails: it was signed out. */
  #endAttempts(appId: string, n: number): void {
    for (const attempt of this.#attempts.values()) {
      const bound = attempt.purpose === 'again' || attempt.purpose === 'escalation';
      if (attempt.state === 'pending' && bound && attempt.appId === appId && attempt.n === n) {
        if (attempt.oauth) this.#byState.delete(attempt.oauth.state);
        this.#fail(attempt, SIGNED_OUT);
      }
    }
  }

  /** RFC 7009 where the account's server advertises it, best-effort. */
  async #revoke(account: VaultAccount): Promise<Revocation> {
    if (account.kind !== 'oauth' || !account.revocationEndpoint || !account.clientId) {
      return 'nowhere';
    }
    try {
      const revoked = await revoke(this.#fetch, account.revocationEndpoint, {
        token: account.refresh ?? account.secret,
        hint: account.refresh ? 'refresh_token' : 'access_token',
        clientId: account.clientId,
      });
      return revoked ? 'revoked' : 'failed';
    } catch {
      return 'failed';
    }
  }
}

/** The header the account's credential rides, as the card's scheme names it. */
export function headersOf(account: VaultAccount): Record<string, string> {
  if (account.kind === 'apiKey' && account.header) return {[account.header]: account.secret};
  return {Authorization: `Bearer ${account.secret}`};
}

function sameHeaders(a: Record<string, string>, b: Record<string, string>): boolean {
  const keys = Object.keys(a);
  return keys.length === Object.keys(b).length && keys.every(key => a[key] === b[key]);
}

function applyTokens(
  account: VaultAccount,
  tokens: TokenResponse,
  scopes: readonly string[],
): void {
  account.secret = tokens.access_token;
  if (tokens.refresh_token) account.refresh = tokens.refresh_token;
  if (typeof tokens.expires_in === 'number')
    account.expiresAt = Date.now() + tokens.expires_in * 1000;
  else delete account.expiresAt;
  if (tokens.scope) {
    account.scopes = tokens.scope.split(' ').filter(scope => scope !== '' && scope !== 'openid');
  } else {
    account.scopes = [...scopes];
  }
}

function registrationKey(issuer: string, redirectUri: string): string {
  return `${issuer} ${redirectUri}`;
}

function union(a: readonly string[], b: readonly string[]): string[] {
  return [...new Set([...a, ...b])];
}

function reasonOf(err: unknown): string {
  if (err instanceof OAuthError) return err.message;
  return err instanceof Error ? err.message : String(err);
}
