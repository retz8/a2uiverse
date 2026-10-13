/**
 * What Publish says (task 14.9), read off the names a person types, a listing and the Store's
 * answers: plain words first, Stellify's term beside each (task-14.2 decision 12), the Store's own
 * findings kept verbatim beneath the plain lead (task-14.9 decision 10).
 */
import {
  APP_ID_MAX_LENGTH,
  APP_ID_PATTERN,
  PUBLISHER_NAME_MAX_LENGTH,
  PUBLISHER_NAME_PATTERN,
  RESERVED_APP_IDS,
  RESERVED_PUBLISHER_NAMES,
  type Drift,
  type PublishOutcome,
  type PublishedCard,
} from '@a2uiverse/sdk';
import type {PublisherRefusal} from '../../../orchestratorApi';
import {signInOf} from '../appCard';

/** A notice's words: its lead in bold, then the rest. */
export interface Words {
  lead: string;
  rest?: string;
}

/** A sentence with Stellify's terms beside its plain words. */
export type Spoken = (string | {term: string})[];

// --- Names --------------------------------------------------------------------------------------

interface Grammar {
  pattern: RegExp;
  max: number;
  reserved: readonly string[];
}

/** A publisher's name and an app's id share one grammar (task-13.2 decision 6). */
const GRAMMARS: Record<'publisher' | 'app', Grammar> = {
  publisher: {
    pattern: PUBLISHER_NAME_PATTERN,
    max: PUBLISHER_NAME_MAX_LENGTH,
    reserved: RESERVED_PUBLISHER_NAMES,
  },
  app: {pattern: APP_ID_PATTERN, max: APP_ID_MAX_LENGTH, reserved: RESERVED_APP_IDS},
};

/**
 * A name made from what was typed (task-14.9 decision 16): lowercased, every run of other
 * characters one hyphen, leading non-letters dropped; none when that is what was typed, or still
 * not a name.
 */
export function suggestedName(
  typed: string,
  kind: 'publisher' | 'app' = 'publisher',
): string | undefined {
  const {pattern, max, reserved} = GRAMMARS[kind];
  const slug = typed
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^[^a-z]+/, '')
    .slice(0, max)
    .replace(/-+$/, '');
  return slug && slug !== typed && pattern.test(slug) && !reserved.includes(slug)
    ? slug
    : undefined;
}

/** What is wrong with a typed name, checked before it is sent; none when it may be sent. */
export function nameProblem(typed: string, kind: 'publisher' | 'app'): string | undefined {
  const {pattern, max, reserved} = GRAMMARS[kind];
  if (typed === '') return undefined;
  if (!pattern.test(typed)) {
    const suggestion = suggestedName(typed, kind);
    return `Use lowercase letters, numbers and hyphens, starting with a letter${suggestion ? `: ${suggestion}` : ''}.`;
  }
  if (typed.length > max) return `Keep it to ${max} characters or fewer.`;
  if (reserved.includes(typed)) return 'That name is kept for A2UIVerse. Try another.';
  return undefined;
}

// --- Claim and sign-in --------------------------------------------------------------------------

/** A claim refused at the Store, under its field. */
export function claimProblem(refusal: PublisherRefusal): string | undefined {
  if (refusal === 'taken') return 'That name belongs to another publisher. Try another.';
  if (refusal === 'name')
    return 'Use lowercase letters, numbers and hyphens, starting with a letter.';
  return undefined;
}

/** What a refusal that says who is signed in now says the reason was (task-14.9 decision 11). */
export function whoReason(refusal: PublisherRefusal): string | undefined {
  switch (refusal) {
    case 'held':
      return 'A publisher is already signed in on this computer.';
    case 'signed-out':
      return 'No publisher is signed in on this computer any more.';
    case 'another-store':
      return 'You’re signed in for a different Store.';
    case 'not-accepted':
      return 'The Store no longer accepts your publisher secret.';
    default:
      return undefined;
  }
}

/** Whether a refusal says who is signed in has changed: the page checks again (decision 11). */
export const changesWho = (refusal: PublisherRefusal): boolean =>
  refusal === 'held' ||
  refusal === 'signed-out' ||
  refusal === 'another-store' ||
  refusal === 'not-accepted';

// --- A listing ----------------------------------------------------------------------------------

/**
 * The ahead-of-the-Store notice's sentence after its lead (task-14.9 decision 12): each cause in
 * plain words — a look the Store doesn't have, its catalog ids beside; a version the Store doesn't
 * have — then who can't install it.
 */
export function aheadSentence(ahead: Drift): Spoken {
  const spoken: Spoken = [];
  const looks = ahead.catalogIds;
  if (looks.length > 0) {
    spoken.push(`It now uses ${looks.length === 1 ? 'a look' : 'looks'} the Store doesn’t have`, {
      term: `(${looks.join(', ')})`,
    });
  }
  if (ahead.version !== undefined) {
    spoken.push(
      `${looks.length > 0 ? ', and it' : 'It'} now says it’s version ${ahead.version}, which the Store doesn’t have`,
    );
  }
  spoken.push(', so no one new can install it until you publish an update.');
  return spoken;
}

/** The sample answer file's hint on the form (task-14.9 decision 14). */
export function previewHint(card: PublishedCard | undefined): string {
  if (!card) return 'Needed only if your app asks people to sign in.';
  if (signInOf(card).kind === 'none') {
    return `${card.name} doesn’t ask people to sign in, so leave this out: the Store asks it its own question.`;
  }
  return `Needed because ${card.name} asks people to sign in: the Store can’t ask it a question without your account.`;
}

// --- Publish ------------------------------------------------------------------------------------

/** The published outcome's plain words (task-14.9 decision 17). */
export function publishedWords(outcome: PublishOutcome, name: string): Words {
  const lead = `${name} ${outcome.version} is in the Store.`;
  if (outcome.notes.some(note => note.endsWith(' is listed again'))) {
    return {lead, rest: `${name} is back in the Store.`};
  }
  if (outcome.summary.startsWith('published ')) {
    return {lead, rest: `People can now find ${name} in the Store.`};
  }
  return {lead, rest: `People who have ${name} installed see the update in their App Library.`};
}

/**
 * A refused publish's plain lead (task-14.9 decisions 10, 11, 18), from its reason and status: a
 * name or a look another publisher's, the Store's checks, no clear answer, or who is signed in.
 */
export function publishRefusedWords(
  refusal: PublisherRefusal,
  findings: readonly string[],
  appId: string,
  isNew: boolean,
): Words {
  const unchanged = isNew ? 'Nothing was published.' : 'Your listing hasn’t changed.';
  const who = whoReason(refusal);
  if (who) return {lead: 'Nothing was published.', rest: who};
  switch (refusal) {
    case 'owned':
      return {
        lead: findings[0]?.startsWith('catalog ')
          ? 'One of this app’s looks belongs to another publisher in the Store.'
          : `Another publisher already uses the name “${appId}” in the Store.`,
        rest: unchanged,
      };
    case 'unreached':
      return {
        lead: `The Store didn’t answer, so this ${isNew ? 'app' : 'version'} may or may not be in the Store.`,
        rest: 'Your apps show what the Store has now.',
      };
    default:
      return {
        lead: isNew ? 'The Store didn’t take this app.' : 'The Store didn’t take this version.',
        rest: unchanged,
      };
  }
}

// --- Unpublish ----------------------------------------------------------------------------------

/** An unpublish done (task-14.9 decision 9). */
export const unpublishedWords = (name: string): Words => ({
  lead: `${name} left the Store.`,
  rest: 'People who installed it keep it.',
});

/** A refused unpublish's plain lead (decisions 9, 10, 11). */
export function unpublishRefusedWords(refusal: PublisherRefusal, name: string): Words {
  const who = whoReason(refusal);
  if (who) return {lead: `${name} wasn’t unpublished.`, rest: who};
  switch (refusal) {
    case 'not-published':
      return {lead: `${name} isn’t in the Store any more.`};
    case 'owned':
      return {lead: `${name} belongs to another publisher in the Store.`};
    case 'unreached':
      return {
        lead: `The Store didn’t answer, so ${name} may or may not still be in the Store.`,
        rest: 'Your apps show what the Store has now.',
      };
    default:
      return {lead: `${name} couldn’t be unpublished.`};
  }
}

// --- The form ----------------------------------------------------------------------------------

/**
 * What is wrong with the app's address, read by the browser's own address parser (task-14.9
 * decision 15): none when it is an http or https address the Store can fetch.
 */
export function addressProblem(typed: string): string | undefined {
  if (typed.trim() === '') return undefined;
  try {
    const {protocol} = new URL(typed.trim());
    if (protocol === 'http:' || protocol === 'https:') return undefined;
  } catch {
    // Not an address at all: said the same way.
  }
  return 'Enter your app’s full address, starting with https:// or http://.';
}

// --- The form's files ---------------------------------------------------------------------------

/** A dropped folder with no descriptor at its top (task-14.9 decision 15). */
export const notPackedWords = (folder: string): string =>
  `“${folder}” wasn’t packed by Stellify. Drop the folder it wrote (dist/artifact).`;

/** A file that is no sample answer Stellify captured. */
export const notPreviewWords = (file: string): string =>
  `“${file}” isn’t a sample answer Stellify captured.`;

/** A sample answer captured for another app than the form's. */
export const otherAppPreviewWords = (sampleApp: string, appId: string): string =>
  `This sample answer is for “${sampleApp}”, not “${appId}”.`;

/** A folder's size on its row. */
export const filesWords = (count: number): string => `${count} ${count === 1 ? 'file' : 'files'}`;
