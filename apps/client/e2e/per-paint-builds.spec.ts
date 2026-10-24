/**
 * Per-paint builds on the replay suite (task-15.6; task-15.10 decision 11): the snapshot packs a
 * second build of Shop A's catalog beside the table's, its accent changed, and a synthetic beat
 * paints Shop A in the first build, then — a newer build installed meanwhile — a second question
 * painting it in the second. The first canvas, open across the move, keeps its build's mark and
 * look; the new paint takes the new build's.
 */
import {readFileSync} from 'node:fs';
import {test, expect, type Locator} from '@playwright/test';
import {SECOND_BUILD_FILE, type SecondBuild} from '@a2uiverse/registry-snapshot';

const {first, second} = JSON.parse(readFileSync(SECOND_BUILD_FILE, 'utf8')) as SecondBuild;

/** Shop A's light accent in each build: the table's, and the second's. */
const FIRST_ACCENT = 'rgb(138, 90, 43)';
const SECOND_ACCENT = 'rgb(43, 106, 138)';
/** And its dark accent, the second build's changed too (task-15.11 decision 49). */
const FIRST_DARK_ACCENT = 'rgb(214, 154, 95)';
const SECOND_DARK_ACCENT = 'rgb(119, 170, 190)';

/** The color Shop A's Price is drawn in: the store's accent. */
const accentOf = (fragment: Locator) =>
  fragment.getByRole('button', {name: 'Price'}).evaluate(button => getComputedStyle(button).color);

test('a canvas open across a move keeps its build’s mark and look; the new paint takes the new one', async ({
  page,
}) => {
  await page.goto(`/?beat=per-paint-builds:${first}:${second}&instant`);
  await expect(page.locator('main[data-replay="done"]')).toBeAttached({timeout: 30_000});
  const stage = page.getByTestId('canvas-stage-content');

  // The new paint, on the canvas asked after the move, in the second build.
  await expect(stage.locator(`[data-catalog-build="${second}"]`)).toHaveCount(1);
  await expect(stage.locator(`[data-catalog-build="${first}"]`)).toHaveCount(0);
  expect(await accentOf(stage.locator(`[data-catalog-build="${second}"]`))).toBe(SECOND_ACCENT);

  // The canvas open across the move keeps the build it was drawn in, and its look.
  await page.getByRole('button', {name: 'Back', exact: true}).click();
  await expect(page.getByRole('button', {name: 'What cameras does Shop A have?'})).toBeVisible();
  await expect(stage.locator(`[data-catalog-build="${first}"]`)).toHaveCount(1);
  await expect(stage.locator(`[data-catalog-build="${second}"]`)).toHaveCount(0);
  expect(await accentOf(stage.locator(`[data-catalog-build="${first}"]`))).toBe(FIRST_ACCENT);
});

test('in dark, too, the two builds draw apart (task-15.11 decision 49)', async ({page}) => {
  await page.emulateMedia({colorScheme: 'dark'});
  await page.goto(`/?beat=per-paint-builds:${first}:${second}&instant`);
  await expect(page.locator('main[data-replay="done"]')).toBeAttached({timeout: 30_000});
  const stage = page.getByTestId('canvas-stage-content');
  await expect(stage.locator(`[data-catalog-build="${second}"]`)).toHaveCount(1);
  expect(await accentOf(stage.locator(`[data-catalog-build="${second}"]`))).toBe(
    SECOND_DARK_ACCENT,
  );
  await page.getByRole('button', {name: 'Back', exact: true}).click();
  await expect(stage.locator(`[data-catalog-build="${first}"]`)).toHaveCount(1);
  expect(await accentOf(stage.locator(`[data-catalog-build="${first}"]`))).toBe(FIRST_DARK_ACCENT);
});
