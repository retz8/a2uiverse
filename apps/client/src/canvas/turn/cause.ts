/**
 * The cause vocabulary: what opened a turn on a canvas — the utterance that opened the canvas,
 * a surface action inside one of its fragments, or the answer to an overlay question. Display
 * strings are derived from the cause at render time, never stored: `titleOfCause` is the bare
 * phrase, `describeCause` dresses it as activity for the in-flight label.
 */
import type {A2uiClientAction} from '@a2ui/web_core/v0_9';
import {describeAction} from '../../shared/describeAction';

/** What produced a paint. */
export type PaintCause =
  | {kind: 'utterance'; payload: {text: string}}
  | {kind: 'surface-action'; payload: {action: A2uiClientAction}}
  | {
      kind: 'overlay-answer';
      /** The question (the overlay's title, when known) and the raw action event, verbatim. */
      payload: {question?: string; answer: A2uiClientAction};
    };

/** The most characters of a question the trail's label and the in-flight label carry. */
export const MAX_UTTERANCE_LABEL = 48;

/** The question cut to the label's length, with an ellipsis when it was longer. */
export const truncateUtterance = (text: string): string =>
  text.length <= MAX_UTTERANCE_LABEL ? text : `${text.slice(0, MAX_UTTERANCE_LABEL).trimEnd()}…`;

/**
 * The bare cause-derived phrase: the utterance itself, the action's subject, or the answered
 * question. Empty when the cause derives to nothing (the caller falls back further).
 */
export function titleOfCause(cause: PaintCause): string {
  switch (cause.kind) {
    case 'utterance':
      return `“${truncateUtterance(cause.payload.text)}”`;
    case 'surface-action':
      return describeAction(cause.payload.action);
    case 'overlay-answer':
      if (cause.payload.question) return `answered “${cause.payload.question}”`;
      return describeAction(cause.payload.answer);
  }
}

/**
 * The activity register: the bare phrase dressed for the in-flight label. Always ends in
 * "generating…" so it reads as activity.
 */
export function describeCause(cause: PaintCause): string {
  const phrase = titleOfCause(cause);
  return phrase ? `${phrase} — generating…` : 'Generating…';
}
