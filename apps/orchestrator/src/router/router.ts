import type {AgentCard} from '@a2a-js/sdk';
import {rank, type Embedder} from '@a2uiverse/embedder';
import type {Registry} from '../registry/registry.js';
import type {AppRecord} from '../registry/types.js';

export interface ShortlistEntry {
  record: AppRecord;
  card: AgentCard;
  score: number;
}

/**
 * Retrieval over the Registry's corpus (SPEC decision 10): embed the query,
 * rank routable agents through the shared rank, cap the list. No similarity threshold —
 * ranking only; the Planner makes the semantic selection from the shortlist.
 *
 * A question asked from a view keeps the viewed composition's sources past the cap
 * (phase-9 decision 12): "add GitHub to this", "compare these" name nothing of
 * what is on screen, and the Planner plans the child from those sources.
 */
export interface RouterOptions {
  shortlistCap: number;
  /**
   * The corpus vectors of the app's accounts' own cards (task-20.8 decision 3); none, and an app is
   * ranked by its public card alone.
   */
  accountVectors?: (appId: string) => readonly number[][];
}

export class Router {
  #registry: Registry;
  #embedder: Embedder;
  #options: RouterOptions;

  constructor(registry: Registry, embedder: Embedder, options: RouterOptions) {
    this.#registry = registry;
    this.#embedder = embedder;
    this.#options = options;
  }

  /**
   * The ranked shortlist for `text`, with every routable agent in `keep` past the cap. An app is
   * ranked by its best-matching card: the public one, or any of its accounts' own (task-20.8
   * decision 3); its entry carries the public card.
   */
  async shortlist(text: string, keep: readonly string[] = []): Promise<ShortlistEntry[]> {
    const routable = this.#registry.routable();
    if (routable.length === 0) return [];
    const [query] = await this.#embedder.embed([text]);
    const vectors = routable.flatMap(app => [
      app,
      ...(this.#options.accountVectors?.(app.record.id) ?? []).map(vector => ({...app, vector})),
    ]);
    const best = new Map<string, ShortlistEntry>();
    for (const {record, card, score} of rank(query, vectors)) {
      if (!best.has(record.id)) best.set(record.id, {record, card, score});
    }
    return [...best.values()].filter(
      (entry, i) => i < this.#options.shortlistCap || keep.includes(entry.record.id),
    );
  }
}
