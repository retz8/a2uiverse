/**
 * Durable composition (Phase 9, task 9.8 decision 6): where each of the phase's recorded beats
 * 19–25 ends, and the two states only a paced synthetic replay rests on — a tab still loading behind
 * the live one, and the merge line working after a step back to a combination never merged. Driven
 * off `?beat=`, zero LLM; the questions, actions, presses, steps, views and closes fire through the
 * canvas's own handlers, answered from the beat. The clocks are masked; the baselines are 9.9's.
 */
import {test, expect} from '@playwright/test';
import type {Page} from '@playwright/test';

test.use({viewport: {width: 1440, height: 900}});

const shot = (page: Page) => ({
  mask: [
    page.locator('.canvas-progress'),
    page.locator('.canvas-trail-meta'),
    page.locator('.canvas-band-note'),
  ],
});

/** Replay `beat` instantly and wait for it to finish. */
async function landed(page: Page, beat: string) {
  await page.goto(`/?beat=${beat}&instant`);
  await expect(page.locator('main[data-replay="done"]')).toBeAttached({timeout: 30_000});
}

const entries = (page: Page) => page.getByTestId('canvas-trail-entry');
const stage = (page: Page) => page.getByTestId('canvas-stage-content');

async function openTrail(page: Page) {
  await page.getByRole('button', {name: 'Trail'}).click();
  await expect(page.getByRole('navigation', {name: 'Trail of past canvases'})).toBeVisible();
}

test('beat 19: the entity join finished behind the live canvas, viewed with its merge', async ({
  page,
}) => {
  await landed(page, '19');
  await expect(page.getByTestId('canvas-band')).toBeVisible();
  await expect(page.locator('[data-slot="shell"]')).toHaveAttribute('data-slot-state', 'filled');
  await openTrail(page);
  await expect(entries(page)).toHaveCount(2);
  await expect(entries(page).nth(0)).toHaveAttribute('data-live', 'true');
  await expect(entries(page).nth(1)).toHaveAttribute('data-viewing', 'true');
  await expect(entries(page).nth(1)).not.toHaveAttribute('data-loading', 'true');
  await expect(page).toHaveScreenshot('durable-background-tab.png', shot(page));
});

test('beat 20: the event opened and Gmail retried in the past canvas', async ({page}) => {
  await landed(page, '20');
  await expect(page.getByTestId('canvas-band')).toBeVisible();
  await expect(page.locator('[data-slot="gmail"]')).toHaveAttribute('data-slot-state', 'filled');
  await expect(stage(page).getByRole('button', {name: /^Back/})).toHaveCount(1);
  await openTrail(page);
  await expect(entries(page)).toHaveCount(2);
  await expect(page).toHaveScreenshot('durable-past-action.png', shot(page));
});

test('beat 21: asked again and asked from the view, both children of the first', async ({page}) => {
  await landed(page, '21');
  await openTrail(page);
  await expect(entries(page)).toHaveCount(4);
  await expect(entries(page).nth(0)).toHaveAttribute('data-branch', 'true');
  await expect(entries(page).nth(1)).toHaveAttribute('data-branch', 'true');
  await expect(page).toHaveScreenshot('durable-ask-again.png', shot(page));
});

test('beat 22: added, dropped and compared, each asked from side by side', async ({page}) => {
  await landed(page, '22');
  await expect(page.locator('[data-slot="shell"]')).toHaveAttribute('data-slot-state', 'filled');
  await openTrail(page);
  await expect(entries(page)).toHaveCount(4);
  await expect(entries(page).nth(0)).toHaveAttribute('data-branch', 'true');
  await expect(entries(page).nth(1)).toHaveAttribute('data-branch', 'true');
  await expect(page).toHaveScreenshot('durable-add-drop.png', shot(page));
});

for (const [beat, name] of [
  ['23', 'durable-step-seen.png'],
  ['24', 'durable-step-unseen.png'],
] as const) {
  test(`beat ${beat}: CircleCI stepped back, Forward beside its marker, the view standing`, async ({
    page,
  }) => {
    await landed(page, beat);
    await expect(stage(page).getByRole('button', {name: /^Forward/})).toHaveCount(1);
    await expect(page.locator('[data-slot="shell"]')).toHaveAttribute('data-slot-state', 'filled');
    await expect(page).toHaveScreenshot(name, shot(page));
  });
}

test('beat 25: the loading canvas closed, the canvas empty', async ({page}) => {
  await landed(page, '25');
  await expect(page.getByRole('button', {name: 'Trail'})).toBeDisabled();
  await expect(page).toHaveScreenshot('durable-close-loading.png', shot(page));
});

test('a tab still loading behind the live one: its entry marked loading', async ({page}) => {
  // Paced, so the first canvas's home store is held back while the second has landed.
  await page.goto('/?beat=background-tab-running');
  await expect(page.getByRole('button', {name: 'Trail'})).toBeEnabled({timeout: 30_000});
  await openTrail(page);
  await expect(entries(page)).toHaveCount(2, {timeout: 30_000});
  await expect(entries(page).nth(1)).toHaveAttribute('data-loading', 'true');
  await expect(entries(page).nth(0)).toHaveAttribute('data-live', 'true');
  await expect(page).toHaveScreenshot('durable-background-running.png', shot(page));
});

test('an unseen step: the merge line working until the walk’s view lands', async ({page}) => {
  // Paced, so the step's answer is held back and the line rests working once the step is taken.
  await page.goto('/?beat=step-unseen-working');
  await expect(stage(page).getByRole('button', {name: /^Forward to/})).toHaveCount(1, {
    timeout: 30_000,
  });
  await expect(
    page.locator('.canvas-progress-step[data-status="working"]', {hasText: 'Joining'}),
  ).toBeVisible();
  await expect(page).toHaveScreenshot('durable-step-working.png', shot(page));
});
