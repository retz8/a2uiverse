/**
 * An A2UI part on A2A (task 20.4): the one reading of the A2UI messages a data part carries, and
 * the one spelling of the parts the platform writes. A part is A2UI by what its `data` holds; no
 * reader reads a mark. Typed structurally, so the sdk depends on no A2A package.
 */

/** An A2UI message as the wire carries it: `version` and one operation. */
export type A2uiMessage = Record<string, unknown>;

/** The MIME type the platform marks an A2UI part with, whatever A2UI version its message is stamped. */
export const A2UI_MIME_TYPE = 'application/a2ui+json';

/**
 * The MIME type the platform marks the A2UIVerse extension's own parts with: `paintMeta` and the
 * client's `operation`.
 */
export const A2UI_SHELL_MIME_TYPE = 'application/a2ui-shell+json';

const isMessage = (value: unknown): value is A2uiMessage =>
  typeof value === 'object' &&
  value !== null &&
  !Array.isArray(value) &&
  typeof (value as A2uiMessage).version === 'string';

/**
 * The A2UI messages a data part's `data` carries: one message object — `version` and an
 * operation — or a bare list of messages, each entry judged on its own. Anything else carries
 * none: a `paintMeta` part, an object holding a `messages` list.
 */
export function a2uiMessagesIn(data: unknown): A2uiMessage[] {
  if (Array.isArray(data)) return data.filter(isMessage);
  return isMessage(data) ? [data] : [];
}

/**
 * The same `data` with each A2UI message it carries replaced by `rewrite`'s answer, in the form
 * it came in: one message, or a bare list whose other entries stay as they are. `data` itself
 * when it carries no message, or when `rewrite` hands every message back.
 */
export function withA2uiMessages(
  data: unknown,
  rewrite: (message: A2uiMessage) => A2uiMessage,
): unknown {
  if (Array.isArray(data)) {
    const entries: unknown[] = data.map(entry => (isMessage(entry) ? rewrite(entry) : entry));
    return entries.some((entry, i) => entry !== data[i]) ? entries : data;
  }
  return isMessage(data) ? rewrite(data) : data;
}

/**
 * A data part the platform writes, in the in-memory shape of `@a2a-js/sdk` 1.x: its MIME type in
 * `metadata.mimeType` and in `mediaType`. The A2A SDK writes `mediaType` on the A2A 1.0 wire and
 * leaves it off the 0.3 wire, where `metadata.mimeType` alone carries the mark.
 */
export interface MarkedDataPart {
  content: {$case: 'data'; value: Record<string, unknown>};
  metadata: {mimeType: string};
  filename: string;
  mediaType: string;
}

const marked = (data: Record<string, unknown>, mimeType: string): MarkedDataPart => ({
  content: {$case: 'data', value: data},
  metadata: {mimeType},
  filename: '',
  mediaType: mimeType,
});

/** The platform's one spelling of an A2UI part: one message, marked {@link A2UI_MIME_TYPE}. */
export function a2uiPart(message: A2uiMessage): MarkedDataPart {
  return marked(message, A2UI_MIME_TYPE);
}

/**
 * A part of the A2UIVerse extension's own — a `paintMeta` body, an `operation` body — marked
 * {@link A2UI_SHELL_MIME_TYPE}.
 */
export function shellPart(data: Record<string, unknown>): MarkedDataPart {
  return marked(data, A2UI_SHELL_MIME_TYPE);
}
