/**
 * The runtime's reading of time (task 5.7): vendors paint time in whatever form their own model
 * chose, and nothing on the wire asks them for a format. So the shell reads it — any value that
 * carries a four-digit year and a clock is an instant, a range its start — and everything else
 * stays text. One function for the evaluator's sort and for `DerivedValue`'s `datetime` format,
 * so what sorts together renders together.
 */

const YEAR = /(?:^|\D)(\d{4})(?:\D|$)/;
const CLOCK = /\d{1,2}:\d{2}/;
/** The named shapes the roster is known to paint; read directly, no normalising. */
const ISO = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2}(?:\.\d+)?)?(?:Z|[+-]\d{2}:\d{2})?$/;
const SPACE_UTC = /^(\d{4}-\d{2}-\d{2}) (\d{2}:\d{2}(?::\d{2})?) UTC$/;
/** A range's tail: ` – 11:30`, ` - 11:30 UTC`, ` to 11:30`. */
const RANGE_TAIL = /\s(?:[–—-]|to)\s\d{1,2}:\d{2}.*$/;

/** The instant a value denotes, in ms since the epoch, or undefined when it is not one. */
export function parseInstant(value: unknown): number | undefined {
  if (typeof value !== 'string') return undefined;
  const text = value.trim();
  if (!YEAR.test(text) || !CLOCK.test(text)) return undefined;
  if (ISO.test(text)) return finite(Date.parse(text));
  const spaced = SPACE_UTC.exec(text);
  if (spaced) return finite(Date.parse(`${spaced[1]}T${spaced[2]}Z`));
  // A vendor's own prose spelling: drop the decorations a person reads past, cut a range to its
  // start, and let the engine read what is left. Anything it cannot read is not an instant.
  const normalized = text
    .replace(RANGE_TAIL, '')
    .replace(/\s+at\s+/g, ' ')
    .replace(/[·,]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  return finite(Date.parse(normalized));
}

function finite(ms: number): number | undefined {
  return Number.isNaN(ms) ? undefined : ms;
}

const HUMAN = new Intl.DateTimeFormat(undefined, {dateStyle: 'medium', timeStyle: 'short'});

/** One human form for any spelling the runtime can read; the value as painted otherwise. */
export function formatInstant(value: unknown): string {
  const ms = parseInstant(value);
  return ms === undefined ? String(value) : HUMAN.format(new Date(ms));
}
