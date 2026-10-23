/**
 * The Planner's closed tool set (phase-6 decision 4, task-6.4 decision 5): three readers over the
 * platform's own state, called on demand the way a vendor agent calls its MCP. Each is a bounded
 * deterministic projection — never a partition's contents, never the synthesis document. One
 * interface; the AI SDK adapter below is the only tool-shaped code, so a new projection is a new
 * reader here and the Planner does not change if the platform's state ever moves behind a real
 * MCP server. Beside the readers, the marketplace's tool set — its one search (`storeSearch.ts`).
 */
import {jsonSchema, tool, type ToolSet} from 'ai';
import {SEARCH_TOOL, type StoreSearch} from './storeSearch.js';

export interface InstalledApp {
  id: string;
  displayName: string;
  /** The card's own name and description: this run's card, the installed one when the agent is down. */
  name?: string;
  description?: string;
  skills: {name: string; description: string}[];
  /** The catalogs it paints in: the ids handed at its install, or the basic catalog. */
  catalogs: string[];
  /** Whether its card was fetched at startup: an unreachable app is unroutable this run. */
  reachable: boolean;
  /** Whether its card asks sign-in (task-12.6 decision 9). */
  signIn: boolean;
  /** Its accounts the vault holds, by source and label; none for an app not signed in. */
  accounts: {source: string; label: string}[];
  /** Its update state as last computed, in the App Library's words (task-14.5 decision 6). */
  update: string;
  /** How long ago that state was computed — "checked 12 minutes ago"; absent when none is held. */
  checked?: string;
}

/**
 * How an app's answer on a canvas stands, in the person's words (task-15.11 decision 29): a slot
 * loading, painted, resting on words alone, failed, needing sign-in, needing an update (task 15.5),
 * or an account choice waiting on the person's press.
 */
export type AppStanding =
  | 'still loading'
  | 'answered'
  | 'answered with nothing to show'
  | 'couldn’t answer'
  | 'waiting for you to sign in'
  | 'needs an update'
  | 'waiting for you to choose an account';

export interface CompositionApp {
  /** The app's name on the canvas. */
  app: string;
  /** The account's name, when it is not the app's own (task-12.6 decision 9). */
  account?: string;
  /** What the plan asked the app for, in the Planner's own words (task-15.11 decision 30). */
  askedFor?: string;
  state: AppStanding;
  /** What the person can do about an answer that isn't there yet (task-15.11 decision 30). */
  toDo?: string;
}

/**
 * The merged view as the screen doesn't say it (task-15.11 decision 30): whether it shows and why
 * not, what it puts together — the progress line's words — the columns it was planned with, and
 * the order it was made in.
 */
export interface CompositionMergedView {
  state: 'being made' | 'showing' | 'not shown';
  why?: string;
  joins?: string;
  columns?: string[];
  sortedBy?: {by: string; order: 'ascending' | 'descending'};
}

export interface CompositionView {
  /** What was asked on the canvas. */
  question: string;
  apps: CompositionApp[];
  /** Present when the plan made room for a merged view. */
  mergedView?: CompositionMergedView;
  /**
   * What was asked for that no installed app does yet; one an install filled reads as its app
   * (task-15.4 decision 11).
   */
  nothingInstalledFor: string[];
}

export interface PlatformReaders {
  /** Installed apps — from the Registry: id, display name, the card's name, description and skills, catalogs, reachability, whether it asks sign-in and its accounts by label. */
  installedApps(): InstalledApp[];
  /**
   * This composition — the structure of the composition the question was asked from (task-9.3 decision 2);
   * undefined on a root composition or when that composition is gone.
   */
  thisComposition(askedFrom: string | undefined): CompositionView | undefined;
  /** Recent turns — the composition the question was asked from and its ancestry, one line each, oldest first. */
  recentTurns(askedFrom: string | undefined): string[];
}

export const READER_NAMES = ['installed_apps', 'this_canvas', 'recent_turns'] as const;
export type ReaderName = (typeof READER_NAMES)[number];

const NO_INPUT = jsonSchema<Record<string, never>>({
  type: 'object',
  properties: {},
  additionalProperties: false,
});

const SEARCH_INPUT = jsonSchema<{words: string}>({
  type: 'object',
  properties: {
    words: {
      type: 'string',
      minLength: 1,
      description:
        'A few plain words naming the capability the utterance needs — or the name of the app it asks to install. A gap you name carries these words exactly.',
    },
  },
  required: ['words'],
  additionalProperties: false,
});

/**
 * The readers as the AI SDK's tools, bound to the composition the question was asked from; results as
 * JSON, recent turns as lines. Beside them, when the marketplace is wired, its one tool: the search
 * (task-15.4 decision 1).
 */
export function readerTools(
  readers: PlatformReaders,
  askedFrom: string | undefined,
  store?: StoreSearch,
): ToolSet {
  return {
    ...(store
      ? {
          [SEARCH_TOOL]: tool({
            description:
              'The Store: the apps published there that are not installed here, searched by words. Each app found comes with its app id, its card’s name, description and skills with their examples, and its publisher. An empty list means nothing in the Store matches the words; `unreached` means the Store could not be reached. Call it when the utterance needs what no installed app serves, or asks to install an app — never to answer what the Store lists.',
            inputSchema: SEARCH_INPUT,
            execute: async ({words}) => store.search(words),
          }),
        }
      : {}),
    installed_apps: tool({
      description:
        'The apps installed on this platform: each one’s id, display name, its card’s name, description and skills, the catalogs it paints in, whether it was reachable at boot, whether it asks the user to sign in, the accounts signed in to it — each its source id and its label; none listed means not signed in — and whether it has an update: its state in the words the App Library shows, with how long ago the last check ran. Call it to answer which apps there are, what an installed app can do, which accounts an app has, or whether anything is out of date. The platform itself is not an app.',
      inputSchema: NO_INPUT,
      execute: async () => readers.installedApps(),
    }),
    this_canvas: tool({
      description:
        'The canvas this question was asked from — the answer opens a canvas of its own — in the person’s words: what was asked on it; each app on it — an account’s by its name — what it was asked for, how its answer stands and what to do about one that isn’t there; the merged view — whether it shows and why not, what it puts together, its columns and the order it was made in; and what was asked for that no installed app does yet. Never an app’s data. Call it to answer what is on the canvas the user asked from, where its parts come from, or which account holds what is on it.',
      inputSchema: NO_INPUT,
      execute: async () =>
        readers.thisComposition(askedFrom) ?? {empty: true, note: 'Nothing is on the canvas yet.'},
    }),
    recent_turns: tool({
      description:
        'The trail the user walked to the canvas they are looking at: that canvas and the ones it was asked from, oldest first, one line each — when, what was asked, which sources answered and how, what became of the merged view, whether it is still loading or was closed. Call it to answer what was asked or what happened before.',
      inputSchema: NO_INPUT,
      execute: async () => readers.recentTurns(askedFrom),
    }),
  };
}
