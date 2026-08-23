/**
 * clientContextId → (appId → vendorContextId). Which vendor conversations a
 * client conversation is attached to. In-memory for M0; moves into the
 * Composition object later, hence the interface.
 */
export interface VendorContextMap {
  get(clientContextId: string, appId: string): string | undefined;
  set(clientContextId: string, appId: string, vendorContextId: string): void;
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
}
