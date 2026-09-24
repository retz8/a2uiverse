/**
 * The hover preview of a trail entry (task-9.6 decision 9): the canvas's shell surface mounted a
 * second time from its own runtime, in an inert box scaled down, pointer events off — and beneath
 * it the canvas's own progress line — the sources' ticks, without the merge's words — cut where
 * the box ends. One exists at a time; the rail tears it down on leave.
 */
import {useMemo, useState, useSyncExternalStore, type CSSProperties} from 'react';
import {flushSync} from 'react-dom';
import {
  type PressState,
  PressStateContext,
  SlotContentContext,
  SlotStateContext,
} from '@a2uiverse/shell-catalog';
import {SurfaceFrame} from '../../catalogs/CatalogContext';
import {SurfaceErrorBoundary} from '../../shared/SurfaceErrorBoundary';
import type {CanvasRuntime} from '../canvasRuntime';
import {columnState} from '../composition/columnState';
import {slotCountOf} from '../composition/slotCount';
import {useSlotContent} from '../composition/slotContent';
import {createBindingIndex} from '../navigation/bindingIndex';
import {BindingIndexContext} from '../navigation/decorateCatalog';
import {turnProgress} from '../turnProgress';
import {ProgressLine} from './ProgressLine';

/** The width the canvas is laid out at inside the preview, and the scale it is shown at. */
export const PREVIEW_LAYOUT_WIDTH = 1120;
export const PREVIEW_SCALE = 0.25;

/** Nothing is pressed in a preview: its buttons draw disabled. */
const NO_PRESSES: PressState = {enabled: false, presses: []};

export interface TrailPreviewProps {
  runtime: CanvasRuntime;
  /** The entry's label, so the caption reads as the preview of that canvas. */
  label: string;
  /** Where the preview sits: beside the rail, level with its entry. */
  top: number;
  /** The rail's node column, which widens the rail — the preview sits past it. */
  railColumn: number;
}

export function TrailPreview({runtime, label, top, railColumn}: TrailPreviewProps) {
  const state = useSyncExternalStore(runtime.store.subscribe, runtime.store.getState);
  const slotContent = useSlotContent(
    runtime.processor,
    state.placement,
    state.appliedSeq,
    undefined,
    state.roster,
    state.prose,
  );
  const {merge, slotStates, placement, presses} = state;
  const slotStateOf = useMemo(
    () => (source: string) => columnState({merge, slotStates, placement, presses}, source),
    [merge, slotStates, placement, presses],
  );
  // The second mount registers in an index of its own: navigation must land in the canvas on
  // screen, never in a scaled copy.
  const [index] = useState(() => createBindingIndex(flushSync));
  const surface = state.stageId
    ? runtime.processor.model.surfacesMap.get(state.stageId)
    : undefined;

  // Where the canvas got to, in the progress line's words: the preview's caption and its name.
  const progress = turnProgress(state);
  const said = [progress.working?.label, ...progress.sources.map(source => source.name)].filter(
    (text): text is string => !!text,
  );
  const hasProgress = said.length > 0;

  return (
    <div
      className="canvas-trail-preview"
      data-testid="canvas-trail-preview"
      role="img"
      aria-label={hasProgress ? `Preview of ${label}: ${said.join(', ')}` : `Preview of ${label}`}
      style={{top, '--a2v-trail-col': `${railColumn}px`} as CSSProperties}
    >
      <div className="canvas-trail-preview-frame" aria-hidden="true" inert>
        <div
          className="canvas-trail-preview-scale"
          style={{width: PREVIEW_LAYOUT_WIDTH, transform: `scale(${PREVIEW_SCALE})`}}
        >
          {surface && state.stageId && (
            <div data-slots={slotCountOf(surface) || undefined}>
              <BindingIndexContext.Provider value={index}>
                <SlotContentContext.Provider value={slotContent}>
                  <SlotStateContext.Provider value={slotStateOf}>
                    <PressStateContext.Provider value={NO_PRESSES}>
                      <SurfaceErrorBoundary surfaceId={state.stageId} resetKey={state.appliedSeq}>
                        <SurfaceFrame surface={surface} />
                      </SurfaceErrorBoundary>
                    </PressStateContext.Provider>
                  </SlotStateContext.Provider>
                </SlotContentContext.Provider>
              </BindingIndexContext.Provider>
            </div>
          )}
        </div>
      </div>
      {hasProgress && (
        <div className="canvas-trail-preview-caption" aria-hidden="true">
          <ProgressLine state={state} since={state.question?.askedAt ?? null} compact sourcesOnly />
        </div>
      )}
    </div>
  );
}
