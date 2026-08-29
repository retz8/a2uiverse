/**
 * Reserved source id for the orchestrator's own shell surface and stamps.
 * No installed app may claim it — the Registry enforces the reservation.
 */
export const SHELL_SOURCE_ID = 'shell';

/**
 * A registry entry is the app bundle record (SPEC §9.1): what install will
 * write from M7 on, hardcoded until then.
 */
export interface AppRecord {
  /** Stable app id; doubles as the provenance tag on relayed events. */
  id: string;
  displayName: string;
  /** Base URL of the app's A2A agent. */
  agentUrl: string;
  /** Placeholder until AuthVault (M8); `none` is the only value in Phase 1. */
  authScheme: 'none';
  /** The catalog id the agent emits in `createSurface`; join key to the client's catalog map. */
  catalogId: string;
  /** Package name of the catalog implementation the client loads. */
  catalogPackage: string;
}
