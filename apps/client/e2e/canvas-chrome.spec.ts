/**
 * Canvas chrome baselines (task 9.6, board F5): the gutter's Back and Trail over the live stage,
 * the band over a past canvas, and the open rail with every mark at once. Driven off the trail
 * beat (`?beat=trail&instant`) — four canvases: a root, a child, a branch, and the newest still
 * loading — zero LLM. The stage content and the clocks are masked: the fragments' pixels are the
 * surface spec's business, and the times are per-run.
 */
import {test, expect} from '@playwright/test';
import type {Page} from '@playwright/test';

const chromeShot = (page: Page) => ({
  mask: [
    page.getByTestId('canvas-stage-content'),
    page.locator('.canvas-progress'),
    page.locator('.canvas-trail-meta'),
    page.locator('.canvas-trail-from'),
    page.locator('.canvas-band-note'),
  ],
});

/** Replay the trail beat instantly: the newest canvas live and still loading. */
async function settleTrail(page: Page) {
  await page.goto('/?beat=trail&instant');
  await expect(page.locator('main[data-replay="done"]')).toBeAttached({timeout: 30_000});
  await expect(page.getByTestId('canvas-stage-content')).not.toBeEmpty();
}

test('live: Back and Trail in the gutter over the stage', async ({page}) => {
  await settleTrail(page);
  await expect(page.getByRole('button', {name: 'Back'})).toBeEnabled();
  await expect(page.getByRole('button', {name: 'Trail'})).toBeEnabled();
  await expect(page.getByTestId('canvas-band')).toHaveCount(0);
  await expect(page).toHaveScreenshot('canvas-chrome-live.png', chromeShot(page));
});

test('a past canvas: the band over the page, Ask from this view', async ({page}) => {
  await settleTrail(page);
  await page.getByRole('button', {name: 'Back'}).click();
  const band = page.getByTestId('canvas-band');
  await expect(band).toContainText('Parked');
  await expect(band).toContainText('asked at');
  await expect(band.getByRole('button', {name: 'Ask this again now'})).toBeVisible();
  await expect(band.getByRole('button', {name: /Return to live/})).toBeVisible();
  await expect(page.getByRole('button', {name: 'Ask from this view'})).toBeVisible();
  await expect(page).toHaveScreenshot('canvas-chrome-parked.png', chromeShot(page));
});

test('the rail: every mark at once, over the page', async ({page}) => {
  // Paced, so the newest canvas is still loading — its merge is held back — while the three
  // before it have landed; the rail is read as soon as all four are in it.
  await page.goto('/?beat=trail');
  await expect(page.getByRole('button', {name: 'Trail'})).toBeEnabled({timeout: 30_000});
  await page.getByRole('button', {name: 'Trail'}).click();
  await expect(page.getByTestId('canvas-trail-entry')).toHaveCount(4, {timeout: 30_000});
  await page.getByRole('button', {name: 'Close the trail'}).click();
  await page.getByRole('button', {name: 'Back'}).click();
  await expect(page.getByTestId('canvas-band')).toBeVisible();
  await page.getByRole('button', {name: 'Trail'}).click();
  const rail = page.getByRole('navigation', {name: 'Trail of past canvases'});
  await expect(rail).toBeVisible();
  const entries = page.getByTestId('canvas-trail-entry');
  await expect(entries).toHaveCount(4);
  // Newest first: the live one still loading, the branch marked from its parent, the viewed one.
  await expect(entries.nth(0)).toHaveAttribute('data-live', 'true');
  await expect(entries.nth(0)).toHaveAttribute('data-loading', 'true');
  await expect(entries.nth(1)).toHaveAttribute('data-branch', 'true');
  await expect(entries.nth(1).getByRole('img', {name: /Asked from/})).toBeVisible();
  await expect(entries.nth(1)).toHaveAttribute('data-viewing', 'true');
  // The viewed canvas's lineage in ink: its parent's node, and the line between them.
  await expect(page.locator('.canvas-trail-spine-line--lit')).toHaveCount(1);
  await expect(page.locator('.canvas-trail-spine-node--lit')).toHaveCount(1);
  // The newest is recorded beat 9's question, which carries no Planner title.
  await expect(entries.nth(0).getByTestId('canvas-trail-label')).toHaveText(/status of what/i);
  await expect(entries.nth(1).getByTestId('canvas-trail-label')).toHaveText(
    'Camera prices, both stores',
  );
  await expect(entries.nth(3).getByTestId('canvas-trail-label')).toHaveText(
    'Needs attention today',
  );
  // The rail is a drawer over the page: the band and the question stay where they were.
  const railBox = (await rail.boundingBox())!;
  const bandBox = (await page.getByTestId('canvas-band').boundingBox())!;
  expect(Math.round(bandBox.x)).toBe(56);
  expect(railBox.width).toBeGreaterThanOrEqual(272);
  await expect(page).toHaveScreenshot('canvas-chrome-rail.png', chromeShot(page));
});

test('hovering an entry shows its preview beside the rail', async ({page}) => {
  await settleTrail(page);
  await page.getByRole('button', {name: 'Trail'}).click();
  const entries = page.getByTestId('canvas-trail-entry');
  await entries.nth(3).getByRole('button').first().hover();
  const preview = page.getByTestId('canvas-trail-preview');
  await expect(preview).toBeVisible();
  await expect(preview).toHaveAttribute('aria-label', /Preview of Needs attention today/);
  const railBox = (await page
    .getByRole('navigation', {name: 'Trail of past canvases'})
    .boundingBox())!;
  const previewBox = (await preview.boundingBox())!;
  expect(previewBox.x).toBeGreaterThanOrEqual(railBox.x + railBox.width);
});
