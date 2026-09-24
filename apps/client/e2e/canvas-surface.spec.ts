/**
 * Surface baselines: the recorded beats painted through the full canvas, stage unmasked — the
 * Primer-rendered vendor fragment is the subject. Driven off `?beat=<n>&instant`, zero LLM.
 * The chrome spec keeps guarding the shell over synthetic paints; this one guards what a
 * recorded vendor paint looks like, which is what a catalog-package swap would change.
 */
import {test, expect} from '@playwright/test';
import type {Page} from '@playwright/test';

const surfaceShot = (_page: Page) => ({fullPage: true});

/** Replay the listed beats instantly and wait for the whole list to settle. */
async function settle(page: Page, beats: string) {
  await page.goto(`/?beat=${beats}&instant`);
  await expect(page.locator('main[data-replay="done"]')).toBeAttached({timeout: 30_000});
  await expect(page.getByTestId('canvas-stage-content')).not.toBeEmpty();
}

test('beat 1: PR list', async ({page}) => {
  await settle(page, '1');
  await expect(page).toHaveScreenshot('canvas-surface-beat-1.png', surfaceShot(page));
});

test('beat 2: PR detail', async ({page}) => {
  await settle(page, '2');
  await expect(page).toHaveScreenshot('canvas-surface-beat-2.png', surfaceShot(page));
});

test('beat 3: review compose, chained after beat 2', async ({page}) => {
  await settle(page, '2,3');
  await expect(page).toHaveScreenshot('canvas-surface-beat-3.png', surfaceShot(page));
});

/**
 * The layout-only fan-out (task 6.6 decision 7): 5.7's control prompt, two real vendors on one
 * row and no merged view. The baseline showing what real agents produced rather than what we
 * hand-built, so it is the picture to look at when something drifts.
 */
test('beat 4: two vendors side by side, no merged view', async ({browser}) => {
  // The stage scrolls its own content, so `fullPage` cannot reach past the first fragment at
  // the standard viewport. A viewport tall enough to hold both is what makes the baseline mean
  // what it says.
  const page = await browser.newPage({viewport: {width: 1280, height: 1600}});
  await settle(page, '4');

  // Guard the claim the picture is meant to carry, so a diff is never the only signal: two
  // vendor slots, nothing from the shell, and the two on one row.
  await expect(page.getByTestId('canvas-stage-content')).toHaveAttribute('data-slots', '2');
  await expect(page.locator('[data-shell-content]')).toHaveCount(0);
  const boxes = await Promise.all(
    ['gmail', 'calendar'].map(async source => {
      const fragment = page.locator(`[data-a2ui-fragment="${source}"]`);
      await expect(fragment).toHaveCount(1);
      return (await fragment.boundingBox())!;
    }),
  );
  const [gmail, calendar] = boxes;
  expect(Math.abs(gmail.y - calendar.y)).toBeLessThan(8);
  expect(gmail.x + gmail.width <= calendar.x || calendar.x + calendar.width <= gmail.x).toBe(true);

  await expect(page).toHaveScreenshot('canvas-surface-beat-4.png', surfaceShot(page));
  await page.close();
});

/**
 * The temporal merge (task 5.7 decision 11): three real vendors and the Synthesizer's merged
 * view, recorded through the hub. A replay smoke, not a baseline — the merged view is one
 * model's authoring on one day, and its picture would move with every re-recording.
 */
test('beat 5: the temporal merge replays with its merged view as shell content', async ({page}) => {
  await settle(page, '5');
  await expect(page.getByTestId('canvas-stage-content')).toHaveAttribute('data-slots', '4');
  for (const source of ['gmail', 'calendar', 'github']) {
    await expect(page.locator(`[data-a2ui-fragment="${source}"]`)).toHaveCount(1);
  }
  const view = page.locator('[data-shell-content][data-surface^="shell:"]');
  await expect(view).toHaveCount(1);
  await expect(view.locator('[data-state="complete"]').first()).toBeVisible();
  await expect(view.getByLabel('Sort by')).toBeVisible();
});

/**
 * The entity join (task 7.9 decision 7): Linear, GitHub and CircleCI and the merged view with its
 * match claims, recorded through the hub. A replay smoke, as beat 5 is. What holds across
 * recordings: a row's values are joined and unmarked where a fact holds, the issue with no pull
 * request shows empty cells, and a cell showing no value is not a button.
 */
test('beat 9: the entity join replays, its joined values unmarked and its empty cells not buttons', async ({
  page,
}) => {
  await settle(page, '9');
  await expect(page.getByTestId('canvas-stage-content')).toHaveAttribute('data-slots', '4');
  for (const source of ['linear', 'github', 'circleci']) {
    await expect(page.locator(`[data-a2ui-fragment="${source}"]`)).toHaveCount(1);
  }
  const view = page.locator('[data-shell-content][data-surface^="shell:"]');
  await expect(view).toHaveCount(1);
  await expect(view.getByLabel('Sort by')).toBeVisible();
  await expect(view.locator('[data-join="none"]').first()).toBeVisible();
  await expect(view.locator('[data-join="guessed"], [data-join="broken"]')).toHaveCount(0);
  // The attachment the row never had: 0 of 0, the bare dash, nothing drawn on it (task-7.9
  // decision 14) — distinct from a ref that stopped resolving.
  await expect(view.locator('[data-state="empty"]').first()).toBeVisible();
  await expect(view.locator('[data-state="empty"][role="button"]')).toHaveCount(0);
  await expect(view.locator('[data-state="empty"]').first()).toHaveAttribute(
    'data-marked',
    'empty',
  );
  // A joined value says where it came from, by the app's name.
  await expect(view.locator('[aria-label*="From GitHub"]').first()).toBeVisible();
  // The table reads as an answer (task 7.16): the model's title is the small label on the sort
  // control's row, and a pull request is its handle. The deterministic roster holds no failed run
  // on a joined row, so the danger tone is pinned by the shell catalog's own tests.
  const label = view.locator('h5');
  await expect(label).toHaveCount(1);
  const sortTop = (await view.getByLabel('Sort by').boundingBox())!.y;
  const labelBox = (await label.boundingBox())!;
  expect(Math.abs(labelBox.y + labelBox.height / 2 - sortTop - 12)).toBeLessThan(12);
  await expect(view.locator('[data-value]', {hasText: /^#\d+$/}).first()).toBeVisible();
});

/**
 * The shell as an agent (Phase 6), recorded through the hub. Replay smokes, not baselines: the
 * platform answer is one model's wording on one day. What holds across recordings is the shape —
 * the answer is bound to the data model the hub sent, no vendor painted, and the gap is the tile.
 */
test('beat 6: a platform answer renders from its literal data model, no vendor dispatched', async ({
  page,
}) => {
  await settle(page, '6');
  const stage = page.getByTestId('canvas-stage-content');
  await expect(page.locator('[data-a2ui-fragment]')).toHaveCount(0);
  await expect(page.locator('[data-attribution]')).toHaveCount(0);
  // The three installed apps, each a row bound through the template over `/apps`.
  for (const app of ['GitHub', 'Gmail', 'Google Calendar']) {
    await expect(stage.getByRole('row').filter({hasText: app})).toHaveCount(1);
  }
});

/**
 * The mixed utterance (task 6.6 decision 8): the shell's own words from the installed-apps
 * reader — Calendar's description and its skills, bound through the data model — and the one
 * vendor slot in one layout. As recorded, Calendar answered in prose and never painted, so its
 * slot rests on the prose.
 */
test("beat 8: a mixed utterance carries the reader's words and the one vendor slot", async ({
  page,
}) => {
  await settle(page, '8');
  const stage = page.getByTestId('canvas-stage-content');
  await expect(stage).toHaveAttribute('data-slots', '1');
  // The skill names are the card's, stable across recordings; the prose around them is not.
  await expect(stage).toContainText('What is coming up');
  await expect(stage).toContainText('Answering an invitation');
  await expect(page.locator('[data-slot-gap]')).toHaveCount(0);
  await expect(page.locator('[data-slot-resting="prose"]')).toHaveCount(1);
});

test('beat 7: a capability gap is the tile, and the tile opens the Store with the gap', async ({
  page,
}) => {
  await settle(page, '7');
  await expect(page.locator('[data-a2ui-fragment]')).toHaveCount(0);
  const tile = page.locator('[data-slot-state="gap"]');
  await expect(tile).toHaveCount(1);
  const gap = await tile.getAttribute('data-slot-gap');
  expect(gap).toBeTruthy();
  await tile.getByRole('button', {name: 'Search the Store'}).click();
  const overlay = page.getByTestId('trusted-page-overlay');
  await expect(overlay).toHaveAttribute('data-page', 'store');
  await expect(overlay).toHaveAttribute('data-query', gap!);
});
