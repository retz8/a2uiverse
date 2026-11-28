/**
 * The fragment boundary: the single shell-owned element every vendor fragment mounts inside.
 * It is the one place that carries provenance and isolation — the catalog's own Provider sits
 * *inside* it, so a bundle can scope its tokens and anchor its portal root to this element
 * rather than to the document.
 *
 * It must stay a real element: not a React fragment, not `display: contents`. `@scope`, a portal
 * root and the collision detector all need something to attach to.
 *
 * The visible attribution marker is not here — the orchestrator paints it into the shell's own
 * surface as the slot's sibling, where the fragment cannot address it. What the boundary carries
 * is the machine-readable half: the source, and a region name. The marker announces the app's
 * display name and its account when one is in play; the region names itself by the source id,
 * so a screen reader gets one region and one provenance statement rather than a sentence twice.
 *
 * It is also where navigation reads a fragment's components from: while mounted it is registered
 * in the canvas's binding index under its surface (task-16.7 decision 3).
 */
import {useContext, useEffect, useRef, type ReactNode} from 'react';
import type {SurfaceModel} from '@a2ui/web_core/v1_0';
import type {ReactCatalogComponent} from '@a2ui/react';
import {BindingIndexContext} from '../navigation/bindingIndex';

/** The detector's anchor and the isolation hook; its value is the painting source's id. */
export const FRAGMENT_BOUNDARY_ATTR = 'data-a2ui-fragment';

export interface FragmentBoundaryProps {
  /** The stamp's `source` — which app, and which account of it, painted what is inside. */
  source: string;
  /**
   * The surface drawn inside: the binding index reads its components; its namespaced id is for
   * debugging and for the detector's DOM-ownership check.
   */
  surface: SurfaceModel<ReactCatalogComponent>;
  children: ReactNode;
}

export function FragmentBoundary({source, surface, children}: FragmentBoundaryProps) {
  const index = useContext(BindingIndexContext);
  const boundary = useRef<HTMLDivElement>(null);
  useEffect(
    () => (index && boundary.current ? index.register(surface, boundary.current) : undefined),
    [index, surface],
  );
  return (
    <div
      ref={boundary}
      className="fragment-boundary"
      role="group"
      aria-label={source}
      data-surface={surface.id}
      {...{[FRAGMENT_BOUNDARY_ATTR]: source}}
    >
      {children}
    </div>
  );
}
