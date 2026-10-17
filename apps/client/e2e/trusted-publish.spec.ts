/**
 * Publish over the fixed world (task-14.10 decisions 9, 14, 16): one baseline per Publish board of
 * the UI reference canvas, each board's other states driven and asserted in the page's text. The
 * world signs `a2uiverse-apps` in, its seven apps listed, Shop A's ahead of the Store and Shop B's
 * with a retired line; signed out, nothing published and the Store unreached are each the one read
 * overridden in that test. The update published is Linear's, from its packed folder in the
 * snapshot and the sample its publisher captured.
 */
import {readFileSync} from 'node:fs';
import {join} from 'node:path';
import {test, expect, type Page} from '@playwright/test';
import {REGISTRY_SNAPSHOT_DIR, type RecordedStoreApp} from '@a2uiverse/registry-snapshot';
import {BOARD, answer, gate, openPage, patchRead, samplesDrawn} from './trusted-page';

test.use({viewport: BOARD});

/** A secret in the token's place: a stand-in, never one any Store issued. */
const TOKEN = 'replay-suite-stand-in-token-not-a-secret-00';

const SIGNED_OUT = {state: 'signed-out'};
const SIGNED_IN = {state: 'signed-in', publisher: 'a2uiverse-apps', store: 'accepted'};

const listing = (page: Page, app: string) =>
  page.locator(`[data-testid="publish-listing"][data-app="${app}"]`);

/** Publish entered signed in, its listings and their samples drawn. */
async function openListings(page: Page) {
  await openPage(page, '/?page=publish');
  await expect(page.getByTestId('publish-bar')).toContainText(
    'Publishing as a2uiverse-apps · 7 apps',
  );
  await samplesDrawn(page, 7);
}

/** The recorded Store capture of an app: its entry and its sample. */
const recorded = (appId: string): RecordedStoreApp =>
  JSON.parse(readFileSync(new URL(`../recordings/store/${appId}.json`, import.meta.url), 'utf8'));

/** Linear's packed folder, as the snapshot packs it. */
function linearFolder(): {folder: string; catalogId: string; artifact: string} {
  const table = JSON.parse(readFileSync(join(REGISTRY_SNAPSHOT_DIR, 'catalogs.json'), 'utf8')) as {
    catalogId: string;
    artifact?: string;
  }[];
  const row = table.find(r => r.catalogId.includes('/linear-catalog/'))!;
  return {
    folder: join(REGISTRY_SNAPSHOT_DIR, 'artifacts', row.artifact!),
    catalogId: row.catalogId,
    artifact: row.artifact!,
  };
}

/** A sample answer file chosen on the form. */
const sampleFile = (appId: string, name = 'preview.json') => ({
  name,
  mimeType: 'application/json',
  buffer: Buffer.from(JSON.stringify(recorded(appId).preview)),
});

/** Linear's update form, its packed folder and its sample answer file chosen. */
async function fillLinearUpdate(page: Page) {
  await openListings(page);
  await listing(page, 'linear').getByRole('button', {name: 'Publish an update'}).click();
  const form = page.getByTestId('publish-form');
  await expect(form.getByRole('heading', {name: 'Publish an update to Linear'})).toBeVisible();
  await page.getByLabel('Choose packed folders').setInputFiles(linearFolder().folder);
  await page.getByLabel('Choose the sample answer file').setInputFiles(sampleFile('linear'));
  await expect(form.getByRole('list', {name: 'Packed folders'})).toContainText('linear-catalog');
  await expect(form.getByRole('list', {name: 'Sample answer file'})).toContainText('preview.json');
  return form;
}

test('P1 · signed out: claim a name, or sign in; the Store unreached on entry', async ({page}) => {
  await answer(page, '**/marketplace/publisher.json', SIGNED_OUT);
  await openPage(page, '/?page=publish');
  const signedOut = page.getByTestId('publish-signed-out');
  await expect(signedOut.getByRole('heading', {name: 'Publish your apps'})).toBeVisible();
  await expect(signedOut.getByRole('form', {name: 'Claim a publisher name'})).toBeVisible();
  await expect(signedOut.getByRole('form', {name: 'Sign in as a publisher'})).toBeVisible();
  await expect(signedOut.getByRole('button', {name: 'Claim'})).toBeDisabled();
  await expect(signedOut).toContainText(
    'Your secret stays with A2UIVerse on this computer and goes only to the Store.',
  );
  await expect(page).toHaveScreenshot('publish-p1-signed-out.png');

  // Who is signed in can't be read: the Store can't be reached, Try again.
  await answer(page, '**/marketplace/publisher.json', {ok: false, reason: 'unreached'}, 502);
  await openPage(page, '/?page=publish');
  const unreached = page.getByTestId('publish-store-unreached');
  await expect(unreached).toContainText('The Store can’t be reached right now.');
  await expect(unreached.getByRole('button', {name: 'Try again'})).toBeVisible();
});

test('P2 · the secret shown once after a claim, Continue behind the tick', async ({
  page,
  context,
}) => {
  await context.grantPermissions(['clipboard-read', 'clipboard-write']);
  let claimed: string | undefined;
  let kept = true;
  await page.route('**/marketplace/publisher.json', route =>
    route.fulfill({
      json:
        claimed && kept ? {state: 'signed-in', publisher: claimed, store: 'accepted'} : SIGNED_OUT,
    }),
  );
  await page.route('**/marketplace/claim', route => {
    claimed = (route.request().postDataJSON() as {publisher: string}).publisher;
    return route.fulfill({status: 201, json: {publisher: claimed, token: TOKEN, kept}});
  });
  await openPage(page, '/?page=publish');
  const claim = page.getByRole('form', {name: 'Claim a publisher name'});
  await claim.getByLabel('Publisher name').fill('northlight');
  await claim.getByRole('button', {name: 'Claim'}).click();

  const board = page.getByTestId('publish-token');
  await expect(board).toContainText('Name claimed');
  await expect(board.getByRole('heading', {name: '“northlight” is yours'})).toBeVisible();
  await expect(board).toContainText(
    'This is your publisher secret (token). It is the only way back to this name: you’ll need it to sign in here again after signing out. It won’t be shown again.',
  );
  await expect(board.locator('code')).toHaveText(TOKEN);
  await expect(board.getByRole('button', {name: 'Continue'})).toBeDisabled();
  await expect(page).toHaveScreenshot('publish-p2-token.png');

  // Copy, the tick, then Continue: signed in under the name, nothing published yet.
  await board.getByRole('button', {name: 'Copy'}).click();
  await expect(board.getByRole('button', {name: 'Copied'})).toBeVisible();
  expect(await page.evaluate(() => navigator.clipboard.readText())).toBe(TOKEN);
  await board.getByLabel('I’ve saved it somewhere safe').check();
  await board.getByRole('button', {name: 'Continue'}).click();
  await expect(page.getByTestId('publish-bar')).toContainText('Publishing as northlight · 0 apps');
  await expect(page.getByTestId('publish-empty')).toContainText('Nothing published yet.');

  // A claim this computer couldn't keep: said so, and Continue leads to the sign-in, named.
  claimed = undefined;
  kept = false;
  await openPage(page, '/?page=publish');
  await claim.getByLabel('Publisher name').fill('northlight');
  await claim.getByRole('button', {name: 'Claim'}).click();
  await expect(board).toContainText(
    'But A2UIVerse couldn’t keep your publisher secret (token) on this computer. Save it now, then sign in with it',
  );
  await board.getByLabel('I’ve saved it somewhere safe').check();
  await board.getByRole('button', {name: 'Continue'}).click();
  await expect(
    page.getByRole('form', {name: 'Sign in as a publisher'}).getByLabel('Publisher name'),
  ).toHaveValue('northlight');
});

test('P3 · a name taken, a name not allowed, the wrong secret, the Store unreached', async ({
  page,
}) => {
  let who: object = SIGNED_OUT;
  await page.route('**/marketplace/publisher.json', route => route.fulfill({json: who}));
  const claims: string[] = [];
  let claimAnswer: 'taken' | 'unreached' | 'held' = 'taken';
  await page.route('**/marketplace/claim', route => {
    claims.push((route.request().postDataJSON() as {publisher: string}).publisher);
    return route.fulfill(
      {
        taken: {
          status: 409,
          json: {ok: false, findings: ['publisher name "a2uiverse-apps" is taken']},
        },
        unreached: {
          status: 503,
          json: {ok: false, reason: 'unreached', findings: ['the Store did not answer']},
        },
        held: {
          status: 409,
          json: {ok: false, reason: 'held', findings: ['a publisher is already signed in here']},
        },
      }[claimAnswer],
    );
  });
  await page.route('**/marketplace/sign-in', route => {
    const {token} = route.request().postDataJSON() as {token: string};
    if (token === TOKEN) {
      who = SIGNED_IN;
      return route.fulfill({json: {ok: true, publisher: 'a2uiverse-apps'}});
    }
    return route.fulfill(
      token === 'unkept'
        ? {status: 500, json: {ok: false, findings: ['the secret could not be written']}}
        : {
            status: 401,
            json: {
              ok: false,
              reason: 'not-accepted',
              findings: ["that token is not a2uiverse-apps's"],
            },
          },
    );
  });
  await openPage(page, '/?page=publish');
  const claim = page.getByRole('form', {name: 'Claim a publisher name'});
  const claimName = claim.getByLabel('Publisher name');

  // Taken.
  await claimName.fill('a2uiverse-apps');
  await claim.getByRole('button', {name: 'Claim'}).click();
  await expect(claim).toContainText('That name belongs to another publisher. Try another.');
  await expect(claimName).toHaveAttribute('aria-invalid', 'true');

  // The secret doesn't match.
  const signIn = page.getByRole('form', {name: 'Sign in as a publisher'});
  await signIn.getByLabel('Publisher name').fill('a2uiverse-apps');
  await signIn.getByLabel('Your publisher secret (token)').fill('not-the-secret');
  await signIn.getByRole('button', {name: 'Sign in'}).click();
  await expect(signIn).toContainText('That secret isn’t the one for a2uiverse-apps.');
  await expect(page).toHaveScreenshot('publish-p3-signin-errors.png');

  // Not allowed: said before anything is sent, with the name it could be.
  await claimName.fill('Northlight Cameras');
  await claim.getByRole('button', {name: 'Claim'}).click();
  await expect(claim).toContainText(
    'Use lowercase letters, numbers and hyphens, starting with a letter: northlight-cameras.',
  );
  expect(claims).toEqual(['a2uiverse-apps']);

  // The Store unreached: above both forms, Try again making the claim again.
  claimAnswer = 'unreached';
  await claimName.fill('northlight');
  await claim.getByRole('button', {name: 'Claim'}).click();
  const unreached = page.getByTestId('publish-unreached');
  await expect(unreached).toContainText(
    'The Store can’t be reached right now. Nothing was claimed or changed.',
  );
  await unreached.getByRole('button', {name: 'Try again'}).click();
  await expect.poll(() => claims).toEqual(['a2uiverse-apps', 'northlight', 'northlight']);

  // The secret right, this computer unable to keep it.
  await signIn.getByLabel('Your publisher secret (token)').fill('unkept');
  await signIn.getByRole('button', {name: 'Sign in'}).click();
  const unkept = page.getByTestId('publish-unkept');
  await expect(unkept).toContainText(
    'A2UIVerse couldn’t keep your secret on this computer. Try again in a moment.',
  );
  await expect(unkept).toContainText('the secret could not be written');

  // The secret right: signed in, the listings.
  await signIn.getByLabel('Your publisher secret (token)').fill(TOKEN);
  await signIn.getByRole('button', {name: 'Sign in'}).click();
  await expect(page.getByTestId('publish-bar')).toContainText(
    'Publishing as a2uiverse-apps · 7 apps',
  );

  // A claim sent while another tab signed a publisher in: who is signed in read again, said why.
  who = SIGNED_OUT;
  claimAnswer = 'held';
  await openPage(page, '/?page=publish');
  await claimName.fill('northlight');
  who = SIGNED_IN;
  await claim.getByRole('button', {name: 'Claim'}).click();
  await expect(page.getByTestId('publish-line')).toContainText(
    'Nothing was claimed. A publisher is already signed in on this computer.',
  );
  await expect(page.getByTestId('publish-bar')).toContainText('Publishing as a2uiverse-apps');
});

test('P4 · signed in, nothing published yet', async ({page}) => {
  await answer(page, '**/marketplace/index.json', []);
  await openPage(page, '/?page=publish');
  await expect(page.getByTestId('publish-bar')).toContainText(
    'Publishing as a2uiverse-apps · 0 apps',
  );
  const empty = page.getByTestId('publish-empty');
  await expect(empty).toContainText('Nothing published yet.');
  await expect(empty).toContainText(
    'Pack your app with Stellify in its own folder, then publish it here with the folders it wrote.',
  );
  await expect(empty.getByRole('button', {name: 'Publish an app'})).toBeVisible();
  await expect(page).toHaveScreenshot('publish-p4-empty.png');
});

test('P5 · your listings: each look at its build, a retired line, the ahead-of-the-Store notice', async ({
  page,
}) => {
  await openListings(page);
  await expect(page.locator('[data-testid="publish-listing"] .publish-facts > h2')).toHaveText([
    'CircleCI',
    'GitHub',
    'Gmail',
    'Google Calendar',
    'Linear',
    'Shop A',
    'Shop B',
  ]);
  const shopA = listing(page, 'shop-a');
  await expect(shopA).toContainText('Version 0.1.0 (card version)');
  await expect(shopA.getByTestId('publish-look')).toContainText(
    'Its look (catalog) https://github.com/retz8/a2uiverse-apps/blob/main/mocks/shop-a/shop-a-catalog/catalogs/v0.9.1/catalog.json at build sha256-nnzw-NQHDz-DY2UPvsVm0hLMKv-E927yrmCuEYLIh24',
  );
  await expect(shopA.getByTestId('publish-ahead')).toHaveText(
    'Your app is ahead of the Store (ahead of the Store). It now uses a look the Store doesn’t have (https://github.com/retz8/a2uiverse-apps/blob/main/mocks/shop-a/shop-a-catalog/catalogs/v0.10.0/catalog.json), and it now says it’s version 0.2.0, which the Store doesn’t have, so no one new can install it until you publish an update.',
  );
  const shopB = listing(page, 'shop-b');
  await expect(shopB.getByTestId('publish-retired')).toHaveText(
    'No longer offered in an older look (retired) https://github.com/retz8/a2uiverse-apps/blob/main/mocks/shop-b/shop-b-catalog/catalogs/v0.9.0/catalog.json',
  );
  await expect(page.getByTestId('publish-ahead')).toHaveCount(1);
  // The two listings carrying a notice at the top of the board.
  await shopA.evaluate(element => element.scrollIntoView({block: 'start'}));
  await expect(page).toHaveScreenshot('publish-p5-listings.png');
});

test('P6 · an update’s form: the id and the address filled in, the folder and the sample chosen', async ({
  page,
}) => {
  const form = await fillLinearUpdate(page);
  await expect(form.getByLabel('App name in the Store (app id)')).toHaveValue('linear');
  await expect(form.getByLabel('App name in the Store (app id)')).toHaveAttribute('readonly', '');
  await expect(form.getByLabel('Your app’s address (card URL)')).toHaveValue(
    recorded('linear').entry.cardUrl,
  );
  await expect(form.getByRole('list', {name: 'Packed folders'})).toContainText('5 files');
  await expect(form.getByRole('list', {name: 'Sample answer file'})).toContainText(
    'captured Oct 13',
  );
  await expect(form).toContainText(
    'Needed because Linear asks people to sign in: the Store can’t ask it a question without your account.',
  );
  await expect(page).toHaveScreenshot('publish-p6-publish-form.png');

  // A folder Stellify didn't pack, refused on the spot.
  await page.getByLabel('Choose packed folders').setInputFiles(join(linearFolder().folder, 'dist'));
  await expect(form).toContainText(
    '“dist” wasn’t packed by Stellify. Drop the folder it wrote (dist/artifact).',
  );
  // A file that is no sample answer.
  await page
    .getByLabel('Choose the sample answer file')
    .setInputFiles({name: 'notes.json', mimeType: 'application/json', buffer: Buffer.from('{}')});
  await expect(form).toContainText('“notes.json” isn’t a sample answer Stellify captured.');
  // Another app's sample, and an address that isn't one: checked before anything is sent.
  await page.getByLabel('Choose the sample answer file').setInputFiles(sampleFile('shop-b'));
  await form.getByLabel('Your app’s address (card URL)').fill('linear on my laptop');
  const sent: unknown[] = [];
  await page.route('**/marketplace/publish', route => {
    sent.push(route.request().postDataJSON());
    return route.abort();
  });
  await form.getByRole('button', {name: 'Publish'}).click();
  await expect(form).toContainText(
    'Enter your app’s full address, starting with https:// or http://.',
  );
  await expect(form).toContainText('This sample answer is for “shop-b”, not “linear”.');
  expect(sent).toEqual([]);
});

test('P7 · publishing, refused by the checks, published', async ({page}) => {
  const {catalogId, artifact} = linearFolder();
  const finding = `catalog artifact 1 (${catalogId}): components/PriorityIcon: removed`;
  const answers = [
    {status: 422, json: {ok: false, findings: [finding]}},
    {status: 403, json: {ok: false, findings: ['app id "linear" belongs to another publisher']}},
    'no answer',
    {
      status: 200,
      json: {
        ok: true,
        appId: 'linear',
        version: '0.2.0',
        summary: `republished linear · card 0.1.0 → 0.2.0 · catalog ${artifact.slice(0, 15)}…`,
        notes: [],
      },
    },
    {
      status: 401,
      json: {
        ok: false,
        reason: 'not-accepted',
        findings: [
          "the Store no longer accepts a2uiverse-apps's token: sign out and sign in again",
        ],
      },
    },
  ] as const;
  const bodies: {
    appId: string;
    cardUrl: string;
    catalogs: {files: object}[];
    preview?: {appId: string};
  }[] = [];
  const checks = gate();
  let accepted = true;
  await page.route('**/marketplace/publisher.json', route =>
    accepted ? route.fallback() : route.fulfill({json: {...SIGNED_IN, store: 'not-accepted'}}),
  );
  await page.route('**/marketplace/publish', async route => {
    bodies.push(route.request().postDataJSON());
    if (bodies.length === 1) await checks.opened;
    const reply = answers[bodies.length - 1]!;
    return reply === 'no answer' ? route.abort() : route.fulfill(reply);
  });
  const form = await fillLinearUpdate(page);
  const view = page.getByTestId('publish-form-view');

  // Publishing: the form's place says how it stands.
  await form.getByRole('button', {name: 'Publish'}).click();
  const publishing = page.getByTestId('publish-publishing');
  await expect(publishing.getByRole('heading', {name: 'Publishing Linear'})).toBeVisible();
  await expect(publishing).toContainText(
    'The Store fetches your app, checks its files and asks it one question before it lists it.',
  );
  await expect(publishing).toContainText('Waiting for the Store’s checks');
  await expect(page).toHaveScreenshot('publish-p7-publish-outcomes.png');
  checks.open();

  // The body Stellify posts: the app, its address, the folder's files, the sample.
  expect(bodies[0]).toMatchObject({appId: 'linear', cardUrl: recorded('linear').entry.cardUrl});
  expect(Object.keys(bodies[0]!.catalogs[0]!.files).sort()).toEqual([
    'artifact.json',
    'catalog.json',
    'dist/fonts/inter-latin-opsz-normal.woff2',
    'dist/theme.css',
    'index.js',
  ]);
  expect(bodies[0]!.preview?.appId).toBe('linear');

  // Refused by the Store's checks: its findings as it words them, the form kept behind.
  const refused = view.getByTestId('publish-refused');
  await expect(refused).toContainText(
    'The Store didn’t take this version. Your listing hasn’t changed.',
  );
  await expect(refused).toContainText('What the Store found (findings)');
  await expect(refused.locator('li')).toHaveText([finding]);
  await refused.getByRole('button', {name: 'Back to the form'}).click();
  await expect(form.getByRole('list', {name: 'Packed folders'})).toContainText('linear-catalog');

  // The name another publisher's.
  await form.getByRole('button', {name: 'Publish'}).click();
  await expect(refused).toContainText(
    'Another publisher already uses the name “linear” in the Store. Your listing hasn’t changed.',
  );
  await refused.getByRole('button', {name: 'Back to the form'}).click();

  // No clear answer.
  await form.getByRole('button', {name: 'Publish'}).click();
  await expect(refused).toContainText(
    'The Store didn’t answer, so this version may or may not be in the Store. Your apps show what the Store has now.',
  );
  await refused.getByRole('button', {name: 'Back to the form'}).click();

  // Published: on the listings, the outcome atop them, the summary as the Store words it folded
  // under Details (task-14.11 decision 34).
  await form.getByRole('button', {name: 'Publish'}).click();
  const published = page.getByTestId('publish-act');
  await expect(published).toContainText('Linear 0.2.0 is in the Store.');
  await expect(published).toContainText(
    'People who have Linear installed see the update in their App Library.',
  );
  await expect(page).toHaveURL(/[?&]page=publish$/);
  await expect(page.getByTestId('publish-listings')).toBeVisible();
  await published.getByText('Details').click();
  await expect(published.locator('li')).toHaveText([answers[3].json.summary]);

  // The secret no longer accepted mid-publish: who is signed in read again, the form left behind.
  await listing(page, 'linear').getByRole('button', {name: 'Publish an update'}).click();
  await page.getByLabel('Choose packed folders').setInputFiles(linearFolder().folder);
  await page.getByLabel('Choose the sample answer file').setInputFiles(sampleFile('linear'));
  accepted = false;
  await form.getByRole('button', {name: 'Publish'}).click();
  await expect(page.getByTestId('publish-act')).toContainText(
    'Nothing was published. The Store no longer accepts your publisher secret.',
  );
  await expect(page.getByTestId('publish-not-accepted')).toBeVisible();
  await expect(page).toHaveURL(/[?&]page=publish$/);
});

test('P8 · unpublish and sign out each ask once', async ({page}) => {
  const unpublished = new Set<string>();
  await page.route('**/marketplace/unpublish', route => {
    const {appId} = route.request().postDataJSON() as {appId: string};
    if (appId !== 'shop-b') {
      return route.fulfill({
        status: 404,
        json: {ok: false, findings: [`app "${appId}" is not published`]},
      });
    }
    unpublished.add(appId);
    return route.fulfill({json: {ok: true, appId}});
  });
  await patchRead<{entry: {appId: string}}[]>(
    page,
    '**/marketplace/index.json',
    () => unpublished.size > 0,
    listings => listings.filter(l => !unpublished.has(l.entry.appId)),
  );
  let signedOut = false;
  const signOuts = [
    {status: 500, json: {ok: false, findings: ['the secret could not be removed']}},
    {status: 200, json: {ok: true, publisher: 'a2uiverse-apps'}},
  ];
  await page.route('**/marketplace/sign-out', route => {
    const reply = signOuts.shift()!;
    signedOut = reply.status === 200;
    return route.fulfill(reply);
  });
  await page.route('**/marketplace/publisher.json', route =>
    signedOut ? route.fulfill({json: SIGNED_OUT}) : route.fallback(),
  );
  await openListings(page);

  // Unpublish asks once.
  await listing(page, 'shop-b').getByRole('button', {name: 'Unpublish'}).click();
  const question = page.getByTestId('publish-unpublish');
  await expect(question.getByRole('heading', {name: 'Unpublish Shop B?'})).toBeVisible();
  await expect(question).toContainText(
    'Shop B leaves the Store. People who installed it keep it, and the name “shop-b” stays yours.',
  );
  await expect(page).toHaveScreenshot('publish-p8-confirms.png');
  await question.getByRole('button', {name: 'Unpublish'}).click();
  const act = page.getByTestId('publish-act');
  await expect(act).toContainText('Shop B left the Store. People who installed it keep it.');
  await expect(listing(page, 'shop-b')).toHaveCount(0);

  // An app the Store no longer has.
  await listing(page, 'shop-a').getByRole('button', {name: 'Unpublish'}).click();
  await page.getByTestId('publish-unpublish').getByRole('button', {name: 'Unpublish'}).click();
  await expect(act).toContainText('Shop A isn’t in the Store any more.');
  await expect(act).toContainText('app "shop-a" is not published');

  // Sign out asks once; a sign-out that didn't work leaves you signed in.
  const signOut = () => page.getByTestId('publish-bar').getByRole('button', {name: 'Sign out'});
  await signOut().click();
  const signOutQuestion = page.getByTestId('publish-sign-out');
  await expect(signOutQuestion.getByRole('heading', {name: 'Sign out of Publish?'})).toBeVisible();
  await expect(signOutQuestion).toContainText(
    'A2UIVerse forgets your publisher secret on this computer. To publish as a2uiverse-apps again, you’ll need your secret (token).',
  );
  await signOutQuestion.getByRole('button', {name: 'Sign out'}).click();
  await expect(page.getByTestId('publish-sign-out-failed')).toContainText(
    'Signing out didn’t work, so you’re still signed in.',
  );
  await signOut().click();
  await page.getByTestId('publish-sign-out').getByRole('button', {name: 'Sign out'}).click();
  await expect(page.getByTestId('publish-signed-out')).toBeVisible();

  // Held for another Store, or a secret the Store no longer accepts: each with Sign out.
  await answer(page, '**/marketplace/publisher.json', {
    state: 'another-store',
    publisher: 'a2uiverse-apps',
  });
  await openPage(page, '/?page=publish');
  await expect(page.getByTestId('publish-another-store')).toContainText(
    'You’re signed in as a2uiverse-apps for a different Store. To publish here, sign out first.',
  );
  await answer(page, '**/marketplace/publisher.json', {
    state: 'signed-in',
    publisher: 'a2uiverse-apps',
    store: 'not-accepted',
  });
  await openPage(page, '/?page=publish');
  const notAccepted = page.getByTestId('publish-not-accepted');
  await expect(notAccepted).toContainText(
    'The Store no longer accepts your publisher secret for a2uiverse-apps. Sign out, then claim a name or sign in again.',
  );
  await expect(notAccepted.getByRole('button', {name: 'Sign out'})).toBeVisible();
});
