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

export interface CompositionSlot {
  /** The slot's source; the app id for an account choice still waiting. */
  source: string;
  displayName: string;
  /** The account's label, for a slot of an account (task-12.6 decision 9). */
  label?: string;
  /**
   * The orchestrator's view: pending, arrived (painted), failed, collapsed, needing sign-in
   * (`authority`), or an account choice waiting on the user's press (`choosing-account`).
   */
  state: 'pending' | 'arrived' | 'failed' | 'collapsed' | 'authority' | 'choosing-account';
}

export interface CompositionView {
  utterance: string;
  slots: CompositionSlot[];
  /** Present when the plan reserved a merged view; its state and, when it did not stand, why. */
  mergedView?: {state: 'pending' | 'live' | 'collapsed' | 'declined'; reason?: string};
  /** The capability gaps no app fills yet; one an install filled reads as its slot (task-15.4 decision 11). */
  gaps: string[];
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
        'The canvas the user is looking at — the one this question was asked from — as structure: the utterance it came from, which sources hold a slot — an account’s with its label — and each slot’s state, whether a merged view is live, collapsed or declined and why, and any capability gaps. Never an app’s data. Call it to answer what the user is looking at, or which account holds what is on it.',
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
