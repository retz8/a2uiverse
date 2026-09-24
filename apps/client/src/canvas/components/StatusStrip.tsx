/**
 * The status strip: the thin always-visible region at the foot of the canvas. It names the app —
 * the one thing that does once vendor-shaped content fills the screen — and carries the canvas's
 * sticky error (cleared by its next dispatch). The turn's activity is not here: the question heads
 * the canvas and the progress line under it says where the turn stands. The ⌘K shortcut lives on
 * the Ask pill.
 */
export interface StatusStripProps {
  /** The canvas on screen's sticky error; null with none, or with no canvas. */
  error: string | null;
}

export function StatusStrip({error}: StatusStripProps) {
  return (
    <div className="canvas-status-strip">
      <div className="canvas-status-message" data-testid="canvas-status">
        {error ? (
          <span className="canvas-status-error" role="alert" data-testid="canvas-error">
            {error}
          </span>
        ) : (
          <span className="canvas-status-identity">A2UIVerse</span>
        )}
      </div>
    </div>
  );
}
