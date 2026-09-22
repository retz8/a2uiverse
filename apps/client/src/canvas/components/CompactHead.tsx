/**
 * The header condensed: once the question and its progress line have scrolled out of the page,
 * a one-line bar holds the top edge — the question cut to one line, the progress line beside it
 * while the turn runs — so what the screen answers, and where the turn stands, follow the reader
 * down without the full header taking its room at every scroll position. The bar hangs from a
 * zero-height sticky anchor, so showing it moves nothing beneath. Clicking the question opens the
 * palette with it, as the full header does.
 */
import {useEffect, useState, type RefObject} from 'react';
import type {CanvasState, Question} from '../canvasStore';
import {ProgressLine} from './ProgressLine';

export interface CompactHeadProps {
  /** The page that scrolls, and the full header inside it. */
  scroller: RefObject<HTMLElement | null>;
  head: RefObject<HTMLElement | null>;
  question: Question | null;
  state: CanvasState;
  /** The progress line belongs to the live turn: shown while one runs. */
  showProgress: boolean;
  onEdit: (text: string) => void;
}

/** Whether the full header has left the scroller's view. */
function useScrolledPast(
  scroller: RefObject<HTMLElement | null>,
  head: RefObject<HTMLElement | null>,
  watching: boolean,
): boolean {
  const [past, setPast] = useState(false);
  useEffect(() => {
    const root = scroller.current;
    const target = head.current;
    if (!watching || !root || !target || typeof IntersectionObserver === 'undefined') return;
    const observer = new IntersectionObserver(([entry]) => setPast(!entry.isIntersecting), {
      root,
    });
    observer.observe(target);
    return () => {
      observer.disconnect();
      setPast(false);
    };
  }, [scroller, head, watching]);
  return watching && past;
}

export function CompactHead({
  scroller,
  head,
  question,
  state,
  showProgress,
  onEdit,
}: CompactHeadProps) {
  const running = showProgress && state.inFlight !== null;
  const past = useScrolledPast(scroller, head, question !== null || running);
  return (
    <div className="canvas-compact-anchor">
      {past && (question || running) && (
        <div className="canvas-compact" data-testid="canvas-compact-head">
          {question && (
            <button
              type="button"
              className="canvas-compact-question"
              title="Edit and ask again"
              onClick={() => onEdit(question.text)}
            >
              {question.text}
            </button>
          )}
          {running && <ProgressLine state={state} since={question?.askedAt ?? null} compact />}
        </div>
      )}
    </div>
  );
}
