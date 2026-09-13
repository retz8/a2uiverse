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

  // Guard the claim the picture is meant to carry, so a diff is never the only signal. Three
  // vendor slots; since Phase 6 the Planner may also reserve the merged view for this prompt.
  await expect(page.getByTestId('canvas-stage-content')).toHaveAttribute('data-slots', /^[34]$/);
  for (const source of ['gmail', 'calendar', 'github']) {
    await expect(page.locator(`[data-a2ui-fragment="${source}"]`)).toHaveCount(1);
  }

  await expect(page).toHaveScreenshot('canvas-surface-beat-4.png', surfaceShot(page));
  await page.close();
});

/**
 * The temporal merge (task 5.7 decision 11): three real vendors and the Synthesizer's merged
 * view, recorded through the hub. A replay smoke, not a baseline — the merged view is one
 * model's authoring on one day, and its picture would move with every re-recording.
 */
test('beat 5: the temporal merge replays with its merged view as shell content', async ({page}) => {
  await settle(page, '5');
  await expect(page.getByTestId('canvas-stage-content')).toHaveAttribute('data-slots', '4');
  for (const source of ['gmail', 'calendar', 'github']) {
    await expect(page.locator(`[data-a2ui-fragment="${source}"]`)).toHaveCount(1);
  }
  const view = page.locator('[data-shell-content][data-surface^="shell:"]');
  await expect(view).toHaveCount(1);
  await expect(view.locator('[data-state="complete"]').first()).toBeVisible();
  await expect(view.getByLabel('Sort by')).toBeVisible();
});

/**
 * The shell as an agent (Phase 6), recorded through the hub. Replay smokes, not baselines: the
 * platform answer is one model's wording on one day. What holds across recordings is the shape —
 * the answer is bound to the data model the hub sent, no vendor painted, and the gap is the tile.
 */
test('beat 6: a platform answer renders from its literal data model, no vendor dispatched', async ({
  page,
}) => {
  await settle(page, '6');
  const stage = page.getByTestId('canvas-stage-content');
  await expect(page.locator('[data-a2ui-fragment]')).toHaveCount(0);
  await expect(page.locator('[data-attribution]')).toHaveCount(0);
  // The three installed apps, each a row bound through the template over `/apps`.
  for (const app of ['GitHub', 'Gmail', 'Google Calendar']) {
    await expect(stage.getByRole('row').filter({hasText: app})).toHaveCount(1);
  }
});

test('beat 7: a capability gap is the tile, and the tile opens the Store with the gap', async ({
  page,
}) => {
  await settle(page, '7');
  await expect(page.locator('[data-a2ui-fragment]')).toHaveCount(0);
  const tile = page.locator('[data-slot-state="gap"]');
  await expect(tile).toHaveCount(1);
  const gap = await tile.getAttribute('data-slot-gap');
  expect(gap).toBeTruthy();
  await tile.getByRole('button', {name: 'Search the Store'}).click();
  const overlay = page.getByTestId('trusted-page-overlay');
  await expect(overlay).toHaveAttribute('data-page', 'store');
  await expect(overlay).toHaveAttribute('data-query', gap!);
});
