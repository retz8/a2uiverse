import type {AppRecord} from './types.js';

/** The GitHub catalog id, as emitted by the GitHub agent (`a2uiverse-apps/github/github-catalog`). */
export const GITHUB_CATALOG_ID =
  'https://github.com/retz8/a2uiverse-apps/blob/main/github/github-catalog/catalogs/v0.9.1/catalog.json';

/** The hardcoded registry. Vendor agents take ports 11001+ (tunnel-environment.md). */
export function defaultEntries(): AppRecord[] {
  return [
    {
      id: 'github',
      displayName: 'GitHub',
      agentUrl: 'http://localhost:11001',
      authScheme: 'none',
      catalogId: GITHUB_CATALOG_ID,
      catalogPackage: 'github-catalog',
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
