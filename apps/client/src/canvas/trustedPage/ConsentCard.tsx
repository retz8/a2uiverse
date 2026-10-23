/**
 * The consent card (task-14.2 decision 4, task-14.7 decision 7): one card in the authority tile's
 * shape, trusted shell UI, before an install or an update that asks for more. Installing, it says
 * what the app is, who publishes it, and what it will ask to sign in to, in its own words; updating,
 * only what is new — the new permissions in the app's words, and a new look when a catalog it paints
 * in moves (task-14.2 decision 8). One press confirms. One body in two frames: centred on the
 * Store and the App Library, and floating over a slot from the press made there, nothing on the
 * canvas moving (task-15.9 decision 2).
 */
import {useId, useLayoutEffect, useMemo} from 'react';
import {AlertDialog, Button, Flex, Heading, Popover, Text} from '@radix-ui/themes';
import type {IndexEntry} from '@a2uiverse/sdk';
import {newScopeWords, signInOf, tileLetter, type UpdateNewsFacts} from './appCard';

/** What the card asks: an install, or an update that asks for more. */
export type ConsentAsk =
  {kind: 'install'; entry: IndexEntry} | {kind: 'update'; entry: IndexEntry; news: UpdateNewsFacts};

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
function UpdateNews({entry, news}: {entry: IndexEntry; news: UpdateNewsFacts}) {
  const name = entry.card.name;
  const words = newScopeWords(entry.card, news.newScopes);
  return (
    <>
      {words.length > 0 && (
        <Scopes
          note={`This version asks for more. The next time you use it, ${name} will also ask to be able to`}
          words={words}
          icon="plus"
        />
      )}
      {news.newLook && <p>It also brings a new look for its answers.</p>}
    </>
  );
}

/** The app the card is about: its letter, its name, its publisher. */
function Who({entry}: {entry: IndexEntry}) {
  return (
    <div className="store-consent__who">
      <span className="store-tile store-tile--40" aria-hidden="true">
        {tileLetter(entry.card.name)}
      </span>
      <div className="store-txt">
        <span className="store-name">{entry.card.name}</span>
        <span className="store-by">by {entry.publisher}</span>
      </div>
    </div>
  );
}

/** The card's question, and its two presses' words. */
const title = (ask: ConsentAsk) =>
  ask.kind === 'install' ? `Install ${ask.entry.card.name}?` : `Update ${ask.entry.card.name}?`;
const cancelWords = (ask: ConsentAsk) => (ask.kind === 'install' ? 'Cancel' : 'Not now');
const confirmWords = (ask: ConsentAsk) => (ask.kind === 'install' ? 'Install' : 'Update');

/** What the card says below its question: the app's description and its sign-in, or the news. */
function Detail({ask}: {ask: ConsentAsk}) {
  return ask.kind === 'install' ? (
    <InstallSignIn entry={ask.entry} />
  ) : (
    <UpdateNews entry={ask.entry} news={ask.news} />
  );
}

/** The card on the trusted page: centred, over the page. */
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
          <Who entry={entry} />
          <AlertDialog.Title size="5" mb="0">
            {title(ask)}
          </AlertDialog.Title>
          {ask.kind === 'install' ? (
            <AlertDialog.Description size="2">{entry.card.description}</AlertDialog.Description>
          ) : (
            <AlertDialog.Description size="2" className="store-visually-hidden">
              What this update to {entry.card.name} brings
            </AlertDialog.Description>
          )}
          <Detail ask={ask} />
          <Flex gap="3" justify="end">
            <AlertDialog.Cancel>
              <Button variant="soft" color="gray">
                {cancelWords(ask)}
              </Button>
            </AlertDialog.Cancel>
            <AlertDialog.Action>
              <Button onClick={onConfirm}>{confirmWords(ask)}</Button>
            </AlertDialog.Action>
          </Flex>
        </AlertDialog.Content>
      )}
    </AlertDialog.Root>
  );
}

/** The canvas's column, which the card over a slot stays inside. */
const STAGE = '[data-testid="canvas-stage-content"]';

/** The canvas's scroll, which keeps the press the card floats from in place. */
const SCROLL = '[data-testid="canvas-scroll"]';

/**
 * While the card is open, the press it floats from stays where it is on screen (task-15.11
 * decision 23): a paint that moves it — the merged view landing above — is scrolled back by the
 * same distance, so the card's presses stay under the reader's pointer.
 */
function useHeldInPlace(anchor: HTMLElement | null, open: boolean) {
  useLayoutEffect(() => {
    if (!open || !anchor || typeof ResizeObserver === 'undefined') return;
    const scroll = anchor.closest<HTMLElement>(SCROLL);
    const stage = anchor.closest<HTMLElement>(STAGE);
    if (!scroll || !stage) return;
    let top = anchor.getBoundingClientRect().top;
    const observer = new ResizeObserver(() => {
      if (!anchor.isConnected) return;
      const moved = anchor.getBoundingClientRect().top - top;
      if (moved !== 0) scroll.scrollTop += moved;
      top = anchor.getBoundingClientRect().top;
    });
    observer.observe(stage);
    return () => observer.disconnect();
  }, [anchor, open]);
}

export interface SlotConsentCardProps {
  ask: ConsentAsk | null;
  /** The Install or Update pressed in the slot: the card floats from it. */
  anchor: HTMLElement | null;
  /** The card's one press: install, or update. */
  onConfirm: () => void;
  /** Cancel or Not now, Escape, or a press outside the card. */
  onCancel: () => void;
}

/**
 * The card over a slot (task-15.9 decision 2, the design canvas's O3 and U3): the same body,
 * floating from the press with no scrim, so the offer or the update tile stays behind it and
 * nothing on the canvas moves. Focus stays inside while it is open; Escape and a press outside
 * cancel it.
 */
export function SlotConsentCard({ask, anchor, onConfirm, onCancel}: SlotConsentCardProps) {
  const titleId = useId();
  const anchorRef = useMemo(() => ({current: anchor}), [anchor]);
  const open = ask !== null && anchor !== null;
  useHeldInPlace(anchor, open);
  return (
    <Popover.Root
      modal
      open={open}
      onOpenChange={next => {
        if (!next) onCancel();
      }}
    >
      {anchor && <Popover.Anchor virtualRef={anchorRef as {current: HTMLElement}} />}
      {open && (
        <Popover.Content
          side="bottom"
          align="end"
          // Kept inside the canvas's column, never over the gutter beside it (the canvas's U3).
          collisionBoundary={anchor?.closest<HTMLElement>(STAGE) ?? undefined}
          maxWidth="420px"
          className="store-consent store-consent--slot"
          data-testid="slot-consent-card"
          role="dialog"
          aria-modal="true"
          aria-labelledby={titleId}
        >
          <Who entry={ask.entry} />
          <Heading as="h2" id={titleId} size="5" mb="0">
            {title(ask)}
          </Heading>
          {ask.kind === 'install' && (
            <Text as="p" size="2">
              {ask.entry.card.description}
            </Text>
          )}
          <Detail ask={ask} />
          <Flex gap="3" justify="end">
            <Button variant="soft" color="gray" onClick={onCancel}>
              {cancelWords(ask)}
            </Button>
            <Button onClick={onConfirm}>{confirmWords(ask)}</Button>
          </Flex>
        </Popover.Content>
      )}
    </Popover.Root>
  );
}
