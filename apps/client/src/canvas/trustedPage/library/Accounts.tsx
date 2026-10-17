/**
 * An app's accounts on its App Library view (phase-14 decisions 15–18, task 14.8), drawn to the
 * design canvas's boards: each account by its label with Permissions — read only, in the app's own
 * words — Rename in place and Sign out, asked once; a lapsed account's Sign in again; and Add
 * account, the sign-in waiting form in its place while a window is open, then how it ended. An app
 * that asks no sign-in has no accounts section, one quiet line instead (decision 7).
 */
import {useState, type FormEvent, type KeyboardEvent} from 'react';
import {AlertDialog, Button, Flex} from '@radix-ui/themes';
import {SignInWaiting} from '@a2uiverse/shell-catalog';
import {
  renameAccount,
  signOutAccount,
  type LibraryAccount,
  type LibraryApp,
  type Revocation,
} from '../../../orchestratorApi';
import {KeyIcon, PlusIcon, TickIcon} from '../icons';
import {sentence, signedOutLine} from './libraryWords';
import type {SignInEnd, usePageSignIn} from './usePageSignIn';

type PageSignIn = ReturnType<typeof usePageSignIn>;

/** The wait Add account opens. */
const ADD = 'add';

export interface AccountsProps {
  appId: string;
  name: string;
  /** The app's accounts as the vault reads them; undefined until read. */
  library: LibraryApp | undefined;
  /** Add account opens a page to paste a key, not a sign-in (task-14.8 decision 11). */
  connect: boolean;
  orchestrator: string;
  /** Where a question is drawn: inside the page. */
  container: HTMLElement | null;
  signIn: PageSignIn;
  /** An account changed: the page reads the accounts again. */
  onChanged: () => void;
}

export function Accounts({
  appId,
  name,
  library,
  connect,
  orchestrator,
  container,
  signIn,
  onChanged,
}: AccountsProps) {
  const [signedOut, setSignedOut] = useState<{label: string; revocation: Revocation} | null>(null);
  if (!library) return <span className="store-sk library-sk-block" aria-hidden="true" />;
  if (library.signIn === 'none') {
    return <p className="library-quiet">{name} doesn’t ask you to sign in.</p>;
  }
  const added = signIn.end(ADD);
  const addedSource = added?.kind === 'added' ? added.source : undefined;

  return (
    <section className="store-sec library-accounts" aria-label="Accounts">
      <h2>Accounts</h2>
      {signedOut && (
        <p
          className={
            signedOut.revocation === 'failed' ? 'library-line library-line--warn' : 'library-line'
          }
          role="status"
          data-testid="library-signed-out"
        >
          {signedOutLine(name, signedOut.label, signedOut.revocation)}
        </p>
      )}
      {library.accounts.length === 0 ? (
        <p className="library-quiet">No accounts.</p>
      ) : (
        <ul className="library-accts">
          {library.accounts.map(account => (
            <AccountRow
              key={account.source}
              account={account}
              name={name}
              added={account.source === addedSource}
              orchestrator={orchestrator}
              container={container}
              signIn={signIn}
              onChanged={onChanged}
              onSignedOut={(label, revocation) => {
                setSignedOut({label, revocation});
                onChanged();
              }}
            />
          ))}
        </ul>
      )}
      {library.signIn === 'supported' && (
        <AddAccount appId={appId} name={name} connect={connect} signIn={signIn} />
      )}
    </section>
  );
}

function AddAccount({
  appId,
  name,
  connect,
  signIn,
}: {
  appId: string;
  name: string;
  connect: boolean;
  signIn: PageSignIn;
}) {
  const start = () => signIn.start(ADD, appId, 'add');
  if (signIn.waiting(ADD)) {
    return (
      <div className="library-wait" role="status">
        <SignInWaiting
          app={name}
          connect={connect}
          onAgain={start}
          onCancel={() => signIn.cancel(ADD)}
        />
      </div>
    );
  }
  const end = signIn.end(ADD);
  const lines = end ? addEndLines(end, name) : undefined;
  return (
    <>
      {lines && (
        <div className="library-end" role="status" data-testid="library-add-end">
          <p>{lines.lead}</p>
          {lines.note && <p className="store-note">{lines.note}</p>}
        </div>
      )}
      <div className="library-add">
        <Button variant="soft" onClick={start}>
          {end?.kind === 'expired' ? (
            'Try again'
          ) : (
            <>
              <PlusIcon />
              Add account
            </>
          )}
        </Button>
        <span className="store-note">
          {connect
            ? `Opens a page to connect ${name} with its key, in a new window`
            : `Opens ${name}’s sign-in in a new window`}
        </span>
      </div>
    </>
  );
}

/** How Add account ended, in the words of the design canvas's add-account outcomes. */
function addEndLines(end: SignInEnd, name: string): {lead: string; note?: string} | undefined {
  switch (end.kind) {
    case 'cancelled':
      return {lead: 'Sign-in cancelled. No account was added.'};
    case 'expired':
      return {lead: 'The sign-in took too long and stopped. No account was added.'};
    case 'failed':
      return {lead: 'The sign-in didn’t finish. No account was added.'};
    case 'existing':
      return {
        lead: `You signed in as ${end.label}, which is already one of ${name}’s accounts here.`,
        note: 'To add another, sign in as a different account.',
      };
    default:
      return undefined;
  }
}

function AccountRow({
  account,
  name,
  added,
  orchestrator,
  container,
  signIn,
  onChanged,
  onSignedOut,
}: {
  account: LibraryAccount;
  name: string;
  /** Just added: marked so. */
  added: boolean;
  orchestrator: string;
  container: HTMLElement | null;
  signIn: PageSignIn;
  onChanged: () => void;
  onSignedOut: (label: string, revocation: Revocation) => void;
}) {
  const [open, setOpen] = useState<'permissions' | 'rename' | null>(null);
  const [confirming, setConfirming] = useState(false);
  const key = account.kind === 'key';
  const waiting = signIn.waiting(account.source);
  const again = signIn.end(account.source);

  return (
    <li className="library-acct" data-testid="library-account" data-source={account.source}>
      <span className="library-av" aria-hidden="true">
        {key ? <KeyIcon /> : (account.label.trim()[0] ?? '?').toUpperCase()}
      </span>
      {open === 'rename' ? (
        <RenameForm
          account={account}
          orchestrator={orchestrator}
          onDone={renamed => {
            setOpen(null);
            if (renamed) onChanged();
          }}
        />
      ) : (
        <>
          <div className="store-txt">
            <span className="library-lbl">
              {account.label}
              {added && <span className="library-tag">Added</span>}
            </span>
            {account.lapsed ? (
              <span className="library-meta library-meta--warn">Needs you to sign in again</span>
            ) : (
              <span className="library-meta">{key ? 'Connected with a key' : 'Signed in'}</span>
            )}
          </div>
          <div className="library-acts">
            {account.lapsed && !waiting && (
              <Button
                size="1"
                onClick={() => signIn.start(account.source, account.source, 'again')}
              >
                Sign in again
              </Button>
            )}
            <Button
              size="1"
              variant={open === 'permissions' ? 'soft' : 'ghost'}
              color={open === 'permissions' ? undefined : 'gray'}
              className="library-act"
              aria-expanded={open === 'permissions'}
              onClick={() => setOpen(open === 'permissions' ? null : 'permissions')}
            >
              Permissions
            </Button>
            <Button
              size="1"
              variant="ghost"
              color="gray"
              className="library-act"
              aria-label={`Rename ${account.label}`}
              onClick={() => setOpen('rename')}
            >
              Rename
            </Button>
            <Button
              size="1"
              variant="ghost"
              color="red"
              className="library-act"
              aria-label={`Sign out of ${account.label}`}
              onClick={() => setConfirming(true)}
            >
              Sign out
            </Button>
          </div>
        </>
      )}
      {open === 'permissions' && <Permissions account={account} name={name} />}
      {waiting && (
        <div className="library-wait library-wait--row" role="status">
          <SignInWaiting
            app={name}
            connect={key}
            onAgain={() => signIn.start(account.source, account.source, 'again')}
            onCancel={() => signIn.cancel(account.source)}
          />
        </div>
      )}
      {!waiting && again?.kind === 'again' && again.rebound && (
        <p className="library-line library-row-line" role="status">
          Signed in to {name} as {again.label}.
        </p>
      )}
      <SignOutQuestion
        open={confirming}
        account={account}
        name={name}
        container={container}
        onClose={() => setConfirming(false)}
        onConfirm={async () => {
          const answer = await signOutAccount(orchestrator, account.source);
          if (answer.ok) onSignedOut(answer.label, answer.revocation);
          else onChanged();
        }}
      />
    </li>
  );
}

/** The permissions an account holds, read only (phase-14 decision 18, task-14.8 decision 8). */
function Permissions({account, name}: {account: LibraryAccount; name: string}) {
  if (account.kind === 'key') {
    return (
      <div className="library-perm">
        <p>Connected with a key. {name} can do what that key allows.</p>
      </div>
    );
  }
  if (account.permissions.length === 0) {
    return (
      <div className="library-perm">
        <p>{name} doesn’t say what it can do with this account.</p>
      </div>
    );
  }
  return (
    <div className="library-perm">
      <div className="store-scopes">
        <span className="store-scopes__note">{name} can</span>
        <ul>
          {account.permissions.map(words => (
            <li key={words}>
              <TickIcon />
              <span>{words}</span>
            </li>
          ))}
        </ul>
      </div>
      <p className="store-note">To take a permission away, sign out and sign in again.</p>
    </div>
  );
}

/** Rename in place (phase-14 decision 17): the label the vault holds, or why not. */
function RenameForm({
  account,
  orchestrator,
  onDone,
}: {
  account: LibraryAccount;
  orchestrator: string;
  /** The form closes: renamed, or cancelled. */
  onDone: (renamed: boolean) => void;
}) {
  const [draft, setDraft] = useState(account.label);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const id = `rename-${account.source}`;

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setSaving(true);
    const answer = await renameAccount(orchestrator, account.source, draft);
    setSaving(false);
    if (answer.ok) return onDone(true);
    setError(answer.reason ? sentence(answer.reason) : 'It couldn’t be renamed. Try again.');
  };
  const escape = (event: KeyboardEvent) => {
    if (event.key === 'Escape') {
      event.stopPropagation();
      onDone(false);
    }
  };

  return (
    <form className="library-rename" onSubmit={submit} onKeyDown={escape}>
      <label htmlFor={id} className="store-visually-hidden">
        Account name
      </label>
      <Flex align="center" gap="2" wrap="wrap">
        <input
          id={id}
          type="text"
          // The field takes the focus as it opens: the press that opened it asked to type.
          autoFocus
          value={draft}
          aria-invalid={error !== null}
          aria-describedby={error ? `${id}-error` : undefined}
          onChange={event => {
            setDraft(event.target.value);
            setError(null);
          }}
        />
        <Button size="1" type="submit" disabled={saving}>
          Save
        </Button>
        <Button
          size="1"
          type="button"
          variant="ghost"
          color="gray"
          className="library-act"
          onClick={() => onDone(false)}
        >
          Cancel
        </Button>
      </Flex>
      {error && (
        <p className="library-error" id={`${id}-error`} role="alert">
          {error}
        </p>
      )}
    </form>
  );
}

/** Sign-out, asked once (task-14.2 decision 10): a key account says the key is needed again. */
function SignOutQuestion({
  open,
  account,
  name,
  container,
  onClose,
  onConfirm,
}: {
  open: boolean;
  account: LibraryAccount;
  name: string;
  container: HTMLElement | null;
  onClose: () => void;
  onConfirm: () => void;
}) {
  return (
    <AlertDialog.Root
      open={open}
      onOpenChange={next => {
        if (!next) onClose();
      }}
    >
      {open && (
        <AlertDialog.Content
          container={container ?? undefined}
          maxWidth="460px"
          className="store-consent"
          data-testid="library-sign-out"
        >
          <AlertDialog.Title size="5" mb="0">
            Sign out of {account.label}?
          </AlertDialog.Title>
          <AlertDialog.Description size="2">
            {account.kind === 'key'
              ? `The key is removed from this computer. To connect this account again you’ll need ${name}’s key. Answers already on your canvases stay as they are.`
              : `${name} will ask this account to sign in again the next time it’s used. Answers already on your canvases stay as they are.`}
          </AlertDialog.Description>
          <Flex gap="3" justify="end">
            <AlertDialog.Cancel>
              <Button variant="soft" color="gray">
                Cancel
              </Button>
            </AlertDialog.Cancel>
            <AlertDialog.Action>
              <Button color="red" onClick={onConfirm}>
                Sign out
              </Button>
            </AlertDialog.Action>
          </Flex>
        </AlertDialog.Content>
      )}
    </AlertDialog.Root>
  );
}
