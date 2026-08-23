/**
 * The status strip: the thin always-visible region carrying the status register. In-flight
 * spinner + label, or sticky error (cleared by the next dispatch);
 * idle shows the quiet identity label — the one thing naming the app once a painted surface
 * fills the screen with vendor-shaped content. The ⌘K shortcut lives on the Ask pill.
 * The in-flight label upgrades to the agent-authored paint title when one streams.
 */
import {Spinner} from '@radix-ui/themes';
import type {CanvasState} from '../canvasStore';

export interface StatusStripProps {
  state: CanvasState;
}

export function StatusStrip({state}: StatusStripProps) {
  return (
    <div className="canvas-status-strip">
      <div className="canvas-status-message" data-testid="canvas-status">
        {state.error ? (
          <span className="canvas-status-error" role="alert" data-testid="canvas-error">
            {state.error}
          </span>
        ) : state.inFlight ? (
          <span className="canvas-status-pending" data-testid="canvas-pending">
            <Spinner size="1" />
            {state.inFlight.label}
          </span>
        ) : (
          <span className="canvas-status-identity">A2UIVerse</span>
        )}
      </div>
    </div>
  );
}
