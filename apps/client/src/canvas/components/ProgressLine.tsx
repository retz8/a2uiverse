/**
 * The progress line under the question: planning, then a tick per source as its fragment fills,
 * then the merge in computed words. It stays after the turn lands, the ticks and the merge in the
 * past tense, and follows the reader's presses on the composition (task 8.5). The step that is
 * working carries the in-flight marker (`canvas-pending`).
 */
import {Fragment, useEffect, useState} from 'react';
import type {CanvasState} from '../canvasStore';
import {turnProgress, type StepStatus} from '../turnProgress';

export interface ProgressLineProps {
  state: CanvasState;
  /** When the turn was asked — the planning wait counts from here. */
  since: number | null;
  /**
   * The copy the condensed header carries while the full one is scrolled away: the same line,
   * not a second live region, and not the line tests and landings look up.
   */
  compact?: boolean;
}

const CheckIcon = () => (
  <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
    <path
      d="M3 7.5l2.6 2.5L11 4.5"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

const FailedIcon = () => (
  <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
    <circle cx="7" cy="7" r="5.8" stroke="currentColor" strokeWidth="1.5" />
    <path d="M5 5l4 4M9 5l-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
  </svg>
);

export const WorkingIcon = () => (
  <svg
    className="canvas-spin"
    width="14"
    height="14"
    viewBox="0 0 14 14"
    fill="none"
    aria-hidden="true"
  >
    <circle cx="7" cy="7" r="5.5" stroke="var(--a2v-skel-ring)" strokeWidth="1.6" />
    <path
      d="M7 1.5a5.5 5.5 0 0 1 5.5 5.5"
      stroke="var(--a2v-accent)"
      strokeWidth="1.6"
      strokeLinecap="round"
    />
  </svg>
);

function Step({
  status,
  compact,
  children,
}: {
  status: StepStatus;
  compact?: boolean;
  children: string;
}) {
  const working = status === 'working';
  return (
    <span
      className={`canvas-progress-step canvas-progress-step--${status}`}
      data-testid={working && !compact ? 'canvas-pending' : undefined}
      data-status={status}
    >
      {status === 'done' && <CheckIcon />}
      {status === 'failed' && <FailedIcon />}
      {working && <WorkingIcon />}
      <span>{children}</span>
    </span>
  );
}

const Dot = () => <span className="canvas-progress-dot" aria-hidden="true" />;

/** Whole seconds since `since`, ticking while mounted. */
function useElapsed(since: number | null, running: boolean): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!running) return;
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, [running]);
  return since === null ? 0 : Math.max(0, Math.floor((now - since) / 1000));
}

export function ProgressLine({state, since, compact}: ProgressLineProps) {
  const progress = turnProgress(state);
  const planning = progress.working?.kind === 'planning';
  const elapsed = useElapsed(since, planning);
  // Nothing to say — a platform answer, no vendor dispatched — takes no room under the question
  // (task-8.7 decision 28).
  if (!progress.working && progress.sources.length === 0 && !progress.merge) return null;
  return (
    <div
      className={compact ? 'canvas-progress canvas-progress--compact' : 'canvas-progress'}
      data-testid={compact ? 'canvas-progress-compact' : 'canvas-progress'}
      aria-live={compact ? undefined : 'polite'}
    >
      {progress.working && (
        <>
          <Step status="working" compact={compact}>
            {progress.working.label}
          </Step>
          {planning && elapsed > 0 && (
            <span className="canvas-progress-step canvas-progress-step--faint">{elapsed} s</span>
          )}
        </>
      )}
      {progress.sources.map(source => (
        <Step key={source.appId} status={source.status} compact={compact}>
          {source.name}
        </Step>
      ))}
      {progress.merge && (
        <Fragment>
          <Dot />
          <Step
            status={progress.merge.status === 'done' ? 'idle' : progress.merge.status}
            compact={compact}
          >
            {progress.merge.text}
          </Step>
        </Fragment>
      )}
    </div>
  );
}
