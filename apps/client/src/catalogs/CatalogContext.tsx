/**
 * The resolved catalogs, reachable from the render layer, and `SurfaceFrame` — the one place
 * a surface meets its catalog's provider. The shell renders every surface through this frame
 * and never imports a vendor design system itself.
 */
import {createContext, useContext, type ReactNode} from 'react';
import type {SurfaceModel} from '@a2ui/web_core/v0_9';
import {A2uiSurface} from '@a2ui/react/v0_9';
import type {ReactComponentImplementation} from '@a2ui/react/v0_9';
import type {ResolvedCatalog} from './resolver';

const CatalogContext = createContext<ReadonlyMap<string, ResolvedCatalog>>(new Map());

export function CatalogProvider({
  catalogs,
  children,
}: {
  catalogs: ResolvedCatalog[];
  children: ReactNode;
}) {
  return (
    <CatalogContext.Provider value={new Map(catalogs.map(c => [c.id, c]))}>
      {children}
    </CatalogContext.Provider>
  );
}

/** Render a surface inside its catalog's provider; an unresolved catalog renders bare. */
export function SurfaceFrame({surface}: {surface: SurfaceModel<ReactComponentImplementation>}) {
  const resolved = useContext(CatalogContext).get(surface.catalog.id);
  const content = <A2uiSurface surface={surface} />;
  return resolved ? <resolved.Provider>{content}</resolved.Provider> : content;
}
