import type {ServedCard} from '@a2uiverse/card';

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
 * as its agent served it (task-20.3 decision 7), the URL it came from, the catalogs handed — catalog id to artifact id — the
 * entitlement they make, fixed at install, and where the install came by (task-13.5 decision 3).
 */
export interface InstalledRecord {
  id: string;
  cardUrl: string;
  card: ServedCard;
  catalogs: Record<string, string>;
  entitlement: string[];
  installedAt: string;
  source: InstallSource;
}

/**
 * An app as this run reads it: its display name and dispatch address from the card fetched at
 * startup, the stored card when the agent was down (task-11.4 decision 8); the catalogs handed at install;
 * the entitlement the hub advertises and enforces (decision 12), derived for the run (task-21.13
 * decision 13).
 */
export interface AppRecord {
  /** Stable app id: a source with no account, and the app part of every source of it (task-12.4). */
  id: string;
  displayName: string;
  /**
   * Where dispatch goes: the URL of the interface the platform takes from the card (task-20.3
   * decision 11); empty when the card lists none the platform speaks.
   */
  agentUrl: string;
  /** The catalog ids handed at install; none when the app paints in the basic catalog only. */
  catalogs: string[];
  /**
   * The public catalog and the handed catalogs whose artifact is packed for the host-module
   * interface the platform supplies: what the hub advertises and checks a paint against.
   */
  entitlement: string[];
}

/**
 * A row of the catalog table (task-11.4 decisions 7, 10): a catalog the client provides — the basic
 * catalog and the shell catalog, built from code, never persisted — or an installed artifact, by
 * its id, with its entry's path inside it.
 */
export type CatalogRow =
  {catalogId: string; provided: 'client'} | {catalogId: string; artifact: string; entry: string};
