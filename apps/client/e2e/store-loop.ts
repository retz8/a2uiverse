/**
 * The store loop over the replay suite's fixed world (task-15.10 decisions 6 and 10): the canvas is
 * a replayed beat, its presses left to the reader's hand (`&byhand`) and each answered by its
 * recording; the apps a board needs out of the Store's reach are taken out of the world's installed
 * apps for that test alone — the installed list and each app's entry — and put back once the test
 * answers their install, an update moving the app's version. The fixed world itself is unchanged.
 */
import {expect, type Page} from '@playwright/test';
import {patchRead, WORLD_TIME} from './trusted-page';

/**
 * The world with `ids` uninstalled until `installed` gains them; an app `updatesTo` names, once
 * installed over, at that card version.
 */
export async function uninstalled(
  page: Page,
  ids: readonly string[],
  updatesTo: Readonly<Record<string, string>> = {},
) {
  const installed = new Set<string>();
  const out = (id: string) => ids.includes(id) && !installed.has(id);
  const versionOf = (id: string) => (installed.has(id) ? updatesTo[id] : undefined);
  await patchRead<Array<{id: string; card: {version: string}}>>(
    page,
    '**/registry/apps.json',
    () => true,
    apps =>
      apps
        .filter(app => !out(app.id))
        .map(app => {
          const version = versionOf(app.id);
          return version ? {...app, card: {...app.card, version}} : app;
        }),
  );
  // Once installed here, an app is up to date at the version its entry publishes.
  for (const id of ids) {
    await patchRead<{installed: boolean; entry: {card: {version: string}}; update?: unknown}>(
      page,
      `**/marketplace/apps/${id}/entry.json`,
      () => ids.includes(id),
      listing => {
        if (out(id)) return {...listing, installed: false};
        const version = listing.entry.card.version;
        return {
          ...listing,
          installed: true,
          update: {
            appId: id,
            state: 'up-to-date',
            installedVersion: version,
            publishedVersion: version,
          },
        };
      },
    );
  }
  return {installed};
}

/** What the install route answers: done, or refused for a cause, the Store's way. */
export type InstallOutcome = {ok: true; followed?: string[]} | {ok: false; cause: string};

/**
 * Each install the page sends answered in turn by `outcomes` — the last one standing for every later
 * press — the app put back into the installed apps once installed; `before` holds an answer back.
 */
export async function answerInstalls(
  page: Page,
  world: {installed: Set<string>},
  outcomes: InstallOutcome[],
  before?: (n: number) => Promise<void>,
) {
  const sent: string[] = [];
  await page.route('**/registry/install', async route => {
    const {appId} = route.request().postDataJSON() as {appId: string};
    const n = sent.push(appId) - 1;
    await before?.(n);
    const outcome = outcomes[Math.min(n, outcomes.length - 1)]!;
    if (!outcome.ok) {
      if (outcome.cause === 'store-unreached') return route.abort();
      return route.fulfill({
        status: 422,
        json: {ok: false, cause: outcome.cause, findings: [`refused: ${outcome.cause}`]},
      });
    }
    world.installed.add(appId);
    await route.fulfill({
      json: {ok: true, appId, replaced: false, followed: outcome.followed ?? []},
    });
  });
  return sent;
}

/** Replay `beats` instantly, their presses left to the reader, and wait for the canvas. */
export async function replayByHand(page: Page, beats: string) {
  await page.clock.setFixedTime(WORLD_TIME);
  await page.goto(`/?beat=${beats}&instant&byhand`);
  await expect(page.locator('main[data-replay="done"]')).toBeAttached({timeout: 30_000});
  await expect(page.getByTestId('canvas-stage-content')).not.toBeEmpty();
}

/** The gap's slot holding its offer, by the gap's words. */
export const offerSlot = (page: Page, gap: string) =>
  page.locator(`[data-slot-gap="${gap}"][data-slot-state="offer"]`);

/**
 * The sign-in windows a slot's tile opens, each answered by a page of its own, and the attempts
 * they poll: pending until the test ends them, as the App Library's specs answer them.
 */
export async function signInWindows(page: Page) {
  const attempts: {id: string; source: string}[] = [];
  const outcomes = new Map<string, Record<string, unknown>>();
  await page.context().route('**/auth/start?**', route => {
    const url = new URL(route.request().url());
    attempts.push({id: url.searchParams.get('attempt')!, source: url.searchParams.get('source')!});
    return route.fulfill({contentType: 'text/html', body: '<title>Connect</title><p>Connect</p>'});
  });
  await page.route('**/auth/attempts/**', route => {
    const id = decodeURIComponent(new URL(route.request().url()).pathname.split('/').pop()!);
    return route.fulfill({json: outcomes.get(id) ?? {state: 'pending'}});
  });
  return {
    attempts,
    /** Every attempt still open ends so. */
    end: (outcome: Record<string, unknown>) => {
      for (const {id} of attempts) if (!outcomes.has(id)) outcomes.set(id, outcome);
    },
  };
}

/** The board's baseline, the pointer moved off whatever it last pressed. */
export async function boardShot(page: Page, name: string) {
  await page.mouse.move(0, 0);
  await expect(page).toHaveScreenshot(name);
}
