/**
 * The client's channel to the orchestrator for everything that is not A2A traffic (SPEC §10):
 * the orchestrator's own address and the registry's read routes — the catalog table and the
 * artifacts, served as static files under `/registry` (task-11.4 decision 10); the Store's reads,
 * relayed from the marketplace under `/marketplace` and annotated with what the registry holds,
 * and the install (task 14.7); the App Library's update check, accounts read, rename, sign-out
 * and uninstall (task 14.8); Publish's read of who is signed in, the claim, sign-in, sign-out,
 * publish and unpublish, relayed to the marketplace with the publisher's secret the orchestrator
 * holds (task 14.9). HTTP from M7; IPC in Electron swaps the transport only. Runtime
 * objects (catalogs, providers) never cross this boundary; `catalogs/loader` turns what it serves
 * into them.
 */
import {
  INSTALL_REFUSALS,
  artifactIdOf,
  type IndexEntry,
  type InstallRefusal,
  type PreviewDocument,
  type PublishOutcome,
  type PublishRequest,
  type PublishedCard,
  type UpdateState,
} from '@a2uiverse/sdk';

/** One row of the catalog table: a catalog the client provides itself, or an installed artifact. */
export type CatalogRow =
  {catalogId: string; provided: 'client'} | {catalogId: string; artifact: string; entry: string};

/** The orchestrator's A2A base URL — the only server the client ever talks to. */
export function agentUrl(): string {
  return import.meta.env.VITE_ORCHESTRATOR_URL ?? 'http://localhost:10001';
}

/** The registry's read routes: the table at `catalogs.json`, an artifact under `artifacts/<id>/`. */
export function registryUrl(base: string = agentUrl()): string {
  return new URL('registry/', base.endsWith('/') ? base : `${base}/`).href;
}

/** Where an artifact's files are served: its base URL, which its stylesheet loads resolve against. */
export function artifactUrl(registry: string, artifact: string): string {
  return new URL(`artifacts/${artifact}/`, registry).href;
}

/**
 * Reads JSON over HTTP. The loader reads the table and each descriptor with `cache: 'no-store'`:
 * the table changes with every install, and the browser holds a second request for a URL behind one
 * still unanswered (task-11.8 decision 20).
 */
export async function fetchJson(url: string, init?: RequestInit): Promise<unknown> {
  const response = await fetch(url, init);
  if (!response.ok) throw new Error(`${url} answered ${response.status}`);
  return response.json();
}

/**
 * A read on the trusted page gets this long to answer, then is asked once more, as the loader's
 * JSON reads are (task-11.8): the tunnel sometimes leaves a request unanswered for minutes
 * (task-14.11 decision 26).
 */
export const READ_TIMEOUT_MS = 10_000;

/**
 * A page's read past the browser's cache, bounded: the answer and its body within
 * `READ_TIMEOUT_MS`, else asked once more; no answer to that either throws, as an orchestrator
 * that cannot be reached does.
 */
async function fetchRead(url: string): Promise<Response> {
  for (let attempt = 1; ; attempt += 1) {
    const ask = new AbortController();
    const timer = setTimeout(() => ask.abort(), READ_TIMEOUT_MS);
    try {
      const response = await fetch(url, {cache: 'no-store', signal: ask.signal});
      const body = await response.text();
      return new Response(body, {status: response.status, headers: response.headers});
    } catch (err) {
      if (attempt === 2 || !ask.signal.aborted) throw err;
    } finally {
      clearTimeout(timer);
    }
  }
}

/** A page's JSON read, bounded; a refusal throws. */
async function readJson(url: string): Promise<unknown> {
  const response = await fetchRead(url);
  if (!response.ok) throw new Error(`${url} answered ${response.status}`);
  return response.json();
}

/**
 * A write gets this long to answer before the page reads back what it was changing (task-14.11
 * decision 40): above the orchestrator's own limits for every write but a publish — 10 s for each
 * request to the Store, of which an install asks several, and 10 s for each account's access
 * cancelled at its app.
 */
export const WRITE_TIMEOUT_MS = 60_000;

/** A publish gets the orchestrator's own limit for relaying it to the Store, 180 s, and 10 s more. */
export const PUBLISH_TIMEOUT_MS = 190_000;

/**
 * A write from the browser: the JSON content type and the page's own origin, no token (SPEC §10).
 * Its answer; `unheard` when none came in `timeoutMs`, so whether it landed is read back and it is
 * never sent again; null when the orchestrator could not be reached.
 */
async function write(
  url: string,
  body: unknown,
  timeoutMs = WRITE_TIMEOUT_MS,
): Promise<{status: number; body: unknown} | 'unheard' | null> {
  const ask = new AbortController();
  const timer = setTimeout(() => ask.abort(), timeoutMs);
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify(body),
      signal: ask.signal,
    });
    return {status: response.status, body: await response.json().catch(() => undefined)};
  } catch {
    return ask.signal.aborted ? 'unheard' : null;
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Where a sign-in window opens (task-12.5 decision 5): the orchestrator's start route, naming the
 * attempt the client made, the canvas — its A2A context — and the source, or the bare app id for
 * add-account (task-12.8 decision 5). The App Library's sign-in names no canvas (task-14.3
 * decision 6).
 */
export function signInStartUrl(
  base: string,
  params: {attempt: string; canvas?: string; source: string},
): string {
  const url = new URL('auth/start', base.endsWith('/') ? base : `${base}/`);
  url.searchParams.set('attempt', params.attempt);
  if (params.canvas !== undefined) url.searchParams.set('canvas', params.canvas);
  url.searchParams.set('source', params.source);
  return url.href;
}

/**
 * How a sign-in attempt stands, as the orchestrator answers the poll: pending, signed in as a
 * source — with the account's label and whether the account was already held — failed with a
 * reason, expired, or `unknown` once the orchestrator no longer has it; the app's name on every
 * answer it has the attempt for.
 */
export interface AttemptOutcome {
  state: 'pending' | 'signedIn' | 'failed' | 'expired' | 'unknown';
  source?: string;
  label?: string;
  app?: string;
  existing?: boolean;
  /** Signed in again as another identity: the account re-bound to it (task-12.13 decision 24). */
  rebound?: boolean;
  reason?: string;
}

/** A poll gets this long before it counts as lost; the next one goes out regardless. */
const POLL_TIMEOUT_MS = 10_000;

/** Reads a sign-in attempt's outcome; rejects when the orchestrator could not be asked. */
export async function readAttempt(base: string, attempt: string): Promise<AttemptOutcome> {
  const url = new URL(
    `auth/attempts/${encodeURIComponent(attempt)}`,
    base.endsWith('/') ? base : `${base}/`,
  );
  const response = await fetch(url, {
    cache: 'no-store',
    signal: AbortSignal.timeout(POLL_TIMEOUT_MS),
  });
  if (response.status === 404) return {state: 'unknown'};
  if (!response.ok) throw new Error(`${url.href} answered ${response.status}`);
  return (await response.json()) as AttemptOutcome;
}

// --- The Store (task 14.7) ----------------------------------------------------------------------

/** The marketplace's routes as the orchestrator relays them: the base the Store reads from. */
export function marketplaceUrl(base: string = agentUrl()): string {
  return new URL('marketplace/', base.endsWith('/') ? base : `${base}/`).href;
}

/** One listing as the Store reads it: the entry, whether it is installed, its state as last computed. */
export interface StoreListing {
  entry: IndexEntry;
  installed: boolean;
  update?: UpdateState;
}

/** A read of the Store: its answer, or why there is none — unreached, not published, unreadable. */
export type StoreRead<T> =
  {ok: true; value: T} | {ok: false; reason: 'unreached' | 'not-published' | 'malformed'};

const STORE_REASONS = new Set(['unreached', 'not-published', 'malformed']);

async function readStore<T>(url: string): Promise<StoreRead<T>> {
  let response: Response;
  try {
    response = await fetchRead(url);
  } catch {
    return {ok: false, reason: 'unreached'};
  }
  if (response.ok) {
    try {
      return {ok: true, value: (await response.json()) as T};
    } catch {
      return {ok: false, reason: 'malformed'};
    }
  }
  const body = (await response.json().catch(() => undefined)) as {reason?: unknown} | undefined;
  const reason =
    typeof body?.reason === 'string' && STORE_REASONS.has(body.reason)
      ? (body.reason as 'unreached' | 'not-published' | 'malformed')
      : 'unreached';
  return {ok: false, reason};
}

/** Every published app, each annotated. */
export function readStoreIndex(base: string): Promise<StoreRead<StoreListing[]>> {
  return readStore(new URL('index.json', marketplaceUrl(base)).href);
}

/**
 * One publisher's listings, each app's live card read again first, so an app ahead of the Store
 * says so the first time Publish is opened (task-14.11 decision 38).
 */
export function readPublisherListings(
  base: string,
  publisher: string,
): Promise<StoreRead<StoreListing[]>> {
  const url = new URL('listings.json', marketplaceUrl(base));
  url.searchParams.set('publisher', publisher);
  return readStore(url.href);
}

/** The Store's search over the words: listings in rank order. */
export async function searchStore(base: string, words: string): Promise<StoreRead<StoreListing[]>> {
  const url = new URL('search', marketplaceUrl(base));
  url.searchParams.set('q', words);
  const read = await readStore<{results: StoreListing[]}>(url.href);
  return read.ok ? {ok: true, value: read.value.results} : read;
}

/** One app's listing. */
export function readStoreEntry(base: string, appId: string): Promise<StoreRead<StoreListing>> {
  return readStore(
    new URL(`apps/${encodeURIComponent(appId)}/entry.json`, marketplaceUrl(base)).href,
  );
}

/** One app's captured preview: the sample its view draws. */
export function readStorePreview(base: string, appId: string): Promise<StoreRead<PreviewDocument>> {
  return readStore(
    new URL(`apps/${encodeURIComponent(appId)}/preview.json`, marketplaceUrl(base)).href,
  );
}

/**
 * An installed app as the registry lists it: its card as installed, where it came from, and
 * whether this run holds its card — reached at startup or by a check since (task-14.8 decision 2);
 * a snapshot that does not say is read as reached.
 */
export interface InstalledApp {
  id: string;
  card: PublishedCard;
  /** Each catalog id it holds, at its build's artifact id. */
  catalogs?: Record<string, string>;
  source?: 'marketplace' | 'local';
  reachable?: boolean;
}

/** The installed apps; none when the registry cannot be read. */
export async function readInstalledApps(base: string): Promise<InstalledApp[]> {
  return (await readInstalled(base)) ?? [];
}

/** The installed apps; null when the registry cannot be read. */
export async function readInstalled(base: string): Promise<InstalledApp[] | null> {
  try {
    const apps = await readJson(new URL('apps.json', registryUrl(base)).href);
    return Array.isArray(apps) ? (apps as InstalledApp[]) : null;
  } catch {
    return null;
  }
}

/**
 * An install's answer as the page reads it: done, with the installed apps that followed it onto
 * a new catalog build (task-14.7 decision 2), or refused with its cause (decision 6).
 */
export type InstallAnswer =
  | {ok: true; appId: string; replaced: boolean; followed: string[]}
  | {ok: false; cause: InstallRefusal};

/**
 * Installs an app from the Store by its id — an update is the same install over the held app.
 * An orchestrator that cannot be reached answers as the Store unreached; an install that got no
 * answer is done when the app is installed as the Store lists it now (task-14.11 decision 40), the
 * apps that followed it unknown.
 */
export async function installApp(base: string, appId: string): Promise<InstallAnswer> {
  const answer = await write(new URL('install', registryUrl(base)).href, {appId});
  if (answer === 'unheard') {
    return (await installedAsListed(base, appId))
      ? {ok: true, appId, replaced: true, followed: []}
      : {ok: false, cause: 'store-unreached'};
  }
  if (answer === null) return {ok: false, cause: 'store-unreached'};
  const body = answer.body as
    | {ok?: unknown; appId?: unknown; replaced?: unknown; followed?: unknown; cause?: unknown}
    | undefined;
  if (answer.status >= 200 && answer.status < 300 && body?.ok === true) {
    return {
      ok: true,
      appId: String(body.appId),
      replaced: body.replaced === true,
      followed: Array.isArray(body.followed) ? body.followed.map(String) : [],
    };
  }
  const cause = INSTALL_REFUSALS.find(known => known === body?.cause);
  // A refusal with no cause the page knows still failed the install: the checks are its words.
  return {ok: false, cause: cause ?? 'checks'};
}

/** Whether `appId` is installed at the card version and builds the Store lists for it now. */
async function installedAsListed(base: string, appId: string): Promise<boolean> {
  const [installed, listed] = await Promise.all([readInstalled(base), readStoreEntry(base, appId)]);
  const record = installed?.find(app => app.id === appId);
  if (!record || !listed.ok) return false;
  const {entry} = listed.value;
  return (
    record.card.version === entry.card.version &&
    Object.entries(entry.catalogs).every(([id, artifact]) => record.catalogs?.[id] === artifact)
  );
}

// --- The App Library (task 14.8) ----------------------------------------------------------------

/** The orchestrator's sign-in routes: the accounts read, rename and sign-out. */
function authUrl(base: string, path: string): string {
  return new URL(`auth/${path}`, base.endsWith('/') ? base : `${base}/`).href;
}

/**
 * Runs the update check and answers every installed app's state (SPEC §10); null when the
 * orchestrator could not be asked. The check also replaces the state the Planner's reader holds.
 */
export async function checkUpdates(base: string): Promise<UpdateState[] | null> {
  try {
    const states = await readJson(new URL('updates.json', registryUrl(base)).href);
    return Array.isArray(states) ? (states as UpdateState[]) : null;
  } catch {
    return null;
  }
}

/** An account as the App Library reads it (task-14.3 decision 9). */
export interface LibraryAccount {
  source: string;
  label: string;
  kind: 'oauth' | 'key';
  /** The permissions it holds in the card's own words; none for a key, or a card that gives none. */
  permissions: string[];
  /** It must sign in again. */
  lapsed: boolean;
}

/** An app's accounts, and whether it asks no sign-in, signs in, or asks one A2UIVerse can't run. */
export interface LibraryApp {
  appId: string;
  signIn: 'none' | 'supported' | 'unsupported';
  accounts: LibraryAccount[];
}

/** Every installed app's accounts; null when the orchestrator could not be asked. */
export async function readAccounts(base: string): Promise<LibraryApp[] | null> {
  try {
    const apps = await readJson(authUrl(base, 'accounts.json'));
    return Array.isArray(apps) ? (apps as LibraryApp[]) : null;
  } catch {
    return null;
  }
}

/** A write refused: the orchestrator's first finding, or none when it could not be reached. */
export interface Refused {
  ok: false;
  reason?: string;
}

const refusedOf = (answer: {body: unknown} | null): Refused => {
  const findings = (answer?.body as {findings?: unknown} | undefined)?.findings;
  const first = Array.isArray(findings) ? findings[0] : undefined;
  return typeof first === 'string' ? {ok: false, reason: first} : {ok: false};
};

/**
 * What became of an account's access: cancelled, nowhere to cancel, failed to cancel, or unknown —
 * a sign-out whose answer never came, read back as done.
 */
export type Revocation = 'revoked' | 'nowhere' | 'failed' | 'unknown';

/** Where `source`'s account stands now: its label, gone, or unread. */
async function accountNow(base: string, source: string): Promise<string | 'gone' | null> {
  const apps = await readAccounts(base);
  if (!apps) return null;
  const account = apps.flatMap(app => app.accounts).find(a => a.source === source);
  return account ? account.label : 'gone';
}

/** Renames an account: the label the vault now holds, or why not (task-14.3 decision 4). */
export async function renameAccount(
  base: string,
  source: string,
  label: string,
): Promise<{ok: true; label: string} | Refused> {
  const answer = await write(authUrl(base, 'rename'), {source, label});
  if (answer === 'unheard') {
    const now = await accountNow(base, source);
    return now === label.trim() ? {ok: true, label: now} : {ok: false};
  }
  const body = answer?.body as {ok?: unknown; label?: unknown} | undefined;
  if (answer?.status === 200 && body?.ok === true) return {ok: true, label: String(body.label)};
  return refusedOf(answer);
}

/**
 * Signs an account out: dropped in every case, with what became of its access. `label` is the
 * account's as the page shows it, said when the answer never came and the account is read back
 * gone.
 */
export async function signOutAccount(
  base: string,
  source: string,
  label: string,
): Promise<{ok: true; label: string; revocation: Revocation} | Refused> {
  const answer = await write(authUrl(base, 'sign-out'), {source});
  if (answer === 'unheard') {
    return (await accountNow(base, source)) === 'gone'
      ? {ok: true, label, revocation: 'unknown'}
      : {ok: false};
  }
  const body = answer?.body as {ok?: unknown; label?: unknown; revocation?: unknown} | undefined;
  if (answer?.status === 200 && body?.ok === true) {
    return {ok: true, label: String(body.label), revocation: revocationOf(body.revocation)};
  }
  return refusedOf(answer);
}

/** Uninstalls an app, its accounts signed out — each with what became of its access. */
export async function uninstallApp(
  base: string,
  appId: string,
): Promise<{ok: true; accounts: {label: string; revocation: Revocation}[]} | Refused> {
  const answer = await write(new URL('uninstall', registryUrl(base)).href, {appId});
  if (answer === 'unheard') {
    const installed = await readInstalled(base);
    return installed && !installed.some(app => app.id === appId)
      ? {ok: true, accounts: []}
      : {ok: false};
  }
  const body = answer?.body as {ok?: unknown; accounts?: unknown} | undefined;
  if (answer?.status === 200 && body?.ok === true) {
    const accounts = Array.isArray(body.accounts)
      ? (body.accounts as Record<string, unknown>[])
      : [];
    return {
      ok: true,
      accounts: accounts.map(account => ({
        label: String(account.label),
        revocation: revocationOf(account.revocation),
      })),
    };
  }
  return refusedOf(answer);
}

const revocationOf = (value: unknown): Revocation =>
  value === 'revoked' || value === 'nowhere' ? value : 'failed';

// --- Publish (task 14.9) ------------------------------------------------------------------------

/** Who is signed in to Publish, as the orchestrator reads it at each entry (task-14.4 decision 13). */
export type PublisherStatus =
  | {state: 'signed-out'}
  | {state: 'signed-in'; publisher: string; store: 'accepted' | 'not-accepted' | 'unreached'}
  /** Held for a Store other than the one the orchestrator reaches: by its name alone (decision 12). */
  | {state: 'another-store'; publisher: string};

/** Who is signed in; null when the orchestrator could not be asked. */
export async function readPublisher(base: string): Promise<PublisherStatus | null> {
  try {
    const status = (await readJson(new URL('publisher.json', marketplaceUrl(base)).href)) as {
      state?: unknown;
    } | null;
    return typeof status?.state === 'string' ? (status as PublisherStatus) : null;
  } catch {
    return null;
  }
}

/**
 * Why a publisher's call was refused, read off the orchestrator's reason and status (task-14.9
 * decision 10): a publisher already held, none, one held for another Store, the secret no longer
 * accepted; the name taken or not allowed; the app or a look another publisher's; the Store's
 * checks; the app not published; this computer unable to keep or forget the secret; or no answer
 * the page can read — the Store or the orchestrator unreached, or a body it cannot read.
 */
export type PublisherRefusal =
  | 'held'
  | 'signed-out'
  | 'another-store'
  | 'not-accepted'
  | 'taken'
  | 'name'
  | 'owned'
  | 'checks'
  | 'not-published'
  | 'unkept'
  | 'unreached';

/** A publisher's call refused, with the findings as the orchestrator or the Store worded them. */
export interface PublisherRefused {
  ok: false;
  refusal: PublisherRefusal;
  findings: string[];
}

const PUBLISHER_REASONS: ReadonlySet<string> = new Set([
  'held',
  'signed-out',
  'another-store',
  'not-accepted',
  'unreached',
]);

/**
 * A refused call: the reason the orchestrator named, else what its status means for this route;
 * an answer with no findings to read is no answer at all.
 */
function publisherRefused(
  answer: {status: number; body: unknown} | null,
  byStatus: Partial<Record<number, PublisherRefusal>>,
): PublisherRefused {
  const body = answer?.body as {reason?: unknown; findings?: unknown} | undefined;
  const findings = Array.isArray(body?.findings)
    ? body.findings.filter((f): f is string => typeof f === 'string')
    : [];
  const named =
    typeof body?.reason === 'string' && PUBLISHER_REASONS.has(body.reason)
      ? (body.reason as PublisherRefusal)
      : undefined;
  const byIt = answer && findings.length > 0 ? byStatus[answer.status] : undefined;
  return {ok: false, refusal: named ?? byIt ?? 'unreached', findings};
}

/** The orchestrator's publisher routes, under the marketplace's. */
const publisherUrl = (base: string, path: string) => new URL(path, marketplaceUrl(base)).href;

/**
 * A claim's answer: the secret, shown once, and whether this computer kept it (task-14.4 decision
 * 8); no secret for a claim whose answer never came, read back as held here.
 */
export type ClaimAnswer =
  {ok: true; publisher: string; token: string | null; kept: boolean} | PublisherRefused;

/** Who is signed in to Publish now, read back after a publisher's call got no answer. */
async function signedInNow(base: string): Promise<string | 'signed-out' | null> {
  const status = await readPublisher(base);
  if (!status) return null;
  return status.state === 'signed-out' ? 'signed-out' : status.publisher;
}

/** A publisher's call unanswered and not read back as done: the Store unreached. */
const UNHEARD: PublisherRefused = {ok: false, refusal: 'unreached', findings: []};

/** Claims a publisher name. */
export async function claimPublisher(base: string, publisher: string): Promise<ClaimAnswer> {
  const answer = await write(publisherUrl(base, 'claim'), {publisher});
  if (answer === 'unheard') {
    return (await signedInNow(base)) === publisher
      ? {ok: true, publisher, token: null, kept: true}
      : UNHEARD;
  }
  const body = answer?.body as {publisher?: unknown; token?: unknown; kept?: unknown} | undefined;
  if (answer?.status === 201 && typeof body?.token === 'string') {
    return {
      ok: true,
      publisher: typeof body.publisher === 'string' ? body.publisher : publisher,
      token: body.token,
      kept: body.kept !== false,
    };
  }
  return publisherRefused(answer, {400: 'name', 409: 'taken', 422: 'name'});
}

/** Signs in with a name and its secret, checked at the Store before they are kept (decision 10). */
export async function signInPublisher(
  base: string,
  publisher: string,
  token: string,
): Promise<{ok: true; publisher: string} | PublisherRefused> {
  const answer = await write(publisherUrl(base, 'sign-in'), {publisher, token});
  if (answer === 'unheard') {
    return (await signedInNow(base)) === publisher ? {ok: true, publisher} : UNHEARD;
  }
  const body = answer?.body as {ok?: unknown} | undefined;
  if (answer?.status === 200 && body?.ok === true) return {ok: true, publisher};
  return publisherRefused(answer, {500: 'unkept'});
}

/** Signs out of Publish: the orchestrator forgets the secret (decision 11). */
export async function signOutPublisher(base: string): Promise<{ok: true} | PublisherRefused> {
  const answer = await write(publisherUrl(base, 'sign-out'), {});
  if (answer === 'unheard') {
    return (await signedInNow(base)) === 'signed-out' ? {ok: true} : UNHEARD;
  }
  const body = answer?.body as {ok?: unknown} | undefined;
  if (answer?.status === 200 && body?.ok === true) return {ok: true};
  return publisherRefused(answer, {404: 'signed-out', 500: 'unkept'});
}

/**
 * Publishes: the body Stellify's `publish` posts, relayed with the held secret, the Store's
 * outcome or its findings returned as it worded them (task-14.4 decision 15).
 */
export async function publishApp(
  base: string,
  request: PublishRequest,
): Promise<PublishOutcome | PublisherRefused> {
  const answer = await write(publisherUrl(base, 'publish'), request, PUBLISH_TIMEOUT_MS);
  if (answer === 'unheard') {
    const entry = await listedAsPublished(base, request);
    return entry
      ? {ok: true, appId: request.appId, version: entry.card.version, summary: '', notes: []}
      : UNHEARD;
  }
  const body = answer?.body as Partial<PublishOutcome> | undefined;
  if (answer?.status === 200 && body?.ok === true) {
    return {
      ok: true,
      appId: String(body.appId),
      version: String(body.version),
      summary: typeof body.summary === 'string' ? body.summary : '',
      notes: Array.isArray(body.notes) ? body.notes.map(String) : [],
    };
  }
  return publisherRefused(answer, {400: 'checks', 403: 'owned', 422: 'checks'});
}

/** Unpublishes a whole app. */
export async function unpublishApp(
  base: string,
  appId: string,
): Promise<{ok: true} | PublisherRefused> {
  const answer = await write(publisherUrl(base, 'unpublish'), {appId});
  if (answer === 'unheard') {
    const listed = await listingNow(base, appId);
    return listed === 'gone' ? {ok: true} : UNHEARD;
  }
  const body = answer?.body as {ok?: unknown} | undefined;
  if (answer?.status === 200 && body?.ok === true) return {ok: true};
  return publisherRefused(answer, {400: 'checks', 403: 'owned', 404: 'not-published'});
}

/** The signed-in publisher's listing of `appId` now, its live card read first: gone, or unread. */
async function listingNow(base: string, appId: string): Promise<IndexEntry | 'gone' | null> {
  const publisher = await signedInNow(base);
  if (publisher === null || publisher === 'signed-out') return null;
  const listings = await readPublisherListings(base, publisher);
  if (!listings.ok) return null;
  return listings.value.find(l => l.entry.appId === appId)?.entry ?? 'gone';
}

/**
 * The listing a publish whose answer never came made: the app listed at the builds it handed, its
 * live card covered — no longer ahead of the Store. None when it is not so.
 */
async function listedAsPublished(
  base: string,
  request: PublishRequest,
): Promise<IndexEntry | undefined> {
  const entry = await listingNow(base, request.appId);
  if (entry === null || entry === 'gone' || entry.aheadOfStore) return undefined;
  const handed = await Promise.all(
    request.catalogs.map(async ({files}) => {
      const descriptor = files['artifact.json'];
      if (descriptor === undefined) return undefined;
      return artifactIdOf(Uint8Array.from(atob(descriptor), char => char.charCodeAt(0)));
    }),
  );
  const listed = new Set(Object.values(entry.catalogs));
  return handed.every(id => id !== undefined && listed.has(id)) ? entry : undefined;
}
