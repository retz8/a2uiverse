/**
 * The recorded files of both repos the converter is pointed at (task-21.11 decision 5), each with
 * the catalog document of the app it belongs to: the catalog a surface the file never creates is in,
 * and the one the scaffolder's `__CATALOG_ID__` stands for. The Store captures, each agent's
 * gitignored `.recordings/`, Shop C's payloads and the stub corpora are not among them.
 */
import type {DocumentPlace} from './catalogMap.js';

export interface RecordedFile {
  repo: DocumentPlace['repo'];
  path: string;
  /** The catalog document of the app the file belongs to. */
  own?: DocumentPlace;
}

const APPS_RECORDED = [
  /^[^/]+\/agent\/recordings\/beats\/.+\.json$/,
  /^mocks\/shop-[ab]\/agent\/recordings\/beats\/.+\.json$/,
  /^[^/]+\/agent\/app\/fixtures\/deterministic\/.+\.json$/,
  /^[^/]+\/agent\/app\/knowledge\/examples\/.+\.json$/,
  /^mocks\/shop-[ab]\/agent\/app\/knowledge\/examples\/.+\.json$/,
  /^agent-kit\/tests\/fixtures\/(?!catalog-).+\.json$/,
  /^create-a2ui-agent\/templates\/agent-kind\/[^/]+\/app\/(fixtures\/deterministic|knowledge\/examples)\/.+\.json$/,
];

const APP_CATALOGS: readonly (readonly [string, string])[] = [
  ['agent-kit/tests/fixtures/', 'agent-kit/tests/fixtures/catalog-basic.json'],
  [
    'create-a2ui-agent/templates/agent-kind/basic/',
    'create-a2ui-agent/templates/catalog/basic/catalogs/v0.9.1/catalog.json',
  ],
  [
    'create-a2ui-agent/templates/agent-kind/custom/',
    'create-a2ui-agent/templates/catalog/custom/catalogs/v0.9.1/catalog.json',
  ],
  ['calendar/', 'calendar/calendar-catalog/catalogs/v0.9.1/catalog.json'],
  ['circleci/', 'circleci/circleci-catalog/catalogs/v0.9.1/catalog.json'],
  ['github/', 'github/github-catalog/catalogs/v0.9.1/catalog.json'],
  ['gmail/', 'gmail/gmail-catalog/catalogs/v0.9.1/catalog.json'],
  ['linear/', 'linear/linear-catalog/catalogs/v0.9.1/catalog.json'],
  ['mocks/shop-a/', 'mocks/shop-a/shop-a-catalog/catalogs/v0.9.1/catalog.json'],
  ['mocks/shop-b/', 'mocks/shop-b/shop-b-catalog/catalogs/v0.9.1/catalog.json'],
];

/** The agent kit's test catalogs, named by ids of their own. */
export const KIT_CATALOGS: Readonly<Record<string, DocumentPlace>> = {
  'https://example.test/a2uiverse-kit/basic/catalog.json': {
    repo: 'a2uiverse-apps',
    path: 'agent-kit/tests/fixtures/catalog-basic.json',
  },
  'https://example.test/a2uiverse-kit/custom/catalog.json': {
    repo: 'a2uiverse-apps',
    path: 'agent-kit/tests/fixtures/catalog-custom.json',
  },
};

/** The scaffolder's stand-in for the catalog id of the app it makes. */
export const TEMPLATE_CATALOG_ID = '__CATALOG_ID__';

/** Each repo's recorded files among the paths it tracks. */
export function recordedFiles(
  repo: DocumentPlace['repo'],
  tracked: readonly string[],
): RecordedFile[] {
  if (repo === 'a2uiverse') {
    return tracked
      .filter(path => /^apps\/client\/recordings\/beats\/[^/]+\.json$/.test(path))
      .sort()
      .map(path => ({repo, path}));
  }
  return tracked
    .filter(path => APPS_RECORDED.some(pattern => pattern.test(path)))
    .sort()
    .map(path => {
      const own = APP_CATALOGS.find(([prefix]) => path.startsWith(prefix));
      return own ? {repo, path, own: {repo, path: own[1]}} : {repo, path};
    });
}

/** Where a catalog id's document is, as the id names it: a GitHub blob address in either repo. */
export function placeOfCatalogId(catalogId: string): DocumentPlace | undefined {
  const blob = /^https:\/\/github\.com\/retz8\/(a2uiverse|a2uiverse-apps)\/blob\/main\/(.+)$/.exec(
    catalogId,
  );
  if (blob) return {repo: blob[1] as DocumentPlace['repo'], path: blob[2]!};
  return KIT_CATALOGS[catalogId];
}
