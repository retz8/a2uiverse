/**
 * One sign-in through the real popup and the authority tile (phase-12 decision 28, task-12.12
 * decision 8): a question naming GitHub, the slot's tile at first paint, Sign in opening the kit's
 * own account chooser in a window of its own, the account pressed there, and the slot painting in
 * place once the orchestrator says the sign-in finished.
 */
import {expect, test} from '@playwright/test';
import {ORCHESTRATOR} from './stack';

const QUESTION = 'Show me the open pull requests on GitHub in a2ui-project/a2ui.';

test.beforeAll(async () => {
  // The launcher installs the app once its card answers, after building and packing its catalog.
  await expect
    .poll(
      async () => {
        const res = await fetch(`${ORCHESTRATOR}/registry/apps.json`).catch(() => undefined);
        const apps = res?.ok ? ((await res.json()) as {id: string}[]) : [];
        return apps.map(app => app.id);
      },
      {timeout: 180_000, intervals: [1_000]},
    )
    .toContain('github');
});

test('a sign-in through the real popup paints the slot in place', async ({page, context}) => {
  await page.goto('/');
  const ask = page.getByLabel('Ask the agent');
  await ask.fill(QUESTION);
  await ask.press('Enter');

  // No account yet: the hub's card check fills the slot with the tile, the agent not called.
  const slot = page.locator('[data-slot="github.1"]');
  const signIn = slot.getByRole('button', {name: 'Sign in', exact: true});
  await expect(signIn).toBeVisible({timeout: 120_000});

  // Opened with noopener, the window is a page of the context's own, not the canvas's popup.
  const opened = context.waitForEvent('page');
  await signIn.click();
  const window = await opened;
  await expect(window.getByRole('heading', {name: 'Choose an account'})).toBeVisible();
  await window.getByRole('button', {name: 'retz8'}).click();

  await expect(slot).not.toContainText('Sign in', {timeout: 120_000});
  await expect(slot.locator('[data-a2ui-fragment]')).toContainText(/pull requests/i, {
    timeout: 120_000,
  });
});
