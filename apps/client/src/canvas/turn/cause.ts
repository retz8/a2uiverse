/**
 * The cause vocabulary: what opened a turn on a canvas — the utterance that opened the canvas,
 * or a surface action inside one of its fragments.
 */
import type {A2uiClientAction} from '@a2ui/web_core/v0_9';

/** What produced a paint. */
export type PaintCause =
  | {kind: 'utterance'; payload: {text: string}}
  | {kind: 'surface-action'; payload: {action: A2uiClientAction}};

/** The most characters of a question the trail's label carries. */
export const MAX_UTTERANCE_LABEL = 48;

/** The question cut to the label's length, with an ellipsis when it was longer. */
export const truncateUtterance = (text: string): string =>
  text.length <= MAX_UTTERANCE_LABEL ? text : `${text.slice(0, MAX_UTTERANCE_LABEL).trimEnd()}…`;
