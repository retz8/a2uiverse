import type {AppRecord} from './types.js';

/** The GitHub catalog id, as emitted by the GitHub agent (`a2uiverse-apps/github/github-catalog`). */
export const GITHUB_CATALOG_ID =
  'https://github.com/retz8/a2uiverse-apps/blob/main/github/github-catalog/catalogs/v0.9.1/catalog.json';

/** Gmail verified against the published catalog (2.6). Calendar follows the same repo-path
 * convention and is verified when 2.7 publishes. */
export const GMAIL_CATALOG_ID =
  'https://github.com/retz8/a2uiverse-apps/blob/main/gmail/gmail-catalog/catalogs/v0.9.1/catalog.json';
export const CALENDAR_CATALOG_ID =
  'https://github.com/retz8/a2uiverse-apps/blob/main/calendar/calendar-catalog/catalogs/v0.9.1/catalog.json';
/** CircleCI, verified against the published catalog (7.2). */
export const CIRCLECI_CATALOG_ID =
  'https://github.com/retz8/a2uiverse-apps/blob/main/circleci/circleci-catalog/catalogs/v0.9.1/catalog.json';
/** Linear, verified against the published catalog (7.3). */
export const LINEAR_CATALOG_ID =
  'https://github.com/retz8/a2uiverse-apps/blob/main/linear/linear-catalog/catalogs/v0.9.1/catalog.json';

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
    {
      id: 'circleci',
      displayName: 'CircleCI',
      agentUrl: 'http://localhost:11004',
      authScheme: 'none',
      catalogId: CIRCLECI_CATALOG_ID,
      catalogPackage: 'circleci-catalog',
    },
    {
      id: 'linear',
      displayName: 'Linear',
      agentUrl: 'http://localhost:11005',
      authScheme: 'none',
      catalogId: LINEAR_CATALOG_ID,
      catalogPackage: 'linear-catalog',
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
