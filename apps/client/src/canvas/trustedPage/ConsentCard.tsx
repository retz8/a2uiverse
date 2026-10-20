/**
 * The consent card (task-14.2 decision 4, task-14.7 decision 7): one card in the authority tile's
 * shape, trusted shell UI, before an install or an update that asks for more. Installing, it says
 * what the app is, who publishes it, and what it will ask to sign in to, in its own words; updating,
 * only what is new — the new permissions in the app's words, and a new look when a catalog it paints
 * in moves (task-14.2 decision 8). One press confirms. Built once, for the Store and the App Library.
 */
import {AlertDialog, Button, Flex} from '@radix-ui/themes';
import {asksForMore, type IndexEntry, type UpdateState} from '@a2uiverse/sdk';
import {bringsNewLook, newScopeWords, signInOf, tileLetter} from './appCard';

/** What the card asks: an install, or an update that asks for more. */
export type ConsentAsk =
  {kind: 'install'; entry: IndexEntry} | {kind: 'update'; entry: IndexEntry; update: UpdateState};

export interface ConsentCardProps {
  ask: ConsentAsk | null;
  /** The card's one press: install, or update. The card then closes. */
  onConfirm: () => void;
  /** The card closes — cancelled, or after its press. */
  onClose: () => void;
  /** Where the card is drawn: inside the trusted page, above it. */
  container?: HTMLElement | null;
}

const Tick = () => (
  <svg
    aria-hidden="true"
    width="12"
    height="12"
    viewBox="0 0 12 12"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.4"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M2.5 6.2l2.2 2.1L9.5 3.5" />
  </svg>
);

const Plus = () => (
  <svg
    aria-hidden="true"
    width="12"
    height="12"
    viewBox="0 0 12 12"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.4"
    strokeLinecap="round"
  >
    <path d="M6 2.5v7M2.5 6h7" />
  </svg>
);

function Scopes({note, words, icon}: {note: string; words: string[]; icon: 'tick' | 'plus'}) {
  return (
    <div className="store-scopes">
      <span className="store-scopes__note">{note}</span>
      {words.length > 0 && (
        <ul>
          {words.map(word => (
            <li key={word}>
              {icon === 'tick' ? <Tick /> : <Plus />}
              <span>{word}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/** What installing says of signing in. */
function InstallSignIn({entry}: {entry: IndexEntry}) {
  const name = entry.card.name;
  const need = signInOf(entry.card);
  switch (need.kind) {
    case 'none':
      return <p>{name} doesn’t ask you to sign in.</p>;
    case 'key':
      return (
        <Scopes
          note={`The first time you use it, ${name} will ask you to connect with a key.`}
          words={[]}
          icon="tick"
        />
      );
    case 'unsupported':
      return <p>Signing in to {name} isn’t supported here.</p>;
    case 'signIn':
      return (
        <Scopes
          note={
            need.words.length > 0
              ? `The first time you use it, ${name} will ask you to sign in. It will be able to`
              : `The first time you use it, ${name} will ask you to sign in.`
          }
          words={need.words}
          icon="tick"
        />
      );
  }
}

/** What updating brings that the installed app did not ask for. */
function UpdateNews({entry, update}: {entry: IndexEntry; update: UpdateState}) {
  const name = entry.card.name;
  // Every update that asks for more names what it newly asks (task-15.5 decision 7).
  const words =
    asksForMore(update) && 'newScopes' in update ? newScopeWords(entry.card, update.newScopes) : [];
  return (
    <>
      {words.length > 0 && (
        <Scopes
          note={`This version asks for more. The next time you use it, ${name} will also ask to be able to`}
          words={words}
          icon="plus"
        />
      )}
      {bringsNewLook(update) && <p>It also brings a new look for its answers.</p>}
    </>
  );
}

export function ConsentCard({ask, onConfirm, onClose, container}: ConsentCardProps) {
  const entry = ask?.entry;
  return (
    <AlertDialog.Root
      open={ask !== null}
      onOpenChange={open => {
        if (!open) onClose();
      }}
    >
      {ask && entry && (
        <AlertDialog.Content
          container={container ?? undefined}
          maxWidth="460px"
          className="store-consent"
          data-testid="consent-card"
        >
          <div className="store-consent__who">
            <span className="store-tile store-tile--40" aria-hidden="true">
              {tileLetter(entry.card.name)}
            </span>
            <div className="store-txt">
              <span className="store-name">{entry.card.name}</span>
              <span className="store-by">by {entry.publisher}</span>
            </div>
          </div>
          <AlertDialog.Title size="5" mb="0">
            {ask.kind === 'install' ? `Install ${entry.card.name}?` : `Update ${entry.card.name}?`}
          </AlertDialog.Title>
          {ask.kind === 'install' ? (
            <>
              <AlertDialog.Description size="2">{entry.card.description}</AlertDialog.Description>
              <InstallSignIn entry={entry} />
            </>
          ) : (
            <>
              <AlertDialog.Description size="2" className="store-visually-hidden">
                What this update to {entry.card.name} brings
              </AlertDialog.Description>
              <UpdateNews entry={entry} update={ask.update} />
            </>
          )}
          <Flex gap="3" justify="end">
            <AlertDialog.Cancel>
              <Button variant="soft" color="gray">
                {ask.kind === 'install' ? 'Cancel' : 'Not now'}
              </Button>
            </AlertDialog.Cancel>
            <AlertDialog.Action>
              <Button onClick={onConfirm}>{ask.kind === 'install' ? 'Install' : 'Update'}</Button>
            </AlertDialog.Action>
          </Flex>
        </AlertDialog.Content>
      )}
    </AlertDialog.Root>
  );
}
