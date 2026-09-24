/** The trail's clock and calendar, as board F5 of the design canvas draws them. */

/** `09:12` — a 24-hour clock. */
export const timeOf = (ms: number): string =>
  new Date(ms).toLocaleTimeString([], {hour: '2-digit', minute: '2-digit', hourCycle: 'h23'});

/** The day header an entry sits under: Today, Yesterday, then the date. */
export function dayOf(ms: number, now = Date.now()): string {
  const day = (at: number) => new Date(at).toDateString();
  if (day(ms) === day(now)) return 'Today';
  if (day(ms) === day(now - 24 * 60 * 60 * 1000)) return 'Yesterday';
  return new Date(ms).toLocaleDateString([], {month: 'short', day: 'numeric'});
}
