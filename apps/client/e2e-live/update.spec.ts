/**
 * The update, live, is the quiet one (task-14.10 decision 6): a newer build of Shop A — its card
 * unchanged — published behind the page as the dev publisher; opening the App Library runs the
 * check, which installs it itself; the page shows Shop A up to date, and the next canvas loads the
 * new build.
 */
import {expect, test} from '@playwright/test';
import {installedBuild, waitInstalled} from './orchestrator';
import {newerBuild, pack, publishAsDevPublisher} from './packs';
import {MARKETPLACE, SHOP_A_CARD} from './stack';

const QUESTION = 'What cameras does Shop A have?';

test.beforeAll(async () => {
  await waitInstalled(['shop-a']);
});

test('a newer build of Shop A installs itself at the check, and the next canvas loads it', async ({
  page,
}) => {
  const stamp = String(Date.now());
  const packed = await pack('shop-a', 'shop-a-newer', newerBuild(stamp));
  await publishAsDevPublisher('shop-a', SHOP_A_CARD, packed);
  const entry = (await (await fetch(`${MARKETPLACE}/apps/shop-a/entry.json`)).json()) as {
    catalogs: Record<string, string>;
  };
  const [[catalogId, published]] = Object.entries(entry.catalogs);
  expect(await installedBuild(catalogId!)).not.toBe(published);

  // Entering the App Library runs the check: the newer build is installed, no press asked. Every
  // request the session makes is kept from here: the page may load the build as the check lands.
  const loaded: string[] = [];
  page.on('request', request => loaded.push(request.url()));
  await page.goto('/?page=library');
  const row = page.locator('[data-testid="library-row"][data-app="shop-a"]');
  await expect(row.getByTestId('library-state')).toHaveText('Up to date', {timeout: 60_000});
  await expect(row.getByRole('button', {name: 'Update Shop A'})).toHaveCount(0);
  expect(await installedBuild(catalogId!)).toBe(published);

  // The next canvas draws Shop A with the new build: its files fetched, its mark on the window.
  await page
    .getByTestId('trusted-page-overlay')
    .getByRole('button', {name: 'Close, back to your canvas'})
    .click();
  const ask = page.getByLabel('Ask the agent');
  await ask.fill(QUESTION);
  await ask.press('Enter');
  await expect(page.locator('[data-a2ui-fragment="shop-a"]').first()).toBeVisible({
    timeout: 180_000,
  });
  expect(loaded.some(url => url.includes(`/registry/artifacts/${published}/`))).toBe(true);
  expect(
    await page.evaluate(() => (globalThis as {__a2uiverseE2eBuild?: string}).__a2uiverseE2eBuild),
  ).toBe(stamp);
});
