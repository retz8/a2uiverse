/**
 * The client's channel to the orchestrator for everything that is not A2A traffic (SPEC §9.1):
 * the installed-app projection and the orchestrator's own address. A static import in Phase 1;
 * HTTP from M7 and IPC in Electron swap the transport only — the surface stays as it is here.
 * Runtime objects (catalogs, providers) never cross this boundary; see `catalogs/resolver`.
 */
import {CATALOG_ID} from 'github-catalog';
import {CATALOG_ID as GMAIL_CATALOG_ID} from 'gmail-catalog';
import {CATALOG_ID as CALENDAR_CATALOG_ID} from 'calendar-catalog';
import {CATALOG_ID as SHOP_A_CATALOG_ID} from 'shop-a-catalog';
import {CATALOG_ID as SHOP_B_CATALOG_ID} from 'shop-b-catalog';
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
 * the rest are installed apps. A new app joins with a record here plus a `TABLE` entry in
 * `catalogs/resolver` — the two lists move together.
 *
 * The two mock storefronts (`a2uiverse-apps/mocks/`) are always here, though they are in the
 * orchestrator's roster only when it is pointed at the tier: the client renders whatever roster the
 * orchestrator serves and knows nothing of the profile. Naming a mock in this list is an accepted
 * leak with a known expiry — the list itself is the placeholder Phase 9's dynamic catalog loading
 * replaces, and all five app catalogs leave it together then.
 */
const STATIC_CATALOGS: CatalogRecord[] = [
  {appId: 'shell', catalogId: SHELL_CATALOG_ID, package: '@a2uiverse/shell-catalog'},
  {appId: 'github', catalogId: CATALOG_ID, package: 'github-catalog'},
  {appId: 'gmail', catalogId: GMAIL_CATALOG_ID, package: 'gmail-catalog'},
  {appId: 'calendar', catalogId: CALENDAR_CATALOG_ID, package: 'calendar-catalog'},
  {appId: 'shop-a', catalogId: SHOP_A_CATALOG_ID, package: 'shop-a-catalog'},
  {appId: 'shop-b', catalogId: SHOP_B_CATALOG_ID, package: 'shop-b-catalog'},
];

/** Every catalog the client can render, in registry order. */
export async function listCatalogs(): Promise<CatalogRecord[]> {
  return STATIC_CATALOGS;
}

/** The orchestrator's A2A base URL — the only server the client ever talks to. */
export function agentUrl(): string {
  return import.meta.env.VITE_ORCHESTRATOR_URL ?? 'http://localhost:10001';
}
