/**
 * The held catalogs, reachable from the render layer, and `SurfaceFrame` — the one place a surface
 * meets its catalog's provider. The shell renders every surface through this frame and never
 * imports a vendor design system itself. A frame finds the build its surface was drawn in from the
 * surface itself (task 15.6), so a surface keeps its own build beside a newer one of its catalog;
 * the held set, which grows as catalogs load — the page's, or a Store sample's (task-14.7 decision
 * 1) — answers a catalog the client did not resolve.
 */
import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useSyncExternalStore,
  type ReactNode,
} from 'react';
import type {SurfaceModel} from '@a2ui/web_core/v1_0';
import {A2uiSurface, MarkdownContext} from '@a2ui/react';
import type {ReactCatalogComponent} from '@a2ui/react';
import {CatalogFrame, FrameCatalogContext} from './catalogFrame';
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

/** The catalog a surface's root component is drawn in, read again as the root comes and goes. */
function useRootCatalog(surface: SurfaceModel<ReactCatalogComponent>) {
  const subscribe = useCallback(
    (onChange: () => void) => {
      const created = surface.componentsModel.onCreated.subscribe(onChange);
      const deleted = surface.componentsModel.onDeleted.subscribe(onChange);
      return () => {
        created.unsubscribe();
        deleted.unsubscribe();
      };
    },
    [surface],
  );
  return useSyncExternalStore(
    subscribe,
    () => surface.componentsModel.get(surface.rootId)?.catalog as Catalog | undefined,
  );
}

type Catalog = SurfaceModel<ReactCatalogComponent>['defaultCatalog'] & object;

/**
 * Render a surface inside its catalog's provider; an unresolved catalog renders bare. A loaded
 * build's surface is marked with the build, the root its stylesheets are scoped to (task-14.11
 * decision 39), so a surface keeps its own build's look beside another build of the same catalog.
 * A root in another catalog than the surface's default, or on a surface that names none, is
 * framed in its own (task-21.14 decisions 2, 12). Every surface gets the page's Markdown
 * renderer; `A2uiSurface` also hands it to web_core, so the basic catalog's custom-element `Text`
 * renders through it too.
 */
export function SurfaceFrame({surface}: {surface: SurfaceModel<ReactCatalogComponent>}) {
  const catalog = surface.defaultCatalog;
  const held = useContext(CatalogContext);
  const resolve = (of: Catalog) => resolvedOf(of) ?? held.get(of.id);
  const root = useRootCatalog(surface);
  const inner = (
    <MarkdownContext.Provider value={renderMarkdown}>
      <A2uiSurface surface={surface} />
    </MarkdownContext.Provider>
  );
  const content =
    root && root !== catalog ? (
      <CatalogFrame catalog={root} resolved={resolve(root)}>
        {inner}
      </CatalogFrame>
    ) : (
      inner
    );
  if (!catalog) return content;
  const around = (
    <FrameCatalogContext.Provider value={catalog}>{content}</FrameCatalogContext.Provider>
  );
  const resolved = resolve(catalog);
  if (!resolved) return around;
  const framed = <resolved.Provider>{around}</resolved.Provider>;
  return resolved.build ? (
    <div {...{[BUILD_ATTRIBUTE]: resolved.build}} style={MARK_STYLE}>
      {framed}
    </div>
  ) : (
    framed
  );
}
