/**
 * The held catalogs, reachable from the render layer, and `SurfaceFrame` — the one place a surface
 * meets its catalog's provider. The shell renders every surface through this frame and never
 * imports a vendor design system itself. Under the loader the table grows as catalogs load, and
 * every frame reads the newest.
 */
import {createContext, useContext, useMemo, useSyncExternalStore, type ReactNode} from 'react';
import type {SurfaceModel} from '@a2ui/web_core/v0_9';
import {A2uiSurface} from '@a2ui/react/v0_9';
import type {ReactComponentImplementation} from '@a2ui/react/v0_9';
import type {ResolvedCatalog} from './clientCatalogs';
import type {CatalogLoader} from './loader';

const CatalogContext = createContext<ReadonlyMap<string, ResolvedCatalog>>(new Map());

/** A fixed set of catalogs, or the loader the set grows from. */
export type HeldCatalogs = readonly ResolvedCatalog[] | CatalogLoader;

/** Whether the held catalogs are the loader's, which grow, rather than a fixed set. */
export const isLoader = (catalogs: HeldCatalogs): catalogs is CatalogLoader =>
  !Array.isArray(catalogs);

const NEVER = () => () => {};

export function CatalogProvider({
  catalogs,
  children,
}: {
  catalogs: HeldCatalogs;
  children: ReactNode;
}) {
  // Memoized: every fragment of a composition reads this on each applied batch.
  const fixed = useMemo(
    () => (isLoader(catalogs) ? undefined : new Map(catalogs.map(c => [c.id, c]))),
    [catalogs],
  );
  const loaded = useSyncExternalStore(isLoader(catalogs) ? catalogs.subscribe : NEVER, () =>
    isLoader(catalogs) ? catalogs.resolved() : fixed!,
  );
  return <CatalogContext.Provider value={loaded}>{children}</CatalogContext.Provider>;
}

/** Render a surface inside its catalog's provider; an unresolved catalog renders bare. */
export function SurfaceFrame({surface}: {surface: SurfaceModel<ReactComponentImplementation>}) {
  const resolved = useContext(CatalogContext).get(surface.catalog.id);
  const content = <A2uiSurface surface={surface} />;
  return resolved ? <resolved.Provider>{content}</resolved.Provider> : content;
}
