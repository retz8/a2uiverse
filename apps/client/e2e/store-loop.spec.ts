/**
 * The store loop's offer on the replay suite (task-15.10 decisions 5 to 7): one baseline per board
 * of the UI reference canvas *Store loop — UI reference* — the offer and the Store and other
 * canvases, light theme — over the recorded beats, their presses made by hand and answered by the
 * recording: beat 31, Shop B offered beside Shop A, through Install, its key and the fill; beat 32,
 * both shops offered; beat 33, the install ask; beat 7, nothing in the Store. A board drawing two
 * moments or several causes side by side is drawn at its first; the rest are checked on the page.
 */
import {test, expect, type Page} from '@playwright/test';
import {
  answerInstalls,
  boardShot,
  offerSlot,
  replayByHand,
  signInWindows,
  uninstalled,
  type InstallOutcome,
} from './store-loop';
import {BOARD, gate, samplesDrawn} from './trusted-page';

test.use({viewport: BOARD});

const SHOP_B_DESCRIPTION =
  'Northlight Cameras, a high-volume online retailer listing current stock with live pricing and next-day dispatch.';

/** The consent card over the slot, by its title. */
const card = (page: Page, title: string) => page.getByRole('dialog', {name: title});

/** Beat 31 by hand, Shop B out of the installed apps, each install answered by `outcomes`. */
async function shopBOffered(page: Page, outcomes: InstallOutcome[] = [{ok: true}]) {
  const world = await uninstalled(page, ['shop-b']);
  const sent = await answerInstalls(page, world, outcomes);
  await replayByHand(page, '31');
  return {offer: offerSlot(page, 'Shop B'), sent};
}

/** Install pressed on an offer's row, then on the consent card over the slot. */
async function install(page: Page, row: ReturnType<typeof offerSlot>, app: string) {
  await row
    .getByRole('listitem')
    .filter({hasText: app})
    .getByRole('button', {name: 'Install'})
    .click();
  await card(page, `Install ${app}?`).getByRole('button', {name: 'Install'}).click();
}

test('O1 · first paint: Shop B offered beside Shop A, bare, the fixed line and More in the Store', async ({
  page,
}) => {
  const {offer} = await shopBOffered(page);
  await expect(offer).toContainText('None of your apps can do this. From the Store:');
  await expect(offer.getByRole('listitem')).toHaveCount(1);
  await expect(offer.getByRole('listitem')).toContainText(SHOP_B_DESCRIPTION);
  await expect(offer.getByRole('button', {name: 'Install'})).toBeEnabled();
  await expect(offer.getByRole('button', {name: 'More in the Store'})).toBeVisible();
  await expect(page.getByTestId('canvas-stage-content')).toContainText(
    'Only Shop A answered, so there’s nothing to combine.',
  );
  await boardShot(page, 'store-loop-o1-offer.png');
});

test('O2 · neither shop installed: both offered, in the Planner’s order', async ({page}) => {
  await uninstalled(page, ['shop-a', 'shop-b']);
  await replayByHand(page, '32');
  const offer = offerSlot(page, 'camera shop');
  const rows = offer.getByRole('listitem');
  await expect(rows).toHaveCount(2);
  await expect(rows.nth(0)).toContainText('Shop B');
  await expect(rows.nth(1)).toContainText('Shop A');
  await expect(offer.getByRole('button', {name: 'Install'})).toHaveCount(2);
  await boardShot(page, 'store-loop-o2-two-apps.png');
});

test('O3 · Install asks first: the Store’s consent card over the slot, Cancel sending nothing', async ({
  page,
}) => {
  const {offer, sent} = await shopBOffered(page);
  await offer.getByRole('button', {name: 'Install'}).click();
  const consent = card(page, 'Install Shop B?');
  await expect(consent).toContainText('by a2uiverse-apps');
  await expect(consent).toContainText(SHOP_B_DESCRIPTION);
  await expect(consent).toContainText(
    'The first time you use it, Shop B will ask you to connect with a key.',
  );
  await boardShot(page, 'store-loop-o3-consent.png');

  await consent.getByRole('button', {name: 'Cancel'}).click();
  await expect(consent).toHaveCount(0);
  expect(sent).toEqual([]);
  await expect(offer.getByRole('button', {name: 'Install'})).toBeEnabled();
});

test('O4 · installing: the pressed row says so, every other Install held until it ends', async ({
  page,
}) => {
  const world = await uninstalled(page, ['shop-a', 'shop-b']);
  const held = gate();
  await answerInstalls(page, world, [{ok: true}], () => held.opened);
  await replayByHand(page, '32');
  const offer = offerSlot(page, 'camera shop');
  await install(page, offer, 'Shop B');
  const rows = offer.getByRole('listitem');
  await expect(rows.nth(0).getByRole('button', {name: 'Installing'})).toBeDisabled();
  await expect(rows.nth(1).getByRole('button', {name: 'Install'})).toBeDisabled();
  await boardShot(page, 'store-loop-o4-installing.png');
  held.open();
});

test('O5 · the slot changes once: installed, Shop B asks its key — connecting is the second step', async ({
  page,
}) => {
  const {sent} = await shopBOffered(page);
  await install(page, offerSlot(page, 'Shop B'), 'Shop B');
  const stage = page.getByTestId('canvas-stage-content');
  await expect(stage).toContainText('Connect Shop B to show it here.');
  await expect(stage.getByRole('button', {name: 'Connect'})).toBeVisible();
  await expect(stage).toContainText('Opens a page to paste your Shop B key');
  await expect(offerSlot(page, 'Shop B')).toHaveCount(0);
  expect(sent).toEqual(['shop-b']);
  await boardShot(page, 'store-loop-o5-connect.png');
});

test('O6 · filled: Shop B’s first answer in the slot the install came from, the merge taking it in', async ({
  page,
}) => {
  const windows = await signInWindows(page);
  await shopBOffered(page);
  await install(page, offerSlot(page, 'Shop B'), 'Shop B');
  const stage = page.getByTestId('canvas-stage-content');
  const opened = page.context().waitForEvent('page');
  await stage.getByRole('button', {name: 'Connect'}).click();
  await (await opened).close();
  await expect.poll(() => windows.attempts.map(a => a.source)).toEqual(['shop-b.1']);
  windows.end({state: 'signedIn', source: 'shop-b.1', label: 'Shop B'});
  await expect(stage).not.toContainText('Connect Shop B to show it here.');
  await expect(stage.getByRole('columnheader', {name: 'Shop B'})).toBeVisible();
  await expect(stage).not.toContainText('so there’s nothing to combine');
  await boardShot(page, 'store-loop-o6-filled.png');
});

test('O7 · an install refused, said on its row in the Store’s words, with the Store’s press', async ({
  page,
}) => {
  const {offer} = await shopBOffered(page, [
    {ok: false, cause: 'store-behind'},
    {ok: false, cause: 'app-unreached'},
    {ok: false, cause: 'checks'},
  ]);
  const row = offer.getByRole('listitem');

  // The Store behind the app: Install stays, to press again later.
  await install(page, offer, 'Shop B');
  await expect(row).toContainText(
    'Shop B can’t be installed yet. Its publisher has changed the app, and the Store hasn’t caught up. Try again later.',
  );
  await expect(row.getByRole('button', {name: 'Install'})).toBeEnabled();
  await boardShot(page, 'store-loop-o7-refused.png');

  // The app unreached: Try again, straight through with no second card.
  await install(page, offer, 'Shop B');
  await expect(row).toContainText('Shop B couldn’t be reached, so nothing was installed.');
  await row.getByRole('button', {name: 'Try again'}).click();

  // Its files failed the checks here: Install held off.
  await expect(row).toContainText(
    'Shop B can’t be installed. Its files didn’t pass the checks on this computer, so nothing changed.',
  );
  await expect(row.getByRole('button', {name: 'Install'})).toBeDisabled();

  // The Store unreached for the install: Try again.
  await page.unroute('**/registry/install');
  await page.route('**/registry/install', route => route.abort());
  await replayByHand(page, '31');
  await install(page, offerSlot(page, 'Shop B'), 'Shop B');
  const again = offerSlot(page, 'Shop B').getByRole('listitem');
  await expect(again).toContainText(
    'The Store can’t be reached right now, so nothing was installed.',
  );
  await expect(again.getByRole('button', {name: 'Try again'})).toBeVisible();
});

test('O8 · nothing to offer: the two quiet lines, each with Search the Store', async ({page}) => {
  await replayByHand(page, '7');
  const nothing = page.locator('[data-slot-state="nothing"]');
  await expect(nothing).toContainText('Nothing in the Store can do this yet.');
  await expect(nothing.getByRole('button', {name: 'Search the Store'})).toBeVisible();
  await boardShot(page, 'store-loop-o8-nothing.png');

  await replayByHand(page, 'gap-unreached');
  const unreached = page.locator('[data-slot-state="nothing"]');
  await expect(unreached).toContainText('Couldn’t reach the Store.');
  await expect(unreached.getByRole('button', {name: 'Search the Store'})).toBeVisible();
});

test('E1 · an offered app’s name opens its view in the Store', async ({page}) => {
  const {offer} = await shopBOffered(page);
  await offer.getByRole('button', {name: 'Shop B', exact: true}).click();
  const view = page.getByTestId('store-app-view');
  await expect(view).toHaveAttribute('data-app', 'shop-b');
  await expect(view.getByRole('button', {name: 'Install Shop B'})).toBeVisible();
  await samplesDrawn(page, 1);
  await boardShot(page, 'store-loop-e1-app-view.png');
});

test('E2 · installed on the page opened from the slot: the slot fills beneath it', async ({
  page,
}) => {
  const {offer} = await shopBOffered(page);
  await offer.getByRole('button', {name: 'More in the Store'}).click();
  await page
    .getByTestId('store-row')
    .filter({hasText: 'Shop B'})
    .getByRole('link', {name: 'Shop B'})
    .click();
  await page.getByRole('button', {name: 'Install Shop B'}).click();
  await page.getByTestId('consent-card').getByRole('button', {name: 'Install'}).click();
  const done = page.getByTestId('store-done');
  await expect(done).toContainText('Shop B is installed.');
  await expect(done.getByRole('button', {name: 'Back to your canvas'})).toBeVisible();
  await samplesDrawn(page, 1);
  await boardShot(page, 'store-loop-e2-installed.png');

  await done.getByRole('button', {name: 'Back to your canvas'}).click();
  await expect(page.getByTestId('trusted-page-overlay')).toHaveCount(0);
  await expect(page.getByTestId('canvas-stage-content')).toContainText(
    'Connect Shop B to show it here.',
  );
});

test('E3 · another canvas’s offer: Shop B installed from a slot turns its row to Show it here', async ({
  page,
}) => {
  const world = await uninstalled(page, ['shop-a', 'shop-b']);
  await answerInstalls(page, world, [{ok: true}]);
  await replayByHand(page, '31,32');
  // Installed from the first canvas's slot, the one the second was asked from.
  await page.getByRole('button', {name: 'Back', exact: true}).click();
  await install(page, offerSlot(page, 'Shop B'), 'Shop B');
  await expect(page.getByTestId('canvas-stage-content')).toContainText(
    'Connect Shop B to show it here.',
  );

  await page.getByRole('button', {name: /Return to live/}).click();
  const rows = offerSlot(page, 'camera shop').getByRole('listitem');
  await expect(rows.nth(0)).toContainText('Installed');
  await expect(rows.nth(0).getByRole('button', {name: 'Show it here'})).toBeEnabled();
  await expect(rows.nth(1).getByRole('button', {name: 'Install'})).toBeEnabled();
  await boardShot(page, 'store-loop-e3-show-it-here.png');
});

test('E4 · an install ask: the offer, then the installed line in the shell’s words', async ({
  page,
}) => {
  const world = await uninstalled(page, ['shop-b']);
  await answerInstalls(page, world, [{ok: true}]);
  await replayByHand(page, '33');
  const offer = offerSlot(page, 'Shop B');
  await expect(offer.getByRole('listitem')).toHaveCount(1);
  await install(page, offer, 'Shop B');
  const line = page.locator('[data-slot-state="installed"]');
  await expect(line).toContainText('Shop B is installed.');
  await expect(line).toContainText('What cameras do you have?');
  await boardShot(page, 'store-loop-e4-install-ask.png');
});
