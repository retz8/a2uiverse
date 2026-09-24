/**
 * One canvas on screen (task-9.6 decisions 1, 2): the runtime's own store read here, its question
 * heading the page, its progress line, its stage with the slots resolved against its own processor,
 * its overlay question, its notices and its sticky error. Keyed by the canvas by the page, so
 * switching canvases remounts cleanly. A past canvas draws exactly as the live one — actable, its
 * presses made — the band above it is the page's chrome, not this view's.
 */
import {useCallback, useMemo, useRef, useSyncExternalStore} from 'react';
import {
  type PressState,
  PressStateContext,
  SlotContentContext,
  SlotStateContext,
} from '@a2uiverse/shell-catalog';
import type {CanvasRuntime} from '../canvasRuntime';
import {orderedNotices} from '../canvasStore';
import {columnState} from '../composition/columnState';
import {useSlotContent} from '../composition/slotContent';
import {BindingIndexContext} from '../navigation/decorateCatalog';
import {AmbientNotice} from './AmbientNotice';
import {CanvasOverlay} from './CanvasOverlay';
import {CanvasStage} from './CanvasStage';
import {CompactHead} from './CompactHead';
import {ProgressLine} from './ProgressLine';
import {QuestionHeader} from './QuestionHeader';
import {StatusStrip} from './StatusStrip';

export interface CanvasViewProps {
  runtime: CanvasRuntime;
  /** Open the palette holding these words — the header's "Edit and ask again". */
  onEdit: (text: string) => void;
}

export function CanvasView({runtime, onEdit}: CanvasViewProps) {
  const state = useSyncExternalStore(runtime.store.subscribe, runtime.store.getState);

  // What a `Slot` in the shell surface renders: the fragment placed in it, inside its boundary —
  // or, for a slot whose source answered in prose and never painted, what that source said.
  const slotContent = useSlotContent(
    runtime.processor,
    state.placement,
    state.appliedSeq,
    state.promoted,
    state.roster,
    state.prose,
  );

  // What a reserved column in the merged view says of its source (task-8.5 decision 12).
  const {merge, slotStates, placement, presses} = state;
  const slotStateOf = useCallback(
    (source: string) => columnState({merge, slotStates, placement, presses}, source),
    [merge, slotStates, placement, presses],
  );
  // The presses the paint has not caught up with. A press can always be made: a past canvas
  // takes one as the live canvas does (phase-9 decision 4).
  const pressState = useMemo<PressState>(
    () => ({
      enabled: true,
      presses: presses.flatMap(({operation, status}) =>
        status === 'running' ? [] : [{operation, status}],
      ),
    }),
    [presses],
  );

  // Promotion is plural, so it is emphasis rather than a modal: no focus trap, and the count
  // is announced instead of the focus being seized.
  const promotedCount = state.promoted.size;

  /** The page that scrolls and the header at its top: the condensed header watches the one leave the other. */
  const scrollRef = useRef<HTMLDivElement>(null);
  const headRef = useRef<HTMLElement>(null);

  const question = state.question;
  const showProgress = question !== null || state.inFlight !== null;

  return (
    <BindingIndexContext.Provider value={runtime.bindingIndex}>
      <SlotContentContext.Provider value={slotContent}>
        {/* The header scrolls with the page it heads; once it has left, the condensed bar
            holds the top edge (CompactHead). */}
        <div className="canvas-scroll" data-testid="canvas-scroll" ref={scrollRef}>
          <CompactHead
            scroller={scrollRef}
            head={headRef}
            question={question}
            state={state}
            showProgress={showProgress}
            onEdit={onEdit}
          />
          {(question || showProgress) && (
            <header className="canvas-head" data-testid="canvas-head" ref={headRef}>
              {question && (
                // Keyed by the question, so a new one starts over at display size, measured.
                <QuestionHeader
                  key={`${question.askedAt}:${question.text}`}
                  question={question}
                  onEdit={onEdit}
                />
              )}
              {showProgress && <ProgressLine state={state} since={question?.askedAt ?? null} />}
            </header>
          )}
          <SlotStateContext.Provider value={slotStateOf}>
            <PressStateContext.Provider value={pressState}>
              <CanvasStage processor={runtime.processor} state={state} />
            </PressStateContext.Provider>
          </SlotStateContext.Provider>
        </div>
        {promotedCount > 0 && (
          <div className="canvas-scrim" data-testid="canvas-scrim" aria-hidden="true" />
        )}
        <div role="status" aria-live="polite" className="canvas-visually-hidden">
          {promotedCount > 0
            ? `${promotedCount} ${promotedCount === 1 ? 'source needs' : 'sources need'} your answer`
            : ''}
        </div>
        <CanvasOverlay processor={runtime.processor} state={state} />
        <AmbientNotice notices={orderedNotices(state)} onDismiss={runtime.store.dismissNotice} />
        <StatusStrip error={state.error} />
      </SlotContentContext.Provider>
    </BindingIndexContext.Provider>
  );
}
