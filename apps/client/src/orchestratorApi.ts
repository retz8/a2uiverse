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
