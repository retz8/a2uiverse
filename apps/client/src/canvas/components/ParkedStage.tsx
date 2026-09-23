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
import {type PressState, PressStateContext, SlotContentContext} from '@a2uiverse/shell-catalog';
import {SurfaceFrame} from '../../catalogs/CatalogContext';
import {SurfaceErrorBoundary} from '../../shared/SurfaceErrorBoundary';
import {slotCountOf} from '../composition/slotCount';
import {useSlotContent} from '../composition/slotContent';
import type {PaintEntry} from '../timeline/paint';
import type {ParkedSession} from '../timeline/parkedSession';

export interface ParkedStageProps {
  entry: PaintEntry;
  create: (entry: PaintEntry) => ParkedSession<ReactComponentImplementation>;
  /** Register the session as the active parked view; returns the commit-and-release teardown. */
  attach: (session: ParkedSession<ReactComponentImplementation>) => () => void;
}

/**
 * No press is made on a parked composition: its buttons draw disabled, its lines as captured
 * (task-8.5 decision 9).
 */
const PARKED_PRESSES: PressState = {enabled: false, presses: []};

export function ParkedStage({entry, create, attach}: ParkedStageProps) {
  const [session] = useState(() => create(entry));
  useEffect(() => attach(session), [session, attach]);

  // A parked composition resolves its slots against the sandbox, not the live registry — the
  // same resolver the live stage uses, pointed at the rehydrated surfaces.
  // No promotion in a parked view: the demand it recorded belongs to a paint that has departed.
  const slotContent = useSlotContent(session.processor, session.placement, entry.paintId);

  const surface = session.processor.model.getSurface(session.surfaceId);
  return (
    <div className="canvas-stage canvas-stage--parked" data-testid="canvas-parked-stage">
      {surface ? (
        // The inner wrapper bounds the surface content alone — what the chrome baselines mask.
        <div data-testid="canvas-stage-content" data-slots={slotCountOf(surface) || undefined}>
          <SlotContentContext.Provider value={slotContent}>
            <PressStateContext.Provider value={PARKED_PRESSES}>
              <SurfaceErrorBoundary surfaceId={session.surfaceId} resetKey={entry.paintId}>
                <SurfaceFrame surface={surface} />
              </SurfaceErrorBoundary>
            </PressStateContext.Provider>
          </SlotContentContext.Provider>
        </div>
      ) : null}
    </div>
  );
}
