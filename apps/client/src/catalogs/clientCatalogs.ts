/**
 * The catalogs the client provides itself, and the runtime object every catalog becomes. The
 * client compiles no vendor catalog in (phase-11 decision 1): the shell catalog and the standard
 * basic catalog are its own — the catalog table marks both as provided by the client — and every
 * other catalog arrives through the loader at runtime.
 */
import {Fragment, type ComponentType, type ReactNode} from 'react';
import type {Catalog} from '@a2ui/web_core/v0_9';
import {basicCatalog, type ReactComponentImplementation} from '@a2ui/react/v0_9';
import {
  CATALOG_ID as SHELL_CATALOG_ID,
  createCatalog as createShellCatalog,
  Provider as ShellProvider,
  type CreateCatalogOptions,
} from '@a2uiverse/shell-catalog';
import {decorateCatalog} from '../canvas/navigation/decorateCatalog';

export interface ResolvedCatalog {
  id: string;
  catalog: Catalog<ReactComponentImplementation>;
  /** Wraps every surface of this catalog: the vendor design system's own provider + styles. */
  Provider: ComponentType<{children: ReactNode}>;
}

/**
 * What the shell catalog takes from its host (task-6.2 decision 2, task-7.5 decisions 11, 13): the
 * shell-action handler, the navigation handler and the app-name lookup. Absent, the two actions
 * land nowhere, cells are not interactive and app ids stand in for names: the catalog still
 * validates and renders, which is all a test or a replay needs.
 */
export type ClientCatalogOptions = Partial<CreateCatalogOptions>;

/** A catalog with no Provider renders its surfaces bare. */
const BARE = Fragment as ComponentType<{children: ReactNode}>;

/**
 * A catalog other than the shell's, as the render layer takes it: its components inside the
 * markers navigation lands by (task-7.7 decision 2), under its Provider when it has one.
 */
export function resolveCatalog(
  catalog: Catalog<ReactComponentImplementation>,
  Provider?: ComponentType<{children: ReactNode}>,
): ResolvedCatalog {
  return {id: catalog.id, catalog: decorateCatalog(catalog), Provider: Provider ?? BARE};
}

/**
 * The client's own catalogs: the shell catalog, bound to its host, and upstream's basic catalog
 * as a default (task-11.5 decision 5) — wrapped for navigation like every vendor catalog, with no
 * Provider.
 */
export function clientCatalogs({
  onShellAction = () => {},
  ...host
}: ClientCatalogOptions = {}): ResolvedCatalog[] {
  return [
    {
      id: SHELL_CATALOG_ID,
      catalog: createShellCatalog({onShellAction, ...host}),
      Provider: ShellProvider,
    },
    resolveCatalog(basicCatalog),
  ];
}
