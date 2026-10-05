/**
 * clientContextId → (source → vendorContextId). Which vendor conversations a composition — an A2A
 * context, task 9.3 — is attached to: a vendor's conversation is per context and per source, two
 * accounts of one app two conversations (task-12.4 decision 7), dropped with the context.
 * In-memory; the interface is what the pool sees.
 */
export interface VendorContextMap {
  get(clientContextId: string, source: string): string | undefined;
  set(clientContextId: string, source: string, vendorContextId: string): void;
  /** The composition closed (task-9.3 decision 5): its vendor conversations let go. */
  drop(clientContextId: string): void;
}

export class InMemoryVendorContextMap implements VendorContextMap {
  readonly #map = new Map<string, Map<string, string>>();

  get(clientContextId: string, source: string): string | undefined {
    return this.#map.get(clientContextId)?.get(source);
  }

  set(clientContextId: string, source: string, vendorContextId: string): void {
    let bySource = this.#map.get(clientContextId);
    if (!bySource) {
      bySource = new Map();
      this.#map.set(clientContextId, bySource);
    }
    bySource.set(source, vendorContextId);
  }

  drop(clientContextId: string): void {
    this.#map.delete(clientContextId);
  }
}
