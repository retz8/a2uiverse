/**
 * The marketplace's tool set (phase-15 decision 2, task-15.4 decisions 1, 2): one tool, the
 * search, run over the marketplace's search route through the orchestrator's marketplace client,
 * within its limit for each request to the Store. Installed apps are left out of the answer, and
 * each app is projected as the installed-apps reader projects one, with its publisher. The model
 * reads the marketplace only through this answer, never its index. Each call is a tool call in
 * the plan's record — its words its arguments, its result the answer the model saw — and that one
 * record serves the plan check, the line with nothing to offer and the journal (task-15.4
 * decisions 3, 15).
 */
import type {IndexEntry} from '@a2uiverse/sdk';
import type {ToolCallRecord} from '../journal/types.js';
import type {SearchLookup} from '../registry/marketplace.js';

/** The tool's name, as the model calls it and the plan's record names it. */
export const SEARCH_TOOL = 'search_store';

/** An app as the search answers it: the installed-apps reader's projection, with the publisher. */
export interface StoreApp {
  appId: string;
  name: string;
  publisher: string;
  description: string;
  skills: {name: string; description: string; examples: string[]}[];
}

/** What a search answers the model: the apps found, or that the Store was not reached, and why. */
export type StoreAnswer = {apps: StoreApp[]} | {unreached: string};

export interface StoreSearch {
  search(words: string): Promise<StoreAnswer>;
}

export interface StoreSearchDeps {
  /** The marketplace's search, through the orchestrator's client. */
  search(words: string): Promise<SearchLookup>;
  /** The installed apps' ids, read at each search. */
  installed(): readonly string[];
}

export function storeSearch(deps: StoreSearchDeps): StoreSearch {
  return {
    async search(words) {
      const read = await deps.search(words);
      if (read.kind === 'unreached') return {unreached: read.reason};
      if (read.kind === 'malformed') {
        return {unreached: `the Store's answer was not a search: ${read.errors.join('; ')}`};
      }
      const installed = new Set(deps.installed());
      return {
        apps: read.results
          .filter(({entry}) => !installed.has(entry.appId))
          .map(({entry}) => storeApp(entry)),
      };
    },
  };
}

/** One entry as the search answers it, from the card as published. */
export function storeApp(entry: IndexEntry): StoreApp {
  return {
    appId: entry.appId,
    name: entry.card.name,
    publisher: entry.publisher,
    description: entry.card.description,
    skills: (entry.card.skills ?? []).map(skill => ({
      name: skill.name,
      description: skill.description,
      examples: skill.examples ?? [],
    })),
  };
}

/** One search of a plan, read back from its tool calls. */
export interface SearchRecord {
  words: string;
  /** Whether the Store answered; an unreached search found nothing. */
  reached: boolean;
  apps: StoreApp[];
}

/** The plan's searches, in the order it made them, from its tool calls across both attempts. */
export function searchesOf(toolCalls: readonly ToolCallRecord[]): SearchRecord[] {
  const searches: SearchRecord[] = [];
  for (const call of toolCalls) {
    if (call.name !== SEARCH_TOOL) continue;
    const words = (call.args as {words?: unknown} | null)?.words;
    if (typeof words !== 'string') continue;
    const result = call.result as Partial<{apps: StoreApp[]; unreached: string}> | null;
    searches.push(
      Array.isArray(result?.apps)
        ? {words, reached: true, apps: result.apps}
        : {words, reached: false, apps: []},
    );
  }
  return searches;
}
