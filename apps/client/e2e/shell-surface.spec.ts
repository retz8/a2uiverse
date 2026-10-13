/**
 * The shell's own surface in a real browser (task 6.5): a platform answer bound to the data
 * model the hub sent, and a capability gap whose tile opens the Store over the canvas.
 */
import {test, expect} from '@playwright/test';
import type {Page} from '@playwright/test';
import {storeUnreached} from './trusted-page';

async function settle(page: Page, beat: string) {
  await page.goto(`/?beat=${beat}&instant`);
  await expect(page.locator('main[data-replay="done"]')).toBeAttached({timeout: 30_000});
  await expect(page.getByTestId('canvas-stage-content')).not.toBeEmpty();
}

test('a platform answer renders the rows of its literal data model', async ({page}) => {
  await settle(page, 'platform-answer');
  const stage = page.getByTestId('canvas-stage-content');
  await expect(stage).toContainText('Three apps are installed.');
  await expect(stage.getByRole('row')).toHaveCount(4); // the heading row and three apps
  await expect(stage).toContainText('Events, RSVPs, scheduling');
  // The shell's own content carries no attribution and no fragment boundary.
  await expect(page.locator('[data-a2ui-fragment]')).toHaveCount(0);
  await expect(page.locator('[data-attribution]')).toHaveCount(0);
});

test('the capability tile opens the Store over the canvas, the gap as its query', async ({
  page,
}) => {
  await settle(page, 'gap');
  const tile = page.locator('[data-slot-gap="flight booking"]');
  await expect(tile).toHaveAttribute('data-slot-state', 'gap');
  await expect(tile).not.toContainText('flight booking'); // no model wording, no gap wording

  await tile.getByRole('button', {name: 'Search the Store'}).click();
  const overlay = page.getByTestId('trusted-page-overlay');
  await expect(overlay).toHaveAttribute('data-page', 'store');
  await expect(overlay).toHaveAttribute('data-query', 'flight booking');
  await expect(overlay.getByRole('searchbox', {name: 'Search the Store'})).toHaveValue(
    'flight booking',
  );
  // The canvas stays mounted beneath: the composition that raised the gap is still there.
  await expect(tile).toBeAttached();

  await overlay.getByRole('button', {name: 'Close, back to your canvas'}).click();
  await expect(overlay).toHaveCount(0);
  await expect(tile).toBeVisible();
});

test('the page lives in the address: browser Back closes it to the canvas beneath, a reload lands on it', async ({
  page,
}) => {
  await settle(page, 'gap');
  const tile = page.locator('[data-slot-gap="flight booking"]');
  await tile.getByRole('button', {name: 'Search the Store'}).click();
  const overlay = page.getByTestId('trusted-page-overlay');
  await expect(overlay).toHaveAttribute('data-page', 'store');
  await expect(page).toHaveURL(/[?&]page=store&q=flight\+booking/);

  await page.goBack();
  await expect(overlay).toHaveCount(0);
  await expect(tile).toBeVisible();

  await page.goto('/?page=library&app=gmail');
  await expect(overlay).toHaveAttribute('data-page', 'appLibrary');
  await expect(overlay).toHaveAttribute('data-app', 'gmail');
});

test('the entry point beneath Trail opens the page; Publish is a mode at the header’s right', async ({
  page,
}) => {
  await settle(page, 'platform-answer');
  await page.getByRole('button', {name: 'Apps', exact: true}).click();
  const overlay = page.getByTestId('trusted-page-overlay');
  await expect(overlay).toHaveAttribute('data-page', 'store');
  await overlay.getByRole('link', {name: 'Publish'}).click();
  await expect(overlay).toHaveAttribute('data-page', 'publish');
  await expect(overlay.getByRole('link', {name: 'Publish'})).toHaveAttribute(
    'aria-current',
    'page',
  );
});

test('visual: a platform answer', async ({page}) => {
  await settle(page, 'platform-answer');
  await expect(page).toHaveScreenshot('shell-surface-platform-answer.png', {fullPage: true});
});

test('visual: the capability tile', async ({page}) => {
  await settle(page, 'gap');
  await expect(page).toHaveScreenshot('shell-surface-gap.png', {fullPage: true});
});

test('visual: the Store over the canvas', async ({page}) => {
  // The Store that can't be reached, a state of its own (task-14.10 decision 16): the fixed world
  // answers the Store's reads, so this test refuses them.
  await storeUnreached(page);
  await settle(page, 'gap');
  await page.getByRole('button', {name: 'Search the Store'}).click();
  await expect(page.getByTestId('trusted-page-overlay')).toBeVisible();
  await expect(page.getByTestId('store-unreached')).toBeVisible();
  await expect(page).toHaveScreenshot('shell-surface-store-overlay.png', {fullPage: true});
});
