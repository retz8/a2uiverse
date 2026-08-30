/**
 * The ambient notice region: the outcome register — what the sources said about the turn they
 * just painted, shown transiently and stored nowhere once faded.
 *
 * Plural by construction. A fan-out has several voices whose chunks interleave on the wire, so
 * each source gets its own line, buffered separately and named. Prose stays here rather than in
 * the slot it describes: a fragment's geometry is fixed for the turn, which streaming text
 * inside it would not respect.
 *
 * Every line fades on its own clock, six seconds after its own last chunk. This was once a
 * single group fade timed from the end of the turn, on the reasoning that the lines are one set
 * of answers and should be read together. Live fan-out disproved it: sources finish minutes
 * apart, so a fast source's line sat pinned behind a slow one for the whole turn. What made the
 * group fade necessary was that the notice used to be the only trace of a source that spoke but
 * never painted — and it no longer is, because that source's slot now rests on its words. With
 * nothing left to lose to an early fade, each line is free to go when it is done.
 */
import {useEffect} from 'react';
import type {RenderedNotice} from '../canvasStore';

export const NOTICE_DURATION_MS = 6000;

export interface AmbientNoticeProps {
  /** The stack, already ordered and resolved against the roster. */
  notices: readonly RenderedNotice[];
  /** One line's fade expired. */
  onDismiss: (key: number) => void;
}

/** One source's line, owning the fade its own streaming restarts. */
function NoticeLine({
  notice,
  onDismiss,
}: {
  notice: RenderedNotice;
  onDismiss: (key: number) => void;
}) {
  const {key, text} = notice;
  useEffect(() => {
    // Keyed on the text as well as the line: every arriving chunk restarts the clock, so a
    // source that is still speaking never fades mid-sentence.
    const timer = setTimeout(() => onDismiss(key), NOTICE_DURATION_MS);
    return () => clearTimeout(timer);
  }, [key, text, onDismiss]);

  return (
    <div
      className="canvas-notice"
      data-testid="canvas-notice"
      data-notice-source={notice.source ?? undefined}
    >
      {notice.label !== null && <span className="canvas-notice__source">{notice.label}</span>}
      <span className="canvas-notice__text">{text}</span>
    </div>
  );
}

export function AmbientNotice({notices, onDismiss}: AmbientNoticeProps) {
  if (notices.length === 0) return null;
  return (
    <div className="canvas-notice-stack" data-testid="canvas-notice-stack" role="status">
      {notices.map(notice => (
        <NoticeLine key={notice.key} notice={notice} onDismiss={onDismiss} />
      ))}
    </div>
  );
}
