/**
 * The client's half of the slot seam. `@a2uiverse/shell-catalog` declares
 * `SlotContentContext` and defaults it to "no content — every slot renders its own state"; this
 * is what fills it. A resolver answers with a slot's *complete* content: boundary, then the
 * catalog's own Provider, then the surface.
 *
 * It is parameterized over a processor and a placement map rather than bound to the live ones,
 * because a parked composition renders the same way out of its sandbox.
 */
import {useCallback} from 'react';
import type {ReactNode} from 'react';
import type {SlotContentResolver} from '@a2uiverse/shell-catalog';
import type {ReactComponentImplementation} from '@a2ui/react/v0_9';
import type {SurfaceModel} from '@a2ui/web_core/v0_9';
import {SurfaceFrame} from '../../catalogs/CatalogContext';
import {SurfaceErrorBoundary} from '../../shared/SurfaceErrorBoundary';
import type {PlacedFragment} from '../canvasStore';
import {FragmentBoundary} from './FragmentBoundary';

/** The slice of a processor a resolver reads — the live one and a parked sandbox both satisfy it. */
export interface SurfaceSource {
  readonly model: {
    readonly surfacesMap: ReadonlyMap<string, SurfaceModel<ReactComponentImplementation>>;
  };
}

export function renderSlotContent(
  surfaces: SurfaceSource,
  placed: PlacedFragment | undefined,
  resetKey: number,
): ReactNode | null {
  if (!placed) return null;
  const surface = surfaces.model.surfacesMap.get(placed.surfaceId);
  if (!surface) return null;
  return (
    <FragmentBoundary source={placed.source} surfaceId={placed.surfaceId}>
      {/* Per-fragment containment: one vendor's render failure must not take the shell with it. */}
      <SurfaceErrorBoundary surfaceId={placed.surfaceId} resetKey={resetKey}>
        <SurfaceFrame surface={surface} />
      </SurfaceErrorBoundary>
    </FragmentBoundary>
  );
}

/** The resolver a `Slot` calls for its content, memoized on what it reads. */
export function useSlotContent(
  surfaces: SurfaceSource,
  placement: ReadonlyMap<string, PlacedFragment>,
  resetKey: number,
): SlotContentResolver {
  return useCallback(
    (slotName: string) => renderSlotContent(surfaces, placement.get(slotName), resetKey),
    [surfaces, placement, resetKey],
  );
}
