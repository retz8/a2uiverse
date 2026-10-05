/**
 * The Planner's closed tool set (phase-6 decision 4, task-6.4 decision 5): three readers over the
 * platform's own state, called on demand the way a vendor agent calls its MCP. Each is a bounded
 * deterministic projection — never a partition's contents, never the synthesis document. One
 * interface; the AI SDK adapter below is the only tool-shaped code, so a new projection is a new
 * reader here and the Planner does not change if the platform's state ever moves behind a real
 * MCP server.
 */
import {jsonSchema, tool, type ToolSet} from 'ai';

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

/**
 * The readers as the AI SDK's tools, bound to the composition the question was asked from; results as
 * JSON, recent turns as lines.
 */
export function readerTools(readers: PlatformReaders, askedFrom: string | undefined): ToolSet {
  return {
    installed_apps: tool({
      description:
        'The apps installed on this platform: each one’s id, display name, its card’s name, description and skills, the catalogs it paints in, whether it was reachable at boot, whether it asks the user to sign in, and the accounts signed in to it — each its source id and its label; none listed means not signed in. Call it to answer which apps there are, what an installed app can do, or which accounts an app has. The platform itself is not an app.',
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
