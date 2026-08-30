/**
 * The client's channel to the orchestrator for everything that is not A2A traffic (SPEC §9.1):
 * the installed-app projection and the orchestrator's own address. A static import in Phase 1;
 * HTTP from M7 and IPC in Electron swap the transport only — the surface stays as it is here.
 * Runtime objects (catalogs, providers) never cross this boundary; see `catalogs/resolver`.
 */
import {CATALOG_ID} from 'github-catalog';
import {CATALOG_ID as SHELL_CATALOG_ID} from '@a2uiverse/shell-catalog/id';

/**
 * One catalog the client can render, as the orchestrator's Registry projects it. `appId` is an
 * installed app's id, or the reserved `shell` for the platform's own catalog.
 */
export interface CatalogRecord {
  appId: string;
  catalogId: string;
  /** The catalog package the client resolves locally. */
  package: string;
}

/**
 * The shell catalog carries the composition primitives the orchestrator paints into `shell:main`;
 * the rest are installed apps. Gmail and Calendar join this list when 2.6/2.7 publish
 * `gmail-catalog` and `calendar-catalog` — a record here plus a `TABLE` entry in
 * `catalogs/resolver`.
 */
const STATIC_CATALOGS: CatalogRecord[] = [
  {appId: 'shell', catalogId: SHELL_CATALOG_ID, package: '@a2uiverse/shell-catalog'},
  {appId: 'github', catalogId: CATALOG_ID, package: 'github-catalog'},
];

/** Every catalog the client can render, in registry order. */
export async function listCatalogs(): Promise<CatalogRecord[]> {
  return STATIC_CATALOGS;
}

/** The orchestrator's A2A base URL — the only server the client ever talks to. */
export function agentUrl(): string {
  return import.meta.env.VITE_ORCHESTRATOR_URL ?? 'http://localhost:10001';
}
