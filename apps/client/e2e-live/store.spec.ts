/**
 * The Store, live (task-14.10 decision 5): Shop A, published by the dev publisher and installed by
 * the launcher, uninstalled from the App Library; found by search with its publisher's name and its
 * sample drawn live; the publisher's name followed to that publisher's apps; installed through the
 * consent card; composed in the same session without a reload. It ends installed, as it began.
 */
import {expect, test} from '@playwright/test';
import {ensureInstalled, waitInstalled} from './orchestrator';

const QUESTION = 'What cameras does Shop A have?';

test.beforeAll(async () => {
  await waitInstalled(['github', 'gmail', 'shop-a']);
});

test.afterAll(async () => {
  await ensureInstalled('shop-a');
});

test('Shop A uninstalled, found in the Store, installed and composed without a reload', async ({
  page,
}) => {
  // Uninstall asks once, then the app is gone from the App Library.
  await page.goto('/?page=library&app=shop-a');
  const overlay = page.getByTestId('trusted-page-overlay');
  const view = overlay.getByTestId('library-app-view');
  await expect(view).toContainText('Shop A');
  await view.getByRole('button', {name: 'Uninstall Shop A'}).click();
  const asked = page.getByTestId('library-uninstall');
  await asked.getByRole('button', {name: 'Uninstall', exact: true}).click();
  await expect(overlay.getByTestId('library-uninstalled')).toContainText('Shop A');
  await expect(overlay.locator('[data-testid="library-row"][data-app="shop-a"]')).toHaveCount(0);

  // The Store, searched: Shop A with its publisher's name, and Install in place of its state.
  await overlay.getByRole('link', {name: 'Store', exact: true}).click();
  const search = overlay.getByRole('searchbox', {name: 'Search the Store'});
  await search.fill('camera dealer');
  await search.press('Enter');
  await expect(page).toHaveURL(/[?&]page=store&q=camera\+dealer/);
  const row = overlay.locator('[data-testid="store-row"][data-app="shop-a"]');
  await expect(row).toContainText('by a2uiverse-apps');
  await expect(row.getByRole('button', {name: 'Install Shop A'})).toBeVisible();

  // The publisher's name leads to that publisher's apps: the three the launcher published, not
  // Shop B, which it left for the publisher the Publish story claims.
  await row.getByRole('link', {name: 'a2uiverse-apps'}).click();
  await expect(page).toHaveURL(/[?&]publisher=a2uiverse-apps/);
  const rows = overlay.getByTestId('store-row');
  await expect(rows).toHaveCount(3);
  for (const app of ['github', 'gmail', 'shop-a']) {
    await expect(overlay.locator(`[data-testid="store-row"][data-app="${app}"]`)).toBeVisible();
  }

  // Shop A's view: its sample drawn live from the marketplace's builds.
  await overlay
    .locator('[data-testid="store-row"][data-app="shop-a"]')
    .getByRole('link', {name: 'Shop A'})
    .click();
  const appView = overlay.getByTestId('store-app-view');
  await expect(appView.getByTestId('store-sample')).toHaveAttribute('data-status', 'ready', {
    timeout: 60_000,
  });

  // Install asks first; then the page stays, saying it is installed.
  await appView.getByRole('button', {name: 'Install Shop A'}).click();
  const consent = page.getByTestId('consent-card');
  await consent.getByRole('button', {name: 'Install', exact: true}).click();
  await expect(appView.getByTestId('store-done')).toContainText('Shop A is installed.', {
    timeout: 60_000,
  });

  // Composed in the same session: the page closed to the canvas, the question asked. A mark left
  // on the window before shows nothing reloaded.
  await page.evaluate(() => Object.assign(window, {e2eSession: true}));
  await overlay.getByRole('button', {name: 'Close, back to your canvas'}).click();
  await expect(overlay).toHaveCount(0);
  const ask = page.getByLabel('Ask the agent');
  await ask.fill(QUESTION);
  await ask.press('Enter');
  await expect(page.locator('[data-a2ui-fragment="shop-a"]').first()).toBeVisible({
    timeout: 180_000,
  });
  expect(await page.evaluate(() => 'e2eSession' in window)).toBe(true);
});
