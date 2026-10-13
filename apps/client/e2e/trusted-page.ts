/**
 * The trusted page over the replay suite's fixed world (task-14.10 decision 14): the preview server
 * answers every read the page makes from the world shipped with the registry snapshot; each test
 * answers the writes it makes, and overrides the one read its board needs the world not to hold.
 * The boards are drawn at 1200 × 780 (decision 16), the clock fixed on the morning the world was
 * checked, so a time or a date on the page reads the same on every run.
 */
import {expect, type Page, type Route} from '@playwright/test';

/** The frame every board of the UI reference canvas is drawn in. */
export const BOARD = {width: 1200, height: 780};

/** The world's morning: the update check at 9:02, the samples captured the same day. */
export const WORLD_TIME = new Date('2026-10-13T09:02:00Z');

/** Opens the trusted page at an address over a fresh session, the clock fixed. */
export async function openPage(page: Page, address: string) {
  await page.clock.setFixedTime(WORLD_TIME);
  await page.goto(address);
  await expect(page.getByTestId('trusted-page-overlay')).toBeVisible();
}

/** A gate an answer waits on, opened once: what a board drawn mid-act is taken under. */
export function gate() {
  let open!: () => void;
  const opened = new Promise<void>(resolve => (open = resolve));
  return {opened, open};
}

/** Each request to `url` answered with `body` — as JSON, at `status` — the orchestrator's way. */
export function answer(page: Page, url: string, body: unknown, status = 200) {
  return page.route(url, route => route.fulfill({status, json: body}));
}

/**
 * The world's answer to a read, changed by `patch` while `when` holds, else as the world has it. A
 * read the page dropped on its way elsewhere is let go.
 */
export function patchRead<T>(page: Page, url: string, when: () => boolean, patch: (body: T) => T) {
  return page.route(url, async (route: Route) => {
    if (!when()) return route.fallback();
    try {
      const response = await route.fetch();
      await route.fulfill({response, json: patch((await response.json()) as T)});
    } catch (err) {
      if (!page.isClosed() && !/disposed|closed|canceled|cancelled/i.test(String(err))) throw err;
    }
  });
}

/** The Store's reads refused, as the orchestrator answers when the marketplace is unreached. */
export function storeUnreached(page: Page) {
  return page.route(/\/marketplace\//, route =>
    route.fulfill({status: 502, json: {ok: false, reason: 'unreached'}}),
  );
}

/** Every sample on the page drawn: none still loading, none failed. */
export async function samplesDrawn(page: Page, count: number) {
  const samples = page.getByTestId('store-sample');
  await expect(samples).toHaveCount(count);
  await expect(page.locator('[data-testid="store-sample"]:not([data-status="ready"])')).toHaveCount(
    0,
    {timeout: 30_000},
  );
}
