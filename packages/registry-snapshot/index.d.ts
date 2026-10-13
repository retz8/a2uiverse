import type {IndexEntry, PreviewDocument, PublishedCard, UpdateState} from '@a2uiverse/sdk';

/** The snapshot's root: what the orchestrator serves under `/registry`. */
export declare const REGISTRY_SNAPSHOT_DIR: string;

/** One app as the Store recording holds it: its entry and its sample (task-14.10 decision 15). */
export interface RecordedStoreApp {
  entry: IndexEntry;
  preview: PreviewDocument;
}

/** One row of the snapshot's `catalogs.json`. */
export type SnapshotCatalogRow =
  {catalogId: string; provided: 'client'} | {catalogId: string; artifact: string; entry: string};

/** A listing as the orchestrator relays it: the entry, whether it is installed, its state. */
export interface WorldListing {
  entry: IndexEntry;
  installed: boolean;
  update?: UpdateState;
}

/** An installed record as `/registry/apps.json` serves it. */
export interface WorldInstalledApp {
  id: string;
  cardUrl: string;
  card: PublishedCard;
  catalogs: Record<string, string>;
  entitlement: string[];
  installedAt: string;
  source: 'marketplace' | 'local';
  reachable: boolean;
}

/** An app's accounts as `/auth/accounts.json` serves them. */
export interface WorldLibraryApp {
  appId: string;
  signIn: 'none' | 'supported' | 'unsupported';
  accounts: {
    source: string;
    label: string;
    kind: 'oauth' | 'key';
    permissions: string[];
    lapsed: boolean;
  }[];
}

/** The fixed world: what each of the trusted page's reads answers (task-14.10 decision 14). */
export interface StoreWorld {
  /** `/marketplace/index.json`, and each app's `entry.json`. */
  index: WorldListing[];
  /** Each app's `preview.json`, by app id. */
  previews: Record<string, PreviewDocument>;
  /** `/registry/apps.json`. */
  installed: WorldInstalledApp[];
  /** `/registry/updates.json`. */
  updates: UpdateState[];
  /** `/auth/accounts.json`. */
  accounts: WorldLibraryApp[];
  /** `/marketplace/publisher.json`. */
  publisher: {state: 'signed-in'; publisher: string; store: 'accepted'};
}

/** The world from the recorded Store captures and the snapshot's table; throws when they disagree. */
export declare function storeWorld(input: {
  recordings: readonly RecordedStoreApp[];
  table: readonly SnapshotCatalogRow[];
}): StoreWorld;

/** The Store's search over the world: the listings naming every word, by name. */
export declare function searchWorld(world: StoreWorld, words: string): WorldListing[];
