import type {AppRecord} from './types.js';

/** The Primer catalog id, as emitted by the GitHub agent (`a2ui-github/primer-a2ui-adapter`). */
export const GITHUB_CATALOG_ID =
  'https://github.com/retz8/a2ui-github/blob/main/primer-a2ui-adapter/catalogs/v0.9.1/catalog.json';

/** The hardcoded registry. Vendor agents take ports 11001+ (tunnel-environment.md). */
export function defaultEntries(): AppRecord[] {
  return [
    {
      id: 'github',
      displayName: 'GitHub',
      agentUrl: 'http://localhost:11001',
      authScheme: 'none',
      catalogId: GITHUB_CATALOG_ID,
      catalogPackage: 'primer-a2ui-adapter',
    },
  ];
}

/** Applies `A2UIVERSE_AGENT_URLS` overrides by app id; unknown ids are ignored. */
export function applyUrlOverrides(
  entries: readonly AppRecord[],
  overrides: Readonly<Record<string, string>>,
): AppRecord[] {
  return entries.map(entry => {
    const agentUrl = overrides[entry.id];
    return agentUrl ? {...entry, agentUrl} : entry;
  });
}
