/**
 * Ahead of the Store (SPEC §9.3, task-13.2 decision 13): the live card is the only copy of the
 * card that says what the agent does now; the index's and the registry's are snapshots. The
 * orchestrator runs this over the card it fetched at boot and reports; the marketplace runs it on
 * its own fetch before setting its flag, and at its boot over every entry.
 */
import {PUBLIC_CATALOG_IDS, readSupportedCatalogIds, type CardWithExtensions} from './catalog.js';
import type {Validation} from './validate.js';

/** What the live card declares and the Store lacks. */
export interface Drift {
  /** Catalog ids on the live card the entry has no artifact for, public ones aside. */
  catalogIds: string[];
  /** The live card's version, when the index does not know it. */
  version?: string;
}

/** The part of an index entry drift reads. */
export interface EntryForDrift {
  catalogs: Readonly<Record<string, string>>;
  versions: readonly string[];
}

/**
 * Whether the live card is ahead of the entry: a catalog id the entry has no artifact for, or a
 * version not among the published ones — a live agent behind the index is not ahead of it. Exact
 * over the entry alone, since coverage at publish fills the entry's catalogs for every id the
 * published card declares. A malformed declaration is a finding, not drift; nothing when covered.
 */
export function aheadOfStore(
  entry: EntryForDrift,
  liveCard: CardWithExtensions & {version: string},
  publicIds: readonly string[] = PUBLIC_CATALOG_IDS,
): Validation<Drift | undefined> {
  const read = readSupportedCatalogIds(liveCard);
  if (!read.ok) return read;
  const catalogIds = read.value.filter(id => !(id in entry.catalogs) && !publicIds.includes(id));
  const version = entry.versions.includes(liveCard.version) ? undefined : liveCard.version;
  if (catalogIds.length === 0 && version === undefined) return {ok: true, value: undefined};
  return {ok: true, value: {catalogIds, ...(version !== undefined ? {version} : {})}};
}
