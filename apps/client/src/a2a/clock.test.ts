/**
 * The person's clock (task-12.13 decision 47): the local time with its offset and the IANA zone,
 * sent to the orchestrator on every message so it can tell each app what "now" is.
 */
import {describe, expect, it} from 'vitest';
import {readClock} from './clock';

describe('readClock', () => {
  it('reads the local time in RFC 3339 with its offset, the same instant, and the browser’s zone', () => {
    const at = new Date('2026-10-09T05:20:30.250Z');
    const clock = readClock(at);
    expect(clock.now).toMatch(/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d[+-]\d\d:\d\d$/);
    expect(Date.parse(clock.now)).toBe(Date.parse('2026-10-09T05:20:30Z'));
    expect(clock.timeZone).toBe(Intl.DateTimeFormat().resolvedOptions().timeZone);
  });
});
