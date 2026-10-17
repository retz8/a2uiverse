/**
 * Publish behind its sign-in (task-14.2 decisions 12, 13), drawn to the design canvas's signed-out,
 * secret and errors boards: claim a publisher name or sign in with its secret, one publisher on this
 * computer. A name is checked before it is sent (task-14.9 decision 16); a refusal from the Store
 * is said under its field, the Store unreached above the two. After a claim the secret is shown
 * once, Continue unlocking with the tick — and when this computer couldn't keep it, Continue leads
 * to the sign-in with the name filled in (decision 4).
 */
import {useState, type FormEvent} from 'react';
import type {ClaimAnswer, PublisherRefused} from '../../../orchestratorApi';
import {CopyIcon, TickIcon} from '../icons';
import {Field, Findings, Notice, PageButton, Term} from './parts';
import {claimProblem, nameProblem} from './publishWords';

/** A claim's answer, its secret shown once on the board. */
export type Claimed = Extract<ClaimAnswer, {ok: true}>;

export interface SignedOutProps {
  /** The name the sign-in starts with: the one claimed when its secret wasn't kept here. */
  signInName: string;
  /** Claims a name; a refusal saying who is signed in now is the page's. */
  onClaim: (name: string) => Promise<ClaimAnswer>;
  /** Signs in; a refusal saying who is signed in now is the page's. */
  onSignIn: (name: string, token: string) => Promise<{ok: true} | PublisherRefused>;
}

/** Why the last attempt failed above the forms: the Store unreached, or the secret not kept. */
type Trouble = {kind: 'unreached'} | {kind: 'unkept'; findings: string[]};

export function SignedOut({signInName, onClaim, onSignIn}: SignedOutProps) {
  const [claimName, setClaimName] = useState('');
  const [claimError, setClaimError] = useState<string>();
  const [name, setName] = useState(signInName);
  const [token, setToken] = useState('');
  const [tokenError, setTokenError] = useState<string>();
  const [trouble, setTrouble] = useState<Trouble | null>(null);
  const [pending, setPending] = useState(false);
  /** The last attempt, which Try again makes again. */
  const [last, setLast] = useState<'claim' | 'signIn'>('claim');

  const claim = async () => {
    const problem = nameProblem(claimName, 'publisher');
    setClaimError(problem);
    if (problem) return;
    setPending(true);
    setTrouble(null);
    const answer = await onClaim(claimName);
    setPending(false);
    if (answer.ok) return;
    const field = claimProblem(answer.refusal);
    // A publisher held meanwhile is the page's to land on (task-14.9 decision 11).
    if (field) setClaimError(field);
    else if (answer.refusal !== 'held') setTrouble({kind: 'unreached'});
  };

  const signIn = async () => {
    setPending(true);
    setTrouble(null);
    setTokenError(undefined);
    const answer = await onSignIn(name, token);
    setPending(false);
    if (answer.ok) return;
    if (answer.refusal === 'not-accepted') setTokenError(`That secret isn’t the one for ${name}.`);
    else if (answer.refusal === 'unkept') setTrouble({kind: 'unkept', findings: answer.findings});
    else if (answer.refusal !== 'held') setTrouble({kind: 'unreached'});
  };

  const attempts = {claim, signIn};
  const submit = (attempt: 'claim' | 'signIn') => (event: FormEvent) => {
    event.preventDefault();
    setLast(attempt);
    void attempts[attempt]();
  };

  return (
    <div className="store-col" data-testid="publish-signed-out">
      <div className="publish-intro">
        <h1>Publish your apps</h1>
        <p>
          Put the apps you build in the Store, under a publisher name of your own. Pack each app
          with Stellify first; this page takes the folders it writes.
        </p>
      </div>
      {trouble?.kind === 'unreached' && (
        <div className="publish-card publish-card--outcome" data-testid="publish-unreached">
          <Notice
            tone="bad"
            role="alert"
            words={{
              lead: 'The Store can’t be reached right now.',
              rest: 'Nothing was claimed or changed.',
            }}
          />
          <PageButton disabled={pending} onClick={() => void attempts[last]()}>
            Try again
          </PageButton>
        </div>
      )}
      {trouble?.kind === 'unkept' && (
        <div className="publish-card publish-card--outcome" data-testid="publish-unkept">
          <Notice
            tone="bad"
            role="alert"
            words={{
              lead: 'A2UIVerse couldn’t keep your secret on this computer.',
              rest: 'Try again in a moment.',
            }}
          />
          <Findings label="What went wrong" term="findings" lines={trouble.findings} />
        </div>
      )}
      <div className="publish-cards">
        <form
          className="publish-card"
          onSubmit={submit('claim')}
          aria-label="Claim a publisher name"
        >
          <h2>Claim a publisher name</h2>
          <Field
            label="Publisher name"
            type="text"
            autoComplete="off"
            spellCheck={false}
            placeholder="e.g. northlight"
            value={claimName}
            onChange={event => {
              setClaimName(event.target.value);
              setClaimError(undefined);
            }}
            error={claimError}
            hint="Lowercase letters, numbers and hyphens. People see it on every app you publish."
          />
          <PageButton look="primary" type="submit" disabled={pending || claimName === ''}>
            Claim
          </PageButton>
        </form>
        <form
          className="publish-card"
          onSubmit={submit('signIn')}
          aria-label="Sign in as a publisher"
        >
          <h2>Sign in as a publisher</h2>
          <Field
            label="Publisher name"
            type="text"
            autoComplete="username"
            spellCheck={false}
            value={name}
            onChange={event => setName(event.target.value)}
          />
          <Field
            label={
              <>
                Your publisher secret <Term>(token)</Term>
              </>
            }
            type="password"
            autoComplete="current-password"
            value={token}
            onChange={event => {
              setToken(event.target.value);
              setTokenError(undefined);
            }}
            error={tokenError}
            hint="Shown once when the name was claimed. Stellify keeps a copy on the computer you claimed it from."
          />
          <PageButton type="submit" disabled={pending || name === '' || token === ''}>
            Sign in
          </PageButton>
        </form>
      </div>
      <p className="publish-note">
        Your secret stays with A2UIVerse on this computer and goes only to the Store.
      </p>
    </div>
  );
}

/**
 * The secret, shown once after a claim (task-14.2 decision 13, task-14.9 decisions 4 and 5); a
 * claim whose answer never came, read back as kept here, has none to show (task-14.11 decision 40).
 */
export function TokenBoard({claimed, onContinue}: {claimed: Claimed; onContinue: () => void}) {
  const [saved, setSaved] = useState(false);
  const [copied, setCopied] = useState(false);
  const token = claimed.token;
  if (token === null) {
    return (
      <div className="store-col publish-narrow">
        <div className="publish-card publish-card--token" data-testid="publish-token">
          <span className="store-state store-state--ok">
            <TickIcon size={14} />
            Name claimed
          </span>
          <h2>“{claimed.publisher}” is yours</h2>
          <p>
            This computer keeps your publisher secret <Term>(token)</Term>, so you can publish from
            here. The connection dropped before the secret reached this page, so it can’t be shown,
            and it won’t be shown again.
          </p>
          <PageButton look="primary" height="large" onClick={onContinue}>
            Continue
          </PageButton>
        </div>
      </div>
    );
  }
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(token);
      setCopied(true);
    } catch {
      setCopied(false);
    }
  };
  return (
    <div className="store-col publish-narrow">
      <div className="publish-card publish-card--token" data-testid="publish-token">
        <span className="store-state store-state--ok">
          <TickIcon size={14} />
          Name claimed
        </span>
        <h2>“{claimed.publisher}” is yours</h2>
        {claimed.kept ? (
          <p>
            This is your publisher secret <Term>(token)</Term>. It is the only way back to this
            name: you’ll need it to sign in here again after signing out. It won’t be shown again.
          </p>
        ) : (
          <p>
            But A2UIVerse couldn’t keep your publisher secret <Term>(token)</Term> on this computer.
            Save it now, then sign in with it: it is the only way back to this name, and it won’t be
            shown again.
          </p>
        )}
        <div className="publish-tokenbox">
          <code>{token}</code>
          <PageButton height="small" onClick={() => void copy()}>
            <CopyIcon />
            {copied ? 'Copied' : 'Copy'}
          </PageButton>
        </div>
        <label className="publish-tick">
          <input
            type="checkbox"
            checked={saved}
            onChange={event => setSaved(event.target.checked)}
          />
          I’ve saved it somewhere safe
        </label>
        <PageButton look="primary" height="large" disabled={!saved} onClick={onContinue}>
          Continue
        </PageButton>
      </div>
    </div>
  );
}
