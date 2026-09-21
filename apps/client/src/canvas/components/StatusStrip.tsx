/**
 * The status strip: the thin always-visible region at the foot of the canvas. It names the app —
 * the one thing that does once vendor-shaped content fills the screen — and carries a sticky
 * error (cleared by the next dispatch). The turn's activity is not here: the question heads the
 * canvas and the progress line under it says where the turn stands. The ⌘K shortcut lives on
 * the Ask pill.
 */
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
        ) : (
          <span className="canvas-status-identity">A2UIVerse</span>
        )}
      </div>
    </div>
  );
}
