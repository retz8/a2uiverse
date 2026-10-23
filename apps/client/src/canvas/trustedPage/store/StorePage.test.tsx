/**
 * The Store (task 14.7), over an orchestrator in memory: every app by name, a search on Enter, one
 * publisher's apps, an app's view with its sample drawn live and pressing nothing, Install through
 * the consent card and its outcomes in place, the update that asks for more, an app the Store does
 * not list.
 */
import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest';
import {useState} from 'react';
import {screen, waitFor, within} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {
  BASIC_CATALOG_ID,
  type IndexEntry,
  type PreviewDocument,
  type UpdateState,
} from '@a2uiverse/sdk';
import type {StoreListing} from '../../../orchestratorApi';
import type {TrustedPageState} from '../../trail/trailStore';
import {CATALOGS, renderWithShell} from '../../../../tests/helpers';
import {createInstalledApps, InstalledAppsContext} from '../../installedApps';
import {StorePage} from './StorePage';

const BASE = 'http://hub.test';

const entry = (appId: string, name: string, more: Partial<IndexEntry> = {}): IndexEntry => ({
  appId,
  publisher: 'a2uiverse-apps',
  cardUrl: `http://127.0.0.1:11001/${appId}/.well-known/agent-card.json`,
  card: {
    name,
    description: `${name} does its thing.`,
    url: `http://127.0.0.1:11001/${appId}`,
    version: '1.0.0',
    skills: [{name: 'main', description: '', examples: [`What does ${name} have?`]}],
  },
  catalogs: {},
  versions: ['1.0.0'],
  publishedAt: '2026-10-03T10:00:00Z',
  retired: [],
  ...more,
});

const LINEAR = entry('linear', 'Linear', {
  card: {
    name: 'Linear',
    description: 'Shows the user’s Linear issues.',
    url: 'http://127.0.0.1:11005',
    version: '1.0.0',
    skills: [{name: 'issues', description: '', examples: ['What’s assigned to me in Linear?']}],
    securitySchemes: {
      linear: {
        type: 'oauth2',
        flows: {
          authorizationCode: {
            authorizationUrl: 'https://linear.example/authorize',
            tokenUrl: 'https://linear.example/token',
            scopes: {read: 'See your issues', write: 'Create, change and comment on your issues'},
          },
        },
      },
    },
    security: [{linear: ['read']}],
  },
});
const SHOP_A = entry('shop-a', 'Shop A');
const GMAIL = entry('gmail', 'Gmail');
const ACME = entry('acme-notes', 'Acme Notes', {publisher: 'acme'});

const preview = (appId: string, text: string): PreviewDocument => ({
  appId,
  version: '1.0.0',
  words: 'What cameras do you have?',
  messages: [
    {version: 'v0.9', createSurface: {surfaceId: 'main', catalogId: BASIC_CATALOG_ID}},
    {
      version: 'v0.9',
      updateComponents: {
        surfaceId: 'main',
        root: 'root',
        components: [
          {id: 'root', component: 'Column', children: ['line', 'buy']},
          {id: 'line', component: 'Text', text},
          {id: 'buy', component: 'Button', child: 'buy-label', action: {event: {name: 'buy'}}},
          {id: 'buy-label', component: 'Text', text: 'Buy'},
        ],
      },
    },
  ],
  capturedBy: 'marketplace',
  capturedAt: '2026-10-03T10:00:00Z',
});

interface Fake {
  listings: StoreListing[];
  /** What a search answers, in rank order. */
  search: StoreListing[];
  install: Record<string, unknown>;
  unreached: boolean;
  installs: string[];
  /** What an install waits on before it answers. */
  gate?: Promise<void>;
}

let fake: Fake;

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {status, headers: {'Content-Type': 'application/json'}});

beforeEach(() => {
  fake = {
    listings: [
      {entry: SHOP_A, installed: false},
      {entry: LINEAR, installed: false},
      {entry: GMAIL, installed: true},
      {entry: ACME, installed: false},
    ],
    search: [],
    install: {ok: true, appId: 'linear', replaced: false, followed: []},
    unreached: false,
    installs: [],
  };
  vi.stubGlobal(
    'fetch',
    vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = new URL(String(input));
      const path = url.pathname;
      if (path.startsWith('/marketplace/') && fake.unreached) {
        return json({ok: false, reason: 'unreached', findings: []}, 503);
      }
      if (path === '/marketplace/index.json') return json(fake.listings);
      if (path === '/marketplace/search')
        return json({results: fake.search.map(l => ({...l, score: 1}))});
      const app = /^\/marketplace\/apps\/([^/]+)\/(entry|preview)\.json$/.exec(path);
      if (app) {
        const listing = fake.listings.find(l => l.entry.appId === app[1]);
        if (!listing) return json({ok: false, reason: 'not-published', findings: []}, 404);
        return json(
          app[2] === 'entry'
            ? listing
            : preview(app[1]!, `${listing.entry.card.name}: Lumen X100 · $1,449`),
        );
      }
      if (path === '/registry/install' && init?.method === 'POST') {
        const {appId} = JSON.parse(String(init.body)) as {appId: string};
        fake.installs.push(appId);
        await fake.gate;
        if (fake.install.ok === true) {
          fake.listings = fake.listings.map(l =>
            l.entry.appId === appId ? {entry: l.entry, installed: true} : l,
          );
        }
        return json(fake.install, fake.install.ok === true ? 200 : 422);
      }
      if (path === '/registry/apps.json') {
        return json([
          {id: 'gmail', card: {name: 'Gmail'}},
          {id: 'calendar', card: {name: 'Google Calendar'}},
        ]);
      }
      return json({}, 404);
    }),
  );
});

afterEach(() => {
  vi.unstubAllGlobals();
});

/** The Store with the page's moves kept, as the history would keep them. */
function Store({
  initial,
  onInstalled,
  onClose,
}: {
  initial: TrustedPageState;
  onInstalled?: (appId: string) => boolean;
  onClose?: () => void;
}) {
  const [page, setPage] = useState(initial);
  return (
    <>
      <StorePage
        page={page}
        onNavigate={setPage}
        orchestrator={BASE}
        catalogs={CATALOGS}
        container={null}
        {...(onInstalled ? {onInstalled} : {})}
        {...(onClose ? {onClose} : {})}
      />
      <output data-testid="where">{JSON.stringify(page)}</output>
    </>
  );
}

const where = () => JSON.parse(screen.getByTestId('where').textContent!) as TrustedPageState;
const rows = () => screen.getAllByTestId('store-row').map(row => row.getAttribute('data-app'));

describe('browsing the Store', () => {
  it('lists every app by name, each with its publisher and Install or its state (task-14.2 decision 2)', async () => {
    renderWithShell(<Store initial={{page: 'store'}} />);
    await waitFor(() => expect(rows()).toEqual(['acme-notes', 'gmail', 'linear', 'shop-a']));
    expect(screen.getByTestId('store-label')).toHaveTextContent('All apps · 4');
    const gmail = screen.getAllByTestId('store-row')[1]!;
    expect(within(gmail).getByText('Installed')).toBeInTheDocument();
    expect(within(gmail).queryByRole('button')).toBeNull();
    const linear = screen.getAllByTestId('store-row')[2]!;
    expect(within(linear).getByRole('button', {name: 'Install Linear'})).toBeInTheDocument();
    expect(within(linear).getByRole('link', {name: 'a2uiverse-apps'})).toBeInTheDocument();
  });

  it('shows a waiting update in the App Library’s words with Update; one on its way with no press', async () => {
    const major: UpdateState = {
      appId: 'gmail',
      installedVersion: '1.0.0',
      state: 'major-update',
      publishedVersion: '2.0.0',
      newCatalogIds: [],
      newScopes: [],
      builds: [],
    };
    fake.listings[2] = {entry: GMAIL, installed: true, update: major};
    renderWithShell(<Store initial={{page: 'store'}} />);
    const gmail = await screen.findByRole('button', {name: 'Update Gmail'});
    expect(gmail.closest('li')).toHaveTextContent('A new version is available');
  });

  it('opened on a query, searches it at once and keeps it in the box (task-14.7 decision 3)', async () => {
    fake.search = [{entry: SHOP_A, installed: false}];
    renderWithShell(<Store initial={{page: 'store', query: 'camera shops'}} />);
    await waitFor(() => expect(rows()).toEqual(['shop-a']));
    expect(screen.getByTestId('store-label')).toHaveTextContent('Closest matches · 1');
    expect(screen.getByRole('searchbox', {name: 'Search the Store'})).toHaveValue('camera shops');
  });

  it('searches on Enter only, and emptying the box returns to every app', async () => {
    renderWithShell(<Store initial={{page: 'store'}} />);
    await waitFor(() => expect(rows()).toHaveLength(4));
    const box = screen.getByRole('searchbox', {name: 'Search the Store'});
    await userEvent.type(box, 'notes');
    expect(where()).toEqual({page: 'store'});
    await userEvent.keyboard('{Enter}');
    expect(where()).toEqual({page: 'store', query: 'notes'});
    await userEvent.clear(box);
    expect(where()).toEqual({page: 'store'});
  });

  it('clears the search with its icon button, back to every app', async () => {
    renderWithShell(<Store initial={{page: 'store', query: 'notes'}} />);
    const box = screen.getByRole('searchbox', {name: 'Search the Store'});
    await userEvent.click(await screen.findByRole('button', {name: 'Clear the search'}));
    expect(box).toHaveValue('');
    expect(where()).toEqual({page: 'store'});
    expect(screen.queryByRole('button', {name: 'Clear the search'})).not.toBeInTheDocument();
  });

  it('says when nothing matches, with Show every app', async () => {
    renderWithShell(<Store initial={{page: 'store', query: 'flight tracker'}} />);
    expect(await screen.findByText('No apps match “flight tracker”.')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('link', {name: 'Show every app'}));
    expect(where()).toEqual({page: 'store'});
  });

  it('filters on a publisher’s name from any listing, in the address (task-14.7 decision 4)', async () => {
    renderWithShell(<Store initial={{page: 'store'}} />);
    await waitFor(() => expect(rows()).toHaveLength(4));
    await userEvent.click(screen.getByRole('link', {name: 'acme'}));
    expect(where()).toEqual({page: 'store', publisher: 'acme'});
    await waitFor(() => expect(rows()).toEqual(['acme-notes']));
    expect(screen.getByTestId('store-label')).toHaveTextContent('Apps by acme · 1');
    expect(screen.getByRole('searchbox')).toHaveAttribute(
      'placeholder',
      'Search this publisher’s apps',
    );
    await userEvent.click(screen.getByRole('button', {name: 'Show every publisher'}));
    expect(where()).toEqual({page: 'store'});
  });

  it('says the Store can’t be reached, and tries again', async () => {
    fake.unreached = true;
    renderWithShell(<Store initial={{page: 'store'}} />);
    expect(await screen.findByText('The Store can’t be reached right now.')).toBeInTheDocument();
    fake.unreached = false;
    await userEvent.click(screen.getByRole('button', {name: 'Try again'}));
    await waitFor(() => expect(rows()).toHaveLength(4));
  });
});

describe('an app’s view', () => {
  it('says what it does, what to ask, what signing in will be, and draws its sample', async () => {
    renderWithShell(<Store initial={{page: 'store', app: 'linear'}} />);
    expect(await screen.findByRole('heading', {name: 'Linear'})).toBeInTheDocument();
    expect(screen.getByText('Shows the user’s Linear issues.')).toBeInTheDocument();
    expect(screen.getByText('“What’s assigned to me in Linear?”')).toBeInTheDocument();
    expect(screen.getByText('See your issues')).toBeInTheDocument();
    const sample = await screen.findByRole('figure', {name: 'Sample answer from Linear'});
    await waitFor(() => expect(sample).toHaveAttribute('data-status', 'ready'));
    expect(within(sample).getByText('Linear: Lumen X100 · $1,449')).toBeInTheDocument();
    expect(within(sample).getByText('“What cameras do you have?”')).toBeInTheDocument();
    expect(sample).toHaveTextContent('Made by the Store when Linear was published');
  });

  it('draws the sample as a picture: nothing in it takes a press (task-14.7 decision 5)', async () => {
    renderWithShell(<Store initial={{page: 'store', app: 'shop-a'}} />);
    const sample = await screen.findByRole('figure', {name: 'Sample answer from Shop A'});
    await waitFor(() => expect(sample).toHaveAttribute('data-status', 'ready'));
    expect(sample.querySelector('[inert]')).not.toBeNull();
    expect(within(sample).getByText('Buy').closest('[inert]')).not.toBeNull();
  });

  it('enlarges the sample in a dialog of its own, closed by its ✕ (task-14.11 decision 33)', async () => {
    renderWithShell(<Store initial={{page: 'store', app: 'linear'}} />);
    const sample = await screen.findByRole('figure', {name: 'Sample answer from Linear'});
    await waitFor(() => expect(sample).toHaveAttribute('data-status', 'ready'));
    await userEvent.click(within(sample).getByRole('button', {name: 'Enlarge the sample'}));
    const dialog = await screen.findByRole('dialog', {name: 'Sample answer from Linear'});
    expect(within(dialog).getByText('“What cameras do you have?”')).toBeInTheDocument();
    expect(within(dialog).getByText('Linear: Lumen X100 · $1,449')).toBeInTheDocument();
    expect(dialog.querySelector('[inert]')).not.toBeNull();
    await userEvent.click(within(dialog).getByRole('button', {name: 'Close'}));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
  });

  it('goes back to the list it came from, named for it (task-14.7 decision 12)', async () => {
    renderWithShell(<Store initial={{page: 'store', query: 'camera', app: 'shop-a'}} />);
    await userEvent.click(await screen.findByRole('link', {name: 'Back to results'}));
    expect(where()).toEqual({page: 'store', query: 'camera'});
  });

  it('says an app the Store doesn’t list isn’t in the Store (task-14.7 decision 13)', async () => {
    renderWithShell(<Store initial={{page: 'store', app: 'nowhere'}} />);
    expect(await screen.findByText('This app isn’t in the Store.')).toBeInTheDocument();
  });
});

describe('holding what it read (task-14.11 decision 29)', () => {
  const reads = (path: string) =>
    vi.mocked(fetch).mock.calls.filter(([input]) => new URL(String(input)).pathname === path)
      .length;

  it('clearing a search shows every app again without reading the Store again', async () => {
    fake.search = [{entry: SHOP_A, installed: false}];
    renderWithShell(<Store initial={{page: 'store'}} />);
    await waitFor(() => expect(rows()).toHaveLength(4));
    const box = screen.getByRole('searchbox', {name: 'Search the Store'});
    await userEvent.type(box, 'camera{Enter}');
    await waitFor(() => expect(rows()).toEqual(['shop-a']));
    await userEvent.click(screen.getByRole('button', {name: 'Clear the search'}));
    expect(rows()).toHaveLength(4);
    expect(reads('/marketplace/index.json')).toBe(1);
    await userEvent.type(box, 'camera{Enter}');
    expect(rows()).toEqual(['shop-a']);
    expect(reads('/marketplace/search')).toBe(1);
  });

  it('back from an app’s view the list is not read again; after an install it is', async () => {
    renderWithShell(<Store initial={{page: 'store'}} />);
    await waitFor(() => expect(rows()).toHaveLength(4));
    await userEvent.click(screen.getByRole('link', {name: 'Shop A'}));
    await userEvent.click(await screen.findByRole('link', {name: 'All apps'}));
    expect(rows()).toHaveLength(4);
    expect(reads('/marketplace/index.json')).toBe(1);
    await userEvent.click(screen.getByRole('link', {name: 'Linear'}));
    await userEvent.click(await screen.findByRole('button', {name: 'Install Linear'}));
    const card = await screen.findByRole('alertdialog', {name: 'Install Linear?'});
    await userEvent.click(within(card).getByRole('button', {name: 'Install'}));
    await screen.findByTestId('store-done');
    await userEvent.click(screen.getByRole('link', {name: 'All apps'}));
    await waitFor(() => expect(reads('/marketplace/index.json')).toBe(2));
    const linear = screen.getAllByTestId('store-row').find(row => row.dataset.app === 'linear')!;
    await waitFor(() => expect(linear).toHaveTextContent('Installed'));
  });
});

describe('installing', () => {
  it('asks once on the consent card, installs, and stays in place saying so', async () => {
    fake.install = {ok: true, appId: 'linear', replaced: false, followed: ['gmail', 'calendar']};
    renderWithShell(<Store initial={{page: 'store', app: 'linear'}} />);
    await userEvent.click(await screen.findByRole('button', {name: 'Install Linear'}));
    const card = await screen.findByRole('alertdialog', {name: 'Install Linear?'});
    expect(within(card).getByText('by a2uiverse-apps')).toBeInTheDocument();
    expect(within(card).getByText('See your issues')).toBeInTheDocument();
    expect(fake.installs).toEqual([]);
    await userEvent.click(within(card).getByRole('button', {name: 'Install'}));
    const done = await screen.findByTestId('store-done');
    expect(fake.installs).toEqual(['linear']);
    expect(done).toHaveTextContent('Linear is installed.');
    expect(done).toHaveTextContent('Also updated along with it: Gmail and Google Calendar.');
    expect(done).toHaveTextContent('Try asking “What’s assigned to me in Linear?” on your canvas.');
    await waitFor(() => expect(screen.getByText('Installed')).toBeInTheDocument());
    expect(screen.getByRole('heading', {name: 'Linear'})).toBeInTheDocument();
  });

  it('Cancel installs nothing', async () => {
    renderWithShell(<Store initial={{page: 'store', app: 'linear'}} />);
    await userEvent.click(await screen.findByRole('button', {name: 'Install Linear'}));
    await userEvent.click(await screen.findByRole('button', {name: 'Cancel'}));
    expect(screen.queryByRole('alertdialog')).toBeNull();
    expect(fake.installs).toEqual([]);
  });

  it('a row’s Install opens the app’s view and asks there', async () => {
    renderWithShell(<Store initial={{page: 'store'}} />);
    await userEvent.click(await screen.findByRole('button', {name: 'Install Shop A'}));
    expect(where()).toEqual({page: 'store', app: 'shop-a'});
    const card = await screen.findByRole('alertdialog', {name: 'Install Shop A?'});
    expect(card).toHaveTextContent('Shop A doesn’t ask you to sign in.');
  });

  it.each([
    ['store-behind', 'Linear can’t be installed yet.', 'Install Linear'],
    ['app-unreached', 'Linear couldn’t be reached,', 'Try again'],
    ['store-unreached', 'The Store can’t be reached right now,', 'Try again'],
  ])(
    'a refusal for %s says why, with the press it leaves (task-14.7 decision 6)',
    async (cause, words, press) => {
      fake.install = {ok: false, findings: ['…'], cause};
      renderWithShell(<Store initial={{page: 'store', app: 'linear'}} />);
      await userEvent.click(await screen.findByRole('button', {name: 'Install Linear'}));
      await userEvent.click(
        within(await screen.findByRole('alertdialog')).getByRole('button', {name: 'Install'}),
      );
      expect(await screen.findByTestId('store-refused')).toHaveTextContent(words);
      expect(screen.getByRole('button', {name: press})).toBeEnabled();
    },
  );

  it('a refusal by the checks leaves Install off', async () => {
    fake.install = {ok: false, findings: ['…'], cause: 'checks'};
    renderWithShell(<Store initial={{page: 'store', app: 'linear'}} />);
    await userEvent.click(await screen.findByRole('button', {name: 'Install Linear'}));
    await userEvent.click(
      within(await screen.findByRole('alertdialog')).getByRole('button', {name: 'Install'}),
    );
    expect(await screen.findByTestId('store-refused')).toHaveTextContent(
      'Its files didn’t pass the checks on this computer',
    );
    expect(screen.getByRole('button', {name: 'Install'})).toBeDisabled();
  });
});

describe('updating', () => {
  it('an update that asks for more passes the consent card, naming only what is new', async () => {
    const asks: UpdateState = {
      appId: 'linear',
      installedVersion: '1.0.0',
      state: 'card-update',
      publishedVersion: '1.1.0',
      newScopes: [{scheme: 'linear', scopes: ['write']}],
      builds: [{catalogId: 'urn:linear', installed: 'sha256-a', published: 'sha256-b'}],
    };
    fake.listings[1] = {entry: LINEAR, installed: true, update: asks};
    fake.install = {ok: true, appId: 'linear', replaced: true, followed: []};
    renderWithShell(<Store initial={{page: 'store', app: 'linear'}} />);
    expect(await screen.findByText('An update that asks for more')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', {name: 'Update Linear'}));
    const card = await screen.findByRole('alertdialog', {name: 'Update Linear?'});
    expect(card).toHaveTextContent('Create, change and comment on your issues');
    expect(card).not.toHaveTextContent('See your issues');
    expect(card).toHaveTextContent('It also brings a new look for its answers.');
    await userEvent.click(within(card).getByRole('button', {name: 'Update'}));
    expect(await screen.findByTestId('store-done')).toHaveTextContent('Linear is updated.');
  });

  it('every other update goes straight through', async () => {
    const newer: UpdateState = {
      appId: 'gmail',
      installedVersion: '1.0.0',
      state: 'newer-build',
      publishedVersion: '1.0.0',
      builds: [],
    };
    fake.listings[2] = {entry: GMAIL, installed: true, update: newer};
    fake.install = {ok: true, appId: 'gmail', replaced: true, followed: []};
    renderWithShell(<Store initial={{page: 'store', app: 'gmail'}} />);
    await userEvent.click(await screen.findByRole('button', {name: 'Update Gmail'}));
    expect(screen.queryByRole('alertdialog')).toBeNull();
    expect(await screen.findByTestId('store-done')).toHaveTextContent('Gmail is updated.');
    expect(fake.installs).toEqual(['gmail']);
  });
});

describe('beside the canvas’s slots (task 15.9)', () => {
  const holder = () =>
    createInstalledApps({
      read: async () => [{id: 'linear', card: {name: 'Linear', version: '1.0.0'}}] as never,
    });

  it('an app held by a press elsewhere draws its Install disabled, on its view and its row (decision 1)', async () => {
    const apps = holder();
    apps.hold('linear');
    renderWithShell(
      <InstalledAppsContext.Provider value={apps}>
        <Store initial={{page: 'store'}} />
      </InstalledAppsContext.Provider>,
    );
    expect(await screen.findByRole('button', {name: 'Install Linear'})).toBeDisabled();
    expect(screen.getByRole('button', {name: 'Install Shop A'})).toBeEnabled();
  });

  it('an install holds its app until it lands, then reads the installed apps again', async () => {
    let open = () => {};
    fake.gate = new Promise(resolve => {
      open = resolve;
    });
    const apps = holder();
    renderWithShell(
      <InstalledAppsContext.Provider value={apps}>
        <Store initial={{page: 'store', app: 'linear'}} />
      </InstalledAppsContext.Provider>,
    );
    await userEvent.click(await screen.findByRole('button', {name: 'Install Linear'}));
    const card = await screen.findByRole('alertdialog', {name: 'Install Linear?'});
    await userEvent.click(within(card).getByRole('button', {name: 'Install'}));
    expect(apps.getState().held.has('linear')).toBe(true);
    open();
    await screen.findByTestId('store-done');
    expect(apps.getState().held.has('linear')).toBe(false);
    expect(apps.getState().versions.get('linear')).toBe('1.0.0');
  });

  it('an install on a page opened from a slot that fills it says it is answering on the canvas, with Back to your canvas (decision 3)', async () => {
    const onInstalled = vi.fn(() => true);
    const onClose = vi.fn();
    renderWithShell(
      <Store
        initial={{page: 'store', app: 'linear'}}
        onInstalled={onInstalled}
        onClose={onClose}
      />,
    );
    await userEvent.click(await screen.findByRole('button', {name: 'Install Linear'}));
    const card = await screen.findByRole('alertdialog', {name: 'Install Linear?'});
    await userEvent.click(within(card).getByRole('button', {name: 'Install'}));
    const done = await screen.findByTestId('store-done');
    expect(onInstalled).toHaveBeenCalledWith('linear');
    expect(done).toHaveTextContent('Linear is installed. It’s answering on your canvas.');
    expect(done).not.toHaveTextContent('Try asking');
    await userEvent.click(within(done).getByRole('button', {name: 'Back to your canvas'}));
    expect(onClose).toHaveBeenCalledOnce();
  });

  it('an install that fills no slot keeps today’s line', async () => {
    renderWithShell(<Store initial={{page: 'store', app: 'linear'}} onInstalled={() => false} />);
    await userEvent.click(await screen.findByRole('button', {name: 'Install Linear'}));
    const card = await screen.findByRole('alertdialog', {name: 'Install Linear?'});
    await userEvent.click(within(card).getByRole('button', {name: 'Install'}));
    const done = await screen.findByTestId('store-done');
    expect(done).toHaveTextContent('Try asking “What’s assigned to me in Linear?” on your canvas.');
    expect(within(done).queryByRole('button', {name: 'Back to your canvas'})).toBeNull();
  });
});
