import type {AppRecord} from './types.js';

/** The GitHub catalog id, as emitted by the GitHub agent (`a2uiverse-apps/github/github-catalog`). */
export const GITHUB_CATALOG_ID =
  'https://github.com/retz8/a2uiverse-apps/blob/main/github/github-catalog/catalogs/v0.9.1/catalog.json';

/** Gmail/Calendar catalog ids follow the same repo-path convention; verified when 2.6/2.7 publish. */
export const GMAIL_CATALOG_ID =
  'https://github.com/retz8/a2uiverse-apps/blob/main/gmail/gmail-catalog/catalogs/v0.9.1/catalog.json';
export const CALENDAR_CATALOG_ID =
  'https://github.com/retz8/a2uiverse-apps/blob/main/calendar/calendar-catalog/catalogs/v0.9.1/catalog.json';

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
    {
      id: 'gmail',
      displayName: 'Gmail',
      agentUrl: 'http://localhost:11002',
      authScheme: 'none',
      catalogId: GMAIL_CATALOG_ID,
      catalogPackage: 'gmail-catalog',
    },
    {
      id: 'calendar',
      displayName: 'Google Calendar',
      agentUrl: 'http://localhost:11003',
      authScheme: 'none',
      catalogId: CALENDAR_CATALOG_ID,
      catalogPackage: 'calendar-catalog',
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
