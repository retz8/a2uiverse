/**
 * The store loop, live (task-15.10 decisions 3 and 4): Calendar, published by the dev publisher and
 * left uninstalled by the launcher, offered by the live Planner from the suite's own marketplace.
 *
 * The loop: a question over Gmail and GitHub that also needs a calendar — Calendar offered in its
 * slot beside the merge reserved over them, installed through the consent card over the slot, its
 * sign-in tile and real sign-in window the second step, the slot filling and the merge taking it in.
 *
 * The Store page tied to its slot: More in the Store from a canvas's offer of Calendar, Calendar
 * installed on the page and the slot filling beneath it; another canvas's slot offering Calendar
 * turned to Show it here and pressed.
 *
 * Each story ends with Calendar uninstalled and every account it signed in signed out, as it found
 * the stack (task-14.10 decision 11).
 */
import {expect, test, type BrowserContext, type Locator, type Page} from '@playwright/test';
import {
  ensureUninstalled,
  signInApps,
  signOutAll,
  waitInstalled,
  waitPublished,
} from './orchestrator';

const LOOP_QUESTION =
  'What’s on my calendar today, and what needs my attention in Gmail and GitHub?';
const CALENDAR_QUESTION = 'What’s on my calendar this week?';
const CALENDAR = 'Google Calendar';

test.beforeAll(async () => {
  await waitInstalled(['github', 'gmail']);
  await waitPublished('calendar');
});

test.afterEach(async () => {
  await ensureUninstalled('calendar');
  for (const app of ['github', 'gmail']) await signOutAll(app);
});

/** A question asked at the palette, on a canvas of its own. */
async function ask(page: Page, question: string) {
  const palette = page.getByLabel('Ask the agent');
  if (!(await palette.isVisible())) await page.keyboard.press('ControlOrMeta+k');
  await palette.fill(question);
  await palette.press('Enter');
}

/** The canvas's offer of Calendar, once the live Planner has planned it. */
async function calendarOffer(page: Page): Promise<Locator> {
  const offer = page.locator('[data-slot-state="offer"]').filter({hasText: CALENDAR});
  await expect(offer).toBeVisible({timeout: 120_000});
  return offer;
}

/** Calendar's slot, under whichever of its accounts the install made it. */
const calendarSlot = (page: Page) => page.locator('[data-slot^="calendar."]');

/** The kit's account chooser in a window of its own, the one account pressed there. */
async function signInWindow(context: BrowserContext, press: () => Promise<void>) {
  const opened = context.waitForEvent('page');
  await press();
  const window = await opened;
  await expect(window.getByRole('heading', {name: 'Choose an account'})).toBeVisible();
  await window.getByRole('button', {name: /you/}).click();
}

test('the loop: Calendar offered beside the merge, installed in its slot, signed in, the slot filling and the merge taking it in', async ({
  page,
  context,
}) => {
  await signInApps(['github', 'gmail']);
  await page.goto('/');
  await ask(page, LOOP_QUESTION);
  const offer = await calendarOffer(page);
  await expect(page.locator('[data-a2ui-fragment^="gmail."]').first()).toBeVisible({
    timeout: 120_000,
  });
  await expect(page.locator('[data-a2ui-fragment^="github."]').first()).toBeVisible({
    timeout: 180_000,
  });

  // Install asks first, on the Store's consent card over the slot.
  await offer.getByRole('button', {name: 'Install'}).click();
  const consent = page.getByRole('dialog', {name: `Install ${CALENDAR}?`});
  await expect(consent).toContainText(
    'The first time you use it, Google Calendar will ask you to sign in.',
  );
  await consent.getByRole('button', {name: 'Install'}).click();

  // Installed, the slot is Calendar's: its sign-in tile the second step, through the real window.
  const slot = calendarSlot(page);
  const signIn = slot.getByRole('button', {name: 'Sign in', exact: true});
  await expect(signIn).toBeVisible({timeout: 120_000});
  await signInWindow(context, () => signIn.click());

  // The slot fills with Calendar's answer, and the merge takes it in on arrival.
  await expect(slot.locator('[data-a2ui-fragment]').first()).toBeVisible({timeout: 120_000});
  await expect(page.getByTestId('canvas-progress')).toContainText(/Joined[^·]*Google Calendar/, {
    timeout: 180_000,
  });
});

test('More in the Store: Calendar installed on the page opened from a slot fills it beneath; another canvas’s offer turns to Show it here', async ({
  page,
}) => {
  await page.goto('/');
  await ask(page, CALENDAR_QUESTION);
  await calendarOffer(page);
  await ask(page, CALENDAR_QUESTION);
  const offer = await calendarOffer(page);

  // More in the Store opens the page tied to this slot; the install there fills it beneath.
  await offer.getByRole('button', {name: 'More in the Store'}).click();
  const overlay = page.getByTestId('trusted-page-overlay');
  await expect(overlay).toHaveAttribute('data-page', 'store');
  const row = overlay.locator('[data-testid="store-row"][data-app="calendar"]');
  await row.getByRole('button', {name: `Install ${CALENDAR}`}).click();
  await page
    .getByTestId('consent-card')
    .getByRole('button', {name: 'Install', exact: true})
    .click();
  const done = overlay.getByTestId('store-done');
  await expect(done).toContainText(`${CALENDAR} is installed.`, {timeout: 60_000});
  await done.getByRole('button', {name: 'Back to your canvas'}).click();
  await expect(overlay).toHaveCount(0);
  const slot = calendarSlot(page);
  await expect(slot.getByRole('button', {name: 'Sign in', exact: true})).toBeVisible({
    timeout: 120_000,
  });

  // The first canvas's offer turned: Show it here, one press, no second consent.
  await page.getByRole('button', {name: 'Back', exact: true}).click();
  const first = await calendarOffer(page);
  await first.getByRole('button', {name: 'Show it here'}).click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await expect(calendarSlot(page)).toBeVisible({timeout: 120_000});
  await expect(first).toHaveCount(0);
});
