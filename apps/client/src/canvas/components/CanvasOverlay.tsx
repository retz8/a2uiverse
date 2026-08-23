/**
 * The overlay slot (task 8.3): the canvas layer holding the one pending question paint above
 * the held stage (phase-8 spec decisions 2–3 — questions arrive as surfaces). The surface's
 * root is a `ConfirmationDialog`, which renders through Primer's own modal machinery (portal,
 * backdrop, focus trap), so this component is just the mount point; answering flows through
 * the dialog's actions into the normal action pipeline, where the wiring recognises the
 * overlay's surface id.
 */
import type {MessageProcessor} from '@a2ui/web_core/v0_9';
import type {ReactComponentImplementation} from '@a2ui/react/v0_9';
import {SurfaceFrame} from '../../catalogs/CatalogContext';
import {SurfaceErrorBoundary} from '../../shared/SurfaceErrorBoundary';
import type {CanvasState} from '../canvasStore';

export interface CanvasOverlayProps {
  processor: MessageProcessor<ReactComponentImplementation>;
  state: CanvasState;
}

export function CanvasOverlay({processor, state}: CanvasOverlayProps) {
  const surface = state.overlay
    ? processor.model.surfacesMap.get(state.overlay.surfaceId)
    : undefined;
  if (!surface || !state.overlay) return null;
  return (
    <div className="canvas-overlay" data-testid="canvas-overlay">
      <SurfaceErrorBoundary surfaceId={state.overlay.surfaceId} resetKey={state.appliedSeq}>
        <SurfaceFrame surface={surface} />
      </SurfaceErrorBoundary>
    </div>
  );
}
