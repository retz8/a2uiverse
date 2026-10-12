/**
 * What the trusted page says of an app, read off its card and its listing (task 14.7): its tile,
 * the questions to try, what signing in will be, the press its listing or its update state carries,
 * what a refused install or update says, and the sample's caption — for the Store and the App
 * Library alike. Every word is the person's — never a scheme, a scope key or a catalog.
 */
import {
  UPDATE_WORDS,
  type InstallRefusal,
  type NewScopes,
  type PreviewDocument,
  type PublishedCard,
  type UpdateState,
} from '@a2uiverse/sdk';
import type {StoreListing} from '../../orchestratorApi';
import type {AppAct} from './useAppAct';

/** The app's tile: the first letter of its card's name (task-14.7 decision 9). */
export function tileLetter(name: string): string {
  return (name.trim()[0] ?? '?').toUpperCase();
}

/** The questions to try: the first example of each skill, up to three (task-14.7 decision 8). */
export function tryAsking(card: PublishedCard): string[] {
  return (card.skills ?? [])
    .flatMap(skill => (skill.examples?.[0] ? [skill.examples[0]] : []))
    .slice(0, 3);
}

/** What signing in to the app will be (task-14.7 decision 10). */
export type SignInNeed =
  | {kind: 'none'}
  /** A sign-in in a window, and what the app will be able to do in the card's own words. */
  | {kind: 'signIn'; words: string[]}
  /** A pasted key or token. */
  | {kind: 'key'}
  | {kind: 'unsupported'};

type Scheme = {
  type?: string;
  scheme?: string;
  in?: string;
  name?: string;
  flows?: {authorizationCode?: {scopes?: Record<string, string>}};
};

/** A scheme the platform signs in with, by its kind; none for one it does not. */
function kindOf(scheme: Scheme | undefined): 'signIn' | 'key' | undefined {
  switch (scheme?.type) {
    case 'oauth2':
      return scheme.flows?.authorizationCode ? 'signIn' : undefined;
    case 'openIdConnect':
      return 'signIn';
    case 'http':
      return scheme.scheme?.toLowerCase() === 'bearer' ? 'key' : undefined;
    case 'apiKey':
      return scheme.in === 'header' && scheme.name ? 'key' : undefined;
    default:
      return undefined;
  }
}

/** The card's own words for scope keys under a scheme; a key with none is left out. */
function wordsOf(scheme: Scheme | undefined, keys: readonly string[]): string[] {
  const words = scheme?.flows?.authorizationCode?.scopes ?? {};
  return keys.flatMap(key => (words[key] ? [words[key]] : []));
}

const schemesOf = (card: PublishedCard) =>
  (card.securitySchemes ?? {}) as Record<string, Scheme | undefined>;

/**
 * What the card asks, read as the orchestrator's vault reads it: no `security`, or an empty
 * alternative, asks nothing; otherwise the first alternative naming one scheme the platform signs
 * in with, its scopes in the card's words; none such is a sign-in not supported here.
 */
export function signInOf(card: PublishedCard): SignInNeed {
  const security = card.security;
  if (!security || security.length === 0) return {kind: 'none'};
  if (security.some(requirement => Object.keys(requirement).length === 0)) return {kind: 'none'};
  const schemes = schemesOf(card);
  for (const requirement of security) {
    const keys = Object.keys(requirement);
    if (keys.length !== 1) continue;
    const scheme = schemes[keys[0]!];
    const kind = kindOf(scheme);
    if (kind === 'key') return {kind: 'key'};
    if (kind === 'signIn') return {kind: 'signIn', words: wordsOf(scheme, requirement[keys[0]!]!)};
  }
  return {kind: 'unsupported'};
}

/** The new permissions a card update asks for, in the published card's words. */
export function newScopeWords(card: PublishedCard, newScopes: readonly NewScopes[]): string[] {
  const schemes = schemesOf(card);
  return newScopes.flatMap(({scheme, scopes}) => wordsOf(schemes[scheme], scopes));
}

/** The update states whose listing carries Update (task-14.2 decision 8). */
const UPDATABLE = new Set<UpdateState['state']>([
  'newer-build',
  'major-update',
  'card-update',
  'update-required',
]);

/** What the end of a listing carries (task-14.2 decision 8, phase-14 decision 20). */
export type ListingAct =
  | {kind: 'install'}
  | {kind: 'installed'}
  /** An update waiting: its words, and whether it passes the consent card first. */
  | {kind: 'update'; words: string; state: UpdateState; consent: boolean}
  /** An update on its way from the publisher: its words, no press. */
  | {kind: 'waiting'; words: string};

export function listingAct({installed, update}: StoreListing): ListingAct {
  if (!installed) return {kind: 'install'};
  return (update && updateAct(update)) ?? {kind: 'installed'};
}

/**
 * What an installed app's update state carries, in the Store and the App Library alike: an Update
 * — through the consent card for the update that asks for more — or the wait for the publisher;
 * nothing for every other state.
 */
export function updateAct(
  update: UpdateState,
): Extract<ListingAct, {kind: 'update'} | {kind: 'waiting'}> | undefined {
  if (update.state === 'ahead-of-store') {
    return {kind: 'waiting', words: UPDATE_WORDS['ahead-of-store']};
  }
  if (UPDATABLE.has(update.state)) {
    return {
      kind: 'update',
      words: UPDATE_WORDS[update.state],
      state: update,
      consent: update.state === 'card-update',
    };
  }
  return undefined;
}

/** Names in a line: "A", "A and B", "A, B and C". */
export const listed = (names: readonly string[]) =>
  names.length <= 1
    ? (names[0] ?? '')
    : `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]}`;

/** What a refused install or update says (task-14.7 decision 6), and the press it leaves. */
export function refusalOf(cause: InstallRefusal, name: string, act: AppAct) {
  const verb = act === 'install' ? 'installed' : 'updated';
  switch (cause) {
    case 'store-behind':
      return {
        tone: 'warn' as const,
        lead: `${name} can’t be ${verb} yet.`,
        rest: 'Its publisher has changed the app, and the Store hasn’t caught up. Try again later.',
        press: 'again' as const,
      };
    case 'app-unreached':
      return {
        tone: 'bad' as const,
        lead: `${name} couldn’t be reached,`,
        rest: act === 'install' ? 'so nothing was installed.' : 'so nothing changed.',
        press: 'retry' as const,
      };
    case 'checks':
      return {
        tone: 'bad' as const,
        lead: `${name} can’t be ${verb}.`,
        rest: 'Its files didn’t pass the checks on this computer, so nothing changed.',
        press: 'none' as const,
      };
    case 'store-unreached':
      return {
        tone: 'bad' as const,
        lead: 'The Store can’t be reached right now,',
        rest: act === 'install' ? 'so nothing was installed.' : 'so nothing changed.',
        press: 'retry' as const,
      };
  }
}

/** Whether a card update brings a new look: a catalog it paints in moves to a new build. */
export function bringsNewLook(update: UpdateState): boolean {
  return 'builds' in update && update.builds.length > 0;
}

const DAY = new Intl.DateTimeFormat('en-US', {month: 'short', day: 'numeric'});
const DAY_YEAR = new Intl.DateTimeFormat('en-US', {
  month: 'short',
  day: 'numeric',
  year: 'numeric',
});

/** A date as the page says it: "Oct 3", the year added when it is not this year's. */
export function dayOf(iso: string, now: Date = new Date()): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  return (date.getFullYear() === now.getFullYear() ? DAY : DAY_YEAR).format(date);
}

/** The sample's caption: who made it, and when (task-14.7 decision 11). */
export function sampleCaption(
  preview: Pick<PreviewDocument, 'capturedBy' | 'capturedAt'>,
  name: string,
  now?: Date,
): string {
  const day = dayOf(preview.capturedAt, now);
  const made =
    preview.capturedBy === 'publisher'
      ? 'Made by the publisher with their own account'
      : `Made by the Store when ${name} was published`;
  return day ? `${made}, ${day}` : made;
}
