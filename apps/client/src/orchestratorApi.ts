/**
 * The client's channel to the orchestrator for everything that is not A2A traffic (SPEC §10):
 * the orchestrator's own address and the registry's read routes — the catalog table and the
 * artifacts, served as static files under `/registry` (task-11.4 decision 10); the Store's reads,
 * relayed from the marketplace under `/marketplace` and annotated with what the registry holds,
 * and the install (task 14.7). HTTP from M7; IPC in Electron swaps the transport only. Runtime
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
 * add-account (task-12.8 decision 5).
 */
export function signInStartUrl(
  base: string,
  params: {attempt: string; canvas: string; source: string},
): string {
  const url = new URL('auth/start', base.endsWith('/') ? base : `${base}/`);
  url.searchParams.set('attempt', params.attempt);
  url.searchParams.set('canvas', params.canvas);
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

/** An installed app as the registry lists it: what the page names it by. */
export interface InstalledApp {
  id: string;
  card: Pick<PublishedCard, 'name'>;
}

/** The installed apps; none when the registry cannot be read. */
export async function readInstalledApps(base: string): Promise<InstalledApp[]> {
  try {
    const apps = await fetchJson(new URL('apps.json', registryUrl(base)).href, {cache: 'no-store'});
    return Array.isArray(apps) ? (apps as InstalledApp[]) : [];
  } catch {
    return [];
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
