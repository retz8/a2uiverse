/**
 * The App Library (SPEC §9.3; phase-14 decisions 13–21; task 14.8), drawn to the design canvas's
 * App Library boards: every installed app with its state in plain words, and an app's view — its
 * state, its accounts, Uninstall at the bottom.
 *
 * Entering the App Library runs the update check (decision 1); an update runs it again
 * (decision 3). Update passes the consent card for the update that asks for more and goes straight
 * through otherwise (task-14.2 decision 8); pressed on a list row, its outcome is a notice at the
 * top of the list (decision 4). An update or an uninstall runs one at a time across the page. The
 * app lives in the address, each move replacing the page's entry on the history; after an
 * uninstall the page returns to the list.
 */
import {useCallback, useEffect, useState, type ReactNode} from 'react';
import {AlertDialog, Button, Flex} from '@radix-ui/themes';
import type {UpdateState} from '@a2uiverse/sdk';
import {isLoader, type PageCatalogs} from '../../../catalogs/CatalogContext';
import {
  readStoreEntry,
  uninstallApp,
  type InstalledApp,
  type Revocation,
} from '../../../orchestratorApi';
import type {TrustedPageState} from '../../trail/trailStore';
import {listed, refusalOf, signInOf, tileLetter} from '../appCard';
import {ConsentCard, type ConsentAsk} from '../ConsentCard';
import {
  BackIcon,
  ChevronIcon,
  ClockIcon,
  ComputerIcon,
  DoneIcon,
  TickIcon,
  UpdateIcon,
  WarnIcon,
} from '../icons';
import {pageLink} from '../pageLink';
import {useAppAct, type AppActOutcome} from '../useAppAct';
import {Accounts} from './Accounts';
import {
  appStateView,
  checkedAt,
  stateNote,
  uninstallNote,
  uninstallQuestion,
  uninstalledLine,
  unreachedNotice,
  type AppStateView,
  type StatePress,
  type StateTone,
} from './libraryWords';
import {useLibrary, type Library} from './useLibrary';
import {usePageSignIn} from './usePageSignIn';

export interface LibraryPageProps {
  /** The page at the App Library: the app whose view it shows, if any. */
  page: TrustedPageState;
  onNavigate: (page: TrustedPageState) => void;
  /** The orchestrator's base URL: every read and write goes through it. */
  orchestrator: string;
  /** The page's catalogs: an update moves the builds new canvases load. */
  catalogs: PageCatalogs;
  /** Where the consent card and the questions are drawn: inside the page. */
  container: HTMLElement | null;
  /** How often a sign-in is asked after. */
  pollMs?: number;
  /** Opens a sign-in window; the default is the browser's. */
  openWindow?: (url: string) => void;
}

/** The last uninstall's outcome. */
type UninstallOutcome =
  | {kind: 'idle'}
  | {kind: 'running'; appId: string}
  | {kind: 'done'; appId: string; name: string; accounts: {label: string; revocation: Revocation}[]}
  | {kind: 'refused'; appId: string; name: string};

const LIBRARY: TrustedPageState = {page: 'appLibrary'};

/** The update the press carries. */
type UpdatePress = Extract<StatePress, {kind: 'update'}>;

export function LibraryPage({
  page,
  onNavigate,
  orchestrator,
  catalogs,
  container,
  pollMs,
  openWindow,
}: LibraryPageProps) {
  const library = useLibrary(orchestrator);
  const {runCheck, readAccounts, readInstalled} = library;
  // An update moved the registry: new canvases take the builds it now names, and the check runs
  // again (task-14.8 decision 3).
  const onChanged = useCallback(() => {
    if (isLoader(catalogs)) void catalogs.refresh();
    void runCheck();
    void readAccounts();
  }, [catalogs, runCheck, readAccounts]);
  // A check that lands may have moved the registry itself — a newer build installs at the check
  // (phase-13 decision 16): new canvases take the builds it now names, as after an update here.
  const landed = library.check.running || library.check.failed ? undefined : library.check.at;
  useEffect(() => {
    if (landed && isLoader(catalogs)) void catalogs.refresh();
  }, [landed, catalogs]);
  const {outcome, run, refuse} = useAppAct({orchestrator, onChanged});
  const [ask, setAsk] = useState<ConsentAsk | null>(null);
  const [uninstall, setUninstall] = useState<UninstallOutcome>({kind: 'idle'});
  const busy = outcome.kind === 'running' || uninstall.kind === 'running';

  /** Update: the consent card for the update that asks for more, else straight through. */
  const update = async (appId: string, press: UpdatePress) => {
    if (busy) return;
    setUninstall({kind: 'idle'});
    if (!press.consent) return void run(appId, 'update');
    let entry = library.listings.get(appId);
    if (!entry) {
      const read = await readStoreEntry(orchestrator, appId);
      if (read.ok) entry = read.value.entry;
    }
    if (!entry) return refuse(appId, 'update', 'store-unreached');
    setAsk({kind: 'update', entry, update: press.state});
  };

  const remove = async (app: InstalledApp) => {
    if (busy) return;
    setUninstall({kind: 'running', appId: app.id});
    const answer = await uninstallApp(orchestrator, app.id);
    if (answer.ok) {
      setUninstall({kind: 'done', appId: app.id, name: app.card.name, accounts: answer.accounts});
      // Back to the list, the entry replaced: Back never lands on the removed app's view.
      onNavigate(LIBRARY);
    } else {
      setUninstall({kind: 'refused', appId: app.id, name: app.card.name});
    }
    void readInstalled();
    void readAccounts();
  };

  const acts: Acts = {
    busy,
    outcome,
    onUpdate: (appId, press) => void update(appId, press),
    onRetry: appId => void run(appId, 'update'),
    onCheck: () => void runCheck(),
  };

  return (
    <>
      {page.app ? (
        <AppView
          key={page.app}
          appId={page.app}
          library={library}
          acts={acts}
          uninstall={uninstall}
          onUninstall={app => void remove(app)}
          onNavigate={onNavigate}
          orchestrator={orchestrator}
          container={container}
          pollMs={pollMs}
          openWindow={openWindow}
        />
      ) : (
        <LibraryList library={library} acts={acts} uninstall={uninstall} onNavigate={onNavigate} />
      )}
      <ConsentCard
        ask={ask}
        container={container}
        onConfirm={() => {
          if (ask) void run(ask.entry.appId, 'update');
        }}
        onClose={() => setAsk(null)}
      />
    </>
  );
}

/** The presses an app's state carries, and the outcome of the last. */
interface Acts {
  /** An update or an uninstall is running: every other one waits. */
  busy: boolean;
  outcome: AppActOutcome;
  onUpdate: (appId: string, press: UpdatePress) => void;
  onRetry: (appId: string) => void;
  onCheck: () => void;
}

/** Every app by its card's name. */
const byName = (a: InstalledApp, b: InstalledApp) =>
  a.card.name.localeCompare(b.card.name, 'en', {sensitivity: 'base'});

/** An app's state as just checked: unknown for every app when the check got no answer. */
function stateOf(library: Library, app: InstalledApp): AppStateView {
  const {check} = library;
  const update: UpdateState | undefined =
    check.states.get(app.id) ??
    (check.failed ? {appId: app.id, installedVersion: '', state: 'unknown'} : undefined);
  return appStateView(app, update, check.running);
}

// --- The list ----------------------------------------------------------------------------------

function LibraryList({
  library,
  acts,
  uninstall,
  onNavigate,
}: {
  library: Library;
  acts: Acts;
  uninstall: UninstallOutcome;
  onNavigate: (page: TrustedPageState) => void;
}) {
  const {installed, check} = library;
  const apps = installed.status === 'ready' ? [...installed.apps].sort(byName) : [];
  const nameOf = (appId: string) => apps.find(app => app.id === appId)?.card.name ?? appId;

  return (
    <div className="store-col" data-testid="library-list">
      {acts.outcome.kind === 'done' && (
        <UpdatedNotice name={nameOf(acts.outcome.appId)} followed={acts.outcome.followed} named />
      )}
      {acts.outcome.kind === 'refused' && (
        <RefusedNotice name={nameOf(acts.outcome.appId)} outcome={acts.outcome} />
      )}
      {uninstall.kind === 'done' && <UninstalledNotice outcome={uninstall} />}
      {uninstall.kind === 'refused' && (
        <div className="store-notice store-notice--bad" role="alert">
          <div className="store-notice__grow">
            <span>
              <b>{uninstall.name} couldn’t be uninstalled,</b> so nothing changed.
            </span>
          </div>
        </div>
      )}

      {installed.status === 'loading' && <ListSkeleton />}
      {installed.status === 'unreached' && (
        <LibraryUnreached onRetry={() => void library.readInstalled()} />
      )}
      {installed.status === 'ready' && apps.length === 0 && (
        <div className="store-empty" data-testid="library-empty">
          <p>
            <b>No apps yet.</b>
          </p>
          <p className="store-note">Apps you install from the Store show up here.</p>
          <Button asChild variant="soft">
            <a {...pageLink({page: 'store'}, onNavigate)}>Browse the Store</a>
          </Button>
        </div>
      )}
      {installed.status === 'ready' && apps.length > 0 && (
        <>
          <div className="store-label" data-testid="library-label">
            <span>
              <b>Your apps</b> · {apps.length}
            </span>
            {check.running ? (
              <span className="library-checking" role="status">
                Checking for updates
              </span>
            ) : (
              <span>
                {check.at && `Checked for updates at ${checkedAt(check.at)} · `}
                <button type="button" className="library-link" onClick={acts.onCheck}>
                  Check again
                </button>
              </span>
            )}
          </div>
          <ul className="store-list" aria-label="Your apps">
            {apps.map(app => (
              <LibraryRow
                key={app.id}
                app={app}
                view={stateOf(library, app)}
                acts={acts}
                onNavigate={onNavigate}
              />
            ))}
          </ul>
        </>
      )}
    </div>
  );
}

function LibraryRow({
  app,
  view,
  acts,
  onNavigate,
}: {
  app: InstalledApp;
  view: AppStateView;
  acts: Acts;
  onNavigate: (page: TrustedPageState) => void;
}) {
  const name = app.card.name;
  return (
    <li className="store-row" data-testid="library-row" data-app={app.id}>
      <span className="store-tile store-tile--40" aria-hidden="true">
        {tileLetter(name)}
      </span>
      <div className="store-txt">
        <span className="store-name">
          <a {...pageLink({page: 'appLibrary', app: app.id}, onNavigate)}>{name}</a>
        </span>
        <StateLine view={view} />
      </div>
      <div className="store-end">
        <StatePressButton app={app} view={view} acts={acts} size="1" />
        <span className="library-chev" aria-hidden="true">
          <ChevronIcon />
        </span>
      </div>
    </li>
  );
}

const TONE_ICON: Record<StateTone, (() => ReactNode) | undefined> = {
  ok: () => <TickIcon />,
  new: () => <UpdateIcon />,
  warn: () => <WarnIcon size={12} />,
  bad: () => <WarnIcon size={12} />,
  waiting: () => <ClockIcon />,
  local: () => <ComputerIcon />,
  quiet: undefined,
};

/** An app's state in words, with its tone and icon; a placeholder while the check runs. */
function StateLine({view}: {view: AppStateView}) {
  if (view.kind === 'checking') {
    return (
      <span className="store-sk library-sk-state" aria-label="Checking for updates" role="img" />
    );
  }
  const icon = TONE_ICON[view.tone]?.();
  return (
    <span className={`store-state store-state--${view.tone}`} data-testid="library-state">
      {icon}
      {view.words}
    </span>
  );
}

/** Update, Updating, Try again or Check again — or nothing, as the state carries. */
function StatePressButton({
  app,
  view,
  acts,
  size,
}: {
  app: InstalledApp;
  view: AppStateView;
  acts: Acts;
  size: '1' | '2';
}) {
  const name = app.card.name;
  const {outcome} = acts;
  if (outcome.kind === 'running' && outcome.appId === app.id) {
    return (
      <Button size={size} disabled>
        Updating
      </Button>
    );
  }
  if (view.kind !== 'state') return null;
  const {press} = view;
  if (press.kind === 'check') {
    return (
      <Button size={size} variant="soft" color="gray" onClick={acts.onCheck}>
        Check again
      </Button>
    );
  }
  if (press.kind !== 'update') return null;
  // A refusal that leaves a retry: Try again, straight through — the card was already passed.
  if (
    outcome.kind === 'refused' &&
    outcome.appId === app.id &&
    refusalOf(outcome.cause, name, 'update').press === 'retry'
  ) {
    return (
      <Button size={size} disabled={acts.busy} onClick={() => acts.onRetry(app.id)}>
        Try again
      </Button>
    );
  }
  return (
    <Button
      size={size}
      variant={press.primary || size === '2' ? 'solid' : 'soft'}
      disabled={acts.busy}
      aria-label={`Update ${name}`}
      onClick={() => acts.onUpdate(app.id, press)}
    >
      Update
    </Button>
  );
}

function ListSkeleton() {
  return (
    <div className="store-list" aria-busy="true" aria-label="Loading your apps">
      {[45, 35, 50].map(width => (
        <div key={width} className="store-skrow" aria-hidden="true">
          <span className="store-tile store-tile--40 store-sk" />
          <span className="store-skrow__txt">
            <span className="store-sk" style={{width: `${width}%`}} />
            <span className="store-sk" style={{width: `${width + 20}%`}} />
          </span>
          <span />
        </div>
      ))}
    </div>
  );
}

function LibraryUnreached({onRetry}: {onRetry: () => void}) {
  return (
    <div className="store-empty" role="alert" data-testid="library-unreached">
      <p>
        <b>Your apps can’t be read right now.</b>
      </p>
      <Button variant="soft" color="gray" onClick={onRetry}>
        Try again
      </Button>
    </div>
  );
}

// --- Notices -----------------------------------------------------------------------------------

/** An update done, with the apps updated along with it (task-14.7 decision 2). */
function UpdatedNotice({
  name,
  followed,
  named,
}: {
  name: string;
  followed: readonly string[];
  /** On the list: the notice names the app. */
  named?: boolean;
}) {
  return (
    <div className="store-notice store-notice--done" role="status" data-testid="library-updated">
      <DoneIcon />
      <div className="store-notice__grow">
        <span>
          <b>
            {named ? `${name} is updated to the newest version.` : 'Updated to the newest version.'}
          </b>
          {followed.length > 0 && ` Also updated along with it: ${listed(followed)}.`}
        </span>
      </div>
    </div>
  );
}

/** An update refused, in the Store's words for its cause (task-14.7 decision 6). */
function RefusedNotice({
  name,
  outcome,
}: {
  name: string;
  outcome: Extract<AppActOutcome, {kind: 'refused'}>;
}) {
  const refusal = refusalOf(outcome.cause, name, outcome.act);
  return (
    <div
      className={`store-notice store-notice--${refusal.tone}`}
      role="alert"
      data-testid="library-refused"
    >
      <div className="store-notice__grow">
        <span>
          <b>{refusal.lead}</b> {refusal.rest}
        </span>
      </div>
    </div>
  );
}

/** An uninstall done, and each account whose access could not be cancelled (decision 9). */
function UninstalledNotice({outcome}: {outcome: Extract<UninstallOutcome, {kind: 'done'}>}) {
  const {lead, rest} = uninstalledLine(outcome.name, outcome.accounts);
  return (
    <div
      className="store-notice store-notice--done"
      role="status"
      data-testid="library-uninstalled"
    >
      <DoneIcon />
      <div className="store-notice__grow">
        <span>
          <b>{lead}</b>
        </span>
        {rest.map(line => (
          <span key={line}>{line}</span>
        ))}
      </div>
    </div>
  );
}

// --- An app's view -----------------------------------------------------------------------------

function AppView({
  appId,
  library,
  acts,
  uninstall,
  onUninstall,
  onNavigate,
  orchestrator,
  container,
  pollMs,
  openWindow,
}: {
  appId: string;
  library: Library;
  acts: Acts;
  uninstall: UninstallOutcome;
  onUninstall: (app: InstalledApp) => void;
  onNavigate: (page: TrustedPageState) => void;
  orchestrator: string;
  container: HTMLElement | null;
  pollMs?: number;
  openWindow?: (url: string) => void;
}) {
  const {installed} = library;
  const app = installed.status === 'ready' ? installed.apps.find(a => a.id === appId) : undefined;

  return (
    <div
      className="store-col store-col--app library-col"
      data-testid="library-app-view"
      data-app={appId}
    >
      <a className="store-crumb" {...pageLink(LIBRARY, onNavigate)}>
        <BackIcon />
        Your apps
      </a>
      {installed.status === 'loading' && <AppSkeleton />}
      {installed.status === 'unreached' && (
        <LibraryUnreached onRetry={() => void library.readInstalled()} />
      )}
      {installed.status === 'ready' && !app && (
        <div className="store-empty" data-testid="library-not-installed">
          <p>
            <b>This app isn’t installed.</b>
          </p>
          <Flex gap="3" justify="center" wrap="wrap">
            <Button asChild variant="soft">
              <a {...pageLink({page: 'store', app: appId}, onNavigate)}>Find it in the Store</a>
            </Button>
            <Button asChild variant="soft" color="gray">
              <a {...pageLink(LIBRARY, onNavigate)}>Your apps</a>
            </Button>
          </Flex>
        </div>
      )}
      {app && (
        <AppBody
          app={app}
          library={library}
          acts={acts}
          uninstall={uninstall}
          onUninstall={onUninstall}
          onNavigate={onNavigate}
          orchestrator={orchestrator}
          container={container}
          pollMs={pollMs}
          openWindow={openWindow}
        />
      )}
    </div>
  );
}

function AppSkeleton() {
  return (
    <div className="store-app" aria-busy="true" aria-label="Loading the app">
      <span className="store-tile store-tile--56 store-sk" aria-hidden="true" />
      <span className="store-txt" aria-hidden="true">
        <span className="store-sk" style={{width: '30%', height: 20}} />
        <span className="store-sk" style={{width: '20%'}} />
      </span>
    </div>
  );
}

function AppBody({
  app,
  library,
  acts,
  uninstall,
  onUninstall,
  onNavigate,
  orchestrator,
  container,
  pollMs,
  openWindow,
}: {
  app: InstalledApp;
  library: Library;
  acts: Acts;
  uninstall: UninstallOutcome;
  onUninstall: (app: InstalledApp) => void;
  onNavigate: (page: TrustedPageState) => void;
  orchestrator: string;
  container: HTMLElement | null;
  pollMs?: number;
  openWindow?: (url: string) => void;
}) {
  const name = app.card.name;
  const entry = library.listings.get(app.id);
  const accounts = library.accounts.get(app.id);
  const view = stateOf(library, app);
  const update = library.check.running ? undefined : library.check.states.get(app.id);
  const note = stateNote(name, app, update);
  const {outcome} = acts;
  const mine = outcome.kind !== 'idle' && outcome.appId === app.id ? outcome : undefined;
  const signIn = usePageSignIn({
    orchestrator,
    onSignedIn: library.readAccounts,
    ...(pollMs !== undefined ? {pollMs} : {}),
    ...(openWindow ? {openWindow} : {}),
  });
  const [asking, setAsking] = useState(false);
  const labels = (accounts?.accounts ?? []).map(account => account.label);
  const removing = uninstall.kind === 'running' && uninstall.appId === app.id;

  return (
    <>
      <div className="store-app">
        <span className="store-tile store-tile--56" aria-hidden="true">
          {tileLetter(name)}
        </span>
        <div className="store-txt">
          <h1>{name}</h1>
          {entry && (
            <span className="store-by">
              by{' '}
              <a {...pageLink({page: 'store', publisher: entry.publisher}, onNavigate)}>
                {entry.publisher}
              </a>
            </span>
          )}
        </div>
        <div className="store-end">
          <StateLine view={view} />
          <StatePressButton app={app} view={view} acts={acts} size="2" />
        </div>
      </div>

      {mine?.kind === 'done' && <UpdatedNotice name={name} followed={mine.followed} />}
      {mine?.kind === 'refused' && <RefusedNotice name={name} outcome={mine} />}
      {app.reachable === false && (
        <UnreachedNotice name={name} checking={library.check.running} onCheck={acts.onCheck} />
      )}
      {accounts?.signIn === 'unsupported' && (
        <div className="store-notice store-notice--warn" data-testid="library-unsupported">
          <WarnIcon />
          <div className="store-notice__grow">
            <span>
              <b>Signing in to {name} isn’t supported here.</b> It stays installed, but it can’t
              show anything that needs a sign-in. An update from its publisher may change that.
            </span>
          </div>
        </div>
      )}
      {note?.tone === 'warn' && (
        <div className="store-notice store-notice--warn" data-testid="library-state-note">
          <WarnIcon />
          <div className="store-notice__grow">
            <span>{note.text}</span>
          </div>
        </div>
      )}
      {note?.tone === 'quiet' && (
        <p className="library-quiet" data-testid="library-state-note">
          {note.text}
        </p>
      )}

      <Accounts
        appId={app.id}
        name={name}
        library={accounts}
        connect={signInOf(app.card).kind === 'key'}
        orchestrator={orchestrator}
        container={container}
        signIn={signIn}
        onChanged={() => void library.readAccounts()}
      />

      <div className="library-foot">
        <Button
          variant="outline"
          color="red"
          disabled={acts.busy || accounts === undefined}
          onClick={() => setAsking(true)}
        >
          {removing ? 'Uninstalling' : `Uninstall ${name}`}
        </Button>
        {accounts && uninstallNote(labels) && (
          <span className="store-note">{uninstallNote(labels)}</span>
        )}
      </div>

      <AlertDialog.Root
        open={asking}
        onOpenChange={open => {
          if (!open) setAsking(false);
        }}
      >
        {asking && (
          <AlertDialog.Content
            container={container ?? undefined}
            maxWidth="460px"
            className="store-consent"
            data-testid="library-uninstall"
          >
            <div className="store-consent__who">
              <span className="store-tile store-tile--40" aria-hidden="true">
                {tileLetter(name)}
              </span>
              <div className="store-txt">
                <span className="store-name">{name}</span>
                {entry && <span className="store-by">by {entry.publisher}</span>}
              </div>
            </div>
            <AlertDialog.Title size="5" mb="0">
              Uninstall {name}?
            </AlertDialog.Title>
            <AlertDialog.Description size="2">{uninstallQuestion(labels)}</AlertDialog.Description>
            <Flex gap="3" justify="end">
              <AlertDialog.Cancel>
                <Button variant="soft" color="gray">
                  Cancel
                </Button>
              </AlertDialog.Cancel>
              <AlertDialog.Action>
                <Button color="red" onClick={() => onUninstall(app)}>
                  Uninstall
                </Button>
              </AlertDialog.Action>
            </Flex>
          </AlertDialog.Content>
        )}
      </AlertDialog.Root>
    </>
  );
}

/** The view of an app not reached (task-14.8 decision 2). */
function UnreachedNotice({
  name,
  checking,
  onCheck,
}: {
  name: string;
  checking: boolean;
  /** Check again: the check fetches every card again, this app's among them. */
  onCheck: () => void;
}) {
  const {lead, rest} = unreachedNotice(name);
  return (
    <div className="store-notice store-notice--bad" data-testid="library-unreached-app">
      <WarnIcon />
      <div className="store-notice__grow">
        <span>
          <b>{lead}</b> {rest}
        </span>
        <span>
          <Button size="1" variant="soft" color="gray" disabled={checking} onClick={onCheck}>
            Check again
          </Button>
        </span>
      </div>
    </div>
  );
}
