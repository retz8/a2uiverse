/**
 * The Store over the fixed world (task-14.10 decisions 14, 16): one baseline per Store board of the
 * UI reference canvas, each board's other states driven and asserted in the page's text. Linear is
 * the world's one app not installed, so it is the one installed here; every other listing shows its
 * state in place of Install.
 */
import {test, expect, type Page} from '@playwright/test';
import {BOARD, answer, gate, openPage, patchRead, samplesDrawn} from './trusted-page';

test.use({viewport: BOARD});

const row = (page: Page, app: string) =>
  page.locator(`[data-testid="store-row"][data-app="${app}"]`);

/** Linear's view, its Install pressed and the consent card's Install confirmed. */
async function installLinear(page: Page) {
  const view = page.getByTestId('store-app-view');
  await view.getByRole('button', {name: 'Install Linear'}).click();
  await page.getByTestId('consent-card').getByRole('button', {name: 'Install'}).click();
}

test('S1 · opened with no query: every app by name, an installed one its state in place of Install', async ({
  page,
}) => {
  await openPage(page, '/?page=store');
  await expect(page.getByTestId('store-label')).toContainText('All apps · 7');
  await expect(page.locator('[data-testid="store-row"] .store-name > a')).toHaveText([
    'CircleCI',
    'GitHub',
    'Gmail',
    'Google Calendar',
    'Linear',
    'Shop A',
    'Shop B',
  ]);
  await expect(row(page, 'circleci')).toContainText('by a2uiverse-apps');
  await expect(row(page, 'github')).toContainText('Installed');
  await expect(row(page, 'circleci')).toContainText('An update that asks for more');
  await expect(row(page, 'calendar')).toContainText('A new version is available');
  await expect(row(page, 'gmail')).toContainText('A small update is ready');
  await expect(row(page, 'shop-a')).toContainText(
    'A newer version is on its way from the publisher',
  );
  await expect(row(page, 'shop-a').getByRole('button')).toHaveCount(0);
  await expect(row(page, 'shop-b')).toContainText('Needs an update to keep working');
  await expect(row(page, 'shop-b').getByRole('button', {name: 'Update Shop B'})).toBeVisible();
  await expect(row(page, 'linear').getByRole('button', {name: 'Install Linear'})).toBeVisible();
  await expect(page).toHaveScreenshot('store-s1-store-front.png');
});

test('S2 · opened on a query: the closest matches, the query in the box and the address', async ({
  page,
}) => {
  await openPage(page, '/?page=store&q=camera+shop');
  await expect(page.getByRole('searchbox', {name: 'Search the Store'})).toHaveValue('camera shop');
  await expect(page.getByTestId('store-label')).toContainText('Closest matches · 2');
  await expect(page.getByTestId('store-row')).toHaveCount(2);
  await expect(row(page, 'shop-a')).toBeVisible();
  await expect(row(page, 'shop-b')).toBeVisible();
  await expect(page.getByRole('link', {name: 'Show every app'})).toBeVisible();
  await expect(page).toHaveScreenshot('store-s2-search.png');
});

test('S3 · loading, no results, the Store unreached, an app not in the Store', async ({page}) => {
  // Loading: the world's index held until the board is taken.
  const held = gate();
  await page.route('**/marketplace/index.json', async route => {
    await held.opened;
    await route.fallback();
  });
  await openPage(page, '/?page=store');
  await expect(page.getByLabel('Loading the Store')).toBeVisible();
  // Each loading row's app tile is the board's square, as a listing's tile.
  const tile = await page
    .getByLabel('Loading the Store')
    .locator('.store-tile')
    .first()
    .boundingBox();
  expect(tile).toMatchObject({width: 40, height: 40});
  await expect(page).toHaveScreenshot('store-s3-browse-states.png');
  held.open();
  await expect(page.getByTestId('store-row')).toHaveCount(7);

  // No results: a search the world matches nothing for.
  const search = page.getByRole('searchbox', {name: 'Search the Store'});
  await search.fill('flight tracker');
  await search.press('Enter');
  const empty = page.getByTestId('store-empty');
  await expect(empty).toContainText('No apps match “flight tracker”.');
  await expect(empty).toContainText('Try other words, or look through everything in the Store.');

  // Every app again is the list the Store holds, not read again (task-14.11 decision 29) — so a
  // Store refusing its index from here on still shows it.
  await answer(page, '**/marketplace/index.json', {ok: false, reason: 'unreached'}, 502);
  await empty.getByRole('link', {name: 'Show every app'}).click();
  await expect(page.getByTestId('store-row')).toHaveCount(7);

  // The Store unreached: opened afresh, its index refused.
  await openPage(page, '/?page=store');
  const unreached = page.getByTestId('store-unreached');
  await expect(unreached).toContainText('The Store can’t be reached right now.');
  await expect(unreached).toContainText('Your installed apps still work. Try again in a moment.');
  await expect(unreached.getByRole('button', {name: 'Try again'})).toBeVisible();

  // An app the Store doesn't list.
  await openPage(page, '/?page=store&app=flight-finder');
  await expect(page.getByTestId('store-not-listed')).toContainText('This app isn’t in the Store.');
});

test('S4 · one publisher’s apps; the Update a listing carries goes straight through', async ({
  page,
}) => {
  await openPage(page, '/?page=store&publisher=a2uiverse-apps');
  await expect(page.getByTestId('store-label')).toContainText('Apps by a2uiverse-apps · 7');
  await expect(page.getByRole('search')).toContainText('By a2uiverse-apps');
  await expect(page.getByTestId('store-row').filter({hasText: 'by a2uiverse-apps'})).toHaveCount(0);
  await expect(page).toHaveScreenshot('store-s4-publisher.png');

  // A new version's Update, pressed on its row: no card asks, the app's view says it's updated.
  let updated = false;
  await page.route('**/registry/install', async route => {
    expect(route.request().postDataJSON()).toEqual({appId: 'calendar'});
    updated = true;
    await route.fulfill({json: {ok: true, appId: 'calendar', replaced: true, followed: []}});
  });
  await patchRead<{update?: {state: string}}>(
    page,
    '**/marketplace/apps/calendar/entry.json',
    () => updated,
    listing => ({
      ...listing,
      update: {
        appId: 'calendar',
        installedVersion: '0.1.0',
        state: 'up-to-date',
        publishedVersion: '0.1.0',
      },
    }),
  );
  await row(page, 'calendar').getByRole('button', {name: 'Update Google Calendar'}).click();
  await expect(page.getByTestId('consent-card')).toHaveCount(0);
  const done = page.getByTestId('store-done');
  await expect(done).toContainText('Google Calendar is updated.');
  await expect(done).toContainText('Try asking “What needs my attention today?” on your canvas.');
  await expect(page.getByTestId('store-app-view')).toContainText('Installed');

  // A publisher with nothing in the Store.
  await openPage(page, '/?page=store&publisher=northlight');
  await expect(page.getByTestId('store-empty')).toContainText(
    'No apps by northlight are in the Store.',
  );
});

test('S5 · an app’s view: what it does, the questions to try, the sample the Store made', async ({
  page,
}) => {
  // Shop A, the app whose sample the Store made, not installed as the board draws it: the one
  // read the world doesn't hold.
  await patchRead<{entry: unknown}>(
    page,
    '**/marketplace/apps/shop-a/entry.json',
    () => true,
    ({entry}) => ({entry, installed: false}),
  );
  await openPage(page, '/?page=store&app=shop-a');
  const view = page.getByTestId('store-app-view');
  await expect(view.getByRole('heading', {name: 'Shop A'})).toBeVisible();
  await expect(view).toContainText('by a2uiverse-apps');
  await expect(view.getByRole('button', {name: 'Install Shop A'})).toBeVisible();
  await expect(view).not.toContainText('A newer version is on its way from the publisher');
  await expect(view).toContainText('Aperture & Co, a boutique camera dealer');
  await expect(view).toContainText('Shop A doesn’t ask you to sign in.');
  await expect(view.locator('.store-tries li')).toHaveText([
    '“What cameras do you have?”',
    '“What is your returns policy?”',
  ]);
  await samplesDrawn(page, 1);
  const sample = page.getByTestId('store-sample');
  await expect(sample).toContainText('“What cameras do you have?”');
  await expect(sample).toContainText('Made by the Store when Shop A was published, Oct 24');
  await expect(page).toHaveScreenshot('store-s5-app-view.png');
});

test('S6 · a sign-in app: what it will be able to do, the sample its publisher made', async ({
  page,
}) => {
  await openPage(page, '/?page=store&app=linear');
  const view = page.getByTestId('store-app-view');
  await expect(view.getByRole('button', {name: 'Install Linear'})).toBeVisible();
  await expect(view).toContainText(
    'Linear asks you to sign in the first time you use it. It will be able to:',
  );
  await expect(view.locator('.store-scopes__list li')).toHaveText(['See your issues']);
  await samplesDrawn(page, 1);
  await expect(page.getByTestId('store-sample')).toContainText(
    'Made by the publisher with their own account, Oct 24',
  );
  await expect(page).toHaveScreenshot('store-s6-signin-app.png');
});

test('S7 · Install asks first: the consent card, Cancel sending nothing', async ({page}) => {
  const installs: string[] = [];
  await page.route('**/registry/install', route => {
    installs.push(route.request().postData() ?? '');
    return route.fulfill({json: {ok: true, appId: 'linear', replaced: false, followed: []}});
  });
  await openPage(page, '/?page=store&app=linear');
  await samplesDrawn(page, 1);
  await page.getByRole('button', {name: 'Install Linear'}).click();
  const card = page.getByTestId('consent-card');
  await expect(card.getByRole('heading', {name: 'Install Linear?'})).toBeVisible();
  await expect(card).toContainText('by a2uiverse-apps');
  await expect(card).toContainText(
    'The first time you use it, Linear will ask you to sign in. It will be able to',
  );
  await expect(card.locator('li')).toHaveText(['See your issues']);
  await expect(page).toHaveScreenshot('store-s7-consent.png');

  await card.getByRole('button', {name: 'Cancel'}).click();
  await expect(card).toHaveCount(0);
  expect(installs).toEqual([]);
});

test('S8 · installed: the page stays, the app’s state in place of Install', async ({page}) => {
  let installed = false;
  await page.route('**/registry/install', async route => {
    expect(route.request().postDataJSON()).toEqual({appId: 'linear'});
    installed = true;
    await route.fulfill({json: {ok: true, appId: 'linear', replaced: false, followed: []}});
  });
  await patchRead<{installed: boolean}>(
    page,
    '**/marketplace/apps/linear/entry.json',
    () => installed,
    listing => ({...listing, installed: true}),
  );
  await openPage(page, '/?page=store&app=linear');
  await samplesDrawn(page, 1);
  await installLinear(page);
  const done = page.getByTestId('store-done');
  await expect(done).toContainText('Linear is installed.');
  await expect(done).toContainText("Try asking “What's assigned to me in Linear?” on your canvas.");
  const view = page.getByTestId('store-app-view');
  await expect(view.locator('.store-app')).toContainText('Installed');
  await expect(view).not.toContainText('Signing in');
  await samplesDrawn(page, 1);
  await expect(page).toHaveScreenshot('store-s8-installed.png');
});

test('S9 · installing; refused for each cause; a sample that can’t be shown', async ({page}) => {
  const causes = ['store-behind', 'app-unreached', 'checks'];
  const first = gate();
  let presses = 0;
  await page.route('**/registry/install', async route => {
    const cause = causes[presses++];
    if (presses === 1) await first.opened;
    await route.fulfill({status: 422, json: {ok: false, cause, findings: [`refused: ${cause}`]}});
  });
  await openPage(page, '/?page=store&app=linear');
  await samplesDrawn(page, 1);
  const view = page.getByTestId('store-app-view');
  const refused = page.getByTestId('store-refused');

  // Installing: the press says so while the install runs.
  await installLinear(page);
  await expect(view.getByRole('button', {name: 'Installing'})).toBeDisabled();
  await expect(page).toHaveScreenshot('store-s9-install-states.png');
  first.open();

  // The Store behind the app: Install stays, to press again later.
  await expect(refused).toContainText(
    'Linear can’t be installed yet. Its publisher has changed the app, and the Store hasn’t caught up. Try again later.',
  );
  await installLinear(page);

  // The app unreached: Try again, straight through.
  await expect(refused).toContainText('Linear couldn’t be reached, so nothing was installed.');
  await view.getByRole('button', {name: 'Try again'}).click();

  // Its files failed the checks here: Install held off.
  await expect(refused).toContainText(
    'Linear can’t be installed. Its files didn’t pass the checks on this computer, so nothing changed.',
  );
  await expect(view.getByRole('button', {name: 'Install'})).toBeDisabled();

  // The Store unreached for the install: Try again.
  await page.route('**/registry/install', route => route.abort());
  await openPage(page, '/?page=store&app=linear');
  await installLinear(page);
  await expect(page.getByTestId('store-refused')).toContainText(
    'The Store can’t be reached right now, so nothing was installed.',
  );
  await expect(
    page.getByTestId('store-app-view').getByRole('button', {name: 'Try again'}),
  ).toBeVisible();

  // The sample can't be shown: its read refused, the rest of the view standing.
  await answer(
    page,
    '**/marketplace/apps/linear/preview.json',
    {ok: false, reason: 'unreached'},
    502,
  );
  await openPage(page, '/?page=store&app=linear');
  const sample = page.getByTestId('store-sample');
  await expect(sample).toHaveAttribute('data-status', 'failed');
  await expect(sample).toContainText('This sample couldn’t be shown.');
  await expect(sample.getByRole('button', {name: 'Try again'})).toBeVisible();
});
