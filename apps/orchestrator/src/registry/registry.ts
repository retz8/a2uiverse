import type {AppRecord} from './types.js';

/**
 * Installed apps (SPEC §10). The orchestrator's local state, read-only in
 * Phase 1; install writes it from M7.
 */
export class Registry {
  readonly #byId = new Map<string, AppRecord>();

  constructor(entries: readonly AppRecord[]) {
    for (const entry of entries) this.#byId.set(entry.id, entry);
  }

  get(appId: string): AppRecord {
    const record = this.#byId.get(appId);
    if (!record) throw new Error(`Unknown app: ${appId}`);
    return record;
  }

  list(): readonly AppRecord[] {
    return [...this.#byId.values()];
  }

  resolveByCatalogId(catalogId: string): AppRecord | undefined {
    for (const record of this.#byId.values()) {
      if (record.catalogId === catalogId) return record;
    }
    return undefined;
  }
}
