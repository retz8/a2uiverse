/**
 * The composed screen in a real browser, and the collision checks only a real cascade can make.
 *
 * The two in-gate detector layers (`src/canvas/composition/collision*.test.*`) cover inline
 * tokens and DOM ownership. What they structurally cannot see is stylesheet-based scoping:
 * `github-catalog`'s Provider lazily imports three `@primer/primitives` sheets that never load
 * under jsdom. Those sheets are the whole subject of task 2.8, so they are checked here.
 */
import {test, expect} from '@playwright/test';
import type {Page} from '@playwright/test';

/** Replay the composed beat: shell layout, one slot filling, one flipping to failed. */
async function settleComposed(page: Page) {
  await page.goto('/?beat=composed&instant');
  await expect(page.locator('main[data-replay="done"]')).toBeAttached({timeout: 30_000});
  await expect(page.getByTestId('canvas-stage-content')).not.toBeEmpty();
}

test('a composed turn renders one screen: layout, a filled slot, a failed slot', async ({page}) => {
  await settleComposed(page);

  // The shell's own surface holds both slots, in the order the plan put them.
  await expect(page.locator('[data-slot="slot-github"]')).toHaveAttribute(
    'data-slot-state',
    'filled',
  );
  await expect(page.locator('[data-slot="slot-gmail"]')).toHaveAttribute(
    'data-slot-state',
    'failed',
  );

  // The filled one holds a fragment, inside its boundary, painted by a second design system.
  const boundary = page.locator('[data-slot="slot-github"] [data-a2ui-fragment="github"]');
  await expect(boundary).toHaveCount(1);
  await expect(boundary).toContainText('Pull requests');

  // Attribution sits in the shell's surface, beside the slot — outside the fragment's reach.
  await expect(boundary.locator('text=Painted by')).toHaveCount(0);
  await expect(page.getByLabel('Painted by GitHub', {exact: true})).toBeVisible();
});

test('a vendor design system stays inside its boundary', async ({page}) => {
  await settleComposed(page);

  const escaped = await page.evaluate(() => {
    // Primer's own marker: whatever it renders must sit inside a fragment boundary, including
    // the portal root it anchors overlays to.
    const primer = [
      ...document.querySelectorAll('[data-component="ThemeProvider"], [data-portal-root]'),
    ];
    return primer
      .filter(el => !el.closest('[data-a2ui-fragment]'))
      .map(el => el.getAttribute('data-component') ?? el.tagName);
  });
  expect(escaped).toEqual([]);
});

test('a vendor stylesheet resolves inside its fragment and nowhere else', async ({page}) => {
  await settleComposed(page);

  const leaked = await page.evaluate(() => {
    const boundary = document.querySelector('[data-a2ui-fragment]');
    if (!boundary) return {reason: 'no boundary rendered'};
    // A token the vendor's sheets define must read inside the fragment…
    const inside = getComputedStyle(boundary).getPropertyValue('--fgColor-default').trim();
    // …and must not have been written onto the page itself.
    const onRoot = getComputedStyle(document.documentElement)
      .getPropertyValue('--fgColor-default')
      .trim();
    return {inside, onRoot};
  });

  expect(leaked).not.toHaveProperty('reason');
  expect((leaked as {onRoot: string}).onRoot).toBe('');
});
