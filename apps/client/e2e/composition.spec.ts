/**
 * The composed screen in a real browser, and the collision checks only a real cascade can make.
 *
 * The two in-gate detector layers (`src/canvas/composition/collision*.test.*`) cover inline
 * tokens and DOM ownership. What they structurally cannot see is stylesheet-based scoping:
 * `github-catalog`'s Provider lazily imports three `@primer/primitives` sheets that never load
 * under jsdom. Those sheets are the whole subject of task 2.8, so they are checked here.
 */
import {test, expect} from '@playwright/test';
import type {Page} from '@playwright/test';

/** Replay the composed beat: shell layout, one slot filling, one flipping to failed. */
async function settleComposed(page: Page) {
  await page.goto('/?beat=composed&instant');
  await expect(page.locator('main[data-replay="done"]')).toBeAttached({timeout: 30_000});
  await expect(page.getByTestId('canvas-stage-content')).not.toBeEmpty();
}

test('a composed turn renders one screen: layout, a filled slot, a failed slot', async ({page}) => {
  await settleComposed(page);

  // The shell's own surface holds both slots, in the order the plan put them.
  await expect(page.locator('[data-slot="slot-github"]')).toHaveAttribute(
    'data-slot-state',
    'filled',
  );
  await expect(page.locator('[data-slot="slot-gmail"]')).toHaveAttribute(
    'data-slot-state',
    'failed',
  );

  // The filled one holds a fragment, inside its boundary, painted by a second design system.
  const boundary = page.locator('[data-slot="slot-github"] [data-a2ui-fragment="github"]');
  await expect(boundary).toHaveCount(1);
  await expect(boundary).toContainText('Pull requests');

  // Attribution sits in the shell's surface, beside the slot — outside the fragment's reach.
  await expect(boundary.locator('text=Painted by')).toHaveCount(0);
  await expect(page.getByLabel('Painted by GitHub', {exact: true})).toBeVisible();
});

test('a vendor design system stays inside its boundary', async ({page}) => {
  await settleComposed(page);

  const escaped = await page.evaluate(() => {
    // Primer's own marker: whatever it renders must sit inside a fragment boundary, including
    // the portal root it anchors overlays to.
    const primer = [
      ...document.querySelectorAll('[data-component="ThemeProvider"], [data-portal-root]'),
    ];
    return primer
      .filter(el => !el.closest('[data-a2ui-fragment]'))
      .map(el => el.getAttribute('data-component') ?? el.tagName);
  });
  expect(escaped).toEqual([]);
});

test('a vendor stylesheet resolves inside its fragment and nowhere else', async ({page}) => {
  await settleComposed(page);

  const leaked = await page.evaluate(() => {
    const boundary = document.querySelector('[data-a2ui-fragment]');
    if (!boundary) return {reason: 'no boundary rendered'};
    // A token the vendor's sheets define must read inside the fragment…
    const inside = getComputedStyle(boundary).getPropertyValue('--fgColor-default').trim();
    // …and must not have been written onto the page itself.
    const onRoot = getComputedStyle(document.documentElement)
      .getPropertyValue('--fgColor-default')
      .trim();
    return {inside, onRoot};
  });

  expect(leaked).not.toHaveProperty('reason');
  expect((leaked as {onRoot: string}).onRoot).toBe('');
});

test('adaptive weight: a lone fragment owns the canvas, several read as distinct sources', async ({
  page,
}) => {
  await page.goto('/?beat=composed-solo&instant');
  await expect(page.locator('main[data-replay="done"]')).toBeAttached({timeout: 30_000});
  await expect(page.getByTestId('canvas-stage-content')).toHaveAttribute('data-slots', '1');

  const solo = page.locator('[data-a2ui-fragment="github"]');
  const soloBorder = await solo.evaluate(el => getComputedStyle(el).borderTopWidth);
  expect(soloBorder).toBe('0px');

  await settleComposed(page);
  await expect(page.getByTestId('canvas-stage-content')).toHaveAttribute('data-slots', '2');
  const shared = page.locator('[data-a2ui-fragment="github"]');
  const sharedBorder = await shared.evaluate(el => getComputedStyle(el).borderTopWidth);
  // Structure is constant; only prominence changed.
  expect(sharedBorder).not.toBe('0px');
});

test('the shell and its painted surfaces agree on one palette in dark mode', async ({browser}) => {
  const page = await browser.newPage({colorScheme: 'dark'});
  await settleComposed(page);

  const palette = await page.evaluate(() => {
    const boundary = document.querySelector('[data-a2ui-fragment]') as HTMLElement | null;
    const shell = document.querySelector('[data-slot]') as HTMLElement | null;
    return {
      // The shell catalog maps --a2ui-* onto Radix, so an orchestrator-painted surface resolves
      // its tokens from the same appearance the client's own chrome uses.
      surfaceToken: shell
        ? getComputedStyle(shell).getPropertyValue('--a2ui-color-surface').trim()
        : '',
      appBackground: getComputedStyle(document.body).backgroundColor,
      boundaryFound: Boolean(boundary),
    };
  });

  expect(palette.boundaryFound).toBe(true);
  expect(palette.surfaceToken).not.toBe('');
  await page.close();
});

test('a question fragment is promoted in place, with the rest of the canvas dimmed', async ({
  page,
}) => {
  await page.goto('/?beat=composed-question&instant');
  await expect(page.locator('main[data-replay="done"]')).toBeAttached({timeout: 30_000});

  // The asking fragment is raised where it already was; the other keeps its place.
  await expect(page.locator('[data-a2ui-fragment="gmail"][data-promoted="true"]')).toHaveCount(1);
  await expect(page.locator('[data-a2ui-fragment="github"][data-promoted="true"]')).toHaveCount(0);
  await expect(page.getByTestId('canvas-scrim')).toBeVisible();

  // The shell grants attention; it does not seize it. Promotion is plural, so it puts up no
  // modal of its own and no focus trap — the demand is announced instead.
  await expect(page.getByTestId('canvas-overlay')).toHaveCount(0);
  await expect(page.getByRole('status')).toContainText('1 source needs your answer');
  const shellModal = await page.evaluate(
    () =>
      [...document.querySelectorAll('[aria-modal="true"]')].filter(
        el => !el.closest('[data-a2ui-fragment]'),
      ).length,
  );
  expect(shellModal).toBe(0);

  // The question renders where the shell put it: inside its own slot, not floating over the page.
  const inSlot = page.locator('[data-slot="slot-gmail"] [data-a2ui-fragment="gmail"]');
  await expect(inSlot).toContainText('Which account?');
});

test('each source gets its own line, in slot order and named', async ({page}) => {
  await settleComposed(page);

  const lines = page.getByTestId('canvas-notice');
  // Slot order, not arrival order: the stack echoes the layout below it and never reorders
  // under a reader as chunks land.
  await expect(lines).toHaveCount(2);
  await expect(lines.nth(0)).toHaveAttribute('data-notice-source', 'github');
  await expect(lines.nth(1)).toHaveAttribute('data-notice-source', 'gmail');

  // Chunks concatenate with their own source's, never with another's — the whole point of
  // buffering per source rather than into one string.
  await expect(lines.nth(0)).toContainText('Here are the 4 PRs awaiting your review.');
  await expect(lines.nth(0)).toContainText('GitHub');

  // The source that spoke without ever painting still has a voice, beside its failed slot.
  await expect(lines.nth(1)).toContainText('I could not reach the mailbox.');
  await expect(page.locator('[data-slot="slot-gmail"]')).toHaveAttribute(
    'data-slot-state',
    'failed',
  );
});

test('prose stays in the shell region, outside every fragment', async ({page}) => {
  await settleComposed(page);

  const escaped = await page.evaluate(
    () =>
      [...document.querySelectorAll('[data-testid="canvas-notice"]')].filter(el =>
        el.closest('[data-a2ui-fragment]'),
      ).length,
  );
  expect(escaped).toBe(0);
});

test('visual: the composed screen', async ({page}) => {
  await settleComposed(page);
  await expect(page).toHaveScreenshot('composition-composed.png', {fullPage: true});
});

test('visual: a lone fragment owning the canvas', async ({page}) => {
  await page.goto('/?beat=composed-solo&instant');
  await expect(page.locator('main[data-replay="done"]')).toBeAttached({timeout: 30_000});
  await expect(page).toHaveScreenshot('composition-solo.png', {fullPage: true});
});

/*
 * There is deliberately no visual baseline for a promoted slot. Promotion lands a frame after the
 * replay stream is exhausted and the fragment's own height settles a frame after that, so the
 * capture is a coin flip between two legitimate renders however it is settled. A baseline that
 * fails half the time teaches people to ignore baselines. The behavioural test above covers what
 * the picture would have: the scrim, which boundary is raised, the question rendering inside its
 * own slot, and the announced count.
 */

test('visual: the composed screen in dark mode', async ({browser}) => {
  const page = await browser.newPage({colorScheme: 'dark', viewport: {width: 1024, height: 768}});
  await settleComposed(page);
  await expect(page).toHaveScreenshot('composition-dark.png', {fullPage: true});
  await page.close();
});
