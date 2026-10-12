/**
 * The held catalogs, reachable from the render layer, and `SurfaceFrame` — the one place a surface
 * meets its catalog's provider. The shell renders every surface through this frame and never
 * imports a vendor design system itself. Under the loader a set grows as catalogs load, and every
 * frame reads the newest; a canvas, and a Store sample, provide a set of their own (task-14.7
 * decision 1), so a frame finds the build its own renderer was built over.
 */
import {createContext, useContext, useMemo, useSyncExternalStore, type ReactNode} from 'react';
import type {SurfaceModel} from '@a2ui/web_core/v0_9';
import {A2uiSurface} from '@a2ui/react/v0_9';
import type {ReactComponentImplementation} from '@a2ui/react/v0_9';
import type {ResolvedCatalog} from './clientCatalogs';
import type {CatalogLoader, HeldCatalogSet} from './loader';

const CatalogContext = createContext<ReadonlyMap<string, ResolvedCatalog>>(new Map());

/** A fixed set of catalogs, or a set that grows — the loader's own, or one canvas's. */
export type HeldCatalogs =
  readonly ResolvedCatalog[] | Pick<HeldCatalogSet, 'resolved' | 'subscribe'>;

/** Whether the held catalogs grow, rather than being a fixed set. */
const grows = (
  catalogs: HeldCatalogs,
): catalogs is Pick<HeldCatalogSet, 'resolved' | 'subscribe'> => !Array.isArray(catalogs);

/** What the page is handed: a fixed set of catalogs, or the loader. */
export type PageCatalogs = readonly ResolvedCatalog[] | CatalogLoader;

/** Whether the page's catalogs are the loader, which grows, rather than a fixed set. */
export const isLoader = (catalogs: PageCatalogs): catalogs is CatalogLoader =>
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
    () => (grows(catalogs) ? undefined : new Map(catalogs.map(c => [c.id, c]))),
    [catalogs],
  );
  const loaded = useSyncExternalStore(grows(catalogs) ? catalogs.subscribe : NEVER, () =>
    grows(catalogs) ? catalogs.resolved() : fixed!,
  );
  return <CatalogContext.Provider value={loaded}>{children}</CatalogContext.Provider>;
}

/** A canvas's own set around what it renders, when it has one; else the page's, from above. */
export function CanvasCatalogs({held, children}: {held?: HeldCatalogSet; children: ReactNode}) {
  return held ? <CatalogProvider catalogs={held}>{children}</CatalogProvider> : <>{children}</>;
}

/** Render a surface inside its catalog's provider; an unresolved catalog renders bare. */
export function SurfaceFrame({surface}: {surface: SurfaceModel<ReactComponentImplementation>}) {
  const resolved = useContext(CatalogContext).get(surface.catalog.id);
  const content = <A2uiSurface surface={surface} />;
  return resolved ? <resolved.Provider>{content}</resolved.Provider> : content;
}
