import type {AgentCard} from '@a2a-js/sdk';

/**
 * Reserved source id for the orchestrator's own shell surface and stamps.
 * No installed app may claim it — the sdk's app-id check reserves it.
 */
export const SHELL_SOURCE_ID = 'shell';

/**
 * An installed app as the registry persists it (task-11.4 decision 1): the card fetched at install,
 * verbatim, the URL it came from, the catalogs handed — catalog id to artifact id — and the
 * entitlement they make, fixed at install.
 */
export interface InstalledRecord {
  id: string;
  cardUrl: string;
  card: AgentCard;
  catalogs: Record<string, string>;
  entitlement: string[];
  installedAt: string;
}

/**
 * An app as this run reads it: its display name and dispatch URL from the card fetched at startup,
 * the stored card when the agent was down (task-11.4 decision 8); the catalogs handed at install;
 * the entitlement the hub advertises and enforces (decision 12).
 */
export interface AppRecord {
  /** Stable app id; doubles as the provenance tag on relayed events. */
  id: string;
  displayName: string;
  /** The card's `url`: where dispatch goes. */
  agentUrl: string;
  /** The catalog ids handed at install; none when the app paints in the basic catalog only. */
  catalogs: string[];
  entitlement: string[];
}

/**
 * A row of the catalog table (task-11.4 decisions 7, 10): a catalog the client provides — the basic
 * catalog and the shell catalog, built from code, never persisted — or an installed artifact, by
 * its id, with its entry's path inside it.
 */
export type CatalogRow =
  {catalogId: string; provided: 'client'} | {catalogId: string; artifact: string; entry: string};
