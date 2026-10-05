import type {AgentCard} from '@a2a-js/sdk';
import {parseSourceId, sourceId, sourceName} from '@a2uiverse/sdk';
import type {Registry} from '../registry/registry.js';

/** One account of an app as the vault holds it: its ordinal and its label from the sign-in. */
export interface Account {
  n: number;
  label: string;
}

/**
 * The accounts held per app (task-12.4 decision 3): the seam the AuthVault fills (task 12.5).
 * Until it lands no account is held.
 */
export interface AccountStore {
  /** The app's accounts, in ordinal order. */
  accountsOf(appId: string): readonly Account[];
  /** The ordinal the app's next sign-in will take: never one held or held before. */
  nextAccount(appId: string): number;
}

/** No account held: every app's next sign-in is its first. */
export const NO_ACCOUNTS: AccountStore = {
  accountsOf: () => [],
  nextAccount: () => 1,
};

/** One source of an installed app, with its account's label when it has one. */
export interface AppSource {
  source: string;
  label?: string;
}

/**
 * Which sources each app has, and what a source is called (task-12.4 decisions 3, 4, 5): the one
 * place the orchestrator turns an app into its sources and a source back into its app.
 */
export class Sources {
  readonly #registry: Registry;
  readonly #accounts: AccountStore;

  constructor(registry: Registry, accounts: AccountStore = NO_ACCOUNTS) {
    this.#registry = registry;
    this.#accounts = accounts;
  }

  /**
   * An app's sources: one per account the vault holds; the bare app id when its card asks no
   * sign-in; otherwise the one named for the account its sign-in will create (task-12.2
   * decision 4).
   */
  of(appId: string): AppSource[] {
    const held = this.#accounts.accountsOf(appId);
    if (held.length > 0) {
      return held.map(({n, label}) => ({source: sourceId(appId, n), label}));
    }
    const card = this.#registry.card(appId) ?? this.#registry.storedCard(appId);
    if (!asksSignIn(card)) return [{source: appId}];
    return [{source: sourceId(appId, this.#accounts.nextAccount(appId))}];
  }

  /** The app a source belongs to. */
  appOf(source: string): string {
    return parseSourceId(source)?.appId ?? source;
  }

  /** The account's label on its fragments: only when its app has more than one account (phase-12 decision 22). */
  account(source: string): string | undefined {
    const parsed = parseSourceId(source);
    if (parsed?.account === undefined) return undefined;
    const held = this.#accounts.accountsOf(parsed.appId);
    if (held.length < 2) return undefined;
    return held.find(({n}) => n === parsed.account)?.label;
  }

  /** The app's display name: what the attribution marker names. */
  displayName(source: string): string {
    return this.#registry.displayName(this.appOf(source));
  }

  /** The source's one name in words (task-12.4 decision 5). */
  name(source: string): string {
    return sourceName(this.displayName(source), this.account(source));
  }
}

/**
 * Whether the card asks for sign-in: a card-level `security` none of whose alternatives is empty.
 * Absent or empty, or with an empty alternative, nothing is needed.
 */
export function asksSignIn(card: AgentCard | null | undefined): boolean {
  const security = card?.security;
  if (!security || security.length === 0) return false;
  return security.every(requirement => Object.keys(requirement).length > 0);
}
