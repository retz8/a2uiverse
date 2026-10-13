/**
 * Publish, live (task-14.10 decision 8), under a name claimed on the page: the claim with its
 * secret shown once; sign-out, and sign-in with that secret; Shop B's sample captured on its demo
 * key as its publisher would on their terminal, then Shop B published from its packed folder with
 * that sample file and listed; a pack of its catalog with a component removed refused with the
 * Store's findings; unpublish; sign-out. Shop B is neither published nor installed by the launcher.
 */
import {expect, test} from '@playwright/test';
import type {Page} from '@playwright/test';
import {signOutPublisher} from './orchestrator';
import {capturePreview, componentRemoved, pack, type Pack} from './packs';
import {SHOP_B_CARD} from './stack';

const NAME = 'e2e-northlight';

let shopB: Pack;
let breaking: Pack;

test.beforeAll(async () => {
  shopB = await pack('shop-b', 'shop-b');
  breaking = await pack('shop-b', 'shop-b-breaking', componentRemoved('Video'));
});

test.afterAll(async () => {
  await signOutPublisher();
});

/** The publish form filled: the app's id, its address, its packed folder and its sample file. */
async function fill(page: Page, folder: string, sample: string) {
  const form = page.getByTestId('publish-form');
  const appId = form.getByLabel('App name in the Store (app id)');
  if (await appId.isEditable()) await appId.fill('shop-b');
  await form.getByLabel('Your app’s address (card URL)').fill(SHOP_B_CARD);
  await form.getByLabel('Choose packed folders').setInputFiles(folder);
  await form.getByLabel('Choose the sample answer file').setInputFiles(sample);
  return form;
}

test('a name claimed on the page publishes Shop B, is refused a breaking schema, and unpublishes', async ({
  page,
}) => {
  await page.goto('/?page=publish');
  const overlay = page.getByTestId('trusted-page-overlay');

  // The claim: the secret shown once, kept by no page.
  const claim = overlay.getByRole('form', {name: 'Claim a publisher name'});
  await claim.getByLabel('Publisher name').fill(NAME);
  await claim.getByRole('button', {name: 'Claim'}).click();
  const shown = overlay.getByTestId('publish-token');
  await expect(shown).toContainText(`“${NAME}” is yours`);
  const token = (await shown.locator('code').textContent())!.trim();
  await shown.getByLabel('I’ve saved it somewhere safe').check();
  await shown.getByRole('button', {name: 'Continue'}).click();
  await expect(overlay.getByTestId('publish-empty')).toBeVisible();

  // Sign out asks once; sign in with the secret.
  await overlay.getByTestId('publish-bar').getByRole('button', {name: 'Sign out'}).click();
  await page.getByTestId('publish-sign-out').getByRole('button', {name: 'Sign out'}).click();
  const signIn = overlay.getByRole('form', {name: 'Sign in as a publisher'});
  await signIn.getByLabel('Publisher name').fill(NAME);
  await signIn.getByLabel('Your publisher secret (token)').fill(token);
  await signIn.getByRole('button', {name: 'Sign in'}).click();
  await expect(overlay.getByTestId('publish-empty')).toBeVisible();

  // Shop B published from its packed folder with the sample its publisher captured.
  const sample = await capturePreview('shop-b', SHOP_B_CARD, shopB, NAME);
  await overlay
    .getByTestId('publish-empty')
    .getByRole('button', {name: /Publish/})
    .click();
  let form = await fill(page, shopB.dir, sample);
  await form.getByRole('button', {name: 'Publish', exact: true}).click();
  await expect(overlay.getByTestId('publish-published')).toBeVisible({timeout: 120_000});
  await expect(overlay.getByTestId('publish-published')).toContainText('Shop B');
  await overlay.getByRole('button', {name: 'Back to your apps'}).click();
  const listing = overlay.getByTestId('publish-listing');
  await expect(listing).toHaveCount(1);
  await expect(listing).toContainText('Shop B');

  // An update with a component taken out of the schema: refused, the Store's findings in its words.
  await listing.getByRole('button', {name: 'Publish an update'}).click();
  form = await fill(page, breaking.dir, sample);
  await form.getByRole('button', {name: 'Publish', exact: true}).click();
  const refused = overlay.getByTestId('publish-refused');
  await expect(refused).toBeVisible({timeout: 120_000});
  await expect(refused).toContainText('Video');

  // Unpublish asks once; the listing goes.
  await overlay.getByRole('link', {name: 'Your apps in the Store'}).click();
  await overlay.getByTestId('publish-listing').getByRole('button', {name: 'Unpublish'}).click();
  await page
    .getByTestId('publish-unpublish')
    .getByRole('button', {name: /Unpublish/})
    .click();
  await expect(overlay.getByTestId('publish-empty')).toBeVisible({timeout: 60_000});

  // Signed out at the end, as the story found it.
  await overlay.getByTestId('publish-bar').getByRole('button', {name: 'Sign out'}).click();
  await page.getByTestId('publish-sign-out').getByRole('button', {name: 'Sign out'}).click();
  await expect(overlay.getByTestId('publish-signed-out')).toBeVisible();
});
