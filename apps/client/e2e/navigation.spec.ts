/**
 * Navigation from a merged cell in a real browser (task-7.7 decision 13): scroll position,
 * keyboard focus and the ring's box need one. Driven by the synthetic navigation beat — the two
 * storefronts in their own catalogs under a merged view with a guessed join.
 */
import {test, expect} from '@playwright/test';
import type {Page} from '@playwright/test';

const VIEW = '[data-shell-content][data-surface="shell:synthesis"]';
const SHOP_A = '[data-a2ui-fragment="shop-a"]';
const SHOP_B = '[data-a2ui-fragment="shop-b"]';
const RING = '.canvas-landing-ring';

async function settle(page: Page, beats = 'navigation') {
  await page.goto(`/?beat=${beats}&instant`);
  await expect(page.locator('main[data-replay="done"]')).toBeAttached({timeout: 30_000});
}

/** The cell of a row, by the camera the row is for and its column. */
const cell = (page: Page, camera: string, column: number) =>
  page
    .locator(`${VIEW} tbody tr`, {hasText: camera})
    .locator(`td:nth-child(${column}) [role="button"], td:nth-child(${column}) button`)
    .first();

/**
 * The element the landing focused, once it has: focus waits for the scroll to end, so it is
 * polled for — inside the fragment, what it reads, and whether it sits in the viewport.
 */
async function focused(page: Page, fragment: string) {
  const read = () =>
    page.evaluate(selector => {
      const active = document.activeElement;
      const box = active?.getBoundingClientRect();
      return {
        inside: !!active?.closest(selector),
        text: active?.textContent ?? '',
        tabindex: active?.getAttribute('tabindex'),
        inViewport: !!box && box.top >= 0 && box.bottom <= window.innerHeight,
      };
    }, fragment);
  await expect.poll(async () => (await read()).inside, {timeout: 3000}).toBe(true);
  return read();
}

test('a tap lands on the value in the storefront: focus, the ring over its box, no request', async ({
  page,
}) => {
  await settle(page);
  const requests: string[] = [];
  page.on('request', request => requests.push(request.url()));

  await cell(page, 'Verity A7', 3).click();

  const landed = await focused(page, SHOP_B);
  expect(landed.inViewport).toBe(true);
  expect(landed.text).toContain('1799');
  expect(landed.tabindex).toBe('-1');

  const ring = page.locator(RING);
  await expect(ring).toHaveCount(1);
  const [ringBox, targetBox] = await Promise.all([
    ring.boundingBox(),
    page.evaluate(() => {
      const box = document.activeElement!.getBoundingClientRect();
      return {x: box.x, y: box.y, width: box.width, height: box.height};
    }),
  ]);
  expect(Math.abs(ringBox!.x - targetBox.x)).toBeLessThan(2);
  expect(Math.abs(ringBox!.y - targetBox.y)).toBeLessThan(2);
  // The ring is the shell's: outside every fragment.
  expect(await ring.evaluate(el => !!el.closest('[data-a2ui-fragment]'))).toBe(false);
  await expect(ring).toHaveCount(0, {timeout: 4000});

  expect(requests).toEqual([]);
});

test('a field the storefront does not render lands on its row', async ({page}) => {
  await settle(page);
  await cell(page, 'Verity A7', 4).click();
  const landed = await focused(page, SHOP_A);
  // The row: the camera's name and its price together, and no other camera's.
  expect(landed.text).toContain('Verity A7');
  expect(landed.text).toContain('1849');
  expect(landed.text).not.toContain('Lumen X100');
});

test('a join held by judgment alone is drawn guessed, and says what matched', async ({page}) => {
  await settle(page);
  const guessed = cell(page, 'Verity A7', 3);
  await expect(guessed).toHaveAttribute('data-join', 'guessed');
  await expect(cell(page, 'Lumen X100', 3)).not.toHaveAttribute('data-join', 'guessed');
  await guessed.hover();
  await expect(page.getByText(/same camera/)).toBeVisible();
});

test('navigation works on a parked composition', async ({page}) => {
  await settle(page, 'navigation,plain');
  await page.getByRole('button', {name: 'Back'}).click();
  await expect(page.getByTestId('canvas-parked-stage')).not.toBeEmpty();

  await cell(page, 'Lumen X100', 2).click();
  const landed = await focused(page, SHOP_A);
  expect(landed.text).toContain('1299');
  await expect(page.locator(RING)).toHaveCount(1);
});
