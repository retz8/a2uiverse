/**
 * The reserved merge slot (task 7.15), drawn to the design canvas's F2 (merging), F3 (landed) and
 * F8 (merging under a clipped paragraph) at their 1440×900: from plan time the merged view's slot
 * holds its planned column headers over four skeleton rows, the progress line joins the entity's
 * nouns, and the landed table keeps the skeleton's geometry. Driven off `?beat=`, zero LLM — the
 * merging states replay the entity-join recording with the merged view held back.
 */
import {test, expect} from '@playwright/test';
import type {Page} from '@playwright/test';

test.use({viewport: {width: 1440, height: 900}});

const SLOT = '[data-slot="shell"]';
const VENDORS = ['linear', 'github', 'circleci'];

/** A paced replay resting before the merge: every fragment filled, the merged view reserved. */
async function merging(page: Page, beat: string) {
  await page.goto(`/?beat=${beat}`);
  for (const source of VENDORS) {
    await expect(page.locator(`[data-slot="${source}"]`)).toHaveAttribute(
      'data-slot-state',
      'filled',
      {timeout: 30_000},
    );
  }
  await expect(page.locator(SLOT)).toHaveAttribute('data-slot-state', 'pending');
}

/** Heights of the heading row and of each body row of the first table under `root`. */
async function rowHeights(page: Page, root: string) {
  return page
    .locator(`${root} table`)
    .first()
    .evaluate(table => ({
      heading: [...table.querySelectorAll('thead tr')].map(r => r.getBoundingClientRect().height),
      body: [...table.querySelectorAll('tbody tr')].map(r => r.getBoundingClientRect().height),
    }));
}

test('merging: the planned headers over four skeleton rows, the join in the entity’s nouns', async ({
  page,
}) => {
  await merging(page, 'merging');
  const slot = page.locator(SLOT);
  await expect(slot).toHaveAttribute('aria-busy', 'true');
  await expect(slot.locator('thead th')).not.toHaveCount(0);
  await expect(slot.locator('tbody tr[data-skeleton-row]')).toHaveCount(4);
  expect(await rowHeights(page, SLOT)).toEqual({heading: [32], body: [40, 40, 40, 40]});
  await expect(page.getByTestId('canvas-pending')).toContainText(
    /^Joining Linear \S+ to GitHub \S+ and CircleCI \S+$/,
  );
  await expect(page).toHaveScreenshot('reserved-merge-merging.png');
});

test('landed: the table fills the slot in the skeleton’s geometry, no box around it', async ({
  page,
}) => {
  await page.goto('/?beat=9&instant');
  await expect(page.locator('main[data-replay="done"]')).toBeAttached({timeout: 30_000});
  const view = `${SLOT} [data-shell-content]`;
  await expect(page.locator(view)).toBeVisible();
  const {heading, body} = await rowHeights(page, view);
  expect(heading).toEqual([32]);
  expect(new Set(body)).toEqual(new Set([40]));
  const border = await page
    .locator(`${view} .rt-TableRoot`)
    .first()
    .evaluate(el => getComputedStyle(el).borderTopWidth);
  expect(border).toBe('0px');
  await expect(page.getByTestId('canvas-progress')).toContainText(
    /Joined Linear \S+ to GitHub \S+ and CircleCI \S+/,
  );
});

test('merging under a clipped paragraph: the same reserved slot below the four-line box', async ({
  page,
}) => {
  await merging(page, 'long-merging');
  await expect(page.getByTestId('canvas-question')).toHaveClass(/canvas-question--clipped/);
  await expect(page.locator(`${SLOT} tbody tr[data-skeleton-row]`)).toHaveCount(4);
  await expect(page).toHaveScreenshot('reserved-merge-long-merging.png');
});
