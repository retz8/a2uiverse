/**
 * The question as the canvas's header: the user's words, verbatim, from Enter until the next
 * question. A question that fits one line is set at display size; a longer one at body size in a
 * fixed four-line box, so the header's height is settled at Enter and nothing beneath it moves.
 * Past four lines the fourth fades and "Show all" opens the whole question over the page. The
 * header itself is the way back into the palette, pre-filled.
 */
import {useCallback, useEffect, useLayoutEffect, useRef, useState} from 'react';
import type {Question} from '../canvasStore';

/** The long register's line height and its line cap. */
const LONG_LINE = 28;
const LONG_LINES = 4;
/** Taller than one display line (36px) means the question wraps: the long register. */
const DISPLAY_ONE_LINE = 36;

export interface QuestionHeaderProps {
  question: Question;
  /** Open the palette with these words in it. */
  onEdit: (text: string) => void;
}

type Register = {kind: 'display'} | {kind: 'long'; hiddenLines: number};

const ExpandIcon = () => (
  <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true">
    <path
      d="M7.5 2h2.5v2.5M4.5 10H2V7.5M10 2L6.8 5.2M2 10l3.2-3.2"
      stroke="currentColor"
      strokeWidth="1.4"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

const CloseIcon = () => (
  <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true">
    <path d="M3 3l6 6M9 3l-6 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
  </svg>
);

const EditIcon = () => (
  <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
    <path
      d="M9.5 2.5l2 2L5 11H3V9z"
      stroke="currentColor"
      strokeWidth="1.4"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

const timeOf = (epoch: number) =>
  new Date(epoch).toLocaleTimeString([], {hour: '2-digit', minute: '2-digit'});

export function QuestionHeader({question, onEdit}: QuestionHeaderProps) {
  const headerRef = useRef<HTMLButtonElement>(null);
  const [register, setRegister] = useState<Register>({kind: 'display'});
  const [open, setOpen] = useState<DOMRect | null>(null);

  // Measured before it paints: display size until the question proves taller than one line.
  // The canvas keys the header by its question, so a new one starts over here.
  const measure = useCallback(() => {
    const el = headerRef.current;
    if (!el) return;
    if (register.kind === 'display') {
      if (el.scrollHeight > DISPLAY_ONE_LINE * 1.5) setRegister({kind: 'long', hiddenLines: 0});
      return;
    }
    const style = getComputedStyle(el);
    const padding = parseFloat(style.paddingTop) + parseFloat(style.paddingBottom) || 0;
    const lines = Math.round((el.scrollHeight - padding) / LONG_LINE);
    const hiddenLines = Math.max(0, lines - LONG_LINES);
    if (hiddenLines !== register.hiddenLines) setRegister({kind: 'long', hiddenLines});
  }, [register]);

  useLayoutEffect(measure, [measure]);

  useEffect(() => {
    const el = headerRef.current;
    if (!el || typeof ResizeObserver === 'undefined') return;
    const observer = new ResizeObserver(() => measure());
    observer.observe(el.parentElement ?? el);
    return () => observer.disconnect();
  }, [measure]);

  // Esc closes the full question wherever focus is, as it dismisses the palette.
  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        setOpen(null);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [open]);

  const clipped = register.kind === 'long' && register.hiddenLines > 0;
  const className = [
    'canvas-question',
    register.kind === 'long' ? 'canvas-question--long' : 'canvas-question--display',
    clipped ? 'canvas-question--clipped' : '',
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <div className="canvas-question-wrap">
      <button
        ref={headerRef}
        type="button"
        className={className}
        data-testid="canvas-question"
        data-register={register.kind}
        title="Edit and ask again"
        onClick={() => onEdit(question.text)}
      >
        {question.text}
      </button>
      {clipped && (
        <button
          type="button"
          className="canvas-question-showall"
          aria-expanded={open !== null}
          aria-label={`Show the whole question, ${register.hiddenLines} more ${register.hiddenLines === 1 ? 'line' : 'lines'}`}
          onClick={() => setOpen(headerRef.current?.getBoundingClientRect() ?? null)}
        >
          Show all
          <span className="canvas-question-more">
            +{register.hiddenLines} {register.hiddenLines === 1 ? 'line' : 'lines'}
          </span>
          <ExpandIcon />
        </button>
      )}
      {open && (
        <>
          <div
            className="canvas-question-scrim"
            data-testid="canvas-question-scrim"
            onClick={() => setOpen(null)}
          />
          <div
            className="canvas-question-overlay"
            role="dialog"
            aria-label="Your question"
            data-testid="canvas-question-overlay"
            style={{top: open.top - 8, left: open.left - 8}}
          >
            <button
              type="button"
              className="canvas-question-close"
              aria-label="Close (Esc)"
              onClick={() => setOpen(null)}
            >
              <CloseIcon />
              <span className="canvas-question-esc">Esc</span>
            </button>
            <p className="canvas-question-full">{question.text}</p>
            <div className="canvas-question-foot">
              <button
                type="button"
                className="canvas-question-edit"
                onClick={() => {
                  setOpen(null);
                  onEdit(question.text);
                }}
              >
                <EditIcon />
                <span>Edit and ask again</span>
              </button>
              <span className="canvas-question-when">Asked at {timeOf(question.askedAt)}</span>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
