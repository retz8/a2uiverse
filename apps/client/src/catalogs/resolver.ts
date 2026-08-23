/**
 * The client-side half of the catalog projection: `catalogId → {catalog, Provider}`. Records
 * from `orchestratorApi` name catalogs; this table turns them into the runtime objects the
 * render layer needs. Static in Phase 1 — each installed catalog package is imported here.
 */
import type {ComponentType, ReactNode} from 'react';
import type {Catalog} from '@a2ui/web_core/v0_9';
import type {ReactComponentImplementation} from '@a2ui/react/v0_9';
import {CATALOG, CATALOG_ID} from 'primer-a2ui-adapter';
import type {CatalogRecord} from '../orchestratorApi';
import {GitHubCatalogProvider} from './github/provider';

export interface ResolvedCatalog {
  id: string;
  catalog: Catalog<ReactComponentImplementation>;
  /** Wraps every surface of this catalog: the vendor design system's own provider + styles. */
  Provider: ComponentType<{children: ReactNode}>;
}

const TABLE: ReadonlyMap<string, ResolvedCatalog> = new Map([
  [CATALOG_ID, {id: CATALOG_ID, catalog: CATALOG, Provider: GitHubCatalogProvider}],
]);

/** Resolve registry records to runtime catalogs; an unknown catalog id is a hard error. */
export function resolveCatalogs(records: CatalogRecord[]): ResolvedCatalog[] {
  return records.map(record => {
    const resolved = TABLE.get(record.catalogId);
    if (!resolved) throw new Error(`No catalog package for ${record.catalogId}`);
    return resolved;
  });
}
