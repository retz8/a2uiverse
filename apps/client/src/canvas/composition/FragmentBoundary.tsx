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
 * is the machine-readable half: the source, and an accessible name announcing it.
 */
import type {ReactNode} from 'react';

/** The detector's anchor and the isolation hook; its value is the painting app's id. */
export const FRAGMENT_BOUNDARY_ATTR = 'data-a2ui-fragment';

export interface FragmentBoundaryProps {
  /** The stamp's `source` — which app painted what is inside. */
  source: string;
  /** The namespaced surface id, for debugging and for the detector's DOM-ownership check. */
  surfaceId: string;
  /** The fragment asked for attention and the shell granted it: raised, and named as such. */
  promoted?: boolean;
  children: ReactNode;
}

export function FragmentBoundary({source, surfaceId, promoted, children}: FragmentBoundaryProps) {
  return (
    <div
      className={promoted ? 'fragment-boundary fragment-boundary--promoted' : 'fragment-boundary'}
      role="group"
      aria-label={promoted ? `${source} needs your answer` : `Painted by ${source}`}
      data-surface={surfaceId}
      data-promoted={promoted ? 'true' : undefined}
      {...{[FRAGMENT_BOUNDARY_ATTR]: source}}
    >
      {children}
    </div>
  );
}
