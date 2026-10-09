/**
 * One canvas on screen (task-9.6 decisions 1, 2): the runtime's own store read here, its question
 * heading the page, its progress line, its stage with the slots resolved against its own processor,
 * its notices and its sticky error. Keyed by the canvas by the page, so
 * switching canvases remounts cleanly. A past canvas draws exactly as the live one — actable, its
 * presses made — the band above it is the page's chrome, not this view's. The arrows on each
 * attribution row read the canvas's history through the host's context (task 9.7): the two
 * neighbours of the paint on screen, and whether the source is busy.
 */
import {useCallback, useMemo, useRef, useSyncExternalStore} from 'react';
import {
  FragmentHistoryContext,
  type FragmentHistoryResolver,
  type PressState,
  PressStateContext,
  SignInContext,
  SlotContentContext,
  SlotStateContext,
} from '@a2uiverse/shell-catalog';
import type {CanvasRuntime} from '../canvasRuntime';
import {orderedNotices} from '../canvasStore';
import {columnState, sourceBusy} from '../composition/columnState';
import {useSlotContent} from '../composition/slotContent';
import {BindingIndexContext} from '../navigation/decorateCatalog';
import {AmbientNotice} from './AmbientNotice';
import {CanvasStage} from './CanvasStage';
import {CompactHead} from './CompactHead';
import {ProgressLine} from './ProgressLine';
import {QuestionHeader} from './QuestionHeader';
import {useStepHold} from './useStepHold';

export interface CanvasViewProps {
  runtime: CanvasRuntime;
  /** Open the palette holding these words — the header's "Edit and ask again". */
  onEdit: (text: string) => void;
  /** A past canvas, under the band. */
  past?: boolean;
}

export function CanvasView({runtime, onEdit, past = false}: CanvasViewProps) {
  const state = useSyncExternalStore(runtime.store.subscribe, runtime.store.getState);

  // What a `Slot` in the shell surface renders: the fragment placed in it, inside its boundary —
  // or, for a slot whose source answered in prose and never painted, what that source said.
  const slotContent = useSlotContent(
    runtime.processor,
    state.placement,
    state.appliedSeq,
    state.roster,
    state.prose,
  );

  // What a reserved column in the merged view says of its source (task-8.5 decision 12).
  const {merge, slotStates, placement, presses, authority} = state;
  const slotStateOf = useCallback(
    (source: string) => columnState({merge, slotStates, placement, presses, authority}, source),
    [merge, slotStates, placement, presses, authority],
  );
  // The sources a sign-in window is open for, pressed on this canvas (task 12.8).
  const {signingIn} = state;
  const signingInOf = useCallback((source: string) => signingIn.has(source), [signingIn]);
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

  // Where each source's fragment stands in its history (task-9.7 decision 6): the neighbours the
  // canvas's stacks give, busy while the source's repaint is in flight.
  const historyVersion = useSyncExternalStore(runtime.history.subscribe, runtime.history.version);
  const {inFlight} = state;
  const historyOf = useMemo<FragmentHistoryResolver>(
    () => source => {
      const neighbours = runtime.history.neighbours(source);
      if (!neighbours) return undefined;
      return sourceBusy({inFlight, presses}, source) ? {...neighbours, busy: true} : neighbours;
    },
    // The version is what changes when the stacks do; the resolver reads them fresh.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [runtime, historyVersion, inFlight, presses],
  );

  /** The page that scrolls and the header at its top: the condensed header watches the one leave the other. */
  const scrollRef = useRef<HTMLDivElement>(null);
  // A fragment's way back pressed: its row holds its place while the step runs (task-9.9
  // decision 19).
  useStepHold(
    scrollRef,
    presses.some(({operation}) => operation.kind === 'step'),
  );
  const headRef = useRef<HTMLElement>(null);

  const question = state.question;
  const showProgress = question !== null || state.inFlight !== null || state.error !== null;

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
            past={past}
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
              <SignInContext.Provider value={signingInOf}>
                <FragmentHistoryContext.Provider value={historyOf}>
                  <CanvasStage processor={runtime.processor} state={state} />
                </FragmentHistoryContext.Provider>
              </SignInContext.Provider>
            </PressStateContext.Provider>
          </SlotStateContext.Provider>
        </div>
        <AmbientNotice notices={orderedNotices(state)} onDismiss={runtime.store.dismissNotice} />
      </SlotContentContext.Provider>
    </BindingIndexContext.Provider>
  );
}
