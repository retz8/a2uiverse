/**
 * Surface baselines: the recorded beats painted through the full canvas, stage unmasked — the
 * Primer-rendered vendor fragment is the subject. Driven off `?beat=<n>&instant`, zero LLM.
 * Only the "data as of" clock is masked (its pixels are per-run). The chrome spec keeps
 * guarding the shell over synthetic paints; this one guards what a recorded vendor paint looks
 * like, which is what a catalog-package swap would change.
 */
import {test, expect} from '@playwright/test';
import type {Page} from '@playwright/test';

const surfaceShot = (page: Page) => ({
  mask: [page.locator('.canvas-history-stale')],
  fullPage: true,
});

/** Replay the listed beats instantly and wait for the whole list to settle. */
async function settle(page: Page, beats: string) {
  await page.goto(`/?beat=${beats}&instant`);
  await expect(page.locator('main[data-replay="done"]')).toBeAttached({timeout: 30_000});
  await expect(page.getByTestId('canvas-stage-content')).not.toBeEmpty();
}

test('beat 1: PR list', async ({page}) => {
  await settle(page, '1');
  await expect(page).toHaveScreenshot('canvas-surface-beat-1.png', surfaceShot(page));
});

test('beat 2: PR detail', async ({page}) => {
  await settle(page, '2');
  await expect(page).toHaveScreenshot('canvas-surface-beat-2.png', surfaceShot(page));
});

test('beat 3: review compose, chained after beat 2', async ({page}) => {
  await settle(page, '2,3');
  await expect(page).toHaveScreenshot('canvas-surface-beat-3.png', surfaceShot(page));
});
