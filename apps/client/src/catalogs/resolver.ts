/**
 * The client-side half of the catalog projection: `catalogId → {catalog, Provider}`. Records
 * from `orchestratorApi` name catalogs; this table turns them into the runtime objects the
 * render layer needs. Static in Phase 1 — each installed catalog package is imported here; a bundle ships its own
 * Provider, applied around that catalog's fragments only.
 */
import type {ComponentType, ReactNode} from 'react';
import type {Catalog} from '@a2ui/web_core/v0_9';
import type {ReactComponentImplementation} from '@a2ui/react/v0_9';
import {CATALOG, CATALOG_ID, Provider as GitHubProvider} from 'github-catalog';
import {
  CATALOG as GMAIL_CATALOG,
  CATALOG_ID as GMAIL_CATALOG_ID,
  Provider as GmailProvider,
} from 'gmail-catalog';
import {
  CATALOG as CALENDAR_CATALOG,
  CATALOG_ID as CALENDAR_CATALOG_ID,
  Provider as CalendarProvider,
} from 'calendar-catalog';
import {
  CATALOG as SHOP_A_CATALOG,
  CATALOG_ID as SHOP_A_CATALOG_ID,
  Provider as ShopAProvider,
} from 'shop-a-catalog';
import {
  CATALOG as SHOP_B_CATALOG,
  CATALOG_ID as SHOP_B_CATALOG_ID,
  Provider as ShopBProvider,
} from 'shop-b-catalog';
import {
  CATALOG as SHELL_CATALOG,
  CATALOG_ID as SHELL_CATALOG_ID,
  Provider as ShellProvider,
} from '@a2uiverse/shell-catalog';
import type {CatalogRecord} from '../orchestratorApi';

export interface ResolvedCatalog {
  id: string;
  catalog: Catalog<ReactComponentImplementation>;
  /** Wraps every surface of this catalog: the vendor design system's own provider + styles. */
  Provider: ComponentType<{children: ReactNode}>;
}

/** One entry per catalog package in `orchestratorApi`'s projection; the two lists move together. */
const TABLE: ReadonlyMap<string, ResolvedCatalog> = new Map([
  [SHELL_CATALOG_ID, {id: SHELL_CATALOG_ID, catalog: SHELL_CATALOG, Provider: ShellProvider}],
  [CATALOG_ID, {id: CATALOG_ID, catalog: CATALOG, Provider: GitHubProvider}],
  [GMAIL_CATALOG_ID, {id: GMAIL_CATALOG_ID, catalog: GMAIL_CATALOG, Provider: GmailProvider}],
  [
    CALENDAR_CATALOG_ID,
    {id: CALENDAR_CATALOG_ID, catalog: CALENDAR_CATALOG, Provider: CalendarProvider},
  ],
  [SHOP_A_CATALOG_ID, {id: SHOP_A_CATALOG_ID, catalog: SHOP_A_CATALOG, Provider: ShopAProvider}],
  [SHOP_B_CATALOG_ID, {id: SHOP_B_CATALOG_ID, catalog: SHOP_B_CATALOG, Provider: ShopBProvider}],
]);

/** Resolve registry records to runtime catalogs; an unknown catalog id is a hard error. */
export function resolveCatalogs(records: CatalogRecord[]): ResolvedCatalog[] {
  return records.map(record => {
    const resolved = TABLE.get(record.catalogId);
    if (!resolved) throw new Error(`No catalog package for ${record.catalogId}`);
    return resolved;
  });
}
