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
 *
 * A question asked from a view keeps the viewed canvas's sources past the cap
 * (phase-9 decision 12): "add GitHub to this", "compare these" name nothing of
 * what is on screen, and the Planner plans the child from those sources.
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

  /** The ranked shortlist for `text`, with every routable agent in `keep` past the cap. */
  async shortlist(text: string, keep: readonly string[] = []): Promise<ShortlistEntry[]> {
    const routable = this.#registry.routable();
    if (routable.length === 0) return [];
    const [query] = await this.#embedder.embed([text]);
    const ranked = routable
      .map(({record, card, vector}) => ({record, card, score: cosine(query, vector)}))
      .sort((a, b) => b.score - a.score);
    return ranked.filter((entry, i) => i < this.#shortlistCap || keep.includes(entry.record.id));
  }
}
