/**
 * The parked stage: renders a departed paint from its snapshot through a per-visit sandbox
 * session. The session is constructed once per mount; attaching
 * registers it as the current parked view and returns the teardown — unmount IS the write-back
 * commit, which uniformly catches every exit: return-to-live, jumping to another entry, causal
 * jumps, and dispatch-from-parked. The parent keys this component by paint id so switching
 * parked entries remounts cleanly.
 */
import {useEffect, useState} from 'react';
import type {ReactComponentImplementation} from '@a2ui/react/v0_9';
import {SurfaceFrame} from '../../catalogs/CatalogContext';
import {SurfaceErrorBoundary} from '../../shared/SurfaceErrorBoundary';
import type {PaintEntry} from '../timeline/paint';
import type {ParkedSession} from '../timeline/parkedSession';

export interface ParkedStageProps {
  entry: PaintEntry;
  create: (entry: PaintEntry) => ParkedSession<ReactComponentImplementation>;
  /** Register the session as the active parked view; returns the commit-and-release teardown. */
  attach: (session: ParkedSession<ReactComponentImplementation>) => () => void;
}

export function ParkedStage({entry, create, attach}: ParkedStageProps) {
  const [session] = useState(() => create(entry));
  useEffect(() => attach(session), [session, attach]);

  const surface = session.processor.model.getSurface(session.surfaceId);
  return (
    <div className="canvas-stage canvas-stage--parked" data-testid="canvas-parked-stage">
      {surface ? (
        // The inner wrapper bounds the surface content alone — what the chrome baselines mask.
        <div data-testid="canvas-stage-content">
          <SurfaceErrorBoundary surfaceId={session.surfaceId} resetKey={entry.paintId}>
            <SurfaceFrame surface={surface} />
          </SurfaceErrorBoundary>
        </div>
      ) : null}
    </div>
  );
}
