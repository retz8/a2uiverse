/**
 * The progress line under the question: planning, then a tick per source as its fragment fills,
 * then the merge in computed words. It stays after the turn lands, the ticks and the merge in the
 * past tense, and follows the reader's presses on the composition (task 8.5). The step that is
 * working carries the in-flight marker (`canvas-pending`); a source waiting on a sign-in carries a
 * lock and says so (task-12.8 decision 7). An account added from this canvas is said after the
 * merge (task-12.8 decision 6). The canvas's sticky error — a message of its own that failed or
 * never arrived, cleared by its next dispatch — closes the line in the danger tone, an alert on the
 * full line (task-9.9 decision 20).
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
  /** The sources' ticks alone, without the merge step — the trail's preview caption. */
  sourcesOnly?: boolean;
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

const LockIcon = () => (
  <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
    <rect
      x="3"
      y="6.2"
      width="8"
      height="5.8"
      rx="1.2"
      stroke="currentColor"
      strokeWidth="1.4"
      strokeLinejoin="round"
    />
    <path
      d="M4.8 6.2V4.6a2.2 2.2 0 0 1 4.4 0v1.6"
      stroke="currentColor"
      strokeWidth="1.4"
      strokeLinecap="round"
    />
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
      {status === 'locked' && <LockIcon />}
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

export function ProgressLine({state, since, compact, sourcesOnly}: ProgressLineProps) {
  const progress = turnProgress(state);
  const planning = progress.working?.kind === 'planning';
  const elapsed = useElapsed(since, planning);
  const {error} = state;
  const account = sourcesOnly ? null : state.accountNotice;
  // Nothing to say — a platform answer, no vendor dispatched — takes no room under the question
  // (task-8.7 decision 28).
  if (!progress.working && progress.sources.length === 0 && !progress.merge && !error && !account)
    return null;
  const said = progress.working || progress.sources.length > 0 || progress.merge;
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
      {progress.sources.map(step => (
        <Step key={step.source} status={step.status} compact={compact}>
          {step.text}
        </Step>
      ))}
      {progress.merge && !sourcesOnly && (
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
      {account && (
        <Fragment>
          {said && <Dot />}
          <Step status="done" compact={compact}>
            {account}
          </Step>
        </Fragment>
      )}
      {error && !sourcesOnly && (
        <Fragment>
          {(said || account) && <Dot />}
          <span
            className="canvas-progress-step canvas-progress-error"
            role={compact ? undefined : 'alert'}
            data-testid={compact ? undefined : 'canvas-error'}
          >
            <FailedIcon />
            <span>{error}</span>
          </span>
        </Fragment>
      )}
    </div>
  );
}
