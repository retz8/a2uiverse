/**
 * The accounts, live (task-14.10 decision 7), on Gmail — the one app whose sign-in window offers two
 * accounts: signed in from the App Library through the real window, with no canvas; its permissions
 * read in the card's own words; renamed; the second account added through the window; each signed
 * out, asked once. It ends with no account, as it began.
 */
import {expect, test} from '@playwright/test';
import type {BrowserContext, Page} from '@playwright/test';
import {signOutAll, waitInstalled} from './orchestrator';

test.beforeAll(async () => {
  await waitInstalled(['gmail']);
});

test.afterAll(async () => {
  await signOutAll('gmail');
});

/** Add account opens the kit's chooser in a window of its own; the account is pressed there. */
async function addAccount(page: Page, context: BrowserContext, account: string) {
  const opened = context.waitForEvent('page');
  await page.getByRole('button', {name: 'Add account'}).click();
  const window = await opened;
  await expect(window.getByRole('heading', {name: 'Choose an account'})).toBeVisible();
  await window.getByRole('button', {name: account}).click();
}

test('Gmail: an account signed in, its permissions read, renamed, a second added, each signed out', async ({
  page,
  context,
}) => {
  await page.goto('/?page=library&app=gmail');
  const accounts = page.getByRole('region', {name: 'Accounts'});
  await expect(accounts).toContainText('No accounts.');
  const rows = accounts.getByTestId('library-account');

  // Signed in with no canvas: the account appears on the page.
  await addAccount(page, context, 'you@example.com');
  await expect(rows).toHaveCount(1, {timeout: 60_000});
  const first = rows.first();
  await expect(first).toContainText('you@example.com');
  await expect(first).toContainText('Signed in');

  // Its permissions, read only, in the card's own words.
  await first.getByRole('button', {name: 'Permissions'}).click();
  await expect(first).toContainText('See your inbox');
  await expect(first).toContainText('To take a permission away, sign out and sign in again.');

  // Renamed: the label the vault holds.
  await first.getByRole('button', {name: 'Rename you@example.com'}).click();
  await first.getByLabel('Account name').fill('Work');
  await first.getByRole('button', {name: 'Save'}).click();
  await expect(first).toContainText('Work');

  // The second account, through the same window.
  await addAccount(page, context, 'you.personal@example.net');
  await expect(rows).toHaveCount(2, {timeout: 60_000});
  await expect(accounts).toContainText('you.personal@example.net');

  // Each signed out, asked once.
  for (const label of ['Work', 'you.personal@example.net']) {
    await accounts.getByRole('button', {name: `Sign out of ${label}`}).click();
    await page.getByTestId('library-sign-out').getByRole('button', {name: 'Sign out'}).click();
    await expect(accounts.getByTestId('library-signed-out')).toContainText(label);
  }
  await expect(rows).toHaveCount(0);
  await expect(accounts).toContainText('No accounts.');
});
