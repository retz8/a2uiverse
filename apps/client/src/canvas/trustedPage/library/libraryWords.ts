/**
 * What the App Library says (task 14.8), read off the installed record, its update state as just
 * checked and its accounts: each app's state in plain words with the press it carries, and the
 * words of sign-out, uninstall and adding an account. Every word is the person's — never a scheme,
 * a scope key or a catalog.
 */
import {NOT_CHECKED_WORDS, updateWords, type UpdateState} from '@a2uiverse/sdk';
import type {InstalledApp, Revocation} from '../../../orchestratorApi';
import {listed, updateAct} from '../appCard';

/** An app not reached at startup nor by a check since (task-14.8 decision 2). */
export const UNREACHED_WORDS = 'Couldn’t be reached';

/** How a state reads: its color and its icon. */
export type StateTone = 'ok' | 'new' | 'warn' | 'bad' | 'quiet' | 'local' | 'waiting';

/** The press a state carries (task-14.2 decision 8). */
export type StatePress =
  | {kind: 'none'}
  /** Update, through the consent card for the update that asks for more; primary when required. */
  | {kind: 'update'; state: UpdateState; consent: boolean; primary: boolean}
  /** The check could not reach the Store: Check again runs it again. */
  | {kind: 'check'};

/** An app's row and view head: its state in words, or checking. */
export type AppStateView =
  {kind: 'checking'} | {kind: 'state'; words: string; tone: StateTone; press: StatePress};

/**
 * An installed app's state as the App Library shows it: checking while the check runs; not
 * reached, in place of the update state; otherwise its state as just checked, in the App
 * Library's words, an app from a local copy the Store does not list installed from your computer.
 */
export function appStateView(
  app: InstalledApp,
  update: UpdateState | undefined,
  checking: boolean,
): AppStateView {
  if (checking) return {kind: 'checking'};
  if (app.reachable === false)
    return {kind: 'state', words: UNREACHED_WORDS, tone: 'bad', press: {kind: 'none'}};
  const source = app.source ?? 'local';
  if (!update)
    return {kind: 'state', words: NOT_CHECKED_WORDS, tone: 'quiet', press: {kind: 'none'}};
  const words = updateWords(update.state, source);
  const act = updateAct(update);
  if (act?.kind === 'update') {
    const required = update.state === 'update-required';
    return {
      kind: 'state',
      words,
      tone: required ? 'warn' : 'new',
      press: {kind: 'update', state: update, consent: act.consent, primary: required},
    };
  }
  switch (update.state) {
    case 'up-to-date':
      return {kind: 'state', words, tone: 'ok', press: {kind: 'none'}};
    case 'ahead-of-store':
      return {kind: 'state', words, tone: 'waiting', press: {kind: 'none'}};
    case 'unknown':
      return {kind: 'state', words, tone: 'quiet', press: {kind: 'check'}};
    default:
      return {
        kind: 'state',
        words,
        tone: source === 'local' ? 'local' : 'quiet',
        press: {kind: 'none'},
      };
  }
}

/** What an app's view says under its head for its state (the design canvas's update states). */
export function stateNote(
  name: string,
  app: InstalledApp,
  update: UpdateState | undefined,
): {tone: 'warn' | 'quiet'; text: string} | undefined {
  if (app.reachable === false || !update) return undefined;
  switch (update.state) {
    case 'update-required':
      return {
        tone: 'warn',
        text: `${name} no longer answers in the look you have. Update it to keep seeing its answers.`,
      };
    case 'ahead-of-store':
      return {
        tone: 'quiet',
        text: `${name} has changed since it was last put in the Store. Nothing to do yet: the update appears here once the publisher adds it.`,
      };
    case 'not-published':
      return app.source === 'marketplace'
        ? {
            tone: 'quiet',
            text: `Its publisher took ${name} out of the Store. It stays installed here until you uninstall it.`,
          }
        : undefined;
    case 'unknown':
      return {
        tone: 'quiet',
        text: `The Store couldn’t be reached. ${name} still works as installed.`,
      };
    default:
      return undefined;
  }
}

/** The notice on the view of an app not reached (task-14.8 decision 2). */
export function unreachedNotice(name: string): {lead: string; rest: string} {
  return {
    lead: `${name} couldn’t be reached,`,
    rest: 'so it can’t answer right now. Check again tries it once more.',
  };
}

/** The time a check began, as the list's label says it: "9:02 AM". */
export function checkedAt(at: Date): string {
  return new Intl.DateTimeFormat('en-US', {hour: 'numeric', minute: '2-digit'}).format(at);
}

const NUMBERS = ['no', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine'];
const count = (n: number) => NUMBERS[n] ?? String(n);

/** The note beside Uninstall: what else it does (task-14.8 decision 7); none with no accounts. */
export function uninstallNote(labels: readonly string[]): string | undefined {
  if (labels.length === 0) return undefined;
  if (labels.length === 1) return 'Also signs out its account';
  if (labels.length === 2) return 'Also signs out both accounts';
  return `Also signs out all ${count(labels.length)} accounts`;
}

/** What uninstall asks, once (phase-14 decision 19). */
export function uninstallQuestion(labels: readonly string[]): string {
  const stay = 'Answers already on your canvases stay as they are.';
  if (labels.length === 0) return stay;
  const accounts =
    labels.length === 1
      ? `its account, ${labels[0]}`
      : `its ${count(labels.length)} accounts, ${listed(labels)}`;
  return `This also signs out ${accounts}. ${stay}`;
}

/** Where a person removes an app's access by hand, when cancelling it failed. */
const removeByHand = (name: string) =>
  `You can remove that access from your ${name} account’s settings.`;

/** What a sign-out says (task-14.8 decision 9): signed out, and more only when cancelling failed. */
export function signedOutLine(name: string, label: string, revocation: Revocation): string {
  if (revocation !== 'failed') return `Signed out of ${label}.`;
  return `Signed out of ${label} here, but ${name} couldn’t be reached to cancel its access. ${removeByHand(name)}`;
}

/** What an uninstall says once done, with a sentence for each account whose cancel failed. */
export function uninstalledLine(
  name: string,
  accounts: readonly {label: string; revocation: Revocation}[],
): {lead: string; rest: string[]} {
  const lead =
    accounts.length === 0
      ? `${name} is uninstalled.`
      : accounts.length === 1
        ? `${name} is uninstalled and its account is signed out.`
        : `${name} is uninstalled and its accounts are signed out.`;
  const rest = accounts
    .filter(account => account.revocation === 'failed')
    .map(
      account =>
        `${name} couldn’t be reached to cancel the access of ${account.label}. ${removeByHand(name)}`,
    );
  return {lead, rest};
}

/** A sentence from a refusal's reason: "a name cannot be empty" → "A name cannot be empty." */
export function sentence(reason: string): string {
  const trimmed = reason.trim();
  if (!trimmed) return '';
  const capital = trimmed[0]!.toUpperCase() + trimmed.slice(1);
  return /[.!?]$/.test(capital) ? capital : `${capital}.`;
}
