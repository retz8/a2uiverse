/**
 * Publish signed in (task 14.9), drawn to the design canvas's listings, nothing-published and
 * confirm boards: "Your apps in the Store" under the name publishing, with Sign out and Publish an
 * app, and each listing as Stellify's `list` has it — its version, each look at its build, the
 * retired lines, the ahead-of-the-Store notice — beside its sample rendered live, with Publish an
 * update and Unpublish.
 *
 * A held secret the Store no longer accepts, a publisher held for another Store and the Store
 * unreached each stand in place of the listings with their way out (decisions 1–3). Unpublish and
 * sign-out each ask once.
 */
import {useState} from 'react';
import {AlertDialog, Flex} from '@radix-ui/themes';
import type {PageCatalogs} from '../../../catalogs/CatalogContext';
import type {PublisherStatus, StoreListing} from '../../../orchestratorApi';
import type {TrustedPageState} from '../../trail/trailStore';
import {PlusIcon, WarnIcon} from '../icons';
import {SampleFrame} from '../store/SampleFrame';
import {Notice, PageButton, SpokenText, Term} from './parts';
import {aheadSentence} from './publishWords';
import type {Listings as ListingsRead} from './usePublisher';

export interface ListingsProps {
  /** Who is signed in: a publisher, held here or for another Store. */
  status: Exclude<PublisherStatus, {state: 'signed-out'}>;
  listings: ListingsRead;
  /** An act runs across Publish: every other one waits (task-14.9 decision 8). */
  busy: boolean;
  /** The app being unpublished, its press saying so. */
  unpublishing?: string;
  /** Opens the publish form: a new app's, or an update's. */
  onOpenForm: (page: TrustedPageState) => void;
  /** Try again: who is signed in and the listings, read again. */
  onCheck: () => void;
  onSignOut: () => void;
  onUnpublish: (listing: StoreListing) => void;
  orchestrator: string;
  catalogs: PageCatalogs;
  container: HTMLElement | null;
}

export function Listings({
  status,
  listings,
  busy,
  unpublishing,
  onOpenForm,
  onCheck,
  onSignOut,
  onUnpublish,
  orchestrator,
  catalogs,
  container,
}: ListingsProps) {
  const {publisher} = status;
  const accepted = status.state === 'signed-in' && status.store === 'accepted';
  const [signingOut, setSigningOut] = useState(false);
  const [asking, setAsking] = useState<StoreListing | null>(null);
  const apps = accepted && listings.status === 'ready' ? listings.value : undefined;
  const canPublish = accepted && listings.status === 'ready';

  return (
    <>
      <div className="publish-bar" data-testid="publish-bar">
        <div className="store-txt">
          <h1>Your apps in the Store</h1>
          <span className="store-note">
            Publishing as <b>{publisher}</b>
            {apps && ` · ${apps.length} ${apps.length === 1 ? 'app' : 'apps'}`}
          </span>
        </div>
        <div className="publish-acts">
          <PageButton look="quiet" onClick={() => setSigningOut(true)}>
            Sign out
          </PageButton>
          {canPublish && (
            <PageButton
              look="primary"
              disabled={busy}
              onClick={() => onOpenForm({page: 'publish', form: true})}
              data-testid="publish-new"
            >
              <PlusIcon />
              Publish an app
            </PageButton>
          )}
        </div>
      </div>

      {status.state === 'another-store' && (
        <Notice
          tone="warn"
          testId="publish-another-store"
          words={{
            lead: `You’re signed in as ${publisher} for a different Store.`,
            rest: 'To publish here, sign out first.',
          }}
        >
          <span>
            <PageButton height="small" onClick={() => setSigningOut(true)}>
              Sign out
            </PageButton>
          </span>
        </Notice>
      )}
      {status.state === 'signed-in' && status.store === 'not-accepted' && (
        <Notice
          tone="bad"
          testId="publish-not-accepted"
          words={{
            lead: `The Store no longer accepts your publisher secret for ${publisher}.`,
            rest: 'Sign out, then claim a name or sign in again.',
          }}
        >
          <span>
            <PageButton height="small" onClick={() => setSigningOut(true)}>
              Sign out
            </PageButton>
          </span>
        </Notice>
      )}
      {((status.state === 'signed-in' && status.store === 'unreached') ||
        (accepted && listings.status === 'unreached')) && (
        <div className="store-empty" role="alert" data-testid="publish-store-unreached">
          <p>
            <b>The Store can’t be reached right now.</b>
          </p>
          <PageButton onClick={onCheck}>Try again</PageButton>
        </div>
      )}
      {accepted && listings.status === 'loading' && <ListingsSkeleton />}
      {apps?.length === 0 && (
        <div className="publish-empty" data-testid="publish-empty">
          <p>
            <b>Nothing of yours in the Store right now.</b>
          </p>
          <p className="publish-note">
            Pack your app with Stellify in its own folder, then publish it here with the folders it
            wrote.
          </p>
          <PageButton
            look="primary"
            disabled={busy}
            onClick={() => onOpenForm({page: 'publish', form: true})}
          >
            <PlusIcon />
            Publish an app
          </PageButton>
        </div>
      )}
      {apps?.map(listing => (
        <Listing
          key={listing.entry.appId}
          listing={listing}
          busy={busy}
          unpublishing={unpublishing === listing.entry.appId}
          onUpdate={() => onOpenForm({page: 'publish', form: true, app: listing.entry.appId})}
          onUnpublish={() => setAsking(listing)}
          orchestrator={orchestrator}
          catalogs={catalogs}
          container={container}
        />
      ))}

      <AlertDialog.Root
        open={asking !== null}
        onOpenChange={open => {
          if (!open) setAsking(null);
        }}
      >
        {asking && (
          <AlertDialog.Content
            container={container ?? undefined}
            maxWidth="460px"
            className="store-consent"
            data-testid="publish-unpublish"
          >
            <AlertDialog.Title size="4" mb="0">
              Unpublish {asking.entry.card.name}?
            </AlertDialog.Title>
            <AlertDialog.Description size="2">
              {asking.entry.card.name} leaves the Store. People who installed it keep it, and the
              name “{asking.entry.appId}” stays yours.
            </AlertDialog.Description>
            <Flex gap="3" justify="end">
              <AlertDialog.Cancel>
                <PageButton look="quiet">Cancel</PageButton>
              </AlertDialog.Cancel>
              <AlertDialog.Action>
                <PageButton look="danger" onClick={() => onUnpublish(asking)}>
                  Unpublish
                </PageButton>
              </AlertDialog.Action>
            </Flex>
          </AlertDialog.Content>
        )}
      </AlertDialog.Root>

      <AlertDialog.Root open={signingOut} onOpenChange={setSigningOut}>
        {signingOut && (
          <AlertDialog.Content
            container={container ?? undefined}
            maxWidth="460px"
            className="store-consent"
            data-testid="publish-sign-out"
          >
            <AlertDialog.Title size="4" mb="0">
              Sign out of Publish?
            </AlertDialog.Title>
            <AlertDialog.Description size="2">
              A2UIVerse forgets your publisher secret on this computer. To publish as {publisher}{' '}
              again, you’ll need your secret <Term>(token)</Term>.
            </AlertDialog.Description>
            <Flex gap="3" justify="end">
              <AlertDialog.Cancel>
                <PageButton look="quiet">Cancel</PageButton>
              </AlertDialog.Cancel>
              <AlertDialog.Action>
                <PageButton look="danger" onClick={onSignOut}>
                  Sign out
                </PageButton>
              </AlertDialog.Action>
            </Flex>
          </AlertDialog.Content>
        )}
      </AlertDialog.Root>
    </>
  );
}

/** One listing as Stellify's `list` has it, plain words first (task-14.9 decisions 12, 13). */
function Listing({
  listing,
  busy,
  unpublishing,
  onUpdate,
  onUnpublish,
  orchestrator,
  catalogs,
  container,
}: {
  listing: StoreListing;
  busy: boolean;
  unpublishing: boolean;
  onUpdate: () => void;
  onUnpublish: () => void;
  orchestrator: string;
  catalogs: PageCatalogs;
  /** Where the enlarged sample is drawn: inside the page. */
  container: HTMLElement | null;
}) {
  const {entry} = listing;
  const looks = Object.entries(entry.catalogs);
  return (
    <article
      className="publish-listing"
      aria-label={entry.card.name}
      data-testid="publish-listing"
      data-app={entry.appId}
    >
      <div className="publish-facts">
        <h2>{entry.card.name}</h2>
        <span>
          Version <b>{entry.card.version}</b> <Term>(card version)</Term>
        </span>
        {looks.length === 0 ? (
          <span data-testid="publish-look">
            Drawn in the basic look <Term>(basic catalog)</Term>
          </span>
        ) : (
          looks.map(([catalogId, artifactId]) => (
            <span key={catalogId} className="publish-line" data-testid="publish-look">
              Its look <Term>(catalog)</Term> <CatalogId id={catalogId} /> at build{' '}
              <Build id={artifactId} />
            </span>
          ))
        )}
        {entry.retired.map(catalogId => (
          <span key={catalogId} className="publish-line" data-testid="publish-retired">
            No longer offered in an older look <Term>(retired)</Term> <CatalogId id={catalogId} />
          </span>
        ))}
        {entry.aheadOfStore && (
          <div className="store-notice store-notice--warn" data-testid="publish-ahead">
            <WarnIcon />
            <div className="store-notice__grow">
              <span>
                <b>Your app is ahead of the Store</b> <Term>(ahead of the Store)</Term>.{' '}
                <SpokenText spoken={aheadSentence(entry.aheadOfStore)} />
              </span>
            </div>
          </div>
        )}
        <div className="publish-acts">
          <PageButton look="soft" height="small" disabled={busy} onClick={onUpdate}>
            Publish an update
          </PageButton>
          <PageButton look="danger-quiet" height="small" disabled={busy} onClick={onUnpublish}>
            {unpublishing ? 'Unpublishing…' : 'Unpublish'}
          </PageButton>
        </div>
      </div>
      <div className="publish-mini">
        <SampleFrame
          listing={listing}
          catalogs={catalogs}
          orchestrator={orchestrator}
          container={container}
        />
      </div>
    </article>
  );
}

/** A catalog id cut from the left, the whole of it on hover and in a selection (decision 13). */
const CatalogId = ({id}: {id: string}) => (
  <span className="publish-id" title={id}>
    <span dir="ltr">{id}</span>
  </span>
);

/** A build, shortened as Stellify's `list` shortens it, the whole of it on hover and in a selection. */
const Build = ({id}: {id: string}) => (
  <span className="publish-build" title={id}>
    {id}
  </span>
);

function ListingsSkeleton() {
  return (
    <div className="publish-skeleton" aria-busy="true" aria-label="Loading your apps">
      <span className="store-sk publish-sk-card" />
      <span className="store-sk publish-sk-card" />
    </div>
  );
}
