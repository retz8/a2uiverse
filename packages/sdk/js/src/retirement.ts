/**
 * The retirement rule (SPEC §9.1, task-13.2 decision 10), written once for the marketplace and
 * the registry. A publish whose card drops a catalog id retires that line for the app; the row
 * goes once no published app names the id. The registry has the mirror of each half: the update
 * check calls a line retired when an installed id is no longer on the published card, and an
 * artifact goes when no installed card names it.
 */

/**
 * The lines a card change retires: the ids the earlier card named and the later one does not,
 * each once, in the earlier card's order. The marketplace records them on the entry at publish;
 * the orchestrator reads "update required" from them, the installed card the earlier one and the
 * published card the later.
 */
export function retiredLines(earlier: readonly string[], later: readonly string[]): string[] {
  const kept = new Set(later);
  return [...new Set(earlier)].filter(id => !kept.has(id));
}

export interface UnnamedRows {
  /** Held catalog ids no record names. */
  catalogIds: string[];
  /** Held artifact ids no record names — a row moved to a new hash leaves its old artifact here. */
  artifactIds: string[];
}

/**
 * The held rows nothing names any more, given every record's catalogs — catalog id to artifact id.
 * The marketplace drops those rows after a publish or an unpublish; the registry lets those
 * artifacts go after an uninstall or a moved row.
 */
export function unnamedRows(
  held: Readonly<Record<string, string>>,
  records: readonly Readonly<Record<string, string>>[],
): UnnamedRows {
  const namedIds = new Set<string>();
  const namedArtifacts = new Set<string>();
  for (const record of records) {
    for (const [catalogId, artifact] of Object.entries(record)) {
      namedIds.add(catalogId);
      namedArtifacts.add(artifact);
    }
  }
  return {
    catalogIds: Object.keys(held).filter(id => !namedIds.has(id)),
    artifactIds: [...new Set(Object.values(held))].filter(id => !namedArtifacts.has(id)),
  };
}
