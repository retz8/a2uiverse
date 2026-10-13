/**
 * The App Library over the fixed world (task-14.10 decisions 14, 16): one baseline per App Library
 * board of the UI reference canvas, each board's other states driven and asserted in the page's
 * text. Six apps installed, each in a different update state; GitHub on two accounts, Gmail on one,
 * Google Calendar's lapsed, Shop B's a key. A state the world doesn't hold is the one read
 * overridden in that test.
 */
import {test, expect, type BrowserContext, type Page} from '@playwright/test';
import type {UpdateState} from '@a2uiverse/sdk';
import type {LibraryApp} from '../src/orchestratorApi';
import {BOARD, answer, gate, openPage, patchRead} from './trusted-page';

test.use({viewport: BOARD});

interface Installed {
  id: string;
  source: string;
  reachable: boolean;
  card: Record<string, unknown>;
}

const row = (page: Page, app: string) =>
  page.locator(`[data-testid="library-row"][data-app="${app}"]`);
const account = (page: Page, source: string) =>
  page.locator(`[data-testid="library-account"][data-source="${source}"]`);

/** The App Library at its list, the update check landed. */
async function openList(page: Page) {
  await openPage(page, '/?page=library');
  await expect(page.getByTestId('library-label')).toContainText('Checked for updates at 9:02 AM');
}

/** An app's view, the check landed and its accounts read. */
async function openApp(page: Page, app: string) {
  await openPage(page, `/?page=library&app=${app}`);
  const view = page.getByTestId('library-app-view');
  await expect(view.getByTestId('library-state')).toBeVisible();
  await expect(view.getByRole('button', {name: /^Uninstall/})).toBeEnabled();
  return view;
}

/** One app's state replaced in the check's answer, or taken out of it. */
function withState(states: UpdateState[], appId: string, state?: UpdateState): UpdateState[] {
  const rest = states.filter(s => s.appId !== appId);
  return state ? [...rest, state] : rest;
}

/** One app's accounts changed in the vault's answer. */
const withAccounts = (
  apps: LibraryApp[],
  appId: string,
  change: (app: LibraryApp) => LibraryApp,
): LibraryApp[] => apps.map(app => (app.appId === appId ? change(app) : app));

/**
 * The sign-in windows Add account and Sign in again open, each answered by a page of its own, and
 * the attempts they poll: pending until the test says how they end. An attempt left behind by
 * Cancel is still watched, so an ending ends every attempt still open.
 */
async function signInWindows(context: BrowserContext, page: Page) {
  const attempts: {id: string; source: string}[] = [];
  const outcomes = new Map<string, Record<string, unknown>>();
  await context.route('**/auth/start?**', route => {
    const url = new URL(route.request().url());
    attempts.push({id: url.searchParams.get('attempt')!, source: url.searchParams.get('source')!});
    return route.fulfill({contentType: 'text/html', body: '<title>Sign in</title><p>Sign in</p>'});
  });
  await page.route('**/auth/attempts/**', route => {
    const id = decodeURIComponent(new URL(route.request().url()).pathname.split('/').pop()!);
    return route.fulfill({json: outcomes.get(id) ?? {state: 'pending'}});
  });
  return {
    attempts,
    /** A press that opens a window, its attempt seen at the start route. */
    open: async (press: () => Promise<void>) => {
      const before = attempts.length;
      await press();
      await expect.poll(() => attempts.length).toBeGreaterThan(before);
    },
    /** Every attempt still open ends so. */
    end: (outcome: Record<string, unknown>) => {
      for (const {id} of attempts) if (!outcomes.has(id)) outcomes.set(id, outcome);
    },
  };
}

test('L1 · your apps, each with its update state in plain words', async ({page}) => {
  await openList(page);
  await expect(page.getByTestId('library-label')).toContainText('Your apps · 6');
  await expect(page.locator('[data-testid="library-row"] .store-name > a')).toHaveText([
    'CircleCI',
    'GitHub',
    'Gmail',
    'Google Calendar',
    'Shop A',
    'Shop B',
  ]);
  await expect(row(page, 'circleci')).toContainText('An update that asks for more');
  await expect(row(page, 'github')).toContainText('Up to date');
  await expect(row(page, 'github').getByRole('button')).toHaveCount(0);
  await expect(row(page, 'gmail')).toContainText('A small update is ready');
  await expect(row(page, 'calendar')).toContainText('A new version is available');
  await expect(row(page, 'shop-a')).toContainText(
    'A newer version is on its way from the publisher',
  );
  await expect(row(page, 'shop-b')).toContainText('Needs an update to keep working');
  for (const app of ['CircleCI', 'Gmail', 'Google Calendar', 'Shop B']) {
    await expect(page.getByRole('button', {name: `Update ${app}`})).toBeVisible();
  }
  await expect(page).toHaveScreenshot('library-l1-library.png');
});

test('L2 · the other rows; checking for updates; nothing installed', async ({page}) => {
  // The other rows: from a local copy the Store doesn't list, taken out of the Store, the Store
  // not read for one app, not reached since startup, and not checked since it changed.
  let installedApps: 'others' | 'none' = 'others';
  await patchRead<Installed[]>(
    page,
    '**/registry/apps.json',
    () => true,
    apps =>
      installedApps === 'none'
        ? []
        : apps.map(app =>
            app.id === 'shop-a'
              ? {...app, source: 'local'}
              : app.id === 'calendar'
                ? {...app, reachable: false}
                : app,
          ),
  );
  const checking = gate();
  let held = false;
  await patchRead<UpdateState[]>(
    page,
    '**/registry/updates.json',
    () => true,
    states => {
      states = withState(states, 'github');
      for (const appId of ['shop-a', 'shop-b']) {
        const was = states.find(s => s.appId === appId)!;
        states = withState(states, appId, {
          appId,
          installedVersion: was.installedVersion,
          state: 'not-published',
        });
      }
      return withState(states, 'circleci', {
        appId: 'circleci',
        installedVersion: '0.0.9',
        state: 'unknown',
      });
    },
  );
  // The check run again is held while the board's checking state is read.
  await page.route('**/registry/updates.json', async route => {
    if (held) await checking.opened;
    await route.fallback();
  });
  await openList(page);
  await expect(row(page, 'shop-a')).toContainText('Installed from your computer');
  await expect(row(page, 'shop-b')).toContainText('No longer in the Store');
  await expect(row(page, 'shop-b').getByRole('button')).toHaveCount(0);
  await expect(row(page, 'circleci')).toContainText('Couldn’t check for updates');
  await expect(row(page, 'circleci').getByRole('button', {name: 'Check again'})).toBeVisible();
  await expect(row(page, 'calendar')).toContainText('Couldn’t be reached');
  await expect(row(page, 'github')).toContainText('Not checked yet');
  await expect(row(page, 'gmail')).toContainText('A small update is ready');
  await expect(page).toHaveScreenshot('library-l2-library-states.png');

  // Checking: the check run again, held.
  held = true;
  await page.getByTestId('library-label').getByRole('button', {name: 'Check again'}).click();
  await expect(page.getByTestId('library-label')).toContainText('Checking for updates');
  await expect(page.getByRole('img', {name: 'Checking for updates'})).toHaveCount(6);
  checking.open();
  await expect(row(page, 'circleci')).toContainText('Couldn’t check for updates');

  // Nothing installed.
  installedApps = 'none';
  await openPage(page, '/?page=library');
  const empty = page.getByTestId('library-empty');
  await expect(empty).toContainText('No apps yet.');
  await expect(empty).toContainText('Apps you install from the Store show up here.');
  await expect(empty.getByRole('link', {name: 'Browse the Store'})).toBeVisible();
});

test('L3 · an update that asks for more passes the consent card', async ({page}) => {
  const installs: string[] = [];
  await page.route('**/registry/install', route => {
    installs.push(route.request().postData() ?? '');
    return route.fulfill({json: {ok: true, appId: 'circleci', replaced: true, followed: []}});
  });
  const view = await openApp(page, 'circleci');
  await expect(view.getByTestId('library-state')).toContainText('An update that asks for more');
  await view.getByRole('button', {name: 'Update CircleCI'}).click();
  const card = page.getByTestId('consent-card');
  await expect(card.getByRole('heading', {name: 'Update CircleCI?'})).toBeVisible();
  await expect(card).toContainText(
    'This version asks for more. The next time you use it, CircleCI will also ask to be able to',
  );
  await expect(card.locator('li')).toHaveText(['See your projects, pipelines and their runs']);
  await expect(card).toContainText('It also brings a new look for its answers.');
  await expect(page).toHaveScreenshot('library-l3-update-consent.png');

  await card.getByRole('button', {name: 'Not now'}).click();
  await expect(card).toHaveCount(0);
  expect(installs).toEqual([]);
});

test('L4 · updating, updated, waiting on the publisher, gone, and an update refused', async ({
  page,
}) => {
  const updating = gate();
  const updated = new Set<string>();
  const refusals = ['app-unreached', 'store-behind'];
  await page.route('**/registry/install', async route => {
    const {appId} = route.request().postDataJSON() as {appId: string};
    if (appId === 'shop-b') {
      const cause = refusals.shift();
      return route.fulfill({
        status: 422,
        json: {ok: false, cause, findings: [`refused: ${cause}`]},
      });
    }
    if (appId === 'calendar') await updating.opened;
    updated.add(appId);
    await route.fulfill({json: {ok: true, appId, replaced: true, followed: []}});
  });
  // Once updated, the check reads an app up to date; GitHub gone from the Store, and CircleCI's
  // entry unread, when the test says.
  let further = false;
  await patchRead<UpdateState[]>(
    page,
    '**/registry/updates.json',
    () => true,
    states => {
      let next = states;
      for (const appId of updated) {
        next = withState(next, appId, {
          appId,
          installedVersion: '0.1.0',
          state: 'up-to-date',
          publishedVersion: '0.1.0',
        });
      }
      if (further) {
        next = withState(next, 'github', {
          appId: 'github',
          installedVersion: '0.1.0',
          state: 'not-published',
        });
        next = withState(next, 'circleci', {
          appId: 'circleci',
          installedVersion: '0.0.9',
          state: 'unknown',
        });
      }
      return next;
    },
  );

  // Updating: a new version's Update goes straight through, the press saying so meanwhile.
  let view = await openApp(page, 'calendar');
  await view.getByRole('button', {name: 'Update Google Calendar'}).click();
  await expect(page.getByTestId('consent-card')).toHaveCount(0);
  await expect(view.getByRole('button', {name: 'Updating'})).toBeDisabled();
  await expect(page).toHaveScreenshot('library-l4-update-states.png');
  updating.open();

  // Updated: the check run again, the app up to date.
  await expect(view.getByTestId('library-updated')).toContainText('Updated to the newest version.');
  await expect(view.getByTestId('library-state')).toContainText('Up to date');

  // A small update pressed on its row: the notice atop the list names the app.
  await openList(page);
  await page.getByRole('button', {name: 'Update Gmail'}).click();
  await expect(page.getByTestId('library-updated')).toContainText(
    'Gmail is updated to the newest version.',
  );
  await expect(row(page, 'gmail')).toContainText('Up to date');

  // Needs an update: its warning, and an update refused as the Store words it.
  view = await openApp(page, 'shop-b');
  await expect(view.getByTestId('library-state-note')).toContainText(
    'Shop B no longer answers in the look you have. Update it to keep seeing its answers.',
  );
  await view.getByRole('button', {name: 'Update Shop B'}).click();
  await expect(view.getByTestId('library-refused')).toContainText(
    'Shop B couldn’t be reached, so nothing changed.',
  );
  await view.getByRole('button', {name: 'Try again'}).click();
  await expect(view.getByTestId('library-refused')).toContainText(
    'Shop B can’t be updated yet. Its publisher has changed the app, and the Store hasn’t caught up. Try again later.',
  );

  // On its way from the publisher: nothing to press.
  view = await openApp(page, 'shop-a');
  await expect(view.getByTestId('library-state')).toContainText(
    'A newer version is on its way from the publisher',
  );
  await expect(view.getByTestId('library-state-note')).toContainText(
    'Shop A has changed since it was last put in the Store. Nothing to do yet: the update appears here once the publisher adds it.',
  );
  await expect(view.getByRole('button', {name: /^Update/})).toHaveCount(0);

  // Gone from the Store, and a check that couldn't read the Store's entry.
  further = true;
  view = await openApp(page, 'github');
  await expect(view.getByTestId('library-state')).toContainText('No longer in the Store');
  await expect(view.getByTestId('library-state-note')).toContainText(
    'Its publisher took GitHub out of the Store. It stays installed here until you uninstall it.',
  );
  view = await openApp(page, 'circleci');
  await expect(view.getByTestId('library-state')).toContainText('Couldn’t check for updates');
  await expect(view.getByTestId('library-state-note')).toContainText(
    'The Store couldn’t be reached. CircleCI still works as installed.',
  );
  await expect(view.getByRole('button', {name: 'Check again'})).toBeVisible();
});

test('L5 · an app’s view: its state, its two accounts, Add account, Uninstall at the bottom', async ({
  page,
}) => {
  const view = await openApp(page, 'github');
  await expect(view.getByRole('heading', {name: 'GitHub'})).toBeVisible();
  await expect(view).toContainText('by a2uiverse-apps');
  await expect(view.getByTestId('library-state')).toContainText('Up to date');
  for (const [source, label] of [
    ['github.1', 'me@example.com'],
    ['github.2', 'work@example.com'],
  ] as const) {
    await expect(account(page, source)).toContainText(label);
    await expect(account(page, source)).toContainText('Signed in');
  }
  await expect(view.getByRole('button', {name: 'Add account'})).toBeVisible();
  await expect(view).toContainText('Opens GitHub’s sign-in in a new window');
  await expect(view.getByRole('button', {name: 'Uninstall GitHub'})).toBeVisible();
  await expect(view).toContainText('Also signs out both accounts');
  await expect(page).toHaveScreenshot('library-l5-app-view.png');
});

test('L6 · permissions read, an account renamed, a key account', async ({page}) => {
  let renamed = false;
  const renames: unknown[] = [];
  await page.route('**/auth/rename', route => {
    const body = route.request().postDataJSON() as {source: string; label: string};
    renames.push(body);
    if (body.source === 'github.1') {
      return route.fulfill({
        status: 422,
        json: {ok: false, findings: ['another GitHub account already has that name']},
      });
    }
    renamed = true;
    return route.fulfill({json: {ok: true, source: body.source, label: body.label}});
  });
  await patchRead<LibraryApp[]>(
    page,
    '**/auth/accounts.json',
    () => renamed,
    apps =>
      withAccounts(apps, 'github', app => ({
        ...app,
        accounts: app.accounts.map(a => (a.source === 'github.2' ? {...a, label: 'Work'} : a)),
      })),
  );
  await openApp(page, 'github');

  // Permissions, read only, in the app's own words.
  await account(page, 'github.1').getByRole('button', {name: 'Permissions'}).click();
  const permissions = account(page, 'github.1').locator('.library-perm');
  await expect(permissions).toContainText('GitHub can');
  await expect(permissions.locator('li')).toHaveText([
    'See your repositories, pull requests, issues and notifications',
    'Comment, review, merge, and open issues and pull requests as you',
  ]);
  await expect(permissions).toContainText('To take a permission away, sign out and sign in again.');

  // The other account being renamed, in place.
  await page.getByRole('button', {name: 'Rename work@example.com'}).click();
  const name = account(page, 'github.2').getByRole('textbox', {name: 'Account name'});
  await name.fill('Work');
  await expect(page).toHaveScreenshot('library-l6-permissions-rename.png');

  await account(page, 'github.2').getByRole('button', {name: 'Save'}).click();
  await expect(account(page, 'github.2')).toContainText('Work');
  expect(renames).toEqual([{source: 'github.2', label: 'Work'}]);

  // A name another of its accounts has: said under the field.
  await page.getByRole('button', {name: 'Rename me@example.com'}).click();
  await account(page, 'github.1').getByRole('textbox', {name: 'Account name'}).fill('work');
  await account(page, 'github.1').getByRole('button', {name: 'Save'}).click();
  await expect(account(page, 'github.1').getByRole('alert')).toHaveText(
    'Another GitHub account already has that name.',
  );

  // A key account names no permissions.
  await openApp(page, 'shop-b');
  const key = account(page, 'shop-b.1');
  await expect(key).toContainText('Shop B account 1');
  await expect(key).toContainText('Connected with a key');
  await key.getByRole('button', {name: 'Permissions'}).click();
  await expect(key.locator('.library-perm')).toHaveText(
    'Connected with a key. Shop B can do what that key allows.',
  );
});

test('L7 · sign out asks once; a key account says the key is needed again', async ({page}) => {
  const signedOut = new Set<string>();
  await page.route('**/auth/sign-out', route => {
    const {source} = route.request().postDataJSON() as {source: string};
    signedOut.add(source);
    return route.fulfill({
      json:
        source === 'github.2'
          ? {ok: true, source, label: 'work@example.com', revocation: 'revoked'}
          : {ok: true, source, label: 'me@example.com', revocation: 'failed'},
    });
  });
  await patchRead<LibraryApp[]>(
    page,
    '**/auth/accounts.json',
    () => signedOut.size > 0,
    apps =>
      withAccounts(apps, 'github', app => ({
        ...app,
        accounts: app.accounts.filter(a => !signedOut.has(a.source)),
      })),
  );
  await openApp(page, 'github');
  await page.getByRole('button', {name: 'Sign out of work@example.com'}).click();
  const question = page.getByTestId('library-sign-out');
  await expect(
    question.getByRole('heading', {name: 'Sign out of work@example.com?'}),
  ).toBeVisible();
  await expect(question).toContainText(
    'GitHub will ask this account to sign in again the next time it’s used. Answers already on your canvases stay as they are.',
  );
  await expect(page).toHaveScreenshot('library-l7-sign-out.png');

  // Signed out, its access cancelled.
  await question.getByRole('button', {name: 'Sign out'}).click();
  await expect(page.getByTestId('library-signed-out')).toHaveText(
    'Signed out of work@example.com.',
  );
  await expect(account(page, 'github.2')).toHaveCount(0);

  // Signed out here, the app unreached to cancel its access.
  await page.getByRole('button', {name: 'Sign out of me@example.com'}).click();
  await page.getByTestId('library-sign-out').getByRole('button', {name: 'Sign out'}).click();
  await expect(page.getByTestId('library-signed-out')).toHaveText(
    'Signed out of me@example.com here, but GitHub couldn’t be reached to cancel its access. You can remove that access from your GitHub account’s settings.',
  );
  await expect(page.getByTestId('library-app-view')).toContainText('No accounts.');

  // A key account's question.
  await openApp(page, 'shop-b');
  await page.getByRole('button', {name: 'Sign out of Shop B account 1'}).click();
  const keyQuestion = page.getByTestId('library-sign-out');
  await expect(
    keyQuestion.getByRole('heading', {name: 'Sign out of Shop B account 1?'}),
  ).toBeVisible();
  await expect(keyQuestion).toContainText(
    'The key is removed from this computer. To connect this account again you’ll need Shop B’s key. Answers already on your canvases stay as they are.',
  );
  await keyQuestion.getByRole('button', {name: 'Cancel'}).click();
  await expect(keyQuestion).toHaveCount(0);
});

test('L8 · Add account waits in place while its window is open', async ({page, context}) => {
  const windows = await signInWindows(context, page);
  const view = await openApp(page, 'gmail');
  await expect(account(page, 'gmail.1')).toContainText('me@example.com');
  await windows.open(() => view.getByRole('button', {name: 'Add account'}).click());
  await expect(view).toContainText('Finish signing in to Gmail in the window that opened.');
  await expect(view).toContainText('Waiting for you to finish signing in');
  await expect(view.getByRole('button', {name: 'Open the sign-in again'})).toBeVisible();
  await expect(view.getByRole('button', {name: 'Cancel'})).toBeVisible();
  // The window names the app alone: no canvas waits on it.
  expect(windows.attempts.map(a => a.source)).toEqual(['gmail']);
  await expect(page).toHaveScreenshot('library-l8-add-waiting.png');
});

test('L9 · added, cancelled, expired, already here, failed; a lapsed account signed in again', async ({
  page,
  context,
}) => {
  const windows = await signInWindows(context, page);
  let added = false;
  let again = false;
  await patchRead<LibraryApp[]>(
    page,
    '**/auth/accounts.json',
    () => added || again,
    apps => {
      let next = apps;
      if (added) {
        next = withAccounts(next, 'gmail', app => ({
          ...app,
          accounts: [
            ...app.accounts,
            {
              source: 'gmail.2',
              label: 'work@example.com',
              kind: 'oauth',
              permissions: ['See your inbox'],
              lapsed: false,
            },
          ],
        }));
      }
      if (again) {
        next = withAccounts(next, 'calendar', app => ({
          ...app,
          accounts: app.accounts.map(a => ({...a, label: 'work@example.com', lapsed: false})),
        }));
      }
      return next;
    },
  );
  const view = await openApp(page, 'gmail');
  const add = view.getByRole('button', {name: 'Add account'});
  const end = view.getByTestId('library-add-end');

  // Added: the account in the list, marked so.
  await windows.open(() => add.click());
  added = true;
  windows.end({
    state: 'signedIn',
    source: 'gmail.2',
    label: 'work@example.com',
    app: 'Gmail',
  });
  await expect(account(page, 'gmail.2')).toContainText('work@example.com');
  await expect(account(page, 'gmail.2').locator('.library-tag')).toHaveText('Added');
  await expect(page).toHaveScreenshot('library-l9-add-outcomes.png');

  // Cancelled.
  await windows.open(() => add.click());
  await view.getByRole('button', {name: 'Cancel'}).click();
  await expect(end).toHaveText('Sign-in cancelled. No account was added.');

  // Expired: Try again in place of Add account.
  await windows.open(() => add.click());
  windows.end({state: 'expired', app: 'Gmail'});
  await expect(end).toHaveText('The sign-in took too long and stopped. No account was added.');

  // Already one of its accounts.
  await windows.open(() => view.getByRole('button', {name: 'Try again'}).click());
  windows.end({
    state: 'signedIn',
    source: 'gmail.1',
    label: 'me@example.com',
    app: 'Gmail',
    existing: true,
  });
  await expect(end).toContainText(
    'You signed in as me@example.com, which is already one of Gmail’s accounts here.',
  );
  await expect(end).toContainText('To add another, sign in as a different account.');

  // Failed.
  await windows.open(() => add.click());
  windows.end({state: 'failed', reason: 'access_denied', app: 'Gmail'});
  await expect(end).toHaveText('The sign-in didn’t finish. No account was added.');

  // A lapsed account signed in again, as another identity.
  const calendar = await openApp(page, 'calendar');
  const lapsed = account(page, 'calendar.1');
  await expect(lapsed).toContainText('Needs you to sign in again');
  await windows.open(() => lapsed.getByRole('button', {name: 'Sign in again'}).click());
  await expect(calendar).toContainText('Finish signing in to Google Calendar');
  again = true;
  windows.end({
    state: 'signedIn',
    source: 'calendar.1',
    label: 'work@example.com',
    app: 'Google Calendar',
    rebound: true,
  });
  await expect(lapsed).toContainText('Signed in to Google Calendar as work@example.com.');
  await expect(lapsed).not.toContainText('Needs you to sign in again');
  expect(windows.attempts.at(-1)?.source).toBe('calendar.1');
});

test('L10 · uninstall asks once, naming the accounts it signs out', async ({page}) => {
  const uninstalled = new Set<string>();
  await page.route('**/registry/uninstall', route => {
    const {appId} = route.request().postDataJSON() as {appId: string};
    if (appId !== 'github') {
      return route.fulfill({
        status: 404,
        json: {ok: false, findings: [`${appId} is not installed`]},
      });
    }
    uninstalled.add(appId);
    return route.fulfill({
      json: {
        ok: true,
        appId,
        accounts: [
          {label: 'me@example.com', revocation: 'revoked'},
          {label: 'work@example.com', revocation: 'failed'},
        ],
      },
    });
  });
  await patchRead<Installed[]>(
    page,
    '**/registry/apps.json',
    () => uninstalled.size > 0,
    apps => apps.filter(app => !uninstalled.has(app.id)),
  );
  const view = await openApp(page, 'github');
  await view.getByRole('button', {name: 'Uninstall GitHub'}).click();
  const question = page.getByTestId('library-uninstall');
  await expect(question.getByRole('heading', {name: 'Uninstall GitHub?'})).toBeVisible();
  await expect(question).toContainText('by a2uiverse-apps');
  await expect(question).toContainText(
    'This also signs out its two accounts, me@example.com and work@example.com. Answers already on your canvases stay as they are.',
  );
  await expect(page).toHaveScreenshot('library-l10-uninstall.png');

  // After: back on the list, the app gone, each account whose access stayed named.
  await question.getByRole('button', {name: 'Uninstall'}).click();
  const notice = page.getByTestId('library-uninstalled');
  await expect(notice).toContainText('GitHub is uninstalled and its accounts are signed out.');
  await expect(notice).toContainText(
    'GitHub couldn’t be reached to cancel the access of work@example.com. You can remove that access from your GitHub account’s settings.',
  );
  await expect(page.getByTestId('library-list')).toBeVisible();
  await expect(row(page, 'github')).toHaveCount(0);
  await expect(page.getByTestId('library-label')).toContainText('Your apps · 5');

  // Refused: nothing changed, said atop the list.
  const shopA = await openApp(page, 'shop-a');
  await shopA.getByRole('button', {name: 'Uninstall Shop A'}).click();
  await expect(page.getByTestId('library-uninstall')).toHaveText(
    /Answers already on your canvases stay as they are\./,
  );
  await page.getByTestId('library-uninstall').getByRole('button', {name: 'Uninstall'}).click();
  await expect(shopA.getByRole('button', {name: 'Uninstall Shop A'})).toBeEnabled();
  await shopA.getByRole('link', {name: 'Your apps'}).click();
  await expect(page.getByTestId('library-list').getByRole('alert')).toContainText(
    'Shop A couldn’t be uninstalled, so nothing changed.',
  );
});

test('L11 · landed on an app whose sign-in isn’t supported here', async ({page}) => {
  // GitHub's card asking a sign-in A2UIVerse can't run: the one read the world doesn't hold.
  await patchRead<Installed[]>(
    page,
    '**/registry/apps.json',
    () => true,
    apps =>
      apps.map(app =>
        app.id === 'github'
          ? {
              ...app,
              card: {
                ...app.card,
                securitySchemes: {signIn: {type: 'mutualTLS'}},
                security: [{signIn: []}],
              },
            }
          : app,
      ),
  );
  await patchRead<LibraryApp[]>(
    page,
    '**/auth/accounts.json',
    () => true,
    apps => withAccounts(apps, 'github', app => ({...app, signIn: 'unsupported', accounts: []})),
  );
  const view = await openApp(page, 'github');
  await expect(view.getByTestId('library-unsupported')).toContainText(
    'Signing in to GitHub isn’t supported here. It stays installed, but it can’t show anything that needs a sign-in. An update from its publisher may change that.',
  );
  await expect(view).toContainText('No accounts.');
  await expect(view.getByRole('button', {name: 'Add account'})).toHaveCount(0);
  await expect(page).toHaveScreenshot('library-l11-not-supported.png');
});

test('an app not installed: its view says so and points to the Store', async ({page}) => {
  await openPage(page, '/?page=library&app=linear');
  const missing = page.getByTestId('library-not-installed');
  await expect(missing).toContainText('This app isn’t installed.');
  await expect(missing.getByRole('link', {name: 'Find it in the Store'})).toBeVisible();
  // The installed list unread: the page says so.
  await answer(page, '**/registry/apps.json', {}, 502);
  await openPage(page, '/?page=library');
  await expect(page.getByTestId('library-unreached')).toContainText(
    'Your apps can’t be read right now.',
  );
});
