/**
 * The App Library (task 14.8), over an orchestrator in memory: the check on entry and after an
 * update, each state in plain words, a list row's Update with its outcome atop the list, an app's
 * view with its publisher, its accounts — permissions, rename, sign-out, add account with no
 * canvas — and uninstall asked once.
 */
import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest';
import {useState} from 'react';
import {screen, waitFor, within} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type {IndexEntry, PublishedCard, UpdateState} from '@a2uiverse/sdk';
import type {InstalledApp, LibraryApp} from '../../../orchestratorApi';
import type {TrustedPageState} from '../../trail/trailStore';
import {CATALOGS, renderWithShell} from '../../../../tests/helpers';
import {LibraryPage} from './LibraryPage';

/** Over https: a sign-in window opens only there, localhost exempt. */
const BASE = 'https://hub.test';

const card = (name: string, more: Partial<PublishedCard> = {}): PublishedCard => ({
  name,
  description: `${name} does its thing.`,
  url: `http://127.0.0.1:11001/${name}`,
  version: '1.0.0',
  skills: [],
  ...more,
});

const OAUTH = {
  securitySchemes: {
    google: {
      type: 'oauth2',
      flows: {
        authorizationCode: {
          authorizationUrl: 'https://accounts.example/authorize',
          tokenUrl: 'https://accounts.example/token',
          scopes: {read: 'Read your email and its labels'},
        },
      },
    },
  },
  security: [{google: ['read']}],
} as Partial<PublishedCard>;

const KEY = {
  securitySchemes: {shop: {type: 'apiKey', in: 'header', name: 'X-Key'}},
  security: [{shop: []}],
} as Partial<PublishedCard>;

const installed = (id: string, name: string, more: Partial<InstalledApp> = {}): InstalledApp => ({
  id,
  card: card(name),
  source: 'marketplace',
  reachable: true,
  ...more,
});

const entry = (appId: string, name: string): IndexEntry => ({
  appId,
  publisher: 'a2uiverse-apps',
  cardUrl: `http://127.0.0.1:11001/${appId}/.well-known/agent-card.json`,
  card: card(name),
  catalogs: {},
  versions: ['1.0.0'],
  publishedAt: '2026-10-03T10:00:00Z',
  retired: [],
});

const at = (appId: string, more: Record<string, unknown>) =>
  ({appId, installedVersion: '1.0.0', ...more}) as UpdateState;

interface Fake {
  installed: InstalledApp[];
  states: UpdateState[];
  accounts: LibraryApp[];
  listings: IndexEntry[];
  checks: number;
  /** Holds the check's answer until released. */
  gate?: Promise<void>;
  installs: string[];
  install: Record<string, unknown>;
  /** Holds the install's answer until released. */
  installGate?: Promise<void>;
  renamed: {source: string; label: string}[];
  rename: Record<string, unknown>;
  revocation: string;
  uninstalled: string[];
  attempts: Map<string, Record<string, unknown>>;
  /** What every attempt answers. */
  attempt: Record<string, unknown>;
}

let fake: Fake;

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {status, headers: {'Content-Type': 'application/json'}});

beforeEach(() => {
  fake = {
    installed: [
      installed('gmail', 'Gmail', {card: card('Gmail', OAUTH)}),
      installed('calendar', 'Google Calendar'),
      installed('linear', 'Linear', {reachable: false}),
      installed('shop-b', 'Shop B', {source: 'local', card: card('Shop B', KEY)}),
    ],
    states: [
      at('gmail', {state: 'up-to-date', publishedVersion: '1.0.0'}),
      at('calendar', {
        state: 'major-update',
        publishedVersion: '2.0.0',
        newCatalogIds: [],
        builds: [],
      }),
      at('linear', {state: 'up-to-date', publishedVersion: '1.0.0'}),
      at('shop-b', {state: 'not-published'}),
    ],
    accounts: [
      {
        appId: 'gmail',
        signIn: 'supported',
        accounts: [
          {
            source: 'gmail:1',
            label: 'me@example.com',
            kind: 'oauth',
            permissions: ['Read your email and its labels'],
            lapsed: false,
          },
          {
            source: 'gmail:2',
            label: 'work@example.com',
            kind: 'oauth',
            permissions: [],
            lapsed: false,
          },
        ],
      },
      {appId: 'calendar', signIn: 'none', accounts: []},
      {appId: 'linear', signIn: 'none', accounts: []},
      {
        appId: 'shop-b',
        signIn: 'supported',
        accounts: [
          {
            source: 'shop-b:1',
            label: 'Shop B account 1',
            kind: 'key',
            permissions: [],
            lapsed: false,
          },
        ],
      },
    ],
    listings: [
      entry('gmail', 'Gmail'),
      entry('calendar', 'Google Calendar'),
      entry('linear', 'Linear'),
    ],
    checks: 0,
    installs: [],
    install: {ok: true, appId: 'calendar', replaced: true, followed: []},
    renamed: [],
    rename: {ok: true},
    revocation: 'revoked',
    uninstalled: [],
    attempts: new Map(),
    attempt: {state: 'pending'},
  };
  vi.stubGlobal(
    'fetch',
    vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = new URL(String(input));
      const path = url.pathname;
      const body = init?.body ? (JSON.parse(String(init.body)) as Record<string, string>) : {};
      if (path === '/registry/apps.json') return json(fake.installed);
      if (path === '/registry/updates.json') {
        fake.checks += 1;
        await fake.gate;
        return json(fake.states);
      }
      if (path === '/auth/accounts.json') return json(fake.accounts);
      if (path === '/marketplace/index.json')
        return json(fake.listings.map(e => ({entry: e, installed: true})));
      const app = /^\/marketplace\/apps\/([^/]+)\/entry\.json$/.exec(path);
      if (app) {
        const found = fake.listings.find(e => e.appId === app[1]);
        return found
          ? json({entry: found, installed: true})
          : json({ok: false, reason: 'not-published'}, 404);
      }
      if (path === '/registry/install') {
        fake.installs.push(body.appId!);
        await fake.installGate;
        return json(fake.install, fake.install.ok === true ? 200 : 422);
      }
      if (path === '/registry/uninstall') {
        fake.uninstalled.push(body.appId!);
        const held = fake.accounts.find(a => a.appId === body.appId)?.accounts ?? [];
        fake.installed = fake.installed.filter(a => a.id !== body.appId);
        return json({
          ok: true,
          appId: body.appId,
          accounts: held.map(a => ({
            source: a.source,
            label: a.label,
            revocation: fake.revocation,
          })),
        });
      }
      if (path === '/auth/rename') {
        fake.renamed.push({source: body.source!, label: body.label!});
        if (fake.rename.ok !== true) return json(fake.rename, 422);
        for (const held of fake.accounts) {
          for (const account of held.accounts)
            if (account.source === body.source) account.label = body.label!;
        }
        return json({ok: true, source: body.source, label: body.label});
      }
      if (path === '/auth/sign-out') {
        const held = fake.accounts.flatMap(a => a.accounts).find(a => a.source === body.source);
        for (const app of fake.accounts)
          app.accounts = app.accounts.filter(a => a.source !== body.source);
        return json({
          ok: true,
          source: body.source,
          label: held?.label,
          revocation: fake.revocation,
        });
      }
      const attempt = /^\/auth\/attempts\/([^/]+)$/.exec(path);
      if (attempt) return json(fake.attempts.get(attempt[1]!) ?? fake.attempt);
      return json({}, 404);
    }),
  );
});

afterEach(() => {
  vi.unstubAllGlobals();
});

const opened: string[] = [];

/** The App Library with the page's moves kept, as the history would keep them. */
function Library({initial}: {initial: TrustedPageState}) {
  const [page, setPage] = useState(initial);
  return (
    <>
      <LibraryPage
        page={page}
        onNavigate={setPage}
        orchestrator={BASE}
        catalogs={CATALOGS}
        container={null}
        pollMs={5}
        openWindow={url => opened.push(url)}
      />
      <output data-testid="where">{JSON.stringify(page)}</output>
    </>
  );
}

const where = () => JSON.parse(screen.getByTestId('where').textContent!) as TrustedPageState;
const row = (appId: string) =>
  screen.getAllByTestId('library-row').find(r => r.getAttribute('data-app') === appId)!;

describe('the list of your apps', () => {
  it('lists every app by name with its state in plain words, the check run on entry (decision 1)', async () => {
    renderWithShell(<Library initial={{page: 'appLibrary'}} />);
    await waitFor(() =>
      expect(screen.getByTestId('library-label')).toHaveTextContent('Checked for updates at'),
    );
    expect(fake.checks).toBe(1);
    expect(screen.getAllByTestId('library-row').map(r => r.getAttribute('data-app'))).toEqual([
      'gmail',
      'calendar',
      'linear',
      'shop-b',
    ]);
    expect(screen.getByTestId('library-label')).toHaveTextContent('Your apps · 4');
    expect(row('gmail')).toHaveTextContent('Up to date');
    expect(
      within(row('calendar')).getByRole('button', {name: 'Update Google Calendar'}),
    ).toBeInTheDocument();
    expect(row('calendar')).toHaveTextContent('A new version is available');
    expect(row('shop-b')).toHaveTextContent('Installed from your computer');
  });

  it('says an app not reached in place of its state (decision 2)', async () => {
    renderWithShell(<Library initial={{page: 'appLibrary'}} />);
    await waitFor(() => expect(row('linear')).toHaveTextContent('Couldn’t be reached'));
    expect(within(row('linear')).queryByRole('button')).toBeNull();
  });

  it('shows each row checking until the check answers, and Check again runs it again', async () => {
    let release!: () => void;
    fake.gate = new Promise(resolve => (release = resolve));
    renderWithShell(<Library initial={{page: 'appLibrary'}} />);
    await waitFor(() => expect(screen.getAllByTestId('library-row')).toHaveLength(4));
    expect(screen.getByTestId('library-label')).toHaveTextContent('Checking for updates');
    expect(screen.queryAllByTestId('library-state')).toHaveLength(0);
    release();
    await waitFor(() => expect(screen.getAllByTestId('library-state')).toHaveLength(4));
    fake.gate = undefined;
    await userEvent.click(screen.getByRole('button', {name: 'Check again'}));
    await waitFor(() => expect(fake.checks).toBe(2));
  });

  it('moving to an app’s view and back runs no check', async () => {
    renderWithShell(<Library initial={{page: 'appLibrary'}} />);
    await waitFor(() => expect(screen.getAllByTestId('library-state')).toHaveLength(4));
    await userEvent.click(screen.getByRole('link', {name: 'Gmail'}));
    expect(where()).toEqual({page: 'appLibrary', app: 'gmail'});
    await userEvent.click(await screen.findByRole('link', {name: 'Your apps'}));
    expect(fake.checks).toBe(1);
  });

  it('a row’s Update runs in place, its outcome atop the list, and the check runs again (decisions 3, 4)', async () => {
    let release!: () => void;
    fake.installGate = new Promise(resolve => (release = resolve));
    fake.install = {ok: true, appId: 'calendar', replaced: true, followed: ['gmail']};
    renderWithShell(<Library initial={{page: 'appLibrary'}} />);
    await userEvent.click(await screen.findByRole('button', {name: 'Update Google Calendar'}));
    expect(within(row('calendar')).getByRole('button', {name: 'Updating'})).toBeDisabled();
    release();
    const done = await screen.findByTestId('library-updated');
    expect(done).toHaveTextContent(
      'Google Calendar is updated to the newest version. Also updated along with it: Gmail.',
    );
    expect(fake.installs).toEqual(['calendar']);
    expect(where()).toEqual({page: 'appLibrary'});
    await waitFor(() => expect(fake.checks).toBe(2));
  });

  it('one update runs at a time across the page', async () => {
    fake.installGate = new Promise(() => {});
    fake.states[0] = at('gmail', {
      state: 'major-update',
      publishedVersion: '2.0.0',
      newCatalogIds: [],
      builds: [],
    });
    renderWithShell(<Library initial={{page: 'appLibrary'}} />);
    await userEvent.click(await screen.findByRole('button', {name: 'Update Google Calendar'}));
    expect(within(row('gmail')).getByRole('button', {name: 'Update Gmail'})).toBeDisabled();
  });

  it('the update that asks for more passes the consent card first', async () => {
    fake.states[1] = at('calendar', {
      state: 'card-update',
      publishedVersion: '1.1.0',
      newScopes: [],
      builds: [{catalogId: 'x', installed: 'a', published: 'b'}],
    });
    renderWithShell(<Library initial={{page: 'appLibrary'}} />);
    await userEvent.click(await screen.findByRole('button', {name: 'Update Google Calendar'}));
    const consent = await screen.findByTestId('consent-card');
    expect(consent).toHaveTextContent('Update Google Calendar?');
    expect(consent).toHaveTextContent('It also brings a new look for its answers.');
    expect(fake.installs).toEqual([]);
    await userEvent.click(within(consent).getByRole('button', {name: 'Update'}));
    await waitFor(() => expect(fake.installs).toEqual(['calendar']));
  });

  it('with nothing installed, points at the Store', async () => {
    fake.installed = [];
    renderWithShell(<Library initial={{page: 'appLibrary'}} />);
    expect(await screen.findByText('No apps yet.')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('link', {name: 'Browse the Store'}));
    expect(where()).toEqual({page: 'store'});
  });
});

describe('an app’s view', () => {
  it('heads with the app, its publisher linking to the Store’s filter, and its state (decision 6)', async () => {
    renderWithShell(<Library initial={{page: 'appLibrary', app: 'gmail'}} />);
    expect(await screen.findByRole('heading', {name: 'Gmail'})).toBeInTheDocument();
    await waitFor(() =>
      expect(screen.getByTestId('library-state')).toHaveTextContent('Up to date'),
    );
    await userEvent.click(screen.getByRole('link', {name: 'a2uiverse-apps'}));
    expect(where()).toEqual({page: 'store', publisher: 'a2uiverse-apps'});
  });

  it('has no publisher line for an app the Store does not list', async () => {
    renderWithShell(<Library initial={{page: 'appLibrary', app: 'shop-b'}} />);
    expect(await screen.findByRole('heading', {name: 'Shop B'})).toBeInTheDocument();
    expect(screen.queryByText(/^by/)).toBeNull();
  });

  it('says an app not reached, and Check again reaches it once it is back (decision 2)', async () => {
    renderWithShell(<Library initial={{page: 'appLibrary', app: 'linear'}} />);
    const notice = await screen.findByTestId('library-unreached-app');
    expect(notice).toHaveTextContent(
      'Linear couldn’t be reached, so it can’t answer right now. Check again tries it once more.',
    );
    fake.installed = fake.installed.map(app =>
      app.id === 'linear' ? {...app, reachable: true} : app,
    );
    await userEvent.click(within(notice).getByRole('button', {name: 'Check again'}));
    await waitFor(() => expect(screen.queryByTestId('library-unreached-app')).toBeNull());
    expect(fake.checks).toBe(2);
    expect(screen.getByTestId('library-state')).toHaveTextContent('Up to date');
  });

  it('says an app that isn’t installed, with the Store’s view of it (decision 5)', async () => {
    renderWithShell(<Library initial={{page: 'appLibrary', app: 'acme'}} />);
    expect(await screen.findByText('This app isn’t installed.')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('link', {name: 'Find it in the Store'}));
    expect(where()).toEqual({page: 'store', app: 'acme'});
  });

  it('an app that asks no sign-in has no accounts, one quiet line instead (decision 7)', async () => {
    renderWithShell(<Library initial={{page: 'appLibrary', app: 'calendar'}} />);
    expect(
      await screen.findByText('Google Calendar doesn’t ask you to sign in.'),
    ).toBeInTheDocument();
    expect(screen.queryByRole('heading', {name: 'Accounts'})).toBeNull();
    expect(screen.queryByText(/Also signs out/)).toBeNull();
  });
});

describe('an app’s accounts', () => {
  const account = (label: string) =>
    screen.getAllByTestId('library-account').find(a => a.textContent?.includes(label))!;

  it('reads each account’s permissions in the app’s words, or says the app gives none (decision 8)', async () => {
    renderWithShell(<Library initial={{page: 'appLibrary', app: 'gmail'}} />);
    await screen.findByText('me@example.com');
    await userEvent.click(
      within(account('me@example.com')).getByRole('button', {name: 'Permissions'}),
    );
    expect(account('me@example.com')).toHaveTextContent('Gmail canRead your email and its labels');
    await userEvent.click(
      within(account('work@example.com')).getByRole('button', {name: 'Permissions'}),
    );
    expect(account('work@example.com')).toHaveTextContent(
      'Gmail doesn’t say what it can do with this account.',
    );
  });

  it('a key account is connected with a key', async () => {
    renderWithShell(<Library initial={{page: 'appLibrary', app: 'shop-b'}} />);
    await screen.findByText('Shop B account 1');
    expect(account('Shop B account 1')).toHaveTextContent('Connected with a key');
    await userEvent.click(
      within(account('Shop B account 1')).getByRole('button', {name: 'Permissions'}),
    );
    expect(account('Shop B account 1')).toHaveTextContent(
      'Connected with a key. Shop B can do what that key allows.',
    );
  });

  it('renames in place, and shows a refusal’s reason', async () => {
    renderWithShell(<Library initial={{page: 'appLibrary', app: 'gmail'}} />);
    await userEvent.click(await screen.findByRole('button', {name: 'Rename work@example.com'}));
    const field = screen.getByRole('textbox', {name: 'Account name'});
    await userEvent.clear(field);
    await userEvent.type(field, 'Work{Enter}');
    expect(await screen.findByText('Work')).toBeInTheDocument();
    expect(fake.renamed).toEqual([{source: 'gmail:2', label: 'Work'}]);

    fake.rename = {ok: false, findings: ['another Gmail account already has that name']};
    await userEvent.click(screen.getByRole('button', {name: 'Rename Work'}));
    await userEvent.clear(screen.getByRole('textbox', {name: 'Account name'}));
    await userEvent.type(
      screen.getByRole('textbox', {name: 'Account name'}),
      'me@example.com{Enter}',
    );
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Another Gmail account already has that name.',
    );
  });

  it('signs an account out after asking once, and says where to remove access when cancelling failed (decision 9)', async () => {
    fake.revocation = 'failed';
    renderWithShell(<Library initial={{page: 'appLibrary', app: 'gmail'}} />);
    await userEvent.click(
      await screen.findByRole('button', {name: 'Sign out of work@example.com'}),
    );
    const question = await screen.findByTestId('library-sign-out');
    expect(question).toHaveTextContent('Sign out of work@example.com?');
    await userEvent.click(within(question).getByRole('button', {name: 'Sign out'}));
    expect(await screen.findByTestId('library-signed-out')).toHaveTextContent(
      'Signed out of work@example.com here, but Gmail couldn’t be reached to cancel its access.',
    );
    await waitFor(() => expect(screen.queryByText('work@example.com')).toBeNull());
  });

  it('a key account’s sign-out says the key is needed again', async () => {
    renderWithShell(<Library initial={{page: 'appLibrary', app: 'shop-b'}} />);
    await userEvent.click(
      await screen.findByRole('button', {name: 'Sign out of Shop B account 1'}),
    );
    expect(await screen.findByTestId('library-sign-out')).toHaveTextContent(
      'you’ll need Shop B’s key',
    );
  });

  it('adds an account with no canvas, waiting in place, the account marked added', async () => {
    opened.length = 0;
    renderWithShell(<Library initial={{page: 'appLibrary', app: 'gmail'}} />);
    expect(await screen.findByText('Opens Gmail’s sign-in in a new window')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', {name: 'Add account'}));
    expect(opened).toHaveLength(1);
    const start = new URL(opened[0]!);
    expect(start.pathname).toBe('/auth/start');
    expect(start.searchParams.get('source')).toBe('gmail');
    expect(start.searchParams.has('canvas')).toBe(false);
    expect(
      await screen.findByText('Finish signing in to Gmail in the window that opened.'),
    ).toBeInTheDocument();

    fake.accounts[0]!.accounts.push({
      source: 'gmail:3',
      label: 'home@example.com',
      kind: 'oauth',
      permissions: [],
      lapsed: false,
    });
    fake.attempt = {
      state: 'signedIn',
      source: 'gmail:3',
      label: 'home@example.com',
      app: 'Gmail',
      existing: false,
    };
    expect(await screen.findByText('Added')).toBeInTheDocument();
    expect(account('home@example.com')).toHaveTextContent('Added');
  });

  it('Cancel says no account was added, and a sign-in finished afterwards still shows it (decision 10)', async () => {
    renderWithShell(<Library initial={{page: 'appLibrary', app: 'gmail'}} />);
    await userEvent.click(await screen.findByRole('button', {name: 'Add account'}));
    await userEvent.click(await screen.findByRole('button', {name: 'Cancel'}));
    expect(screen.getByTestId('library-add-end')).toHaveTextContent(
      'Sign-in cancelled. No account was added.',
    );

    fake.accounts[0]!.accounts.push({
      source: 'gmail:3',
      label: 'home@example.com',
      kind: 'oauth',
      permissions: [],
      lapsed: false,
    });
    fake.attempt = {
      state: 'signedIn',
      source: 'gmail:3',
      label: 'home@example.com',
      app: 'Gmail',
      existing: false,
    };
    expect(await screen.findByText('Added')).toBeInTheDocument();
    expect(screen.queryByTestId('library-add-end')).toBeNull();
  });

  it('an identity already held says so', async () => {
    renderWithShell(<Library initial={{page: 'appLibrary', app: 'gmail'}} />);
    await userEvent.click(await screen.findByRole('button', {name: 'Add account'}));
    fake.attempt = {
      state: 'signedIn',
      source: 'gmail:1',
      label: 'me@example.com',
      app: 'Gmail',
      existing: true,
    };
    expect(await screen.findByTestId('library-add-end')).toHaveTextContent(
      'You signed in as me@example.com, which is already one of Gmail’s accounts here.',
    );
  });

  it('a key app’s Add account says it connects with its key (decision 11)', async () => {
    renderWithShell(<Library initial={{page: 'appLibrary', app: 'shop-b'}} />);
    expect(
      await screen.findByText('Opens a page to connect Shop B with its key, in a new window'),
    ).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', {name: 'Add account'}));
    expect(
      await screen.findByText('Finish connecting Shop B in the window that opened.'),
    ).toBeInTheDocument();
  });
});

describe('uninstall', () => {
  it('asks once, naming the accounts it signs out, then returns to the list with what it did', async () => {
    renderWithShell(<Library initial={{page: 'appLibrary', app: 'gmail'}} />);
    expect(await screen.findByText('Also signs out both accounts')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', {name: 'Uninstall Gmail'}));
    const question = await screen.findByTestId('library-uninstall');
    expect(question).toHaveTextContent(
      'This also signs out its two accounts, me@example.com and work@example.com.',
    );
    await userEvent.click(within(question).getByRole('button', {name: 'Uninstall'}));
    expect(await screen.findByTestId('library-uninstalled')).toHaveTextContent(
      'Gmail is uninstalled and its accounts are signed out.',
    );
    expect(where()).toEqual({page: 'appLibrary'});
    expect(fake.uninstalled).toEqual(['gmail']);
    await waitFor(() => expect(screen.getAllByTestId('library-row')).toHaveLength(3));
  });
});
