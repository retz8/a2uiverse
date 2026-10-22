/**
 * The update tile on the replay suite (task-15.10 decisions 5 and 6): one baseline per board of the
 * UI reference canvas's update tile, light theme, over the synthetic beats — the orchestrator's own
 * paint: Shop B on beat 31's canvas, installed but unable to paint in what it is installed with,
 * needing an update or the Store waiting on its publisher, its Update's Retry answered by beat 31's
 * recorded fill; and CircleCI's update that asks for more, then needs more access. Shop B is the
 * world's own forced update, so Update goes straight through, its version moving once installed.
 */
import {test, expect, type Page} from '@playwright/test';
import {answerInstalls, boardShot, replayByHand, uninstalled} from './store-loop';
import {BOARD, gate} from './trusted-page';

test.use({viewport: BOARD});

/** Shop B's slot on beat 31's canvas, by its source. */
const shopB = (page: Page) => page.locator('[data-slot="shop-b.1"]');

test('U1 · needs an update: one line under Shop B’s marker, with Update', async ({page}) => {
  await replayByHand(page, 'update-needed');
  const tile = shopB(page);
  await expect(tile).toHaveAttribute('data-slot-state', 'update');
  await expect(tile).toContainText('Shop B needs an update to show this.');
  await expect(tile.getByRole('button', {name: 'Update'})).toBeEnabled();
  await expect(page.getByTestId('canvas-progress')).toContainText('Shop B needs an update');
  await boardShot(page, 'update-tile-u1-needs-update.png');
});

test('U2 · the Store waiting on its publisher: the line names them, no press', async ({page}) => {
  await replayByHand(page, 'update-waiting');
  const tile = shopB(page);
  await expect(tile).toContainText(
    'Shop B has changed, and the Store is waiting on its publisher, a2uiverse-apps.',
  );
  await expect(tile.getByRole('button')).toHaveCount(0);
  await expect(page.getByTestId('canvas-progress')).toContainText(
    'Shop B waiting on its publisher',
  );
  await boardShot(page, 'update-tile-u2-waiting.png');
});

test('U3 · an update that asks for more: the Store’s update card over the slot, only what is new', async ({
  page,
}) => {
  const sent = await answerInstalls(page, {installed: new Set()}, [{ok: true}]);
  await replayByHand(page, 'update-asks-more');
  const tile = page.locator('[data-slot="circleci.1"]');
  await expect(tile).toContainText('CircleCI needs an update to show this.');
  await tile.getByRole('button', {name: 'Update'}).click();
  const consent = page.getByRole('dialog', {name: 'Update CircleCI?'});
  await expect(consent).toContainText('This version asks for more.');
  await expect(consent.locator('li')).toHaveText(['Rerun and cancel your workflows']);
  await boardShot(page, 'update-tile-u3-update-consent.png');

  await consent.getByRole('button', {name: 'Not now'}).click();
  await expect(consent).toHaveCount(0);
  expect(sent).toEqual([]);
});

test('U4 · updating, then a refusal on the line in the Store’s words, with the Store’s press', async ({
  page,
}) => {
  const world = await uninstalled(page, [], {'shop-b': '0.1.0'});
  const held = gate();
  await answerInstalls(
    page,
    world,
    [
      {ok: false, cause: 'app-unreached'},
      {ok: false, cause: 'store-behind'},
    ],
    n => (n === 0 ? held.opened : Promise.resolve()),
  );
  await replayByHand(page, 'update-needed');
  const tile = shopB(page);

  // Straight through: no card, the press reads Updating, the progress line Shop B updating.
  await tile.getByRole('button', {name: 'Update'}).click();
  await expect(tile).toContainText('Updating');
  await expect(tile.getByRole('button', {name: 'Update'})).toHaveCount(0);
  await expect(page.getByTestId('canvas-progress')).toContainText('Shop B updating');
  await boardShot(page, 'update-tile-u4-updating.png');
  held.open();

  // The app unreached: Try again, straight through.
  await expect(tile).toContainText('Shop B couldn’t be reached, so nothing changed.');
  await tile.getByRole('button', {name: 'Try again'}).click();

  // The Store behind the app: Update stays.
  await expect(tile).toContainText(
    'Shop B can’t be updated yet. Its publisher has changed the app, and the Store hasn’t caught up. Try again later.',
  );
  await expect(tile.getByRole('button', {name: 'Update'})).toBeEnabled();
});

test('U5 · after an update that asks for more: the account lacks it — needs more access', async ({
  page,
}) => {
  await answerInstalls(page, {installed: new Set()}, [{ok: true}]);
  await replayByHand(page, 'update-asks-more');
  const tile = page.locator('[data-slot="circleci.1"]');
  await tile.getByRole('button', {name: 'Update'}).click();
  await page
    .getByRole('dialog', {name: 'Update CircleCI?'})
    .getByRole('button', {name: 'Update'})
    .click();
  await expect(tile).toContainText('CircleCI needs more access to show it here.');
  await expect(tile).toContainText('Rerun and cancel your workflows');
  await expect(tile.getByRole('button', {name: 'Allow'})).toBeVisible();
  await boardShot(page, 'update-tile-u5-more-access.png');
});

test('U6 · the update landed from another slot: Update becomes Show it here; an uninstalled app keeps its failure tile', async ({
  page,
}) => {
  const world = await uninstalled(page, [], {'shop-b': '0.1.0'});
  await answerInstalls(page, world, [{ok: true}]);
  await replayByHand(page, 'update-needed,update-needed');
  const stage = page.getByTestId('canvas-stage-content');

  // Updated from the second canvas's slot, which fills.
  await shopB(page).getByRole('button', {name: 'Update'}).click();
  await expect(stage.getByRole('columnheader', {name: 'Shop B'})).toBeVisible();

  // The first canvas's slot turns, once, with no second consent.
  await page.getByRole('button', {name: 'Back', exact: true}).click();
  const tile = shopB(page);
  await expect(tile).toContainText('Updated');
  await expect(tile.getByRole('button', {name: 'Show it here'})).toBeEnabled();
  await boardShot(page, 'update-tile-u6-show-it-here.png');
  await tile.getByRole('button', {name: 'Show it here'}).click();
  await expect(stage.getByRole('columnheader', {name: 'Shop B'})).toBeVisible();

  // Uninstalled since: today's failure tile, Retry, no reinstall.
  await replayByHand(page, 'update-uninstalled');
  const gone = shopB(page);
  await expect(gone).toHaveAttribute('data-slot-state', 'failed');
  await expect(gone).toContainText('This app isn’t installed anymore.');
  await expect(gone.getByRole('button', {name: 'Retry'})).toBeVisible();
  await expect(gone.getByRole('button', {name: /Install|Update/})).toHaveCount(0);
});
