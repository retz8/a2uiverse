/**
 * clientContextId → (appId → vendorContextId). Which vendor conversations a composition — an A2A
 * context, task 9.3 — is attached to: a vendor's conversation is per context, dropped with it.
 * In-memory; the interface is what the pool sees.
 */
export interface VendorContextMap {
  get(clientContextId: string, appId: string): string | undefined;
  set(clientContextId: string, appId: string, vendorContextId: string): void;
  /** The composition closed (task-9.3 decision 5): its vendor conversations let go. */
  drop(clientContextId: string): void;
}

export class InMemoryVendorContextMap implements VendorContextMap {
  readonly #map = new Map<string, Map<string, string>>();

  get(clientContextId: string, appId: string): string | undefined {
    return this.#map.get(clientContextId)?.get(appId);
  }

  set(clientContextId: string, appId: string, vendorContextId: string): void {
    let byApp = this.#map.get(clientContextId);
    if (!byApp) {
      byApp = new Map();
      this.#map.set(clientContextId, byApp);
    }
    byApp.set(appId, vendorContextId);
  }

  drop(clientContextId: string): void {
    this.#map.delete(clientContextId);
  }
}
