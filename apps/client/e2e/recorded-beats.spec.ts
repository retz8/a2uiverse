/**
 * One picture per recorded beat (task-21.11 decision 10): each of `recordings/beats/` replayed
 * through the whole canvas, a chained beat after the beat it was recorded from, and taken once it
 * has settled. Driven off `?beat=<n>&instant`, zero LLM, the clock fixed so a time a fragment draws
 * reads the same on every run. The pictures are what the converted recordings must still draw.
 */
import {readdirSync, readFileSync} from 'node:fs';
import {test, expect} from '@playwright/test';
import {WORLD_TIME} from './trusted-page';

interface Recorded {
  name: string;
  beat: number;
  title: string;
  chainedFrom: string | null;
}

const folder = new URL('../recordings/beats/', import.meta.url);
const recorded: Recorded[] = readdirSync(folder)
  .filter(file => file.endsWith('.json'))
  .map(file => JSON.parse(readFileSync(new URL(file, folder), 'utf8')) as Recorded)
  .sort((a, b) => a.beat - b.beat);

/** The beats to replay for `beat`: the chain it was recorded in, oldest first. */
function chainOf(beat: Recorded): number[] {
  const parent = recorded.find(other => other.name === beat.chainedFrom);
  return parent ? [...chainOf(parent), beat.beat] : [beat.beat];
}

for (const beat of recorded) {
  test(`beat ${beat.beat}: ${beat.title}`, async ({page}) => {
    await page.clock.setFixedTime(WORLD_TIME);
    await page.goto(`/?beat=${chainOf(beat).join(',')}&instant`);
    // Settled is the replay done: beat 25 ends on its only canvas closed, the stage gone.
    await expect(page.locator('main[data-replay="done"]')).toBeAttached({timeout: 30_000});
    await page.mouse.move(0, 0);
    await expect(page).toHaveScreenshot(`recorded-beat-${beat.beat}.png`, {fullPage: true});
  });
}
