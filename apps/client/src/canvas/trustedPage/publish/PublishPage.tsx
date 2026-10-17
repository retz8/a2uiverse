/**
 * Publish (SPEC §9.3; phase-14 decisions 4–7, 21; task 14.9): the publisher's side of the Store,
 * for a publisher who is also a user, drawn to the design canvas's Publish boards — claim a name or
 * sign in with its secret, the listings with their notices, publish from the folders Stellify
 * packed with the sample answer file, unpublish. The orchestrator holds the secret and is the
 * publisher's hands; the page holds none, the secret passing through the claim's answer once.
 *
 * Entering Publish reads who is signed in and the listings (decision 6). A publish belongs to
 * Publish, not to its form (decision 8): while it runs, and when it is refused, it shows in the
 * form's place, or atop the listings when the person went back to them; once it is in the Store
 * the page lands on the listings, the outcome atop them (task-14.11 decision 34). One act runs at
 * a time. A refusal saying who is
 * signed in has changed reads it again and lands on what it says (decision 11). The form lives in
 * the address (decision 7). Leaving Publish drops what it holds.
 */
import {useCallback, useEffect, useRef, useState} from 'react';
import {Spinner} from '@radix-ui/themes';
import type {PublishOutcome} from '@a2uiverse/sdk';
import type {PageCatalogs} from '../../../catalogs/CatalogContext';
import {
  claimPublisher,
  publishApp,
  signInPublisher,
  signOutPublisher,
  unpublishApp,
  type ClaimAnswer,
  type PublisherRefusal,
  type PublisherRefused,
  type StoreListing,
} from '../../../orchestratorApi';
import type {TrustedPageState} from '../../trail/trailStore';
import {Listings} from './Listings';
import {publishRequest} from './packedFiles';
import {Findings, Notice, PageButton} from './parts';
import {draftFor, type Draft} from './draft';
import {PublishForm} from './PublishForm';
import {
  changesWho,
  publishRefusedWords,
  publishedWords,
  unpublishRefusedWords,
  unpublishedWords,
  whoReason,
  type Words,
} from './publishWords';
import {SignedOut, TokenBoard, type Claimed} from './SignedOut';
import {acceptedPublisher, usePublisher} from './usePublisher';

export interface PublishPageProps {
  /** The page at Publish: at its listings, or at its form. */
  page: TrustedPageState;
  onNavigate: (page: TrustedPageState) => void;
  /** The orchestrator's base URL: every read and write goes through it. */
  orchestrator: string;
  /** The page's catalogs: the loader a listing's sample loads its builds through. */
  catalogs: PageCatalogs;
  /** Where the confirms are drawn: inside the page. */
  container: HTMLElement | null;
}

/**
 * The act running or last run across Publish (task-14.9 decision 8). A publish keeps the form it
 * was sent from — the app an update went to, `''` for a new app — where its outcome is drawn.
 */
export type PublishAct =
  | {kind: 'idle'}
  | {kind: 'publishing'; target: string; appId: string; isNew: boolean}
  | {kind: 'published'; target: string; appId: string; isNew: boolean; outcome: PublishOutcome}
  | {
      kind: 'publish-refused';
      target: string;
      appId: string;
      isNew: boolean;
      refusal: PublisherRefusal;
      findings: string[];
    }
  | {kind: 'unpublishing'; appId: string; name: string}
  | {kind: 'unpublished'; appId: string; name: string}
  | {
      kind: 'unpublish-refused';
      appId: string;
      name: string;
      refusal: PublisherRefusal;
      findings: string[];
    };

const PUBLISH: TrustedPageState = {page: 'publish'};

export function PublishPage({
  page,
  onNavigate,
  orchestrator,
  catalogs,
  container,
}: PublishPageProps) {
  const {who, listings, check, refreshListings} = usePublisher(orchestrator);
  const publisher = acceptedPublisher(who);
  const [claimed, setClaimed] = useState<Claimed | null>(null);
  const [signInName, setSignInName] = useState('');
  /** A claim or a sign-in refused because a publisher is held now (decision 11). */
  const [line, setLine] = useState<Words | null>(null);
  const [signOutFailed, setSignOutFailed] = useState<string[] | null>(null);
  const [act, setAct] = useState<PublishAct>({kind: 'idle'});
  const [draft, setDraft] = useState<Draft | null>(null);
  const busy = act.kind === 'publishing' || act.kind === 'unpublishing';
  const live = useRef(true);
  useEffect(() => {
    live.current = true;
    return () => {
      live.current = false;
    };
  }, []);
  /** Where the page is now: a publish that lands finds whether its form is still on screen. */
  const where = useRef(page);
  useEffect(() => {
    where.current = page;
  }, [page]);

  const mine = listings.status === 'ready' ? listings.value : [];
  const listingOf = (appId: string): StoreListing | undefined =>
    mine.find(listing => listing.entry.appId === appId);
  const nameOf = (appId: string) => listingOf(appId)?.entry.card.name ?? appId;

  /** Who is signed in has changed under an act: read it again, the form left behind. */
  const whoChanged = useCallback(() => {
    onNavigate(PUBLISH);
    void check();
  }, [onNavigate, check]);

  /** A form opened from the listings: an outcome already shown atop them is done with. */
  const openForm = (form: TrustedPageState) => {
    if (act.kind === 'published' || act.kind === 'publish-refused') setAct({kind: 'idle'});
    onNavigate(form);
  };

  // A form the publisher signed in can't fill — a reload signed out, say — leaves the address.
  const signedInElsewhere = who.status !== 'loading' && !publisher;
  useEffect(() => {
    if (page.form && signedInElsewhere && !claimed) onNavigate(PUBLISH);
  }, [page.form, signedInElsewhere, claimed, onNavigate]);

  const claim = async (name: string): Promise<ClaimAnswer> => {
    setLine(null);
    const answer = await claimPublisher(orchestrator, name);
    if (!live.current) return answer;
    if (answer.ok) {
      setClaimed(answer);
      void check();
    } else if (changesWho(answer.refusal)) {
      setLine({lead: 'Nothing was claimed.', rest: whoReason(answer.refusal)});
      whoChanged();
    }
    return answer;
  };

  const signIn = async (name: string, token: string): Promise<{ok: true} | PublisherRefused> => {
    setLine(null);
    const answer = await signInPublisher(orchestrator, name, token);
    if (!live.current) return answer;
    if (answer.ok) void check();
    else if (answer.refusal === 'held') {
      setLine({lead: 'You weren’t signed in.', rest: whoReason(answer.refusal)});
      whoChanged();
    }
    return answer;
  };

  const signOut = async () => {
    setSignOutFailed(null);
    const answer = await signOutPublisher(orchestrator);
    if (!live.current) return;
    if (answer.ok || answer.refusal === 'signed-out') {
      setAct({kind: 'idle'});
      setLine(null);
      setDraft(null);
      void check();
    } else {
      setSignOutFailed(answer.findings);
    }
  };

  const publish = async (form: Draft) => {
    if (busy) return;
    const isNew = listingOf(form.appId) === undefined;
    setLine(null);
    setAct({kind: 'publishing', target: form.target, appId: form.appId, isNew});
    let request;
    try {
      request = await publishRequest({
        appId: form.appId,
        cardUrl: form.cardUrl.trim(),
        folders: form.folders,
        ...(form.preview ? {preview: form.preview.preview} : {}),
      });
    } catch {
      if (!live.current) return;
      setAct({kind: 'idle'});
      setDraft(d =>
        d && d.target === form.target
          ? {
              ...d,
              filesError: 'A file in a packed folder couldn’t be read. Drop the folders again.',
            }
          : d,
      );
      return;
    }
    const answer = await publishApp(orchestrator, request);
    if (!live.current) return;
    if (answer.ok) {
      setAct({kind: 'published', target: form.target, appId: form.appId, isNew, outcome: answer});
      setDraft(null);
      refreshListings();
      // In the Store: the listings, the outcome atop them, and the address theirs (decision 34).
      if (where.current.form) onNavigate(PUBLISH);
      return;
    }
    setAct({
      kind: 'publish-refused',
      target: form.target,
      appId: form.appId,
      isNew,
      refusal: answer.refusal,
      findings: answer.findings,
    });
    if (changesWho(answer.refusal)) whoChanged();
    else refreshListings();
  };

  const unpublish = async (listing: StoreListing) => {
    if (busy) return;
    const {appId} = listing.entry;
    const name = listing.entry.card.name;
    setLine(null);
    setAct({kind: 'unpublishing', appId, name});
    const answer = await unpublishApp(orchestrator, appId);
    if (!live.current) return;
    if (answer.ok) {
      setAct({kind: 'unpublished', appId, name});
      refreshListings();
      return;
    }
    setAct({
      kind: 'unpublish-refused',
      appId,
      name,
      refusal: answer.refusal,
      findings: answer.findings,
    });
    if (changesWho(answer.refusal)) whoChanged();
    else refreshListings();
  };

  // --- The view ---------------------------------------------------------------------------------

  if (claimed) {
    return (
      <TokenBoard
        claimed={claimed}
        onContinue={() => {
          // Not kept here: the sign-in, the name filled in (decision 4).
          if (!claimed.kept) setSignInName(claimed.publisher);
          setClaimed(null);
        }}
      />
    );
  }

  if (page.form && publisher && listings.status === 'ready') {
    const target = page.app ?? '';
    const listing = page.app ? listingOf(page.app) : undefined;
    const current = draft?.target === target ? draft : draftFor(target, listing);
    return (
      <PublishForm
        draft={current}
        listing={listing}
        act={act}
        busy={busy}
        nameOf={nameOf}
        onChange={change =>
          setDraft(d => change(d?.target === target ? d : draftFor(target, listing)))
        }
        onPublish={form => void publish(form)}
        onDismiss={() => setAct({kind: 'idle'})}
        onCancel={() => {
          setDraft(null);
          onNavigate(PUBLISH);
        }}
        onNavigate={onNavigate}
      />
    );
  }

  const notices = (
    <>
      {line && <Notice tone="bad" role="alert" words={line} testId="publish-line" />}
      {signOutFailed && (
        <Notice
          tone="bad"
          role="alert"
          testId="publish-sign-out-failed"
          words={{lead: 'Signing out didn’t work, so you’re still signed in.'}}
        >
          <Findings label="What went wrong" term="findings" lines={signOutFailed} />
        </Notice>
      )}
      <ActNotice act={act} nameOf={nameOf} />
    </>
  );

  if (who.status === 'loading' || (page.form && publisher && listings.status === 'loading')) {
    return (
      <div className="store-col" aria-busy="true" aria-label="Loading Publish">
        {notices}
        <span className="store-sk" style={{width: '30%', height: 18}} />
        <span className="store-sk publish-sk-card" />
      </div>
    );
  }

  if (who.status === 'unreached') {
    return (
      <div className="store-col">
        {notices}
        <div className="store-empty" role="alert" data-testid="publish-store-unreached">
          <p>
            <b>The Store can’t be reached right now.</b>
          </p>
          <PageButton onClick={() => void check()}>Try again</PageButton>
        </div>
      </div>
    );
  }

  if (who.value.state === 'signed-out') {
    return (
      <>
        {(line || act.kind !== 'idle') && (
          <div className="store-col publish-notices">{notices}</div>
        )}
        <SignedOut key={signInName} signInName={signInName} onClaim={claim} onSignIn={signIn} />
      </>
    );
  }

  return (
    <div className="store-col publish-listings" data-testid="publish-listings">
      {notices}
      <Listings
        status={who.value}
        listings={listings}
        busy={busy}
        unpublishing={act.kind === 'unpublishing' ? act.appId : undefined}
        onOpenForm={openForm}
        onCheck={() => void check()}
        onSignOut={() => void signOut()}
        onUnpublish={listing => void unpublish(listing)}
        orchestrator={orchestrator}
        catalogs={catalogs}
        container={container}
      />
    </div>
  );
}

/** The act's outcome atop the listings, or atop the view a refusal landed on (decisions 8–11). */
function ActNotice({act, nameOf}: {act: PublishAct; nameOf: (appId: string) => string}) {
  switch (act.kind) {
    case 'publishing':
      return (
        <Notice
          tone="quiet"
          icon={<Spinner size="1" />}
          role="status"
          testId="publish-act"
          words={{
            lead: `Publishing ${nameOf(act.appId)}.`,
            rest: 'Waiting for the Store’s checks.',
          }}
        />
      );
    case 'published': {
      const words = publishedWords(act.outcome, nameOf(act.appId));
      return (
        <Notice tone="done" role="status" testId="publish-act" words={words}>
          <details className="publish-details">
            <summary>Details</summary>
            <Findings
              label="Summary"
              term="publish summary"
              lines={[act.outcome.summary, ...act.outcome.notes].filter(Boolean)}
            />
          </details>
        </Notice>
      );
    }
    case 'publish-refused':
      return (
        <Notice
          tone="bad"
          role="alert"
          testId="publish-act"
          words={publishRefusedWords(act.refusal, act.findings, act.appId, act.isNew)}
        >
          {act.refusal !== 'unreached' && !changesWho(act.refusal) && (
            <Findings label="What the Store found" term="findings" lines={act.findings} />
          )}
        </Notice>
      );
    case 'unpublished':
      return (
        <Notice tone="done" role="status" testId="publish-act" words={unpublishedWords(act.name)} />
      );
    case 'unpublish-refused':
      return (
        <Notice
          tone="bad"
          role="alert"
          testId="publish-act"
          words={unpublishRefusedWords(act.refusal, act.name)}
        >
          {act.refusal !== 'unreached' && !changesWho(act.refusal) && (
            <Findings label="What the Store found" term="findings" lines={act.findings} />
          )}
        </Notice>
      );
    default:
      return null;
  }
}
