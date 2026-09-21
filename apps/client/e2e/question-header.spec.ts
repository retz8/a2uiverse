/**
 * The question as the canvas's header (task 7.14), drawn to the design canvas's Final page at its
 * 1440×900: the user's words at the top from Enter until the next question, the progress line
 * under them, and a paragraph past four lines clipped with "Show all" opening it over the page.
 * Driven off `?beat=`, zero LLM.
 */
import {test, expect} from '@playwright/test';
import type {Page} from '@playwright/test';

test.use({viewport: {width: 1440, height: 900}});

const UTTERANCE = "what's the status of what I'm working on?";

async function settle(page: Page, beats: string) {
  await page.goto(`/?beat=${beats}&instant`);
  await expect(page.locator('main[data-replay="done"]')).toBeAttached({timeout: 30_000});
  await expect(page.getByTestId('canvas-stage-content')).not.toBeEmpty();
}

test('while the plan is made the question heads an otherwise empty canvas', async ({page}) => {
  await page.goto('/?beat=9');
  const question = page.getByTestId('canvas-question');
  await expect(question).toHaveText(UTTERANCE);
  await expect(page.getByTestId('canvas-pending')).toContainText('Planning which apps can answer');
  await expect(page.getByTestId('canvas-empty-ghost')).toHaveCount(0);
  // The strip names the app; the turn's activity is the head's.
  await expect(page.getByTestId('canvas-status')).toHaveText('A2UIVerse');
});

test('landed: the question stands, a tick per source, the join in the past tense', async ({
  page,
}) => {
  await settle(page, '9');
  await expect(page.getByTestId('canvas-question')).toHaveText(UTTERANCE);
  await expect(page.getByTestId('canvas-question')).toHaveAttribute('data-register', 'display');
  const progress = page.getByTestId('canvas-progress');
  for (const app of ['Linear', 'GitHub', 'CircleCI']) {
    await expect(progress.locator('[data-status="done"]', {hasText: app})).toBeVisible();
  }
  await expect(progress).toContainText('Joined Linear, GitHub and CircleCI');
  await expect(page.getByTestId('canvas-pending')).toHaveCount(0);
  await expect(page).toHaveScreenshot('question-header-landed.png');
});

test('the header opens the palette holding the question', async ({page}) => {
  await settle(page, '9');
  await page.getByTestId('canvas-question').click();
  await expect(page.getByRole('textbox', {name: 'Ask the agent'})).toHaveValue(UTTERANCE);
});

test('a paragraph past four lines is clipped, "Show all" says how much is hidden', async ({
  page,
}) => {
  await settle(page, 'long-question');
  const question = page.getByTestId('canvas-question');
  await expect(question).toHaveAttribute('data-register', 'long');
  await expect(question).toHaveClass(/canvas-question--clipped/);
  expect((await question.boundingBox())?.height).toBe(120);
  await expect(
    page.getByRole('button', {name: /Show the whole question, \d more lines/}),
  ).toBeVisible();
  await expect(page).toHaveScreenshot('question-header-clipped.png');
});

test('"Show all" opens the whole question over the page, nothing beneath moving', async ({
  page,
}) => {
  await settle(page, 'long-question');
  const table = page.getByTestId('canvas-stage-content');
  const before = await table.boundingBox();
  await page.getByRole('button', {name: /Show the whole question/}).click();
  const overlay = page.getByRole('dialog', {name: 'Your question'});
  await expect(overlay).toContainText(
    "What's the status of what I'm working on, and is anything blocked?",
  );
  expect(await table.boundingBox()).toEqual(before);
  await expect(page).toHaveScreenshot('question-header-show-all.png', {
    mask: [page.locator('.canvas-question-when')],
  });
  await page.keyboard.press('Escape');
  await expect(overlay).toHaveCount(0);
});
