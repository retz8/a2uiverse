/**
 * The client's channel to the orchestrator for everything that is not A2A traffic (SPEC §10):
 * the orchestrator's own address and the registry's read routes — the catalog table and the
 * artifacts, served as static files under `/registry` (task-11.4 decision 10); the Store's reads,
 * relayed from the marketplace under `/marketplace` and annotated with what the registry holds,
 * and the install (task 14.7); the App Library's update check, accounts read, rename, sign-out
 * and uninstall (task 14.8). HTTP from M7; IPC in Electron swaps the transport only. Runtime
 * objects (catalogs, providers) never cross this boundary; `catalogs/loader` turns what it serves
 * into them.
 */
import {
  INSTALL_REFUSALS,
  type IndexEntry,
  type InstallRefusal,
  type PreviewDocument,
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
    response = await fetch(url, {cache: 'no-store'});
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
    const apps = await fetchJson(new URL('apps.json', registryUrl(base)).href, {cache: 'no-store'});
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
 * A write from the browser: the JSON content type and the page's own origin, no token (SPEC §10).
 * An orchestrator that cannot be reached answers as the Store unreached.
 */
export async function installApp(base: string, appId: string): Promise<InstallAnswer> {
  let response: Response;
  try {
    response = await fetch(new URL('install', registryUrl(base)), {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({appId}),
    });
  } catch {
    return {ok: false, cause: 'store-unreached'};
  }
  const body = (await response.json().catch(() => undefined)) as
    | {ok?: unknown; appId?: unknown; replaced?: unknown; followed?: unknown; cause?: unknown}
    | undefined;
  if (response.ok && body?.ok === true) {
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
    const states = await fetchJson(new URL('updates.json', registryUrl(base)).href, {
      cache: 'no-store',
    });
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
    const apps = await fetchJson(authUrl(base, 'accounts.json'), {cache: 'no-store'});
    return Array.isArray(apps) ? (apps as LibraryApp[]) : null;
  } catch {
    return null;
  }
}

/**
 * A write from the browser: the JSON content type and the page's own origin, no token (SPEC §10).
 * Null when the orchestrator could not be reached.
 */
async function write(url: string, body: unknown): Promise<{status: number; body: unknown} | null> {
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify(body),
    });
    return {status: response.status, body: await response.json().catch(() => undefined)};
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

/** What became of an account's access: cancelled, nowhere to cancel, or failed to cancel. */
export type Revocation = 'revoked' | 'nowhere' | 'failed';

/** Renames an account: the label the vault now holds, or why not (task-14.3 decision 4). */
export async function renameAccount(
  base: string,
  source: string,
  label: string,
): Promise<{ok: true; label: string} | Refused> {
  const answer = await write(authUrl(base, 'rename'), {source, label});
  const body = answer?.body as {ok?: unknown; label?: unknown} | undefined;
  if (answer?.status === 200 && body?.ok === true) return {ok: true, label: String(body.label)};
  return refusedOf(answer);
}

/** Signs an account out: dropped in every case, with what became of its access. */
export async function signOutAccount(
  base: string,
  source: string,
): Promise<{ok: true; label: string; revocation: Revocation} | Refused> {
  const answer = await write(authUrl(base, 'sign-out'), {source});
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
