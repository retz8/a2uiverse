import type {AgentCard} from '@a2a-js/sdk';
import {CATALOG_ID as SHELL_CATALOG_ID} from '@a2uiverse/shell-catalog/id';
import type {Embedder} from '../embedder/types.js';
import {corpusDoc} from './corpus.js';
import {SHELL_SOURCE_ID, type AppRecord} from './types.js';

/** How a Registry fetches an agent's card; injected so tests need no network. */
export type ResolveCard = (agentUrl: string) => Promise<AgentCard>;

/** An agent the Router can rank: record + fetched card + corpus vector. */
export interface RoutableApp {
  record: AppRecord;
  card: AgentCard;
  vector: number[];
}

/** The platform's display name, as its record and its attribution carry it. */
export const PLATFORM_DISPLAY_NAME = 'A2UIVerse';

/**
 * Installed apps (SPEC §10) plus, since Phase 2, the agent-authored mirror:
 * AgentCards fetched at boot and their corpus vectors (SPEC decisions 10/11).
 * The record is orchestrator-authored install state; the card is refreshable
 * and nullable — an unreachable agent has a null card and is unroutable that
 * session.
 *
 * Since Phase 6 the Registry also holds the platform's own card, handed to it at construction
 * (phase-6 decision 1, task-6.4 decision 9): indexed under the reserved `shell` id with the same
 * blended document and vector a vendor gets, so the Router ranks the platform like any app. Its
 * record is one shape with the apps' — the shell catalog, the orchestrator's own URL — but the
 * platform is not an installed app: `list()` leaves it out, and nothing dispatches to it.
 */
export class Registry {
  readonly #byId = new Map<string, AppRecord>();
  readonly #cards = new Map<string, AgentCard | null>();
  readonly #vectors = new Map<string, number[]>();
  readonly #platform: {record: AppRecord; card: AgentCard} | undefined;

  constructor(entries: readonly AppRecord[], options: {platformCard?: AgentCard} = {}) {
    for (const entry of entries) {
      if (entry.id === SHELL_SOURCE_ID) {
        throw new Error(`App id '${SHELL_SOURCE_ID}' is reserved for the shell`);
      }
      this.#byId.set(entry.id, entry);
    }
    const {platformCard} = options;
    this.#platform = platformCard
      ? {
          record: {
            id: SHELL_SOURCE_ID,
            displayName: PLATFORM_DISPLAY_NAME,
            agentUrl: platformCard.url,
            authScheme: 'none',
            catalogId: SHELL_CATALOG_ID,
            catalogPackage: '@a2uiverse/shell-catalog',
          },
          card: platformCard,
        }
      : undefined;
  }

  get(appId: string): AppRecord {
    if (appId === SHELL_SOURCE_ID && this.#platform) return this.#platform.record;
    const record = this.#byId.get(appId);
    if (!record) throw new Error(`Unknown app: ${appId}`);
    return record;
  }

  /** The installed apps — the platform is not one. */
  list(): readonly AppRecord[] {
    return [...this.#byId.values()];
  }

  resolveByCatalogId(catalogId: string): AppRecord | undefined {
    for (const record of this.#byId.values()) {
      if (record.catalogId === catalogId) return record;
    }
    return undefined;
  }

  /**
   * Fetch every agent's card and embed its corpus document — one call at
   * boot. A fetch failure leaves a null card and no vector (unroutable this
   * session); it never throws. The platform's card is in hand already: no
   * fetch, the same embedding.
   */
  async refreshCards({
    resolveCard,
    embedder,
  }: {
    resolveCard: ResolveCard;
    embedder: Embedder;
  }): Promise<void> {
    const records = this.list();
    const cards = await Promise.all(
      records.map(record => resolveCard(record.agentUrl).catch(() => null)),
    );
    this.#cards.clear();
    this.#vectors.clear();
    const carded = records.flatMap((record, i) => {
      this.#cards.set(record.id, cards[i]);
      return cards[i] ? [{record, card: cards[i]}] : [];
    });
    if (this.#platform) {
      this.#cards.set(SHELL_SOURCE_ID, this.#platform.card);
      carded.push(this.#platform);
    }
    if (carded.length === 0) return;
    const vectors = await embedder.embed(carded.map(({card}) => corpusDoc(card)));
    carded.forEach(({record}, i) => this.#vectors.set(record.id, vectors[i]));
  }

  /** The fetched card: null when unreachable at boot, undefined before refresh/unknown. */
  card(appId: string): AgentCard | null | undefined {
    return this.#cards.get(appId);
  }

  /** Apps the Router may rank — those with a card and a corpus vector — and the platform among them. */
  routable(): RoutableApp[] {
    const apps: RoutableApp[] = [];
    const records = this.#platform ? [...this.#byId.values(), this.#platform.record] : this.list();
    for (const record of records) {
      const card = this.#cards.get(record.id);
      const vector = this.#vectors.get(record.id);
      if (card && vector) apps.push({record, card, vector});
    }
    return apps;
  }
}
