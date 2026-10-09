import {readClientSession, type ClientSession} from '@a2uiverse/sdk';
import {withGuidance} from './credentialBar.js';

type Metadata = Record<string, unknown> | undefined;

/**
 * The person's local time in plain words (task-12.13 decision 47): "The person's local time is
 * Friday 9 October 2026, 14:20 (Asia/Seoul)." Undefined without a whole clock, or with a time or
 * a zone that does not read.
 */
export function localTimeSentence(session: ClientSession | undefined): string | undefined {
  if (!session?.now || !session.timeZone) return undefined;
  const at = new Date(session.now);
  if (Number.isNaN(at.getTime())) return undefined;
  try {
    const parts = Object.fromEntries(
      new Intl.DateTimeFormat('en-GB', {
        timeZone: session.timeZone,
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hourCycle: 'h23',
      })
        .formatToParts(at)
        .map(part => [part.type, part.value]),
    );
    const {weekday, day, month, year, hour, minute} = parts;
    return `The person's local time is ${weekday} ${day} ${month} ${year}, ${hour}:${minute} (${session.timeZone}).`;
  } catch {
    return undefined;
  }
}

/**
 * The words of a text request the hub writes to an app: the request, the guidance sentence
 * (task-12.7 decision 6), and the person's local time from the first of `metadata` carrying a
 * whole clock — the press's own, then the question's — said in words, so nothing a2uiverse-specific
 * rides the vendor wire.
 */
export function requestWords(request: string, ...metadata: Metadata[]): string {
  const time = metadata
    .map(each => localTimeSentence(readClientSession(each)))
    .find(sentence => sentence !== undefined);
  return time ? `${withGuidance(request)} ${time}` : withGuidance(request);
}
