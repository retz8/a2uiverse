import type {AgentCard} from '@a2a-js/sdk';
import {cosine} from '../embedder/similarity.js';
import type {Embedder} from '../embedder/types.js';
import type {Registry} from '../registry/registry.js';
import type {AppRecord} from '../registry/types.js';

export interface ShortlistEntry {
  record: AppRecord;
  card: AgentCard;
  score: number;
}

/**
 * Retrieval over the Registry's corpus (SPEC decision 10): embed the query,
 * rank routable agents by cosine, cap the list. No similarity threshold —
 * ranking only; the Planner makes the semantic selection from the shortlist.
 */
export class Router {
  #registry: Registry;
  #embedder: Embedder;
  #shortlistCap: number;

  constructor(registry: Registry, embedder: Embedder, options: {shortlistCap: number}) {
    this.#registry = registry;
    this.#embedder = embedder;
    this.#shortlistCap = options.shortlistCap;
  }

  async shortlist(text: string): Promise<ShortlistEntry[]> {
    const routable = this.#registry.routable();
    if (routable.length === 0) return [];
    const [query] = await this.#embedder.embed([text]);
    return routable
      .map(({record, card, vector}) => ({record, card, score: cosine(query, vector)}))
      .sort((a, b) => b.score - a.score)
      .slice(0, this.#shortlistCap);
  }
}
