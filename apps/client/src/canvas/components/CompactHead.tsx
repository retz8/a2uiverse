/**
 * The header condensed: once the question and its progress line have scrolled out of the page,
 * a one-line bar holds the top edge — the question cut to one line, the progress line beside it
 * whenever the full header carries one, running or landed (task-8.7 decision 22) — so what the
 * screen answers, and where the turn stands, follow the reader down without the full header
 * taking its room at every scroll position. The bar hangs from a zero-height sticky anchor, so
 * showing it moves nothing beneath. Clicking the question opens the palette with it, as the full
 * header does.
 */
import {useEffect, useState, type RefObject} from 'react';
import {createPortal} from 'react-dom';
import type {CanvasState, Question} from '../canvasStore';
import {ProgressLine} from './ProgressLine';

export interface CompactHeadProps {
  /** The page that scrolls, and the full header inside it. */
  scroller: RefObject<HTMLElement | null>;
  head: RefObject<HTMLElement | null>;
  question: Question | null;
  state: CanvasState;
  /** The progress line belongs to the live turn: shown whenever the full header shows it. */
  showProgress: boolean;
  onEdit: (text: string) => void;
  /**
   * A past canvas: the band holds the top edge, so the condensed copy folds into the band's
   * middle rather than hanging a second bar beneath it (task 9.6).
   */
  past?: boolean;
}

/** Where the band takes the condensed copy on a past canvas. */
export const BAND_MIDDLE_ID = 'canvas-band-middle';

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
  past = false,
}: CompactHeadProps) {
  const scrolled = useScrolledPast(scroller, head, question !== null || showProgress);
  const shown = scrolled && (question || showProgress);
  // The band is the page's chrome, rendered beside this view; it stands by the time anything
  // has scrolled.
  const bandMiddle = past && shown ? document.getElementById(BAND_MIDDLE_ID) : null;
  if (bandMiddle) return createPortal(bar(), bandMiddle);
  return <div className="canvas-compact-anchor">{shown && bar()}</div>;

  function bar() {
    return (
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
        {showProgress && <ProgressLine state={state} since={question?.askedAt ?? null} compact />}
      </div>
    );
  }
}
