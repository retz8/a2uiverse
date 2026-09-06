/**
 * The runtime's one reading of time (task 5.7): any value that carries a year and a clock is an
 * instant, whatever the vendor's spelling; anything else is text. Shared by the evaluator's sort
 * and DerivedValue's `datetime` format, so what sorts together renders together.
 */
import {expect, test} from 'vitest';
import {formatInstant, parseInstant} from './instant';

test('reads the spellings the roster has painted, all to the same instant', () => {
  const t = Date.UTC(2026, 8, 6, 0, 20);
  expect(parseInstant('2026-09-06T00:20:00Z')).toBe(t);
  expect(parseInstant('2026-09-06 00:20 UTC')).toBe(t);
  expect(parseInstant('Sep 6, 2026 · 00:20 UTC')).toBe(t);
  expect(parseInstant('2026-09-06T02:20:00+02:00')).toBe(t);
  expect(parseInstant('2026-09-06T00:20:00.250Z')).toBe(t + 250);
});

test('a range reads as its start; a zone-less value is US Eastern wall time, not the viewer’s', () => {
  // 10:00 Eastern on Sep 6 (EDT, UTC-4) is 14:00 UTC.
  expect(parseInstant('2026-09-06 10:00 – 11:30')).toBe(Date.UTC(2026, 8, 6, 14, 0));
  expect(parseInstant('2026-09-06T10:00')).toBe(Date.UTC(2026, 8, 6, 14, 0));
  // In January the same wall time is EST, UTC-5.
  expect(parseInstant('2026-01-06 10:00')).toBe(Date.UTC(2026, 0, 6, 15, 0));
});

test('a named zone in the value is honoured', () => {
  expect(parseInstant('2026-09-07, 15:00 – 15:30 (America/New_York)')).toBe(
    Date.UTC(2026, 8, 7, 19, 0),
  );
  expect(parseInstant('2026-09-07 15:00 (Europe/London)')).toBe(Date.UTC(2026, 8, 7, 14, 0));
  expect(parseInstant('2026-09-07 15:00 (Asia/Seoul)')).toBe(Date.UTC(2026, 8, 7, 6, 0));
});

test('a value without a year or without a clock is not an instant', () => {
  expect(parseInstant('11:00')).toBeUndefined();
  expect(parseInstant('11:00 – 12:00')).toBeUndefined();
  expect(parseInstant('2026-09-06')).toBeUndefined();
  expect(parseInstant('All day')).toBeUndefined();
  expect(parseInstant('9 hours ago')).toBeUndefined();
  expect(parseInstant(1_700_000_000_000)).toBeUndefined();
  expect(parseInstant(undefined)).toBeUndefined();
});

test('formatInstant renders one human form for any spelling — English, US Eastern — and leaves what it cannot read as is', () => {
  // 00:20 UTC on Sep 6 is 8:20 PM on Sep 5 in New York (EDT).
  expect(formatInstant('2026-09-06T00:20:00Z')).toBe('Sep 5, 2026, 8:20 PM');
  expect(formatInstant('Sep 6, 2026 · 00:20 UTC')).toBe('Sep 5, 2026, 8:20 PM');
  expect(formatInstant('2026-01-06T00:20:00Z')).toBe('Jan 5, 2026, 7:20 PM');
  expect(formatInstant('11:00 – 12:00')).toBe('11:00 – 12:00');
});
