/**
 * The held catalogs, reachable from the render layer, and `SurfaceFrame` — the one place a surface
 * meets its catalog's provider. The shell renders every surface through this frame and never
 * imports a vendor design system itself. A frame finds the build its surface was drawn in from the
 * surface itself (task 15.6), so a surface keeps its own build beside a newer one of its catalog;
 * the held set, which grows as catalogs load — the page's, or a Store sample's (task-14.7 decision
 * 1) — answers a catalog the client did not resolve.
 */
import {createContext, useContext, useMemo, useSyncExternalStore, type ReactNode} from 'react';
import type {SurfaceModel} from '@a2ui/web_core/v0_9';
import {A2uiSurface, MarkdownContext} from '@a2ui/react/v0_9';
import type {ReactCatalogComponent} from '@a2ui/react/v0_9';
import {resolvedOf, type ResolvedCatalog} from './clientCatalogs';
import {BUILD_ATTRIBUTE} from './host';
import type {CatalogLoader, HeldCatalogSet} from './loader';
import {renderMarkdown} from './markdown';

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

/** A frame's mark: no box of its own, so the surface lays out as if it were not there. */
const MARK_STYLE = {display: 'contents'} as const;

/**
 * Render a surface inside its catalog's provider; an unresolved catalog renders bare. A loaded
 * build's surface is marked with the build, the root its stylesheets are scoped to (task-14.11
 * decision 39), so a surface keeps its own build's look beside another build of the same catalog.
 * Every surface gets the page's Markdown renderer; `A2uiSurface` also hands it to web_core, so
 * the basic catalog's custom-element `Text` renders through it too.
 */
export function SurfaceFrame({surface}: {surface: SurfaceModel<ReactCatalogComponent>}) {
  const catalog = surface.defaultCatalog;
  const held = useContext(CatalogContext).get(catalog?.id ?? '');
  const resolved = (catalog && resolvedOf(catalog)) ?? held;
  const content = (
    <MarkdownContext.Provider value={renderMarkdown}>
      <A2uiSurface surface={surface} />
    </MarkdownContext.Provider>
  );
  if (!resolved) return content;
  const framed = <resolved.Provider>{content}</resolved.Provider>;
  return resolved.build ? (
    <div {...{[BUILD_ATTRIBUTE]: resolved.build}} style={MARK_STYLE}>
      {framed}
    </div>
  ) : (
    framed
  );
}
