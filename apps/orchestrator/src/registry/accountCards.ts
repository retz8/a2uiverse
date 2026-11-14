/**
 * Each signed-in account's extended card (task 20.8): the card an app's agent serves that account
 * through A2A's Get Extended Agent Card, taken as the account's live card — the interfaces a
 * dispatch to the account walks, and what the Router and the Planner know it can do (decision 1).
 * Its sign-in, its catalog ids and its name on screen are never read (decision 5): what the install
 * fixed stays on the card as installed.
 *
 * Fetched for every account the vault holds, when the app's public live card has the flag, each time
 * the run takes that public card — behind that fetch, within what remains of its time limit — and
 * when a sign-in for the account completes, in 5 s (decisions 2, 6, 8). Read by the card's one
 * reading from the answer as served, a signed one checked against key sets on the app's card URL's
 * own origin (decisions 10, 11). Held in memory alone until the next fetch replaces it (decision 12):
 * an answer that the agent has none drops it, and every other answer that brings no card keeps what
 * was held (decision 9). The journal says each fetch made, for which account, over which interface
 * and how it ended, never the card.
 */
import type {AgentCard} from '@a2a-js/sdk';
import {
  a2aVersionOf,
  accountCardAdds,
  servesExtendedCard,
  type AccountCardAdds,
  type PassedSignature,
} from '@a2uiverse/card';
import {corpusDoc, type Embedder} from '@a2uiverse/embedder';
import {parseSourceId, sourceId} from '@a2uiverse/sdk';
import {
  takeExtendedCard,
  type ExtendedCardOptions,
  type ExtendedCardOutcome,
  type FetchedExtendedCard,
  type NotReached,
} from '@a2uiverse/smoke-transport';
import type {NotReachedEntry} from '../agentsPool/types.js';

/** How long the fetch at a sign-in's completion may take (task-20.8 decision 8). */
export const SIGN_IN_FETCH_TIMEOUT_MS = 5000;

/** Where an account's card was fetched: behind which fetch of the public card, or at a sign-in. */
export type AccountCardFetch = 'boot' | 'check' | 'refetch' | 'install' | 'signIn';

/** How a fetch of an account's card ended (task-20.8 decision 9). */
export type AccountCardOutcome = ExtendedCardOutcome;

/** One fetch of an account's card as the journal records it: never the card. */
export interface AccountCardJournalEntry {
  appId: string;
  source: string;
  fetch: AccountCardFetch;
  outcome: AccountCardOutcome;
  /** The binding and the A2A version of the interface that answered; none when none did. */
  binding?: string;
  a2aVersion?: string;
  /** Each interface the walk tried before it and did not reach. */
  notReached?: NotReachedEntry[];
  /** Why the fetch brought no card, in a finding's words. */
  reason?: string;
  /** The signature that passed, on a signed card taken. */
  signature?: PassedSignature;
}

/** The public live card a fetch walks, and the card URL a signed account's card is checked on. */
export interface PublicLiveCard {
  card: AgentCard;
  cardUrl: string;
}

export interface AccountCardsDeps {
  /** The app's accounts, as the vault holds them. */
  accountsOf(appId: string): readonly {n: number}[];
  /**
   * The header a request for the account carries, as for a dispatch: refreshed first when due;
   * none when the vault has none to send — an account whose refresh failed among them.
   */
  credentialFor(source: string): Promise<Readonly<Record<string, string>> | undefined>;
  /** The app's public live card this run holds, and its card URL; none when none was fetched. */
  liveCard(appId: string): PublicLiveCard | undefined;
  /** A2A's Get Extended Agent Card, over the walk of the card handed. */
  fetchExtendedCard(appId: string, options: ExtendedCardOptions): Promise<FetchedExtendedCard>;
  /** The Router's corpus vector of an account's card; none, and the Router ranks the public card alone. */
  embedder?: Embedder;
  journal?(entry: AccountCardJournalEntry): Promise<void>;
  /** The fetch a signed card's key sets are fetched through. */
  fetchImpl?: typeof fetch;
}

/** An account's card as the run holds it, with its corpus vector once embedded. */
interface Held {
  card: AgentCard;
  vector?: number[];
}

/** An account's card beside the account it is held for. */
export interface HeldAccountCard {
  source: string;
  card: AgentCard;
  vector?: number[];
}

export class AccountCards {
  readonly #deps: AccountCardsDeps;
  readonly #held = new Map<string, Held>();
  /** The latest fetch begun for each account: an older one ending after it changes nothing. */
  readonly #latest = new Map<string, number>();
  #fetches = 0;

  constructor(deps: AccountCardsDeps) {
    this.#deps = deps;
  }

  /** The account's card the run holds; none, and the account is served on the public card. */
  card(source: string): AgentCard | undefined {
    return this.#held.get(source)?.card;
  }

  /** Every account's card held for the app, in account order. */
  heldFor(appId: string): HeldAccountCard[] {
    return this.#deps.accountsOf(appId).flatMap(({n}) => {
      const source = sourceId(appId, n);
      const held = this.#held.get(source);
      return held ? [{source, ...held}] : [];
    });
  }

  /**
   * What the account's card says that the public card does not (task-20.8 decision 3), against
   * the public card a reader is shown; none when the run holds no card for the account.
   */
  adds(source: string, publicCard: AgentCard | undefined): AccountCardAdds | undefined {
    const held = this.#held.get(source);
    return held && publicCard ? accountCardAdds(publicCard, held.card) : undefined;
  }

  /**
   * Behind a fetch of the app's public card the run took (task-20.8 decisions 2, 6, 8): every
   * account's card fetched side by side, each within `timeoutMs`, what remains of that fetch's
   * time limit. A public card without the flag drops every account's card held.
   */
  async afterLiveCard(
    appId: string,
    live: PublicLiveCard,
    {fetch, timeoutMs}: {fetch: AccountCardFetch; timeoutMs: number},
  ): Promise<void> {
    if (!servesExtendedCard(live.card)) {
      this.dropApp(appId);
      return;
    }
    await Promise.all(
      this.#deps
        .accountsOf(appId)
        .map(({n}) => this.#fetch(sourceId(appId, n), live, fetch, timeoutMs)),
    );
  }

  /**
   * A sign-in for the account completed (task-20.8 decision 6): its card fetched in 5 s, when the
   * run holds the app's public live card and it has the flag.
   */
  async signedIn(source: string): Promise<void> {
    const appId = parseSourceId(source)?.appId;
    const live = appId === undefined ? undefined : this.#deps.liveCard(appId);
    if (!live || !servesExtendedCard(live.card)) return;
    await this.#fetch(source, live, 'signIn', SIGN_IN_FETCH_TIMEOUT_MS);
  }

  /** The account was signed out: its card goes. */
  drop(source: string): void {
    this.#held.delete(source);
    this.#latest.delete(source);
  }

  /** The app was uninstalled, or stopped serving extended cards: every account's card goes. */
  dropApp(appId: string): void {
    for (const source of [...this.#held.keys()]) {
      if (parseSourceId(source)?.appId === appId) this.drop(source);
    }
  }

  async #fetch(
    source: string,
    live: PublicLiveCard,
    fetch: AccountCardFetch,
    timeoutMs: number,
  ): Promise<void> {
    const appId = parseSourceId(source)!.appId;
    const fetchNumber = ++this.#fetches;
    this.#latest.set(source, fetchNumber);
    const signal = AbortSignal.timeout(Math.max(timeoutMs, 0));
    const credential = await this.#deps.credentialFor(source);
    // An account the vault has nothing to send for — a refresh that failed — has no fetch.
    if (!credential) return;
    const ended = await this.#ended(appId, live, credential, signal, timeoutMs);
    if (this.#latest.get(source) !== fetchNumber || !this.#holdsAccount(source)) return;
    if (ended.outcome === 'none') this.#held.delete(source);
    if (ended.card) this.#held.set(source, {card: ended.card});
    await this.#deps.journal?.({appId, source, fetch, ...ended.entry, outcome: ended.outcome});
    if (ended.card) await this.#embed(source, ended.card);
  }

  /** One fetch, read and checked: how it ended, and the card it took. */
  async #ended(
    appId: string,
    live: PublicLiveCard,
    credential: Readonly<Record<string, string>>,
    signal: AbortSignal,
    timeoutMs: number,
  ): Promise<{
    outcome: AccountCardOutcome;
    card?: AgentCard;
    entry: Omit<AccountCardJournalEntry, 'appId' | 'source' | 'fetch' | 'outcome'>;
  }> {
    if (signal.aborted) return {outcome: 'unanswered', entry: {}};
    const fetched = await this.#deps.fetchExtendedCard(appId, {
      card: live.card,
      credential,
      signal,
    });
    const {outcome, card, reason, signature} = await takeExtendedCard(fetched.answer, {
      cardUrl: live.cardUrl,
      signal,
      timeoutMs,
      ...(this.#deps.fetchImpl ? {fetchImpl: this.#deps.fetchImpl} : {}),
    });
    return {
      outcome,
      ...(card ? {card} : {}),
      entry: {
        ...(fetched.taken
          ? {binding: fetched.taken.protocolBinding, a2aVersion: a2aVersionOf(fetched.taken)}
          : {}),
        ...(fetched.notReached.length > 0 ? {notReached: journaled(fetched.notReached)} : {}),
        ...(reason !== undefined ? {reason} : {}),
        ...(signature ? {signature} : {}),
      },
    };
  }

  #holdsAccount(source: string): boolean {
    const parsed = parseSourceId(source);
    return (
      parsed?.account !== undefined &&
      this.#deps.accountsOf(parsed.appId).some(({n}) => n === parsed.account)
    );
  }

  /** The account card's corpus vector, for the Router; one that cannot be had leaves none. */
  async #embed(source: string, card: AgentCard): Promise<void> {
    const embedder = this.#deps.embedder;
    if (!embedder) return;
    try {
      const [vector] = await embedder.embed([corpusDoc(card)]);
      const held = this.#held.get(source);
      if (held?.card === card && vector) held.vector = vector;
    } catch (err) {
      console.error(`account cards: embedding ${source}'s card failed:`, (err as Error).message);
    }
  }
}

function journaled(notReached: readonly NotReached[]): NotReachedEntry[] {
  return notReached.map(entry => ({
    binding: entry.interface.protocolBinding,
    a2aVersion: a2aVersionOf(entry.interface),
    why: entry.why,
  }));
}
