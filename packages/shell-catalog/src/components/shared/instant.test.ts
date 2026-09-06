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

test('a range reads as its start; a zone-less value is local time', () => {
  expect(parseInstant('2026-09-06 10:00 – 11:30')).toBe(new Date(2026, 8, 6, 10, 0).getTime());
  expect(parseInstant('2026-09-06T10:00')).toBe(new Date(2026, 8, 6, 10, 0).getTime());
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

test('formatInstant renders one human form for any spelling, and leaves what it cannot read as is', () => {
  const t = Date.UTC(2026, 8, 6, 0, 20);
  const expected = new Intl.DateTimeFormat(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(t));
  expect(formatInstant('2026-09-06T00:20:00Z')).toBe(expected);
  expect(formatInstant('Sep 6, 2026 · 00:20 UTC')).toBe(expected);
  expect(formatInstant('11:00 – 12:00')).toBe('11:00 – 12:00');
});
