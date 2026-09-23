/** The reader's presses in flight on a composition: what the merge waits on (task-8.10). */
import {describe, expect, test} from 'vitest';
import {Presses} from '../src/composition/presses.js';

describe('presses', () => {
  test('quiet waits for every press on a source it watches, and says how long each held it', async () => {
    const presses = new Presses();
    presses.begin('github');
    presses.begin('github');
    let quiet = false;
    const waits = presses.quiet(() => new Set(['github'])).then(w => ((quiet = true), w));

    presses.end('github');
    await new Promise(resolve => setTimeout(resolve, 0));
    expect(quiet).toBe(false);

    presses.end('github');
    expect(await waits).toEqual([{appId: 'github', ms: expect.any(Number)}]);
  });

  test('a press on a source it does not watch holds nothing', async () => {
    const presses = new Presses();
    presses.begin('calendar');
    expect(await presses.quiet(() => new Set(['github']))).toEqual([]);
  });

  test('an abort ends the wait', async () => {
    const presses = new Presses();
    presses.begin('github');
    const controller = new AbortController();
    const waits = presses.quiet(() => new Set(['github']), controller.signal);
    controller.abort();
    expect(await waits).toEqual([]);
  });
});
