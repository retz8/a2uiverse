/**
 * The cause vocabulary: what opened a turn on a canvas — the utterance that opened the canvas,
 * a surface action inside one of its fragments, or the answer to an overlay question.
 */
import type {A2uiClientAction} from '@a2ui/web_core/v0_9';

/** What produced a paint. */
export type PaintCause =
  | {kind: 'utterance'; payload: {text: string}}
  | {kind: 'surface-action'; payload: {action: A2uiClientAction}}
  | {
      kind: 'overlay-answer';
      /** The question (the overlay's title, when known) and the raw action event, verbatim. */
      payload: {question?: string; answer: A2uiClientAction};
    };

/** The most characters of a question the trail's label carries. */
export const MAX_UTTERANCE_LABEL = 48;

/** The question cut to the label's length, with an ellipsis when it was longer. */
export const truncateUtterance = (text: string): string =>
  text.length <= MAX_UTTERANCE_LABEL ? text : `${text.slice(0, MAX_UTTERANCE_LABEL).trimEnd()}…`;
