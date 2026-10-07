/**
 * The client's channel to the orchestrator for everything that is not A2A traffic (SPEC §10):
 * the orchestrator's own address and the registry's read routes — the catalog table and the
 * artifacts, served as static files under `/registry` (task-11.4 decision 10). HTTP from M7; IPC
 * in Electron swaps the transport only. Runtime objects (catalogs, providers) never cross this
 * boundary; `catalogs/loader` turns what it serves into them.
 */

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
