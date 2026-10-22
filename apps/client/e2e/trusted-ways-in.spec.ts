/**
 * The trusted page's ways in (task-14.10 decisions 13, 16): one baseline per Ways-in board of the
 * UI reference canvas — the entry point in the gutter, the Planner's buttons from recorded beats 28
 * and 29, the nothing-to-offer line — each pressed and checked to land where it says: the Store on
 * the gap's words, the App Library, Publish, or the App Library at the app the answer names (beat
 * 30). The offer's two ways into the Store, More in the Store and an offered app's name, are checked
 * on beat 31 (task-15.10 decision 8). The canvas is the replayed beat; the page lands over it on
 * the fixed world.
 */
import {test, expect, type Page} from '@playwright/test';
import {offerSlot, replayByHand, uninstalled} from './store-loop';
import {BOARD} from './trusted-page';

test.use({viewport: BOARD});

async function settle(page: Page, beat: string) {
  await page.goto(`/?beat=${beat}&instant`);
  await expect(page.locator('main[data-replay="done"]')).toBeAttached({timeout: 30_000});
  await expect(page.getByTestId('canvas-stage-content')).not.toBeEmpty();
}

const overlay = (page: Page) => page.getByTestId('trusted-page-overlay');

test('G1 · the entry point beside Back and Trail opens the Store the first time', async ({
  page,
}) => {
  await settle(page, 'platform-answer');
  await expect(page.getByRole('button', {name: 'Back', exact: true})).toBeVisible();
  await expect(page.getByRole('button', {name: 'Trail', exact: true})).toBeVisible();
  const apps = page.getByRole('button', {name: 'Apps', exact: true});
  await expect(apps).toHaveAttribute('title', 'Apps: Store, App Library and Publish');
  await apps.hover();
  await expect(page).toHaveScreenshot('ways-in-g1-entry-point.png');

  await apps.click();
  await expect(overlay(page)).toHaveAttribute('data-page', 'store');
  await expect(page.getByTestId('store-label')).toContainText('All apps · 7');
  // Closed and opened again: the destination last open.
  await overlay(page).getByRole('link', {name: 'App Library'}).click();
  await expect(overlay(page)).toHaveAttribute('data-page', 'appLibrary');
  await overlay(page).getByRole('button', {name: 'Close, back to your canvas'}).click();
  await expect(overlay(page)).toHaveCount(0);
  await apps.click();
  await expect(overlay(page)).toHaveAttribute('data-page', 'appLibrary');
});

test('G2 · the Planner’s button lands on the App Library', async ({page}) => {
  await settle(page, '28');
  const stage = page.getByTestId('canvas-stage-content');
  await expect(stage).toContainText('All of your apps are up to date — checked just now.');
  const button = stage.getByRole('button', {name: 'Open the App Library'});
  await expect(button).toBeVisible();
  await expect(page).toHaveScreenshot('ways-in-g2-out-of-date.png');

  await button.click();
  await expect(overlay(page)).toHaveAttribute('data-page', 'appLibrary');
  await expect(overlay(page)).not.toHaveAttribute('data-app');
  await expect(page.getByTestId('library-label')).toContainText('Your apps · 6');
  await expect(page).toHaveURL(/[?&]page=library(&|$)/);
});

test('G3 · the Planner’s button lands on Publish', async ({page}) => {
  await settle(page, '29');
  const stage = page.getByTestId('canvas-stage-content');
  await expect(stage).toContainText('Pack your app with Stellify in its own folder.');
  const button = stage.getByRole('button', {name: 'Open Publish'});
  await expect(button).toBeVisible();
  await expect(page).toHaveScreenshot('ways-in-g3-publish-question.png');

  await button.click();
  await expect(overlay(page)).toHaveAttribute('data-page', 'publish');
  await expect(page.getByTestId('publish-bar')).toContainText('Publishing as a2uiverse-apps');
  await expect(page).toHaveURL(/[?&]page=publish(&|$)/);
});

test('G4 · the nothing-to-offer line opens the Store on the gap’s words', async ({page}) => {
  await settle(page, 'gap');
  const tile = page.locator('[data-slot-gap="flight booking"]');
  await expect(tile.getByRole('button', {name: 'Search the Store'})).toBeVisible();
  await expect(page).toHaveScreenshot('ways-in-g4-nothing-to-offer.png');

  await tile.getByRole('button', {name: 'Search the Store'}).click();
  await expect(overlay(page)).toHaveAttribute('data-page', 'store');
  await expect(overlay(page)).toHaveAttribute('data-query', 'flight booking');
  await expect(page.getByRole('searchbox', {name: 'Search the Store'})).toHaveValue(
    'flight booking',
  );
  await expect(page.getByTestId('store-empty')).toContainText('No apps match “flight booking”.');
});

/** Beat 31's offer of Shop B beside Shop A, its presses left to the reader, Shop B uninstalled. */
async function offerOfShopB(page: Page) {
  await uninstalled(page, ['shop-b']);
  await replayByHand(page, '31');
  return offerSlot(page, 'Shop B');
}

test('G5 · the offer’s More in the Store opens the Store on the gap’s words, tied to its slot', async ({
  page,
}) => {
  const offer = await offerOfShopB(page);
  await offer.getByRole('button', {name: 'More in the Store'}).click();
  await expect(overlay(page)).toHaveAttribute('data-page', 'store');
  await expect(overlay(page)).toHaveAttribute('data-query', 'Shop B');
  // The tie is never written into the address (task-15.9 decision 3).
  await expect(page).toHaveURL(/[?&]page=store&q=Shop\+B$/);
});

test('G6 · an offered app’s name opens its view in the Store', async ({page}) => {
  const offer = await offerOfShopB(page);
  await offer.getByRole('button', {name: 'Shop B', exact: true}).click();
  await expect(overlay(page)).toHaveAttribute('data-page', 'store');
  await expect(overlay(page)).toHaveAttribute('data-app', 'shop-b');
  await expect(page.getByTestId('store-app-view')).toHaveAttribute('data-app', 'shop-b');
});

test('beat 30: the Planner’s button lands on the App Library at the app it names', async ({
  page,
}) => {
  await settle(page, '30');
  const button = page
    .getByTestId('canvas-stage-content')
    .getByRole('button', {name: 'Open GitHub in App Library'});
  await button.click();
  await expect(overlay(page)).toHaveAttribute('data-page', 'appLibrary');
  await expect(overlay(page)).toHaveAttribute('data-app', 'github');
  const view = page.getByTestId('library-app-view');
  await expect(view).toHaveAttribute('data-app', 'github');
  await expect(view.getByRole('heading', {name: 'GitHub'})).toBeVisible();
  await expect(view.getByTestId('library-account')).toHaveCount(1);
  await expect(page).toHaveURL(/[?&]page=library&app=github(&|$)/);
});
