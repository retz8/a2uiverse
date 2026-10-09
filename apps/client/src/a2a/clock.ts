/**
 * The person's clock (task-12.13 decision 47): their local time when a message is sent, in
 * RFC 3339 with its offset, and the IANA zone the browser has. The orchestrator tells each app
 * what "now" is from it, in the words of the request it writes.
 */
import type {ClientClock} from '@a2uiverse/sdk';

const pad = (n: number) => String(Math.trunc(Math.abs(n))).padStart(2, '0');

export function readClock(at: Date = new Date()): ClientClock {
  const offset = -at.getTimezoneOffset();
  const sign = offset < 0 ? '-' : '+';
  const now =
    `${at.getFullYear()}-${pad(at.getMonth() + 1)}-${pad(at.getDate())}` +
    `T${pad(at.getHours())}:${pad(at.getMinutes())}:${pad(at.getSeconds())}` +
    `${sign}${pad(offset / 60)}:${pad(offset % 60)}`;
  return {now, timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone};
}
