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
  CATALOG as CIRCLECI_CATALOG,
  CATALOG_ID as CIRCLECI_CATALOG_ID,
  Provider as CircleciProvider,
} from 'circleci-catalog';
import {
  CATALOG as LINEAR_CATALOG,
  CATALOG_ID as LINEAR_CATALOG_ID,
  Provider as LinearProvider,
} from 'linear-catalog';
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
  CATALOG_ID as SHELL_CATALOG_ID,
  createCatalog as createShellCatalog,
  Provider as ShellProvider,
  type ShellActionHandler,
} from '@a2uiverse/shell-catalog';
import type {CatalogRecord} from '../orchestratorApi';

export interface ResolvedCatalog {
  id: string;
  catalog: Catalog<ReactComponentImplementation>;
  /** Wraps every surface of this catalog: the vendor design system's own provider + styles. */
  Provider: ComponentType<{children: ReactNode}>;
}

export interface ResolveCatalogsOptions {
  /**
   * The host's shell-action handler (task-6.2 decision 2): the shell catalog is built for this
   * host, and its two actions — `openStore`, `openAppLibrary` — land here. Absent, they land
   * nowhere: the catalog still validates and renders, which is all a test or a replay needs.
   */
  onShellAction?: ShellActionHandler;
}

/** Resolve registry records to runtime catalogs; an unknown catalog id is a hard error. */
export function resolveCatalogs(
  records: CatalogRecord[],
  {onShellAction = () => {}}: ResolveCatalogsOptions = {},
): ResolvedCatalog[] {
  const shellCatalog = createShellCatalog({onShellAction});
  /** One entry per catalog package in `orchestratorApi`'s projection; the two lists move together. */
  const table: ReadonlyMap<string, ResolvedCatalog> = new Map([
    [SHELL_CATALOG_ID, {id: SHELL_CATALOG_ID, catalog: shellCatalog, Provider: ShellProvider}],
    [CATALOG_ID, {id: CATALOG_ID, catalog: CATALOG, Provider: GitHubProvider}],
    [GMAIL_CATALOG_ID, {id: GMAIL_CATALOG_ID, catalog: GMAIL_CATALOG, Provider: GmailProvider}],
    [
      CALENDAR_CATALOG_ID,
      {id: CALENDAR_CATALOG_ID, catalog: CALENDAR_CATALOG, Provider: CalendarProvider},
    ],
    [
      CIRCLECI_CATALOG_ID,
      {id: CIRCLECI_CATALOG_ID, catalog: CIRCLECI_CATALOG, Provider: CircleciProvider},
    ],
    [LINEAR_CATALOG_ID, {id: LINEAR_CATALOG_ID, catalog: LINEAR_CATALOG, Provider: LinearProvider}],
    [SHOP_A_CATALOG_ID, {id: SHOP_A_CATALOG_ID, catalog: SHOP_A_CATALOG, Provider: ShopAProvider}],
    [SHOP_B_CATALOG_ID, {id: SHOP_B_CATALOG_ID, catalog: SHOP_B_CATALOG, Provider: ShopBProvider}],
  ]);
  return records.map(record => {
    const resolved = table.get(record.catalogId);
    if (!resolved) throw new Error(`No catalog package for ${record.catalogId}`);
    return resolved;
  });
}
