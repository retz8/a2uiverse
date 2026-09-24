/**
 * Late arrival and failure (Phase 8, task 8.6 decision 6): the state each of the phase's synthetic
 * beats lands on, at the design canvas's 1440×900 — the failure tile of board F6 in each of its
 * causes, the row above the merged view's label with Include, each collapse's one line, the decline
 * with Include beneath it, the merge waiting on its home source, and the view a press made whole.
 * Driven off `?beat=`, zero LLM; a case up to its press ends there (`-offered`), and the presses
 * fire through the buttons' own handler, answered from the beat.
 */
import {test, expect} from '@playwright/test';
import type {Page} from '@playwright/test';

test.use({viewport: {width: 1440, height: 900}});

const MERGE = '[data-slot="shell"]';
const slot = (page: Page, source: string) => page.locator(`[data-slot="${source}"]`);

/** Replay `beat` instantly and wait for it to finish. */
async function landed(page: Page, beat: string) {
  await page.goto(`/?beat=${beat}&instant`);
  await expect(page.locator('main[data-replay="done"]')).toBeAttached({timeout: 30_000});
}

test('the failure tile: the vendor’s words as its one statement, Retry; its column failed', async ({
  page,
}) => {
  await landed(page, 'fast-failure-offered');
  const tile = slot(page, 'shop-c');
  await expect(tile).toHaveAttribute('data-slot-state', 'failed');
  await expect(tile.locator('[data-slot-failure-line]')).not.toContainText('Fieldstone');
  await expect(tile.getByRole('button', {name: 'Retry'})).toBeEnabled();
  await expect(tile.locator('[data-slot-failure-words]')).toHaveCount(0);
  await expect(page.locator(`${MERGE} [data-column-reserved="failed"]`)).not.toHaveCount(0);
  await expect(page).toHaveScreenshot('late-failure-tile.png');
});

test('the tile at the hard cap: no answer within the time allowed', async ({page}) => {
  await landed(page, 'held-retry-offered');
  await expect(slot(page, 'shop-c').locator('[data-slot-failure-line]')).toHaveText(
    'No answer within the time allowed.',
  );
  await expect(page).toHaveScreenshot('late-failure-timeout.png');
});

test('a half-drawn fragment: taken off for the tile, the source unreachable', async ({page}) => {
  await landed(page, 'half-drawn');
  await expect(slot(page, 'shop-c').locator('[data-slot-failure-line]')).toHaveText(
    'Couldn’t be reached.',
  );
  await expect(page.getByText('Lumen X100 kit')).toHaveCount(0);
  await expect(page).toHaveScreenshot('late-failure-half-drawn.png');
});

test('a paint the client cannot draw: failed once the report is answered', async ({page}) => {
  await landed(page, 'invalid-paint');
  await expect(slot(page, 'shop-c').locator('[data-slot-failure-line]')).toHaveText(
    'Answered, but its screen couldn’t be shown.',
  );
  await expect(page).toHaveScreenshot('late-failure-invalid.png');
});

test('a late arrival: the row above the label with Include; its column not included', async ({
  page,
}) => {
  await landed(page, 'late-include-offered');
  const view = page.locator(MERGE);
  await expect(view.locator('[data-slot-press-row]')).toHaveText(
    'Fieldstone arrived after this merge.Include',
  );
  await expect(view.locator('[data-column-reserved="late"]')).not.toHaveCount(0);
  await expect(page).toHaveScreenshot('late-failure-late-row.png');
});

test('a failed fold-in: the landed view kept, Include again', async ({page}) => {
  await landed(page, 'failed-fold-in');
  await expect(page.locator(MERGE).getByRole('button', {name: 'Include again'})).toBeEnabled();
  await expect(page).toHaveScreenshot('late-failure-failed-fold-in.png');
});

test('the merge waiting on its home source: the skeleton held, the stragglers’ peers in', async ({
  page,
}) => {
  await page.goto('/?beat=home-straggling-waiting');
  for (const source of ['shop-b', 'shop-c']) {
    await expect(slot(page, source)).toHaveAttribute('data-slot-state', 'filled', {
      timeout: 30_000,
    });
  }
  await expect(slot(page, 'shop-a')).toHaveAttribute('data-slot-state', 'pending');
  await expect(page.locator(MERGE)).toHaveAttribute('data-slot-state', 'pending');
  await expect(page).toHaveScreenshot('late-failure-home-waiting.png');
});

test('the home source failed: the merge collapses to its line, the fragments moved up', async ({
  page,
}) => {
  await landed(page, 'home-retry-offered');
  await expect(page.locator(`${MERGE} [data-slot-collapse="home"]`)).toHaveText(
    'Can’t join without Aperture & Co cameras.',
  );
  await expect(page.locator(`${MERGE} tbody tr[data-skeleton-row]`)).toHaveCount(0);
  await expect(page).toHaveScreenshot('late-failure-home-collapsed.png');
});

test('fewer than two sources: the collapse line names who answered', async ({page}) => {
  await landed(page, 'too-few');
  await expect(page.locator(`${MERGE} [data-slot-collapse="few"]`)).toHaveText(
    'Only Aperture & Co answered, so there’s nothing to merge.',
  );
  await expect(page).toHaveScreenshot('late-failure-too-few.png');
});

test('the merged view couldn’t be made: its line with Try again', async ({page}) => {
  await landed(page, 'try-again-offered');
  await expect(page.locator(`${MERGE} [data-slot-collapse="unmade"]`)).toContainText(
    'The merged view couldn’t be made.',
  );
  await expect(page.locator(MERGE).getByRole('button', {name: 'Try again'})).toBeEnabled();
  await expect(page).toHaveScreenshot('late-failure-unmade.png');
});

test('a decline: the Synthesizer’s reason, a later source offered Include beneath it', async ({
  page,
}) => {
  await landed(page, 'include-after-decline-offered');
  await expect(page.locator(`${MERGE} [data-slot-declined]`)).toContainText(
    'Northlight lists these cameras under other names',
  );
  await expect(page.locator(MERGE).getByRole('button', {name: 'Include'})).toBeEnabled();
  await expect(page).toHaveScreenshot('late-failure-declined-include.png');
});

test('after Retry: the retried source folded in, every column filled, nothing offered', async ({
  page,
}) => {
  await landed(page, 'fast-failure');
  await expect(slot(page, 'shop-c')).toHaveAttribute('data-slot-state', 'filled');
  await expect(page.locator(`${MERGE} [data-column-reserved]`)).toHaveCount(0);
  await expect(page.locator(`${MERGE} [data-slot-press-row]`)).toHaveCount(0);
  await expect(page).toHaveScreenshot('late-failure-retried.png');
});
