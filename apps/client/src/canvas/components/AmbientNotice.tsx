/**
 * The ambient notice: agent prose shown as a transient auto-fading element — the outcome
 * register of phase-8 spec decision 2. Keyed by the store so a replacing notice restarts
 * the fade; stored nowhere once dismissed.
 */
import {useEffect} from 'react';
import type {CanvasState} from '../canvasStore';

export const NOTICE_DURATION_MS = 6000;

export interface AmbientNoticeProps {
  notice: CanvasState['notice'];
  onDismiss: (key: number) => void;
}

export function AmbientNotice({notice, onDismiss}: AmbientNoticeProps) {
  const key = notice?.key;
  useEffect(() => {
    if (key === undefined) return;
    const timer = setTimeout(() => onDismiss(key), NOTICE_DURATION_MS);
    return () => clearTimeout(timer);
  }, [key, onDismiss]);

  if (!notice) return null;
  return (
    <div className="canvas-notice" data-testid="canvas-notice" role="status">
      {notice.text}
    </div>
  );
}
