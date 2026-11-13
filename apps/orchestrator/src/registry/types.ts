import type {InstalledCard} from './installedCard.js';
import type {CatalogIdsByVersion} from '@a2uiverse/sdk';

/**
 * Reserved source id for the orchestrator's own shell surface and stamps.
 * No installed app may claim it — the sdk's app-id check reserves it.
 */
export const SHELL_SOURCE_ID = 'shell';

/**
 * Where an app's last install came by (task-13.5 decision 3): resolved through the marketplace by
 * its id, or handed from a local pack. Only an app from the marketplace is moved by its index.
 */
export type InstallSource = 'marketplace' | 'local';

/**
 * An installed app as the registry persists it (task-11.4 decision 1): the card fetched at install,
 * verbatim, the URL it came from, the catalogs handed — catalog id to artifact id — the
 * entitlement they make, fixed at install, and where the install came by (task-13.5 decision 3).
 */
export interface InstalledRecord {
  id: string;
  cardUrl: string;
  card: InstalledCard;
  catalogs: Record<string, string>;
  entitlement: string[];
  installedAt: string;
  source: InstallSource;
}

/**
 * An app as this run reads it: its display name and dispatch URL from the card fetched at startup,
 * the stored card when the agent was down (task-11.4 decision 8); the catalogs handed at install;
 * the entitlement the hub advertises and enforces (decision 12), flat and per A2UI version.
 */
export interface AppRecord {
  /** Stable app id: a source with no account, and the app part of every source of it (task-12.4). */
  id: string;
  displayName: string;
  /** The card's `url`: where dispatch goes. */
  agentUrl: string;
  /** The catalog ids handed at install; none when the app paints in the basic catalog only. */
  catalogs: string[];
  /** The union over the versions: what every reading but the hub's advertising and paint check uses. */
  entitlement: string[];
  /**
   * The entitlement per A2UI version, from the card as installed (task-19.2 decision 1): the public
   * catalogs and the ids the card declares for that version; what the hub advertises under each
   * version's key and checks a paint stamped with it against. The flat entitlement under both keys
   * when the stored card does not read. Derived for the run, never persisted.
   */
  entitlementByVersion: CatalogIdsByVersion;
}

/**
 * A row of the catalog table (task-11.4 decisions 7, 10): a catalog the client provides — the basic
 * catalog and the shell catalog, built from code, never persisted — or an installed artifact, by
 * its id, with its entry's path inside it.
 */
export type CatalogRow =
  {catalogId: string; provided: 'client'} | {catalogId: string; artifact: string; entry: string};
