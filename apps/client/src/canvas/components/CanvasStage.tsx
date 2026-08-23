/**
 * The stage: the canvas layer holding the one live surface (phase-8 spec decision 3).
 * Within-surface composition is the agent's job; the stage just renders whatever surface the
 * store points at, through the same A2uiSurface pipeline the chat page uses. `appliedSeq`
 * keys the error boundary so a surface that threw on a half-streamed component retries per
 * applied batch rather than staying dead.
 */
import type {MessageProcessor} from '@a2ui/web_core/v0_9';
import type {ReactComponentImplementation} from '@a2ui/react/v0_9';
import {SurfaceFrame} from '../../catalogs/CatalogContext';
import {SurfaceErrorBoundary} from '../../shared/SurfaceErrorBoundary';
import type {CanvasState} from '../canvasStore';

export interface CanvasStageProps {
  processor: MessageProcessor<ReactComponentImplementation>;
  state: CanvasState;
}

export function CanvasStage({processor, state}: CanvasStageProps) {
  const surface = state.stageId ? processor.model.surfacesMap.get(state.stageId) : undefined;
  return (
    <div className="canvas-stage" data-testid="canvas-stage">
      {surface && state.stageId ? (
        // The inner wrapper bounds the surface content alone — what the chrome baselines mask.
        <div data-testid="canvas-stage-content">
          <SurfaceErrorBoundary surfaceId={state.stageId} resetKey={state.appliedSeq}>
            <SurfaceFrame surface={surface} />
          </SurfaceErrorBoundary>
        </div>
      ) : (
        <div className="canvas-empty-ghost" data-testid="canvas-empty-ghost" aria-hidden="true">
          <div className="canvas-empty-mark">a2ui canvas</div>
          <div className="canvas-empty-hint">⌘K to ask</div>
        </div>
      )}
    </div>
  );
}
