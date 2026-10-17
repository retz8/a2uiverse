/**
 * Publish (task 14.9), over an orchestrator in memory: claim with the secret shown once, sign-in,
 * each answer of who is signed in, the listings as Stellify's `list` has them, unpublish asked
 * once, and the publish form — the folders and the sample answer file read in the page, the body
 * Stellify posts, each outcome in the form's place or atop the listings, the secret refused
 * mid-session.
 */
import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest';
import {useState} from 'react';
import {fireEvent, screen, waitFor, within} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type {IndexEntry, PreviewDocument, PublishedCard, PublishRequest} from '@a2uiverse/sdk';
import type {PublisherStatus} from '../../../orchestratorApi';
import type {TrustedPageState} from '../../trail/trailStore';
import {CATALOGS, renderWithShell} from '../../../../tests/helpers';
import {PublishPage} from './PublishPage';

const BASE = 'https://hub.test';
const TOKEN = 'T'.repeat(43);
const ME = 'a2uiverse-apps';

const card = (name: string, more: Partial<PublishedCard> = {}): PublishedCard => ({
  name,
  description: `${name} does its thing.`,
  url: `http://127.0.0.1:11001/${name}`,
  version: '0.3.0',
  skills: [],
  ...more,
});

const SIGN_IN = {
  securitySchemes: {
    linear: {
      type: 'oauth2',
      flows: {authorizationCode: {authorizationUrl: 'a', tokenUrl: 't', scopes: {}}},
    },
  },
  security: [{linear: []}],
} as Partial<PublishedCard>;

const LINEAR_CATALOG = 'https://a2uiverse.dev/linear/linear-catalog/catalogs/v0.9.1/catalog.json';
const LINEAR_BUILD = 'sha256-3f2aAbCdEfGhIjKlMnOpQrStUvWxYz0123456789-_abc';

const entry = (appId: string, name: string, more: Partial<IndexEntry> = {}): IndexEntry => ({
  appId,
  publisher: ME,
  cardUrl: `http://127.0.0.1:11001/${appId}/.well-known/agent-card.json`,
  card: card(name),
  catalogs: {},
  versions: ['0.3.0'],
  publishedAt: '2026-10-03T10:00:00Z',
  retired: [],
  ...more,
});

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {status, headers: {'Content-Type': 'application/json'}});

interface Answer {
  status: number;
  body: unknown;
}

interface Fake {
  status: PublisherStatus;
  index: IndexEntry[];
  claim: Answer;
  signIn: Answer;
  signOut: Answer;
  publish: Answer;
  /** Holds the publish's answer until released. */
  publishGate?: Promise<void>;
  /** Who is signed in once the publish answered. */
  afterPublish?: PublisherStatus;
  unpublish: Answer;
  claims: string[];
  published: PublishRequest[];
  unpublished: string[];
  reads: number;
}

let fake: Fake;

const SIGNED_IN: PublisherStatus = {state: 'signed-in', publisher: ME, store: 'accepted'};

beforeEach(() => {
  fake = {
    status: SIGNED_IN,
    index: [
      entry('shop-a', 'Shop A', {retired: ['https://shop-a.example/catalog/v1.json']}),
      entry('linear', 'Linear', {
        card: card('Linear', SIGN_IN),
        catalogs: {[LINEAR_CATALOG]: LINEAR_BUILD},
        aheadOfStore: {
          catalogIds: ['https://a2uiverse.dev/linear/v2/catalog.json'],
          version: '0.5.0',
          seenAt: '2026-10-10T00:00:00Z',
        },
      }),
      entry('acme-mail', 'Acme Mail', {publisher: 'acme'}),
    ],
    claim: {status: 201, body: {publisher: 'northlight', token: TOKEN, kept: true}},
    signIn: {status: 200, body: {ok: true, publisher: ME}},
    signOut: {status: 200, body: {ok: true, publisher: ME}},
    publish: {
      status: 200,
      body: {
        ok: true,
        appId: 'linear',
        version: '0.4.0',
        summary:
          'republished linear · card 0.3.0 → 0.4.0 · catalog sha256-3f2aAbCd… → sha256-9c1eXyZw…',
        notes: ['catalog "x" moved to a new build'],
      },
    },
    unpublish: {status: 200, body: {ok: true, appId: 'shop-a'}},
    claims: [],
    published: [],
    unpublished: [],
    reads: 0,
  };
  vi.spyOn(console, 'warn').mockImplementation(() => {});
  vi.stubGlobal(
    'fetch',
    vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = new URL(String(input));
      const path = url.pathname;
      const body = init?.body ? (JSON.parse(String(init.body)) as Record<string, unknown>) : {};
      if (path === '/marketplace/publisher.json') {
        fake.reads += 1;
        return json(fake.status);
      }
      if (path === '/marketplace/listings.json')
        return json(
          fake.index
            .filter(e => e.publisher === url.searchParams.get('publisher'))
            .map(e => ({entry: e, installed: false})),
        );
      if (path.endsWith('/preview.json')) return json({ok: false, reason: 'not-published'}, 404);
      if (path === '/marketplace/claim') {
        fake.claims.push(String(body.publisher));
        if (fake.claim.status === 201 && (fake.claim.body as {kept?: boolean}).kept)
          fake.status = {state: 'signed-in', publisher: String(body.publisher), store: 'accepted'};
        return json(fake.claim.body, fake.claim.status);
      }
      if (path === '/marketplace/sign-in') {
        if (fake.signIn.status === 200)
          fake.status = {state: 'signed-in', publisher: String(body.publisher), store: 'accepted'};
        return json(fake.signIn.body, fake.signIn.status);
      }
      if (path === '/marketplace/sign-out') {
        if (fake.signOut.status === 200) fake.status = {state: 'signed-out'};
        return json(fake.signOut.body, fake.signOut.status);
      }
      if (path === '/marketplace/publish') {
        fake.published.push(body as unknown as PublishRequest);
        await fake.publishGate;
        if (fake.afterPublish) fake.status = fake.afterPublish;
        return json(fake.publish.body, fake.publish.status);
      }
      if (path === '/marketplace/unpublish') {
        fake.unpublished.push(String(body.appId));
        if (fake.unpublish.status === 200)
          fake.index = fake.index.filter(e => e.appId !== body.appId);
        return json(fake.unpublish.body, fake.unpublish.status);
      }
      return json({}, 404);
    }),
  );
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

/** Publish with the page's moves kept, as the history would keep them. */
function Publish({initial}: {initial: TrustedPageState}) {
  const [page, setPage] = useState(initial);
  return (
    <>
      <PublishPage
        page={page}
        onNavigate={setPage}
        orchestrator={BASE}
        catalogs={CATALOGS}
        container={null}
      />
      <output data-testid="where">{JSON.stringify(page)}</output>
    </>
  );
}

const open = (page: TrustedPageState = {page: 'publish'}) =>
  renderWithShell(<Publish initial={page} />);

const where = () => JSON.parse(screen.getByTestId('where').textContent!) as TrustedPageState;

/** A file the folder picker chose, under its folder. */
function chosen(folder: string, path: string, content: string): File {
  const file = new File([content], path.split('/').pop()!);
  Object.defineProperty(file, 'webkitRelativePath', {value: `${folder}/${path}`});
  return file;
}

const DESCRIPTOR = JSON.stringify({
  catalogId: LINEAR_CATALOG,
  entry: 'index.js',
  schema: 'catalog.json',
  hostInterface: '0.9.1',
  files: {},
  package: {name: 'linear-catalog', version: '0.4.0'},
});

const preview = (appId: string): PreviewDocument => ({
  appId,
  version: '0.4.0',
  words: 'What’s assigned to me in Linear?',
  messages: [{version: 'v0.9', createSurface: {surfaceId: 's', catalogId: 'x'}}],
  capturedBy: 'publisher',
  capturedAt: '2026-10-03T09:00:00Z',
});

const previewFile = (doc: unknown, name = 'preview.json') => new File([JSON.stringify(doc)], name);

/** The form for Linear's update, its folder and its sample given. */
async function fillLinearUpdate(user: ReturnType<typeof userEvent.setup>) {
  const linear = await screen.findByRole('article', {name: 'Linear'});
  await user.click(within(linear).getByRole('button', {name: 'Publish an update'}));
  await screen.findByRole('heading', {name: 'Publish an update to Linear'});
  await user.upload(screen.getByLabelText('Choose packed folders'), [
    chosen('artifact', 'artifact.json', DESCRIPTOR),
    chosen('artifact', 'index.js', 'export const CATALOG = {};'),
    chosen('artifact', 'dist/styles.css', '.x{}'),
  ]);
  await screen.findByText('linear-catalog');
  await user.upload(
    screen.getByLabelText('Choose the sample answer file'),
    previewFile(preview('linear')),
  );
  await screen.findByText('preview.json');
}

describe('signed out', () => {
  beforeEach(() => {
    fake.status = {state: 'signed-out'};
  });

  it('claims a name, the secret shown once, Continue unlocking with the tick, then the listings', async () => {
    const user = userEvent.setup();
    open();
    const claim = await screen.findByRole('form', {name: 'Claim a publisher name'});
    await user.type(within(claim).getByLabelText('Publisher name'), 'northlight');
    await user.click(within(claim).getByRole('button', {name: 'Claim'}));

    const board = await screen.findByTestId('publish-token');
    expect(within(board).getByRole('heading', {name: '“northlight” is yours'})).toBeInTheDocument();
    expect(within(board).getByText(TOKEN)).toBeInTheDocument();
    expect(board).toHaveTextContent('It is the only way back to this name');
    const go = within(board).getByRole('button', {name: 'Continue'});
    expect(go).toBeDisabled();
    await user.click(within(board).getByRole('checkbox', {name: 'I’ve saved it somewhere safe'}));
    await user.click(go);

    expect(
      await screen.findByRole('heading', {name: 'Your apps in the Store'}),
    ).toBeInTheDocument();
    expect(screen.getByTestId('publish-bar')).toHaveTextContent(
      'Publishing as northlight · 0 apps',
    );
    expect(screen.getByTestId('publish-empty')).toHaveTextContent(
      'Nothing of yours in the Store right now.',
    );
    expect(screen.queryByText(TOKEN)).not.toBeInTheDocument();
  });

  it('a claim this computer couldn’t keep says so, and Continue leads to the sign-in with the name', async () => {
    fake.claim = {
      status: 201,
      body: {publisher: 'northlight', token: TOKEN, kept: false, findings: ['not kept']},
    };
    const user = userEvent.setup();
    open();
    const claim = await screen.findByRole('form', {name: 'Claim a publisher name'});
    await user.type(within(claim).getByLabelText('Publisher name'), 'northlight');
    await user.click(within(claim).getByRole('button', {name: 'Claim'}));

    const board = await screen.findByTestId('publish-token');
    expect(board).toHaveTextContent('A2UIVerse couldn’t keep your publisher secret');
    expect(board).toHaveTextContent('Save it now, then sign in with it');
    await user.click(within(board).getByRole('checkbox'));
    await user.click(within(board).getByRole('button', {name: 'Continue'}));

    const signIn = await screen.findByRole('form', {name: 'Sign in as a publisher'});
    expect(within(signIn).getByLabelText('Publisher name')).toHaveValue('northlight');
  });

  it('checks a name before it is sent, with the name it suggests; a name taken is the Store’s', async () => {
    const user = userEvent.setup();
    open();
    const claim = await screen.findByRole('form', {name: 'Claim a publisher name'});
    const field = within(claim).getByLabelText('Publisher name');
    await user.type(field, 'Northlight Cameras');
    await user.click(within(claim).getByRole('button', {name: 'Claim'}));
    expect(
      within(claim).getByText(
        'Use lowercase letters, numbers and hyphens, starting with a letter: northlight-cameras.',
      ),
    ).toBeInTheDocument();
    expect(field).toHaveAttribute('aria-invalid', 'true');
    expect(fake.claims).toEqual([]);

    fake.claim = {status: 409, body: {ok: false, findings: ['publisher name "acme" is taken']}};
    await user.clear(field);
    await user.type(field, 'acme');
    await user.click(within(claim).getByRole('button', {name: 'Claim'}));
    expect(
      await within(claim).findByText('That name belongs to another publisher. Try another.'),
    ).toBeInTheDocument();
    expect(fake.claims).toEqual(['acme']);
  });

  it('says a secret not the name’s under its field, and the Store unreached above the forms', async () => {
    fake.signIn = {
      status: 401,
      body: {ok: false, reason: 'not-accepted', findings: ["that token is not acme's"]},
    };
    const user = userEvent.setup();
    open();
    const signIn = await screen.findByRole('form', {name: 'Sign in as a publisher'});
    await user.type(within(signIn).getByLabelText('Publisher name'), ME);
    await user.type(within(signIn).getByLabelText(/Your publisher secret/), 'wrong');
    await user.click(within(signIn).getByRole('button', {name: 'Sign in'}));
    expect(
      await within(signIn).findByText(`That secret isn’t the one for ${ME}.`),
    ).toBeInTheDocument();

    fake.signIn = {status: 503, body: {ok: false, reason: 'unreached', findings: ['x']}};
    await user.click(within(signIn).getByRole('button', {name: 'Sign in'}));
    const notice = await screen.findByTestId('publish-unreached');
    expect(notice).toHaveTextContent(
      'The Store can’t be reached right now. Nothing was claimed or changed.',
    );

    fake.signIn = {status: 200, body: {ok: true, publisher: ME}};
    await user.click(within(notice).getByRole('button', {name: 'Try again'}));
    expect(
      await screen.findByRole('heading', {name: 'Your apps in the Store'}),
    ).toBeInTheDocument();
  });

  it('a claim refused because a publisher is held now reads who is signed in again', async () => {
    fake.claim = {
      status: 409,
      body: {ok: false, reason: 'held', findings: ['acme is signed in here: sign out first']},
    };
    const user = userEvent.setup();
    open();
    const claim = await screen.findByRole('form', {name: 'Claim a publisher name'});
    await user.type(within(claim).getByLabelText('Publisher name'), 'northlight');
    fake.status = {state: 'signed-in', publisher: 'acme', store: 'accepted'};
    await user.click(within(claim).getByRole('button', {name: 'Claim'}));

    expect(await screen.findByTestId('publish-line')).toHaveTextContent(
      'Nothing was claimed. A publisher is already signed in on this computer.',
    );
    expect(await screen.findByTestId('publish-bar')).toHaveTextContent('Publishing as acme');
  });
});

describe('who is signed in', () => {
  it('a held secret the Store no longer accepts: a notice in place of the listings, Sign out asked once', async () => {
    fake.status = {state: 'signed-in', publisher: ME, store: 'not-accepted'};
    const user = userEvent.setup();
    open();
    const notice = await screen.findByTestId('publish-not-accepted');
    expect(notice).toHaveTextContent(
      `The Store no longer accepts your publisher secret for ${ME}.`,
    );
    expect(screen.queryByTestId('publish-listing')).not.toBeInTheDocument();
    expect(screen.queryByTestId('publish-new')).not.toBeInTheDocument();

    await user.click(within(notice).getByRole('button', {name: 'Sign out'}));
    const ask = await screen.findByTestId('publish-sign-out');
    expect(ask).toHaveTextContent('A2UIVerse forgets your publisher secret on this computer.');
    expect(ask).toHaveTextContent(`To publish as ${ME} again, you’ll need your secret (token).`);
    await user.click(within(ask).getByRole('button', {name: 'Sign out'}));
    expect(await screen.findByRole('form', {name: 'Claim a publisher name'})).toBeInTheDocument();
  });

  it('a publisher held for another Store: the notice, by the name alone', async () => {
    fake.status = {state: 'another-store', publisher: ME};
    open();
    const notice = await screen.findByTestId('publish-another-store');
    expect(notice).toHaveTextContent(
      `You’re signed in as ${ME} for a different Store. To publish here, sign out first.`,
    );
    expect(notice).not.toHaveTextContent(/https?:/);
    expect(screen.queryByTestId('publish-new')).not.toBeInTheDocument();
  });

  it('the Store unreached on entry: Try again runs the check again; Publish an app hidden', async () => {
    fake.status = {state: 'signed-in', publisher: ME, store: 'unreached'};
    const user = userEvent.setup();
    open();
    const unreached = await screen.findByTestId('publish-store-unreached');
    expect(unreached).toHaveTextContent('The Store can’t be reached right now.');
    expect(screen.getByTestId('publish-bar')).toHaveTextContent(`Publishing as ${ME}`);
    expect(screen.queryByTestId('publish-new')).not.toBeInTheDocument();

    fake.status = SIGNED_IN;
    await user.click(within(unreached).getByRole('button', {name: 'Try again'}));
    expect(await screen.findByTestId('publish-new')).toBeInTheDocument();
    expect(fake.reads).toBe(2);
  });

  it('a failed sign-out keeps the publisher, saying so', async () => {
    fake.signOut = {
      status: 500,
      body: {ok: false, findings: ['the publisher could not be forgotten: EACCES']},
    };
    const user = userEvent.setup();
    open();
    await user.click(await screen.findByRole('button', {name: 'Sign out'}));
    await user.click(
      within(await screen.findByTestId('publish-sign-out')).getByRole('button', {name: 'Sign out'}),
    );
    const failed = await screen.findByTestId('publish-sign-out-failed');
    expect(failed).toHaveTextContent('Signing out didn’t work, so you’re still signed in.');
    expect(failed).toHaveTextContent('the publisher could not be forgotten: EACCES');
  });
});

describe('the listings', () => {
  it('are the index filtered on the name, by the app’s name, each as Stellify’s list has it', async () => {
    open();
    const listings = await screen.findAllByTestId('publish-listing');
    expect(listings.map(l => l.getAttribute('data-app'))).toEqual(['linear', 'shop-a']);
    expect(screen.getByTestId('publish-bar')).toHaveTextContent(`Publishing as ${ME} · 2 apps`);

    const [linear, shop] = listings as [HTMLElement, HTMLElement];
    expect(linear).toHaveTextContent('Version 0.3.0 (card version)');
    const look = within(linear).getByTestId('publish-look');
    expect(look).toHaveTextContent(`Its look (catalog) ${LINEAR_CATALOG} at build ${LINEAR_BUILD}`);
    expect(within(look).getByTitle(LINEAR_BUILD)).toBeInTheDocument();
    expect(within(look).getByTitle(LINEAR_CATALOG)).toBeInTheDocument();
    expect(within(linear).getByTestId('publish-ahead')).toHaveTextContent(
      'Your app is ahead of the Store (ahead of the Store). It now uses a look the Store doesn’t have (https://a2uiverse.dev/linear/v2/catalog.json), and it now says it’s version 0.5.0, which the Store doesn’t have, so no one new can install it until you publish an update.',
    );

    expect(within(shop).getByTestId('publish-look')).toHaveTextContent(
      'Drawn in the basic look (basic catalog)',
    );
    expect(within(shop).getByTestId('publish-retired')).toHaveTextContent(
      'No longer offered in an older look (retired) https://shop-a.example/catalog/v1.json',
    );
    expect(within(shop).queryByTestId('publish-ahead')).not.toBeInTheDocument();
    expect(within(shop).getByTestId('store-sample')).toBeInTheDocument();
  });

  it('unpublish asks once, its outcome atop the listings, the listings read again', async () => {
    const user = userEvent.setup();
    open();
    const shop = await screen.findByRole('article', {name: 'Shop A'});
    await user.click(within(shop).getByRole('button', {name: 'Unpublish'}));
    const ask = await screen.findByTestId('publish-unpublish');
    expect(ask).toHaveTextContent(
      'Shop A leaves the Store. People who installed it keep it, and the name “shop-a” stays yours.',
    );
    await user.click(within(ask).getByRole('button', {name: 'Unpublish'}));

    expect(await screen.findByTestId('publish-act')).toHaveTextContent(
      'Shop A left the Store. People who installed it keep it.',
    );
    await waitFor(() =>
      expect(screen.queryByRole('article', {name: 'Shop A'})).not.toBeInTheDocument(),
    );
    expect(fake.unpublished).toEqual(['shop-a']);
  });

  it('an unpublish refused leads in plain words with the Store’s findings beneath', async () => {
    fake.unpublish = {status: 404, body: {ok: false, findings: ['app "shop-a" is not published']}};
    const user = userEvent.setup();
    open();
    const shop = await screen.findByRole('article', {name: 'Shop A'});
    await user.click(within(shop).getByRole('button', {name: 'Unpublish'}));
    await user.click(
      within(await screen.findByTestId('publish-unpublish')).getByRole('button', {
        name: 'Unpublish',
      }),
    );
    const notice = await screen.findByTestId('publish-act');
    expect(notice).toHaveTextContent('Shop A isn’t in the Store any more.');
    expect(notice).toHaveTextContent('What the Store found (findings)');
    expect(notice).toHaveTextContent('app "shop-a" is not published');
  });
});

describe('the publish form', () => {
  it('reads the folders and the sample in the page and posts the body Stellify posts', async () => {
    const user = userEvent.setup();
    open();
    await fillLinearUpdate(user);
    expect(where()).toEqual({page: 'publish', form: true, app: 'linear'});
    expect(screen.getByLabelText(/App name in the Store/)).toHaveValue('linear');
    expect(screen.getByLabelText(/App name in the Store/)).toHaveAttribute('readonly');
    expect(screen.getByLabelText(/Your app’s address/)).toHaveValue(
      'http://127.0.0.1:11001/linear/.well-known/agent-card.json',
    );
    expect(screen.getByText('3 files')).toBeInTheDocument();
    expect(screen.getByText('captured Oct 3')).toBeInTheDocument();
    expect(
      screen.getByText(
        'Needed because Linear asks people to sign in: the Store can’t ask it a question without your account.',
      ),
    ).toBeInTheDocument();

    await user.click(screen.getByRole('button', {name: 'Publish'}));
    // In the Store: the listings, the outcome atop them, the address theirs (task-14.11 decision 34).
    const notice = await screen.findByTestId('publish-act');
    await waitFor(() => expect(where()).toEqual({page: 'publish'}));
    expect(notice).toHaveTextContent('Linear 0.4.0 is in the Store.');
    expect(notice).toHaveTextContent(
      'People who have Linear installed see the update in their App Library.',
    );
    expect(within(notice).getByText('Details')).toBeInTheDocument();
    expect(notice).toHaveTextContent('Summary (publish summary)');
    expect(notice).toHaveTextContent('republished linear · card 0.3.0 → 0.4.0');
    expect(notice).toHaveTextContent('catalog "x" moved to a new build');

    const [sent] = fake.published as [PublishRequest];
    expect(sent.appId).toBe('linear');
    expect(sent.cardUrl).toBe('http://127.0.0.1:11001/linear/.well-known/agent-card.json');
    expect(Object.keys(sent.catalogs[0]!.files)).toEqual([
      'artifact.json',
      'dist/styles.css',
      'index.js',
    ]);
    expect(atob(sent.catalogs[0]!.files['index.js']!)).toBe('export const CATALOG = {};');
    expect(sent.preview).toEqual(preview('linear'));

    expect(await screen.findByRole('article', {name: 'Linear'})).toBeInTheDocument();
  });

  it('refuses a folder with no descriptor on the spot, and a file that is no sample', async () => {
    const user = userEvent.setup();
    open();
    const linear = await screen.findByRole('article', {name: 'Linear'});
    await user.click(within(linear).getByRole('button', {name: 'Publish an update'}));
    await user.upload(screen.getByLabelText('Choose packed folders'), [
      chosen('linear-catalog', 'package.json', '{}'),
    ]);
    expect(
      await screen.findByText(
        '“linear-catalog” wasn’t packed by Stellify. Drop the folder it wrote (dist/artifact).',
      ),
    ).toBeInTheDocument();
    await user.upload(
      screen.getByLabelText('Choose the sample answer file'),
      previewFile({x: 1}, 'notes.json'),
    );
    expect(
      await screen.findByText('“notes.json” isn’t a sample answer Stellify captured.'),
    ).toBeInTheDocument();
  });

  it('takes folders by drag and drop', async () => {
    const user = userEvent.setup();
    open();
    const linear = await screen.findByRole('article', {name: 'Linear'});
    await user.click(within(linear).getByRole('button', {name: 'Publish an update'}));

    const fileEntry = (name: string, content: string) => ({
      name,
      isFile: true,
      isDirectory: false,
      file: (resolve: (f: File) => void) => resolve(new File([content], name)),
    });
    const dirEntry = (name: string, children: unknown[]) => ({
      name,
      isFile: false,
      isDirectory: true,
      createReader: () => {
        let read = false;
        return {
          readEntries: (resolve: (entries: unknown[]) => void) => {
            resolve(read ? [] : children);
            read = true;
          },
        };
      },
    });
    const folder = dirEntry('artifact', [
      fileEntry('artifact.json', DESCRIPTOR),
      dirEntry('dist', [fileEntry('styles.css', '.x{}')]),
    ]);
    fireEvent.drop(screen.getByTestId('publish-drop-folders'), {
      dataTransfer: {items: [{webkitGetAsEntry: () => folder}], files: []},
    });
    expect(await screen.findByText('linear-catalog')).toBeInTheDocument();
    expect(screen.getByText('2 files')).toBeInTheDocument();
  });

  it('a refusal by the Store’s checks shows what it found, the form kept behind Back to the form', async () => {
    fake.publish = {
      status: 422,
      body: {
        ok: false,
        findings: ['catalog artifact 1 (linear): the schema removed component IssueRow'],
      },
    };
    const user = userEvent.setup();
    open();
    await fillLinearUpdate(user);
    await user.click(screen.getByRole('button', {name: 'Publish'}));

    const refused = await screen.findByTestId('publish-refused');
    expect(refused).toHaveTextContent(
      'The Store didn’t take this version. Your listing hasn’t changed.',
    );
    expect(refused).toHaveTextContent('What the Store found (findings)');
    expect(refused).toHaveTextContent(
      'catalog artifact 1 (linear): the schema removed component IssueRow',
    );
    await user.click(within(refused).getByRole('button', {name: 'Back to the form'}));
    expect(screen.getByText('linear-catalog')).toBeInTheDocument();
    expect(screen.getByText('preview.json')).toBeInTheDocument();
  });

  it('a publish with no clear answer is worded honestly, the form kept', async () => {
    fake.publish = {status: 503, body: {ok: false, reason: 'unreached', findings: ['timed out']}};
    const user = userEvent.setup();
    open();
    await fillLinearUpdate(user);
    await user.click(screen.getByRole('button', {name: 'Publish'}));
    const refused = await screen.findByTestId('publish-refused');
    expect(refused).toHaveTextContent(
      'The Store didn’t answer, so this version may or may not be in the Store. Your apps show what the Store has now.',
    );
    expect(refused).not.toHaveTextContent('timed out');
    await user.click(within(refused).getByRole('button', {name: 'Back to the form'}));
    expect(screen.getByText('linear-catalog')).toBeInTheDocument();
  });

  it('follows a publish to the listings, its outcome atop them, every act held while it runs', async () => {
    let release!: () => void;
    fake.publishGate = new Promise(resolve => (release = resolve));
    const user = userEvent.setup();
    open();
    await fillLinearUpdate(user);
    await user.click(screen.getByRole('button', {name: 'Publish'}));
    expect(await screen.findByTestId('publish-publishing')).toHaveTextContent('Publishing Linear');

    await user.click(screen.getByRole('link', {name: 'Your apps in the Store'}));
    expect(await screen.findByTestId('publish-act')).toHaveTextContent(
      'Publishing Linear. Waiting for the Store’s checks.',
    );
    const shop = screen.getByRole('article', {name: 'Shop A'});
    expect(within(shop).getByRole('button', {name: 'Unpublish'})).toBeDisabled();
    expect(within(shop).getByRole('button', {name: 'Publish an update'})).toBeDisabled();
    expect(screen.getByTestId('publish-new')).toBeDisabled();

    release();
    await waitFor(() =>
      expect(screen.getByTestId('publish-act')).toHaveTextContent('Linear 0.4.0 is in the Store.'),
    );
    expect(screen.getByTestId('publish-act')).toHaveTextContent('republished linear');
    expect(within(shop).getByRole('button', {name: 'Unpublish'})).toBeEnabled();
  });

  it('the secret refused mid-session reads who is signed in again, the act’s line atop the view', async () => {
    fake.publish = {
      status: 401,
      body: {
        ok: false,
        reason: 'not-accepted',
        findings: [
          "the Store no longer accepts a2uiverse-apps's token: sign out and sign in again",
        ],
      },
    };
    fake.afterPublish = {state: 'signed-in', publisher: ME, store: 'not-accepted'};
    const user = userEvent.setup();
    open();
    await fillLinearUpdate(user);
    await user.click(screen.getByRole('button', {name: 'Publish'}));

    expect(await screen.findByTestId('publish-not-accepted')).toBeInTheDocument();
    expect(screen.getByTestId('publish-act')).toHaveTextContent(
      'Nothing was published. The Store no longer accepts your publisher secret.',
    );
    expect(where()).toEqual({page: 'publish'});
  });

  it('checks a new app’s id before it is sent, and a sample for another app', async () => {
    const user = userEvent.setup();
    open();
    await user.click(await screen.findByTestId('publish-new'));
    expect(await screen.findByRole('heading', {name: 'Publish an app'})).toBeInTheDocument();
    expect(where()).toEqual({page: 'publish', form: true});
    expect(screen.getByText('Needed only if your app asks people to sign in.')).toBeInTheDocument();

    await user.type(screen.getByLabelText(/App name in the Store/), 'Shop C');
    await user.type(screen.getByLabelText(/Your app’s address/), 'http://127.0.0.1:11003/');
    await user.upload(
      screen.getByLabelText('Choose the sample answer file'),
      previewFile(preview('gmail')),
    );
    await screen.findByText('preview.json');
    await user.click(screen.getByRole('button', {name: 'Publish'}));
    expect(
      screen.getByText(
        'Use lowercase letters, numbers and hyphens, starting with a letter: shop-c.',
      ),
    ).toBeInTheDocument();
    expect(fake.published).toEqual([]);

    await user.clear(screen.getByLabelText(/App name in the Store/));
    await user.type(screen.getByLabelText(/App name in the Store/), 'shop-c');
    await user.click(screen.getByRole('button', {name: 'Publish'}));
    expect(
      screen.getByText('This sample answer is for “gmail”, not “shop-c”.'),
    ).toBeInTheDocument();
    expect(fake.published).toEqual([]);
  });

  it('checks the app’s address before it is sent: an http or https address', async () => {
    const user = userEvent.setup();
    open();
    await user.click(await screen.findByTestId('publish-new'));
    await user.type(await screen.findByLabelText(/App name in the Store/), 'shop-c');
    const address = screen.getByLabelText(/Your app’s address/);
    await user.type(address, 'localhost:11003/.well-known/agent-card.json');
    await user.click(screen.getByRole('button', {name: 'Publish'}));
    expect(
      screen.getByText('Enter your app’s full address, starting with https:// or http://.'),
    ).toBeInTheDocument();
    expect(address).toHaveAttribute('aria-invalid', 'true');
    expect(fake.published).toEqual([]);

    await user.clear(address);
    await user.type(address, ' http://localhost:11003/.well-known/agent-card.json ');
    expect(screen.queryByText(/Enter your app’s full address/)).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', {name: 'Publish'}));
    await waitFor(() => expect(fake.published).toHaveLength(1));
    expect(fake.published[0]!.cardUrl).toBe('http://localhost:11003/.well-known/agent-card.json');
  });

  it('a new app published lands on the listings with its outcome; a new form starts fresh', async () => {
    fake.publish = {
      status: 200,
      body: {
        ok: true,
        appId: 'shop-c',
        version: '1.0.0',
        summary: 'published shop-c · card 1.0.0 · basic catalog',
        notes: ['app id "shop-c" is now a2uiverse-apps\'s'],
      },
    };
    const user = userEvent.setup();
    open();
    await user.click(await screen.findByTestId('publish-new'));
    await user.type(await screen.findByLabelText(/App name in the Store/), 'shop-c');
    await user.type(screen.getByLabelText(/Your app’s address/), 'http://127.0.0.1:11003/');
    fake.index.push(entry('shop-c', 'Shop C', {versions: ['1.0.0']}));
    await user.click(screen.getByRole('button', {name: 'Publish'}));

    const notice = await screen.findByTestId('publish-act');
    await waitFor(() => expect(notice).toHaveTextContent('Shop C 1.0.0 is in the Store.'));
    expect(notice).toHaveTextContent('People can now find Shop C in the Store.');
    expect(where()).toEqual({page: 'publish'});
    expect(fake.published[0]).toEqual({
      appId: 'shop-c',
      cardUrl: 'http://127.0.0.1:11003/',
      catalogs: [],
    });

    await user.click(screen.getByTestId('publish-new'));
    expect(await screen.findByRole('heading', {name: 'Publish an app'})).toBeInTheDocument();
    expect(screen.getByLabelText(/App name in the Store/)).toHaveValue('');
  });

  it('a reload on the form lands on it filled in from the listing; Cancel returns to the listings', async () => {
    const user = userEvent.setup();
    open({page: 'publish', form: true, app: 'linear'});
    expect(
      await screen.findByRole('heading', {name: 'Publish an update to Linear'}),
    ).toBeInTheDocument();
    expect(screen.getByLabelText(/Your app’s address/)).toHaveValue(
      'http://127.0.0.1:11001/linear/.well-known/agent-card.json',
    );
    await user.click(screen.getByRole('button', {name: 'Cancel'}));
    expect(where()).toEqual({page: 'publish'});
    expect(fake.reads).toBe(1);
  });

  it('signed out, a form in the address gives way to the sign-in', async () => {
    fake.status = {state: 'signed-out'};
    open({page: 'publish', form: true});
    expect(await screen.findByRole('form', {name: 'Claim a publisher name'})).toBeInTheDocument();
    await waitFor(() => expect(where()).toEqual({page: 'publish'}));
  });
});
