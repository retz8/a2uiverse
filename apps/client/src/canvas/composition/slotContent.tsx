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
import type {PlacedFragment, RosterEntry} from '../canvasStore';
import {FragmentBoundary} from './FragmentBoundary';
import {SHELL_SOURCE} from './roster';

/**
 * What a slot rests on when its source spoke but never painted. Not a fragment — it is the
 * shell quoting the source, so it carries no boundary and no vendor Provider.
 */
function restingProse(text: string) {
  return (
    <span style={{color: 'var(--a2ui-color-on-surface)', opacity: 0.75}} data-slot-resting="prose">
      {text}
    </span>
  );
}

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
  promoted = false,
  spoken?: string,
): ReactNode | null {
  if (!placed) return spoken ? restingProse(spoken) : null;
  const surface = surfaces.model.surfacesMap.get(placed.surfaceId);
  if (!surface) return null;
  // Per-surface containment either way: one render failure must not take the shell with it.
  const contained = (
    <SurfaceErrorBoundary surfaceId={placed.surfaceId} resetKey={resetKey}>
      <SurfaceFrame surface={surface} />
    </SurfaceErrorBoundary>
  );
  if (placed.source === SHELL_SOURCE) {
    // The shell's own content (task-5.5 decision 2): the shell writing on its own page. No
    // boundary, no tile, no region named after a source — provenance is in the cells.
    return (
      <div data-shell-content data-surface={placed.surfaceId} style={{minWidth: 0}}>
        {contained}
      </div>
    );
  }
  return (
    <FragmentBoundary source={placed.source} surfaceId={placed.surfaceId} promoted={promoted}>
      {contained}
    </FragmentBoundary>
  );
}

/** The resolver a `Slot` calls for its content, memoized on what it reads. */
export function useSlotContent(
  surfaces: SurfaceSource,
  placement: ReadonlyMap<string, PlacedFragment>,
  resetKey: number,
  promoted?: ReadonlySet<string>,
  roster?: readonly RosterEntry[],
  prose?: ReadonlyMap<string, string>,
): SlotContentResolver {
  return useCallback(
    (slotName: string) => {
      // Only an unfilled slot rests on prose: a fragment that painted is the answer, and the
      // source's running commentary belongs in the shell's notice region, not inside it.
      const source = roster?.find(entry => entry.slot === slotName)?.appId;
      const spoken = source ? prose?.get(source)?.trim() : undefined;
      return renderSlotContent(
        surfaces,
        placement.get(slotName),
        resetKey,
        promoted?.has(slotName),
        spoken || undefined,
      );
    },
    [surfaces, placement, resetKey, promoted, roster, prose],
  );
}
