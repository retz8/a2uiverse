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

/**
 * The one baseline showing what three real agents produced rather than what we hand-built, so
 * it is the picture to look at when something drifts. Beats 1–3 are one-slot compositions of a
 * single vendor; this is the fan-out.
 */
test('beat 4: composed fan-out across three design systems', async ({browser}) => {
  // The stage scrolls its own content, so `fullPage` cannot reach past the first fragment at
  // the standard viewport — the picture would show Gmail alone and claim to be a fan-out. A
  // viewport tall enough to hold all three is what makes the baseline mean what it says.
  const page = await browser.newPage({viewport: {width: 1024, height: 2400}});
  await settle(page, '4');

  // Guard the claim the picture is meant to carry, so a diff is never the only signal.
  await expect(page.getByTestId('canvas-stage-content')).toHaveAttribute('data-slots', '3');
  for (const source of ['gmail', 'calendar', 'github']) {
    await expect(page.locator(`[data-a2ui-fragment="${source}"]`)).toHaveCount(1);
  }

  await expect(page).toHaveScreenshot('canvas-surface-beat-4.png', surfaceShot(page));
  await page.close();
});
