/**
 * The Store (SPEC §9.3; phase-14 decisions 2, 3, 7, 20; task 14.7), drawn to the design canvas's
 * Store boards: every published app by name, or the search's best matches for a query; one
 * publisher's apps, the index filtered on the name; and an app's view — what it does, the
 * questions to try, what signing in will be, its sample rendered live — with Install, or its state
 * once installed and the Update an update waiting carries.
 *
 * A search runs on Enter (task-14.7 decision 3); the query, the publisher and the app live in the
 * address, an app's view opened from a list pushed onto the history over it and every other move
 * replacing the page's entry (task-14.11 decision 28). Install and Update pass through
 * the consent card where it asks (task-14.2 decisions 4, 8); a press on a list row opens that app's
 * view and asks there, so every outcome lands where the boards draw it. Nothing opens an app from
 * the Store: asking does.
 */
import {useCallback, useState, type FormEvent} from 'react';
import {Button} from '@radix-ui/themes';
import {isLoader, type PageCatalogs} from '../../../catalogs/CatalogContext';
import type {StoreListing} from '../../../orchestratorApi';
import type {TrustedPageState} from '../../trail/trailStore';
import {listed, listingAct, refusalOf, signInOf, tileLetter, tryAsking} from '../appCard';
import {ConsentCard, type ConsentAsk} from '../ConsentCard';
import {BackIcon, DoneIcon, RemoveIcon, TickIcon} from '../icons';
import {pageLink} from '../pageLink';
import {useAppAct, type AppAct, type AppActOutcome} from '../useAppAct';
import {SampleFrame} from './SampleFrame';
import {useStoreListing, useStoreListings, type HeldReads} from './useStoreReads';

export interface StorePageProps {
  /** The page at the Store: its query, its publisher, the app whose view it shows. */
  page: TrustedPageState;
  onNavigate: (page: TrustedPageState) => void;
  /** The orchestrator's base URL: every read and the install go through it. */
  orchestrator: string;
  /** The page's catalogs: the loader a sample loads its builds through. */
  catalogs: PageCatalogs;
  /** Where the consent card is drawn: inside the page. */
  container: HTMLElement | null;
}

/** The Store at a list: its query and its publisher, no app. */
const storeAt = ({query, publisher}: {query?: string; publisher?: string}): TrustedPageState => ({
  page: 'store',
  ...(query ? {query} : {}),
  ...(publisher ? {publisher} : {}),
});

export function StorePage({page, onNavigate, orchestrator, catalogs, container}: StorePageProps) {
  /** Moves each time the registry changes, so the app on screen is read again in place. */
  const [registryVersion, setRegistryVersion] = useState(0);
  // The registry changed: canvases opened from now on take the builds it now names (decision 1).
  const onChanged = useCallback(() => {
    if (isLoader(catalogs)) void catalogs.refresh();
    setRegistryVersion(n => n + 1);
  }, [catalogs]);
  const {outcome, run} = useAppAct({orchestrator, onChanged});
  const [ask, setAsk] = useState<ConsentAsk | null>(null);
  /** The lists shown while the Store is open, each read again only once the registry changed. */
  const [held] = useState<HeldReads>(() => new Map());

  /** A press: the consent card where it asks, else straight through (task-14.2 decision 8). */
  const press = (listing: StoreListing, act: AppAct) => {
    const {entry} = listing;
    if (act === 'install') {
      setAsk({kind: 'install', entry});
      return;
    }
    const state = listingAct(listing);
    if (state.kind !== 'update') return;
    if (state.consent) setAsk({kind: 'update', entry, update: state.state});
    else void run(entry.appId, 'update');
  };

  return (
    <>
      {page.app ? (
        <StoreAppView
          key={page.app}
          appId={page.app}
          page={page}
          onNavigate={onNavigate}
          orchestrator={orchestrator}
          catalogs={catalogs}
          container={container}
          refresh={registryVersion}
          outcome={outcome.kind !== 'idle' && outcome.appId === page.app ? outcome : {kind: 'idle'}}
          onPress={press}
          onRetry={act => void run(page.app!, act)}
        />
      ) : (
        <StoreBrowse
          page={page}
          onNavigate={onNavigate}
          orchestrator={orchestrator}
          held={held}
          refresh={registryVersion}
          onPress={(listing, act) => {
            // A press on a row opens the app's view, where its outcome is drawn.
            onNavigate({...storeAt(page), app: listing.entry.appId});
            press(listing, act);
          }}
        />
      )}
      <ConsentCard
        ask={ask}
        container={container}
        onConfirm={() => {
          if (ask) void run(ask.entry.appId, ask.kind);
        }}
        onClose={() => setAsk(null)}
      />
    </>
  );
}

// --- Icons -------------------------------------------------------------------------------------

const SearchIcon = () => (
  <svg
    aria-hidden="true"
    width="16"
    height="16"
    viewBox="0 0 16 16"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.5"
    strokeLinecap="round"
  >
    <circle cx="7" cy="7" r="4.5" />
    <path d="M10.5 10.5L14 14" />
  </svg>
);

const CrossIcon = () => (
  <svg
    aria-hidden="true"
    width="10"
    height="10"
    viewBox="0 0 16 16"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
  >
    <path d="M4 4l8 8M12 4l-8 8" />
  </svg>
);

// --- Browsing ----------------------------------------------------------------------------------

/** Every app by its card's name, with no query; the search's rank with one (task-14.7 decision 14). */
const byName = (a: StoreListing, b: StoreListing) =>
  a.entry.card.name.localeCompare(b.entry.card.name, 'en', {sensitivity: 'base'});

function StoreBrowse({
  page,
  onNavigate,
  orchestrator,
  held,
  refresh,
  onPress,
}: {
  page: TrustedPageState;
  onNavigate: (page: TrustedPageState) => void;
  orchestrator: string;
  /** The lists the Store holds while it is open. */
  held: HeldReads;
  /** Moves each time the registry changes: a held list is read again. */
  refresh: number;
  onPress: (listing: StoreListing, act: AppAct) => void;
}) {
  const {query, publisher} = page;
  const {loaded, retry} = useStoreListings(orchestrator, query, held, refresh);
  // The box holds the words being typed; the query is what Enter searched (task-14.7 decision 3).
  const [draft, setDraft] = useState(query ?? '');
  const [searched, setSearched] = useState(query);
  if (searched !== query) {
    setSearched(query);
    setDraft(query ?? '');
  }

  const submit = (event: FormEvent) => {
    event.preventDefault();
    const words = draft.trim();
    if ((words || undefined) !== query) onNavigate(storeAt({query: words, publisher}));
  };
  const clear = () => {
    setDraft('');
    if (query) onNavigate(storeAt({publisher}));
  };

  const listings =
    loaded.status === 'ready'
      ? loaded.value.filter(listing => !publisher || listing.entry.publisher === publisher)
      : [];
  if (!query) listings.sort(byName);
  const label = query ? 'Best matches' : publisher ? `Apps by ${publisher}` : 'All apps';

  return (
    <div className="store-col" data-testid="store-browse">
      <form className="store-search" role="search" onSubmit={submit}>
        <label htmlFor="store-search-input" className="store-search__icon">
          <SearchIcon />
          <span className="store-visually-hidden">Search the Store</span>
        </label>
        {publisher && (
          <span className="store-filter">
            By {publisher}
            <button
              type="button"
              aria-label="Show every publisher"
              onClick={() => onNavigate(storeAt({query}))}
            >
              <CrossIcon />
            </button>
          </span>
        )}
        <input
          id="store-search-input"
          type="search"
          autoComplete="off"
          placeholder={publisher ? 'Search this publisher’s apps' : 'Search the Store'}
          value={draft}
          onChange={event => {
            const value = event.target.value;
            setDraft(value);
            // Emptying the box returns to every app (task-14.7 decision 3).
            if (value === '' && query) onNavigate(storeAt({publisher}));
          }}
        />
        {draft && (
          <button
            type="button"
            className="canvas-iconbtn store-search__clear"
            aria-label="Clear the search"
            title="Clear"
            onClick={clear}
          >
            <RemoveIcon />
          </button>
        )}
      </form>

      {loaded.status === 'loading' && <ListSkeleton />}
      {(loaded.status === 'unreached' || loaded.status === 'not-published') && (
        <StoreUnreached onRetry={retry} />
      )}
      {loaded.status === 'ready' && listings.length === 0 && (
        <div className="store-empty" data-testid="store-empty">
          {query ? (
            <>
              <p>
                <b>No apps match “{query}”.</b>
              </p>
              <p className="store-note">
                Try other words, or look through everything in the Store.
              </p>
            </>
          ) : (
            <p>
              <b>
                {publisher
                  ? `No apps by ${publisher} are in the Store.`
                  : 'Nothing is in the Store yet.'}
              </b>
            </p>
          )}
          {(query || publisher) && (
            <Button asChild variant="soft" color="gray">
              <a {...pageLink({page: 'store'}, onNavigate)}>Show every app</a>
            </Button>
          )}
        </div>
      )}
      {loaded.status === 'ready' && listings.length > 0 && (
        <>
          <div className="store-label" data-testid="store-label">
            <span>
              <b>{label}</b> · {listings.length}
            </span>
            {query ? (
              <a className="store-link" {...pageLink(storeAt({publisher}), onNavigate)}>
                Show every app
              </a>
            ) : (
              <span>By name</span>
            )}
          </div>
          <ul className="store-list" aria-label={label}>
            {listings.map(listing => (
              <StoreRow
                key={listing.entry.appId}
                listing={listing}
                page={page}
                onNavigate={onNavigate}
                onPress={onPress}
              />
            ))}
          </ul>
        </>
      )}
    </div>
  );
}

function ListSkeleton() {
  return (
    <div className="store-list" aria-busy="true" aria-label="Loading the Store">
      {[45, 35, 50].map(width => (
        <div key={width} className="store-skrow" aria-hidden="true">
          <span className="store-tile store-tile--40 store-sk" />
          <span className="store-skrow__txt">
            <span className="store-sk" style={{width: `${width}%`}} />
            <span className="store-sk" style={{width: `${width + 35}%`}} />
          </span>
          <span className="store-sk store-sk--button" />
        </div>
      ))}
    </div>
  );
}

function StoreUnreached({onRetry}: {onRetry: () => void}) {
  return (
    <div className="store-empty" role="alert" data-testid="store-unreached">
      <p>
        <b>The Store can’t be reached right now.</b>
      </p>
      <p className="store-note">Your installed apps still work. Try again in a moment.</p>
      <Button variant="soft" color="gray" onClick={onRetry}>
        Try again
      </Button>
    </div>
  );
}

function StoreRow({
  listing,
  page,
  onNavigate,
  onPress,
}: {
  listing: StoreListing;
  page: TrustedPageState;
  onNavigate: (page: TrustedPageState) => void;
  onPress: (listing: StoreListing, act: AppAct) => void;
}) {
  const {entry} = listing;
  const name = entry.card.name;
  return (
    <li className="store-row" data-testid="store-row" data-app={entry.appId}>
      <span className="store-tile store-tile--40" aria-hidden="true">
        {tileLetter(name)}
      </span>
      <div className="store-txt">
        <span className="store-name">
          <a {...pageLink({...storeAt(page), app: entry.appId}, onNavigate)}>{name}</a>
          {!page.publisher && (
            <span className="store-by">
              by{' '}
              <a {...pageLink(storeAt({publisher: entry.publisher}), onNavigate)}>
                {entry.publisher}
              </a>
            </span>
          )}
        </span>
        <span className="store-desc">{entry.card.description}</span>
      </div>
      <div className="store-end">
        <ListingEnd
          listing={listing}
          size="1"
          onInstall={() => onPress(listing, 'install')}
          onUpdate={() => onPress(listing, 'update')}
        />
      </div>
    </li>
  );
}

/** Install, or the app's state in place of it (phase-14 decision 20). */
function ListingEnd({
  listing,
  size,
  onInstall,
  onUpdate,
}: {
  listing: StoreListing;
  size: '1' | '2';
  onInstall: () => void;
  onUpdate: () => void;
}) {
  const act = listingAct(listing);
  const name = listing.entry.card.name;
  const variant = size === '1' ? 'soft' : 'solid';
  switch (act.kind) {
    case 'install':
      return (
        <Button size={size} variant={variant} onClick={onInstall} aria-label={`Install ${name}`}>
          Install
        </Button>
      );
    case 'installed':
      return (
        <span className="store-state store-state--ok">
          <TickIcon size={size === '1' ? 12 : 14} />
          Installed
        </span>
      );
    case 'update':
      return (
        <>
          <span
            className={
              act.state.state === 'update-required'
                ? 'store-state store-state--warn'
                : 'store-state store-state--new'
            }
          >
            {act.words}
          </span>
          <Button size={size} variant={variant} onClick={onUpdate} aria-label={`Update ${name}`}>
            Update
          </Button>
        </>
      );
    case 'waiting':
      return <span className="store-state">{act.words}</span>;
  }
}

// --- An app's view -----------------------------------------------------------------------------

function StoreAppView({
  appId,
  page,
  onNavigate,
  orchestrator,
  catalogs,
  container,
  refresh,
  outcome,
  onPress,
  onRetry,
}: {
  appId: string;
  page: TrustedPageState;
  onNavigate: (page: TrustedPageState) => void;
  orchestrator: string;
  catalogs: PageCatalogs;
  /** Where the enlarged sample is drawn: inside the page. */
  container: HTMLElement | null;
  /** Moves when the registry changed: the listing is read again, staying on screen meanwhile. */
  refresh: number;
  outcome: AppActOutcome;
  onPress: (listing: StoreListing, act: AppAct) => void;
  onRetry: (act: AppAct) => void;
}) {
  const {loaded, retry} = useStoreListing(orchestrator, appId, refresh);
  const listing = loaded.status === 'ready' ? loaded.value : undefined;

  const back = storeAt(page);
  const backLabel = page.query
    ? 'Back to results'
    : page.publisher
      ? `Apps by ${page.publisher}`
      : 'All apps';

  return (
    <div className="store-col store-col--app" data-testid="store-app-view" data-app={appId}>
      <a className="store-crumb" {...pageLink(back, onNavigate)}>
        <BackIcon />
        {backLabel}
      </a>
      {loaded.status === 'loading' && <AppSkeleton />}
      {loaded.status === 'unreached' && <StoreUnreached onRetry={retry} />}
      {loaded.status === 'not-published' && (
        <div className="store-empty" data-testid="store-not-listed">
          <p>
            <b>This app isn’t in the Store.</b>
          </p>
          <Button asChild variant="soft" color="gray">
            <a {...pageLink({page: 'store'}, onNavigate)}>Show every app</a>
          </Button>
        </div>
      )}
      {listing && (
        <AppBody
          listing={listing}
          outcome={outcome}
          onNavigate={onNavigate}
          onStart={act => onPress(listing, act)}
          onRetry={onRetry}
          orchestrator={orchestrator}
          catalogs={catalogs}
          container={container}
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
  listing,
  outcome,
  onNavigate,
  onStart,
  onRetry,
  orchestrator,
  catalogs,
  container,
}: {
  listing: StoreListing;
  outcome: AppActOutcome;
  onNavigate: (page: TrustedPageState) => void;
  onStart: (act: AppAct) => void;
  onRetry: (act: AppAct) => void;
  orchestrator: string;
  catalogs: PageCatalogs;
  container: HTMLElement | null;
}) {
  const {entry} = listing;
  const name = entry.card.name;
  const tries = tryAsking(entry.card);
  const refusal = outcome.kind === 'refused' ? refusalOf(outcome.cause, name, outcome.act) : null;

  let press;
  if (outcome.kind === 'running') {
    press = (
      <Button size="2" disabled>
        {outcome.act === 'install' ? 'Installing' : 'Updating'}
      </Button>
    );
  } else if (refusal && outcome.kind === 'refused' && refusal.press === 'retry') {
    press = (
      <Button size="2" onClick={() => onRetry(outcome.act)}>
        Try again
      </Button>
    );
  } else if (refusal && outcome.kind === 'refused' && refusal.press === 'none') {
    press = (
      <Button size="2" disabled>
        {outcome.act === 'install' ? 'Install' : 'Update'}
      </Button>
    );
  } else {
    press = (
      <ListingEnd
        listing={listing}
        size="2"
        onInstall={() => onStart('install')}
        onUpdate={() => onStart('update')}
      />
    );
  }

  return (
    <>
      <div className="store-app">
        <span className="store-tile store-tile--56" aria-hidden="true">
          {tileLetter(name)}
        </span>
        <div className="store-txt">
          <h1>{name}</h1>
          <span className="store-by">
            by{' '}
            <a {...pageLink({page: 'store', publisher: entry.publisher}, onNavigate)}>
              {entry.publisher}
            </a>
          </span>
        </div>
        <div className="store-end">{press}</div>
      </div>

      {outcome.kind === 'done' && (
        <div className="store-notice store-notice--done" role="status" data-testid="store-done">
          <DoneIcon />
          <div className="store-notice__grow">
            <span>
              <b>
                {name} is {outcome.act === 'install' ? 'installed' : 'updated'}.
              </b>
              {outcome.followed.length > 0 &&
                ` Also updated along with it: ${listed(outcome.followed)}.`}
            </span>
            {tries[0] && <span>Try asking “{tries[0]}” on your canvas.</span>}
          </div>
        </div>
      )}
      {refusal && (
        <div
          className={`store-notice store-notice--${refusal.tone}`}
          role="alert"
          data-testid="store-refused"
        >
          <div className="store-notice__grow">
            <span>
              <b>{refusal.lead}</b> {refusal.rest}
            </span>
          </div>
        </div>
      )}

      <div className="store-cols">
        <div className="store-secs">
          <section className="store-sec">
            <h2>What it does</h2>
            <p>{entry.card.description}</p>
          </section>
          {tries.length > 0 && (
            <section className="store-sec">
              <h2>Try asking</h2>
              <ul className="store-tries">
                {tries.map(words => (
                  <li key={words}>“{words}”</li>
                ))}
              </ul>
            </section>
          )}
          {!listing.installed && <SigningIn listing={listing} />}
        </div>
        <SampleFrame
          listing={listing}
          catalogs={catalogs}
          orchestrator={orchestrator}
          container={container}
        />
      </div>
    </>
  );
}

/** What signing in will be (task-14.7 decision 10). */
function SigningIn({listing}: {listing: StoreListing}) {
  const name = listing.entry.card.name;
  const need = signInOf(listing.entry.card);
  return (
    <section className="store-sec">
      <h2>Signing in</h2>
      {need.kind === 'none' && <p>{name} doesn’t ask you to sign in.</p>}
      {need.kind === 'key' && (
        <p>{name} asks you to connect with a key the first time you use it.</p>
      )}
      {need.kind === 'unsupported' && <p>Signing in to {name} isn’t supported here.</p>}
      {need.kind === 'signIn' && (
        <>
          <p>
            {name} asks you to sign in the first time you use it.
            {need.words.length > 0 && ' It will be able to:'}
          </p>
          {need.words.length > 0 && (
            <ul className="store-scopes__list">
              {need.words.map(word => (
                <li key={word}>
                  <TickIcon />
                  <span>{word}</span>
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </section>
  );
}
