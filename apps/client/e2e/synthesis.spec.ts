/**
 * The merged view in a real browser (task 5.7 decision 10): the synthesis region rendered as
 * shell content — no fragment boundary, no attribution tile (phase decision 22) — with its sort
 * control live and its palette the shell's. Driven by the synthetic synthesis beat, so the
 * baseline is the sdk's camera comparison and moves only when the rendering does.
 */
import {test, expect} from '@playwright/test';
import type {Page} from '@playwright/test';

const SLOT = '[data-slot="slot-shell"]';
const VIEW = '[data-shell-content][data-surface="shell:synthesis"]';

async function settleSynthesis(page: Page) {
  await page.goto('/?beat=synthesis&instant');
  await expect(page.locator('main[data-replay="done"]')).toBeAttached({timeout: 30_000});
  await expect(page.locator(VIEW)).toBeVisible();
}

test('the merged view is shell content: in its reserved slot, no boundary, no attribution', async ({
  page,
}) => {
  await settleSynthesis(page);

  await expect(page.locator(SLOT)).toHaveAttribute('data-slot-content', 'shell');
  await expect(page.locator(`${SLOT} ${VIEW}`)).toHaveCount(1);
  await expect(page.locator(`${VIEW} [data-a2ui-fragment]`)).toHaveCount(0);
  const boundaries = await page
    .locator(VIEW)
    .evaluate(el => (el.closest('.fragment-boundary, [data-a2ui-fragment]') ? 1 : 0));
  expect(boundaries).toBe(0);
  await expect(page.getByLabel('Painted by Synthesis', {exact: true})).toHaveCount(0);
  // The vendors keep theirs.
  await expect(page.getByLabel('Painted by Aperture & Co', {exact: true})).toBeVisible();

  // Every cell complete, through the derived-value component alone.
  await expect(page.locator(`${VIEW} table tbody tr`)).toHaveCount(2);
  await expect(page.locator(`${VIEW} [data-state="complete"]`)).toHaveCount(8);
  await expect(page.locator(`${VIEW} [data-marker]`)).toHaveCount(0);
});

test('the sort criterion is displayed and a change re-orders in place', async ({page}) => {
  await settleSynthesis(page);

  const names = () =>
    page.locator(`${VIEW} tbody tr td:first-child [data-state]`).allTextContents();
  const control = page.locator(VIEW).getByLabel('Sort by');
  await expect(control).toBeVisible();
  await expect(control).toContainText('Best price');
  expect(await names()).toEqual(['Lumen X100', 'Verity A7']);

  await page.locator(VIEW).getByLabel('Ascending — switch to descending').click();
  await expect(page.locator(VIEW).getByLabel('Descending — switch to ascending')).toBeVisible();
  expect(await names()).toEqual(['Verity A7', 'Lumen X100']);

  // A different key: by camera name, descending stays.
  await control.click();
  await page.getByRole('option', {name: 'Camera'}).click();
  await expect(control).toContainText('Camera');
  expect(await names()).toEqual(['Verity A7', 'Lumen X100']);
});

test('the merged view and the shell agree on one palette in dark mode', async ({browser}) => {
  const page = await browser.newPage({colorScheme: 'dark'});
  await settleSynthesis(page);
  const palette = await page.locator(VIEW).evaluate(el => ({
    panel: getComputedStyle(el).getPropertyValue('--color-panel-solid').trim(),
    color: getComputedStyle(el).color,
    body: getComputedStyle(document.body).backgroundColor,
  }));
  expect(palette.panel).not.toBe('');
  // Dark ground, light ink: the shell's appearance reached the view.
  expect(palette.body).not.toBe('rgb(255, 255, 255)');
  expect(palette.color).not.toBe('rgb(0, 0, 0)');
  await page.close();
});

test('visual: the merged view as shell content', async ({page}) => {
  await settleSynthesis(page);
  await expect(page).toHaveScreenshot('synthesis-merged.png', {fullPage: true});
});
