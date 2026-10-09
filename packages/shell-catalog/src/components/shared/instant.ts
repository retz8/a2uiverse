/**
 * The runtime's reading of time (task 5.7): vendors paint time in whatever form their own model
 * chose, and nothing on the wire asks them for a format. So the shell reads it — any value that
 * carries a four-digit year and a clock is an instant, a range its start — and everything else
 * stays text. One function for the evaluator's sort and for `DerivedValue`'s `datetime` format,
 * so what sorts together renders together.
 */

/** The language every source's time is shown in: English, whatever the viewer's locale (task 5.7). */
export const INSTANT_LOCALE = 'en-US';

/**
 * The zone every time is read and shown in: the viewer's, as their runtime reports it — the one the
 * client sends with each request (task-12.13 decisions 47, 52).
 */
export function viewerTimeZone(): string {
  return Intl.DateTimeFormat().resolvedOptions().timeZone;
}

const YEAR = /(?:^|\D)(\d{4})(?:\D|$)/;
const CLOCK = /\d{1,2}:\d{2}/;
/** The named shapes the roster is known to paint; read directly, no normalising. */
const ISO = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2}(?:\.\d+)?)?(?:Z|[+-]\d{2}:\d{2})?$/;
const SPACE_UTC = /^(\d{4}-\d{2}-\d{2}) (\d{2}:\d{2}(?::\d{2})?) UTC$/;
/**
 * A range's tail: ` – 11:30`, ` - 11:30 UTC`, ` to 11:30`, or a full date and time,
 * ` – 2026-10-09T21:30:00-04:00` (task-12.13 decision 51).
 */
const RANGE_TAIL = /\s(?:[–—-]|to)\s(?:\d{4}-\d{2}-\d{2}[T ])?\d{1,2}:\d{2}.*$/;

/** An IANA zone the source wrote beside the time, `(America/New_York)`. */
const NAMED_ZONE = /\(([A-Za-z_]+\/[A-Za-z_/+-]+)\)/;
/** A zone the engine can read on its own: `Z`, an offset, or a zone abbreviation, at the end. */
const EXPLICIT_ZONE = /(?:Z|[+-]\d{2}:?\d{2}|\b(?:UTC|GMT|[A-Z]{3,4}))\s*$/;
const ISO_LOCAL = /^(\d{4}-\d{2}-\d{2})[T ](\d{2}:\d{2}(?::\d{2}(?:\.\d+)?)?)$/;

/**
 * The instant a value denotes, in ms since the epoch, or undefined when it is not one; a value with
 * no zone of its own is wall time in `zone`, the viewer's unless named.
 */
export function parseInstant(value: unknown, zone: string = viewerTimeZone()): number | undefined {
  if (typeof value !== 'string') return undefined;
  const text = value.trim();
  if (!YEAR.test(text) || !CLOCK.test(text)) return undefined;
  if (ISO.test(text) && EXPLICIT_ZONE.test(text)) return finite(Date.parse(text));
  const spaced = SPACE_UTC.exec(text);
  if (spaced) return finite(Date.parse(`${spaced[1]}T${spaced[2]}Z`));
  // A vendor's own spelling: honour a zone it named, drop the decorations a person reads past,
  // cut a range to its start, and let the engine read what is left.
  const named = NAMED_ZONE.exec(text)?.[1];
  const normalized = text
    .replace(NAMED_ZONE, '')
    .replace(RANGE_TAIL, '')
    .replace(/\s+at\s+/g, ' ')
    .replace(/[·,]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  if (!named && EXPLICIT_ZONE.test(normalized)) return finite(Date.parse(normalized));
  // No zone the engine can read: the value is wall time in the zone the source named, or in the
  // viewer's (task-12.13 decision 52).
  const iso = ISO_LOCAL.exec(normalized);
  const wall = finite(Date.parse(iso ? `${iso[1]}T${iso[2]}Z` : `${normalized} UTC`));
  if (wall === undefined) return undefined;
  return wall - offsetMs(named ?? zone, wall);
}

/** A clock as written: hours and minutes, optional seconds, optional fraction of a second. */
const CLOCK_PARTS = /\d{1,2}:\d{2}(?::\d{2}(?:\.(\d+))?)?/;

/**
 * The unit an instant's spelling is written to, in ms: a minute, a second, or the fraction of a
 * second it carries. Undefined when the value is not an instant.
 */
export function instantPrecision(value: unknown): number | undefined {
  if (parseInstant(value) === undefined) return undefined;
  const clock = CLOCK_PARTS.exec(String(value));
  if (!clock) return undefined;
  const fraction = clock[1];
  if (fraction !== undefined) return Math.max(1, 10 ** (3 - fraction.length));
  return clock[0].split(':').length === 3 ? 1000 : 60_000;
}

/** The zone's offset from UTC at the given instant, in ms, or 0 for a zone the engine does not know. */
function offsetMs(zone: string, at: number): number {
  try {
    const parts = new Intl.DateTimeFormat('en-US', {timeZone: zone, timeZoneName: 'longOffset'})
      .formatToParts(new Date(at))
      .find(part => part.type === 'timeZoneName')?.value;
    const match = /GMT([+-])(\d{2}):(\d{2})/.exec(parts ?? '');
    if (!match) return 0;
    const sign = match[1] === '-' ? -1 : 1;
    return sign * (Number(match[2]) * 60 + Number(match[3])) * 60_000;
  } catch {
    return 0;
  }
}

function finite(ms: number): number | undefined {
  return Number.isNaN(ms) ? undefined : ms;
}

/** The human form's formatter for each zone it has been asked for. */
const HUMAN = new Map<string, Intl.DateTimeFormat>();

function humanIn(zone: string): Intl.DateTimeFormat {
  let format = HUMAN.get(zone);
  if (!format) {
    format = new Intl.DateTimeFormat(INSTANT_LOCALE, {
      dateStyle: 'medium',
      timeStyle: 'short',
      timeZone: zone,
    });
    HUMAN.set(zone, format);
  }
  return format;
}

/**
 * One human form for any spelling the runtime can read, in English in `zone` — the viewer's unless
 * named; the value as painted otherwise.
 */
export function formatInstant(value: unknown, zone: string = viewerTimeZone()): string {
  const ms = parseInstant(value, zone);
  return ms === undefined ? String(value) : humanIn(zone).format(new Date(ms));
}
