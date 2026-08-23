/**
 * Canvas chrome baselines: the floating/full-width furniture composed over a replayed stage —
 * live Back button, the parked banner, and the open history list. Driven off the beat replay
 * path with two synthetic paints (`?beat=plain,plain-2&instant`), zero LLM. The stage content
 * and the "data as of" clock are masked: the capture time is per-run, so its pixels would rot
 * the baselines — the chrome is what these guard.
 */
import {test, expect} from '@playwright/test';
import type {Page} from '@playwright/test';

const chromeShot = (page: Page) => ({
  mask: [page.getByTestId('canvas-stage-content'), page.locator('.canvas-history-stale')],
});

/** Replay two beats instantly so a departed paint exists to park on. */
async function settleTwoBeats(page: Page) {
  await page.goto('/?beat=plain,plain-2&instant');
  await expect(page.getByTestId('canvas-pending')).toBeHidden({timeout: 20_000});
  await expect(page.getByTestId('canvas-stage')).not.toBeEmpty();
}

test('live: Back floats top-left over the stage', async ({page}) => {
  await settleTwoBeats(page);
  await expect(page.getByRole('button', {name: 'Back'})).toBeEnabled();
  await expect(page).toHaveScreenshot('canvas-chrome-live.png', chromeShot(page));
});

test('parked: the banner materialises around Back', async ({page}) => {
  await settleTwoBeats(page);
  await page.getByRole('button', {name: 'Back'}).click();
  await expect(page.getByText(/past view/i)).toBeVisible();
  await expect(page.getByTestId('canvas-parked-stage')).not.toBeEmpty();
  await expect(page).toHaveScreenshot('canvas-chrome-parked.png', chromeShot(page));
});

test('history list: right-click on Back opens the titled entries', async ({page}) => {
  await settleTwoBeats(page);
  await page.getByRole('button', {name: 'Back'}).click({button: 'right'});
  const menu = page.getByRole('menu');
  await expect(menu).toBeVisible();
  // Element shot: the full-page mask would cover the menu where it overlaps the stage box,
  // and the menu's own pixels (titles from fixed beat prompts) are deterministic unmasked.
  await expect(menu).toHaveScreenshot('canvas-chrome-list.png');
});
