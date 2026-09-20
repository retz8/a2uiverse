/**
 * The join's states in a real browser (task-7.9 decisions 1, 6), driven by the synthetic join
 * beat: a list of offers inside every row under one sort declaration, one row's offers held by a
 * fact and the other's by judgment, and — the beat's second turn — a storefront repaint that
 * changes a matched title, so the values it cut off are drawn broken.
 */
import {test, expect} from '@playwright/test';
import type {Page} from '@playwright/test';

const VIEW = '[data-shell-content][data-surface="shell:synthesis"]';

async function settle(page: Page) {
  await page.goto('/?beat=join&instant');
  await expect(page.locator('main[data-replay="done"]')).toBeAttached({timeout: 30_000});
  await expect(page.locator(VIEW)).toBeVisible();
}

const row = (page: Page, camera: string) => page.locator(`${VIEW} tbody tr`, {hasText: camera});

/**
 * The offers of a row, as painted: the third column's derived values, title then price, without
 * the join marks a guessed or broken value carries beside its text.
 */
const offers = async (page: Page, camera: string) =>
  (await row(page, camera).locator('td:nth-child(3) [data-state]').allTextContents()).map(text =>
    text.replace(/[⚠?]$/u, ''),
  );

test('a repaint that changes a matched field draws the values it cut off broken', async ({
  page,
}) => {
  await settle(page);

  const lumen = row(page, 'Lumen X100').locator('td:nth-child(3)');
  // The retitled offer's two values; its sibling, held by a fact that still holds, carries none.
  await expect(lumen.locator('[data-join="broken"]')).toHaveCount(2);
  await expect(lumen.locator('[data-join="broken"]').first()).toContainText(
    'Northlight Classic 100',
  );
  await expect(lumen.locator('[data-join="guessed"]')).toHaveCount(0);
  // Judgment never breaks: the other row's offers stay guessed.
  const verity = row(page, 'Verity A7').locator('td:nth-child(3)');
  await expect(verity.locator('[data-join="guessed"]')).toHaveCount(4);
  await expect(verity.locator('[data-join="broken"]')).toHaveCount(0);

  // The detail says what no longer matches, with both values.
  await lumen.locator('[data-join="broken"]').first().hover();
  await expect(page.getByText(/title names the camera/)).toBeVisible();
  await expect(page.getByText(/“Lumen X100”/)).toBeVisible();
});

test('one sort control orders the list inside every row', async ({page}) => {
  await settle(page);

  expect(await offers(page, 'Lumen X100')).toEqual([
    'Northlight Classic 100',
    '1,349',
    'Lumen X100 kit',
    '1,499',
  ]);
  expect(await offers(page, 'Verity A7')).toEqual([
    'Verity A7 body',
    '1,799',
    'Verity A7 with 35mm lens',
    '2,199',
  ]);

  // The second control is the offers': one declaration, `/rows/*/offers`.
  const control = page.locator(VIEW).getByLabel('Sort by').nth(1);
  await expect(control).toContainText('Offer price');
  await page.locator(VIEW).getByLabel('Ascending — switch to descending').nth(1).click();

  expect(await offers(page, 'Lumen X100')).toEqual([
    'Lumen X100 kit',
    '1,499',
    'Northlight Classic 100',
    '1,349',
  ]);
  expect(await offers(page, 'Verity A7')).toEqual([
    'Verity A7 with 35mm lens',
    '2,199',
    'Verity A7 body',
    '1,799',
  ]);
  // The rows themselves did not move.
  await expect(page.locator(`${VIEW} tbody tr td:first-child [data-state]`)).toHaveText([
    'Lumen X100',
    'Verity A7',
  ]);
});
