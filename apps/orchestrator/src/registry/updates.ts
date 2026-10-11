/**
 * The update check (SPEC §10; phase-13 decisions 10 and 16; task-13.5 decisions 7 to 10): for each
 * installed app, one of the sdk's eight states, decided in the sdk's order over three things — the
 * installed record, the marketplace's entry and the live card this run holds. One operation does
 * it all: the entries and the live cards fetched one per app, the states computed, a newer build of an app installed
 * from the marketplace installed over at once unless its move would carry an app installed from a
 * local pack (task-13.8 decision 12), an app ahead of the Store reported, and the states answered as
 * they stand after. Behind `GET /registry/updates.json` and the boot.
 */
import type {AgentCard} from '@a2a-js/sdk';
import {
  aheadOfStore,
  PUBLIC_CATALOG_IDS,
  readSupportedCatalogIds,
  retiredLines,
  type BuildMove,
  type CardWithExtensions,
  type NewScopes,
  type UpdateState,
} from '@a2uiverse/sdk';
import type {EntryLookup, MarketplaceClient} from './marketplace.js';
import type {Registry} from './registry.js';
import type {InstalledRecord} from './types.js';

export interface UpdateCheckDeps {
  registry: Registry;
  marketplace: MarketplaceClient;
}

/** What one run of the check did, beyond the states it answers. */
export interface CheckOutcome {
  states: UpdateState[];
  /** Whether the marketplace answered; unreached, every state is unknown and `reason` says why. */
  marketplace: 'reached' | 'unreached';
  reason?: string;
  /** The automatic updates performed, each with its install summary. */
  updated: {appId: string; summary: string}[];
  /** The automatic updates refused, each with the install's findings; tried again next check. */
  failed: {appId: string; findings: string[]}[];
  /**
   * The automatic updates left undone because the move of a catalog's row would carry an app
   * installed from a local pack (task-13.8 decision 12), each with those apps: the app stays at the
   * newer build until the person installs it by id, which moves them too and names them.
   */
  kept: {appId: string; carrying: string[]}[];
  /** The apps reported to the marketplace as ahead of the Store. */
  reported: string[];
  /**
   * The apps whose entry the Store flags as ahead while their live card shows no drift, reported
   * so the marketplace refetches the card and clears a flag it no longer bears out (task-13.8
   * decision 30).
   */
  rechecked: string[];
}

export class UpdateCheck {
  readonly #deps: UpdateCheckDeps;
  #inFlight: Promise<CheckOutcome> | undefined;
  /** Each app's state from the last run, the boot's or the App Library's: what a Store listing shows. */
  #last = new Map<string, UpdateState>();

  constructor(deps: UpdateCheckDeps) {
    this.#deps = deps;
  }

  /** Runs the check, or joins the one in flight (task-13.5 decision 8). */
  check(): Promise<CheckOutcome> {
    if (!this.#inFlight) {
      this.#inFlight = this.#check()
        .then(outcome => {
          this.#last = new Map(outcome.states.map(state => [state.appId, state]));
          return outcome;
        })
        .finally(() => {
          this.#inFlight = undefined;
        });
    }
    return this.#inFlight;
  }

  /** The app's state as last computed, no check run (task-14.4 decision 1); none before a run has seen it. */
  last(appId: string): UpdateState | undefined {
    return this.#last.get(appId);
  }

  async #check(): Promise<CheckOutcome> {
    const {registry, marketplace} = this.#deps;
    const records = registry.installed();
    // Each app's live card is fetched beside its entry (task-13.8 decision 29), so the states are
    // judged on the card the agent serves now, not the one fetched at boot.
    const [lookups] = await Promise.all([
      Promise.all(records.map(record => marketplace.entry(record.id))),
      registry.refetchLiveCards(),
    ]);
    const unreached = lookups.find(lookup => lookup.kind === 'unreached');
    if (unreached) {
      return {
        states: records.map(record => ({
          appId: record.id,
          installedVersion: versionOf(record.card),
          state: 'unknown' as const,
        })),
        marketplace: 'unreached',
        reason: unreached.reason,
        updated: [],
        failed: [],
        kept: [],
        reported: [],
        rechecked: [],
      };
    }
    const outcome: CheckOutcome = {
      states: [],
      marketplace: 'reached',
      updated: [],
      failed: [],
      kept: [],
      reported: [],
      rechecked: [],
    };
    const report = (appId: string) => {
      void marketplace.report(appId).catch((err: unknown) => {
        console.error(`registry: the report of ${appId} failed:`, (err as Error).message);
      });
    };
    for (const [i, record] of records.entries()) {
      const lookup = lookups[i];
      let state = updateStateOf(record, lookup, registry.card(record.id));
      if (state.state === 'ahead-of-store') {
        outcome.reported.push(record.id);
        report(record.id);
      } else if (
        lookup.kind === 'entry' &&
        lookup.entry.aheadOfStore !== undefined &&
        registry.card(record.id)
      ) {
        // The Store still flags a drift this run's live card no longer shows: the report is the
        // marketplace's nudge to look again, and it clears the flag when it sees none either.
        outcome.rechecked.push(record.id);
        report(record.id);
      }
      // A newer build, the card unchanged, installs itself for an app from the marketplace alone
      // (phase-13 decision 16); a failure leaves the build and the state (task-13.5 decision 9).
      // A move that would carry an app installed from a local pack is the person's to make.
      const carrying =
        state.state === 'newer-build' && lookup.kind === 'entry'
          ? localFollowers(record, lookup.entry.catalogs, registry.installed())
          : [];
      if (state.state === 'newer-build' && record.source === 'marketplace' && carrying.length > 0) {
        outcome.kept.push({appId: record.id, carrying});
      } else if (state.state === 'newer-build' && record.source === 'marketplace') {
        const result = await registry.installFromMarketplace(record.id, {automatic: true});
        if (result.ok) {
          outcome.updated.push({appId: record.id, summary: result.summary});
          const moved = registry.installed().find(r => r.id === record.id);
          if (moved) state = updateStateOf(moved, lookup, registry.card(record.id));
        } else {
          outcome.failed.push({appId: record.id, findings: result.findings});
        }
      }
      outcome.states.push(state);
    }
    outcome.states.sort((a, b) => (a.appId < b.appId ? -1 : a.appId > b.appId ? 1 : 0));
    return outcome;
  }
}

/**
 * The apps installed from a local pack that a move of `record` to the published `catalogs` would
 * carry: each other app holding a catalog whose build the move changes, every app on one catalog
 * id sharing its row (task-13.5 decision 5).
 */
function localFollowers(
  record: InstalledRecord,
  catalogs: Record<string, string>,
  installed: readonly InstalledRecord[],
): string[] {
  const moving = Object.keys(record.catalogs).filter(
    id => catalogs[id] !== undefined && catalogs[id] !== record.catalogs[id],
  );
  return installed
    .filter(
      other =>
        other.id !== record.id &&
        other.source !== 'marketplace' &&
        moving.some(id => other.catalogs[id] !== undefined),
    )
    .map(other => other.id)
    .sort();
}

/**
 * One app's state (task-13.2 decision 8), the first match in order: unknown, the marketplace not
 * reached or its entry malformed; not published; ahead of the Store, from the live card through
 * the sdk's drift function, skipped when this run has no live card; update required, an installed
 * line retired, through the sdk's retired-lines function with the installed card as the earlier
 * and the published as the later; a major update, an id added while every installed one stays; a
 * card update, the version moved with no id added or dropped, its new scopes from `security`; a
 * newer build; up to date.
 */
export function updateStateOf(
  record: InstalledRecord,
  lookup: EntryLookup,
  liveCard: AgentCard | null | undefined,
): UpdateState {
  const base = {appId: record.id, installedVersion: versionOf(record.card)};
  if (lookup.kind === 'unreached' || lookup.kind === 'malformed')
    return {...base, state: 'unknown'};
  if (lookup.kind === 'not-published') return {...base, state: 'not-published'};
  const {entry} = lookup;
  const publishedVersion = entry.card.version;
  if (liveCard) {
    const drift = aheadOfStore(entry, liveCard as CardWithExtensions & {version: string});
    if (drift.ok && drift.value) {
      return {
        ...base,
        state: 'ahead-of-store',
        publishedVersion,
        catalogIds: drift.value.catalogIds,
        ...(drift.value.version !== undefined ? {version: drift.value.version} : {}),
      };
    }
  }
  const installedIds = declaredIds(record.card, Object.keys(record.catalogs));
  const publishedIds = declaredIds(entry.card, Object.keys(entry.catalogs));
  const retired = retiredLines(installedIds, publishedIds);
  if (retired.length > 0) return {...base, state: 'update-required', publishedVersion, retired};
  const builds = buildMoves(record.catalogs, entry.catalogs);
  const newCatalogIds = publishedIds.filter(id => !installedIds.includes(id));
  if (newCatalogIds.length > 0) {
    return {...base, state: 'major-update', publishedVersion, newCatalogIds, builds};
  }
  if (publishedVersion !== base.installedVersion) {
    return {
      ...base,
      state: 'card-update',
      publishedVersion,
      newScopes: newScopesOf(record.card, entry.card),
      builds,
    };
  }
  if (builds.length > 0) return {...base, state: 'newer-build', publishedVersion, builds};
  return {...base, state: 'up-to-date', publishedVersion};
}

const versionOf = (card: AgentCard) => card.version ?? '?';

/** The part of a card the scopes are read from: the alternatives of its `security`, structurally. */
interface CardWithSecurity {
  security?: Record<string, string[]>[];
}

/** The catalog ids a card declares, the public ones aside; the record's own when it does not read. */
function declaredIds(card: CardWithExtensions, fallback: string[]): string[] {
  const read = readSupportedCatalogIds(card);
  return (read.ok ? read.value : fallback).filter(id => !PUBLIC_CATALOG_IDS.includes(id));
}

/** The catalogs both sides hold whose build differs: the installed artifact id and the published one. */
function buildMoves(
  installed: Readonly<Record<string, string>>,
  published: Readonly<Record<string, string>>,
): BuildMove[] {
  const moves: BuildMove[] = [];
  for (const [catalogId, artifact] of Object.entries(installed)) {
    const now = published[catalogId];
    if (now !== undefined && now !== artifact) {
      moves.push({catalogId, installed: artifact, published: now});
    }
  }
  return moves;
}

/**
 * What a card update newly asks (task-13.5 decision 10), read as the vault reads consent: from the
 * card's `security` alternatives. For each scheme the published card's alternatives name, the
 * scope keys the installed card's alternatives do not name for it — every scope for a scheme the
 * installed card never names, so a new sign-in requirement shows even with no scope.
 */
function newScopesOf(installed: CardWithSecurity, published: CardWithSecurity): NewScopes[] {
  const was = scopesByScheme(installed);
  const now = scopesByScheme(published);
  const fresh: NewScopes[] = [];
  for (const [scheme, scopes] of [...now].sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))) {
    const had = was.get(scheme);
    const added = [...scopes].filter(scope => !had?.has(scope));
    if (!had || added.length > 0) fresh.push({scheme, scopes: added});
  }
  return fresh;
}

/** Every scheme a card's alternatives name, with the union of the scopes they ask of it. */
function scopesByScheme(card: CardWithSecurity): Map<string, Set<string>> {
  const schemes = new Map<string, Set<string>>();
  for (const alternative of card.security ?? []) {
    for (const [scheme, scopes] of Object.entries(alternative)) {
      const held = schemes.get(scheme) ?? new Set<string>();
      for (const scope of scopes) held.add(scope);
      schemes.set(scheme, held);
    }
  }
  return schemes;
}
