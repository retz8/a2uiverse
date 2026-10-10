/**
 * The marketplace's contracts (SPEC §9.1, §9.3, §10; task 13.2): what the marketplace serves and
 * takes, read by the orchestrator, Stellify and Phase 14's Store page without any of them importing
 * the marketplace. The normative definition is `../contracts/marketplace.json` with the two JSON
 * Schemas beside it — `marketplace-entry.schema.json`, `marketplace-preview.schema.json` —
 * mirrored here as the schemas the sdk compiles and asserted equal by `marketplace.contract.test.ts`.
 * The contracts carry no version of their own: they are versioned with the sdk. The checks that
 * run on these shapes live beside them — `evolution.ts`, `retirement.ts`, `drift.ts`, `smoke.ts`.
 *
 * Transport stays with each caller; nothing here fetches.
 */
import {Ajv2020} from 'ajv/dist/2020.js';
import {hashArtifactFile} from './artifact.js';
import {APP_ID_MAX_LENGTH, APP_ID_PATTERN, RESERVED_APP_IDS} from './catalog.js';
import type {Drift} from './drift.js';
import {schemaErrors, type Validation} from './validate.js';

// --- The HTTP surface -------------------------------------------------------------------------

/**
 * The route layout at the root of the marketplace's port, no prefix (task-13.2 decision 11). The
 * reads are shaped like static files, so a directory of the same layout can stand in for the
 * process; `<appId>`, `<artifactId>` and `<path>` are the placeholders the helpers below fill.
 */
export const MARKETPLACE_ROUTES = {
  /** Every entry; the Store page lists from it, Stellify filters it by its own publisher name. */
  index: 'index.json',
  /** One entry; 404 when the app is not published. */
  entry: 'apps/<appId>/entry.json',
  /** The app's preview document. */
  preview: 'apps/<appId>/preview.json',
  /** An artifact's files under its id, immutable, exactly as the registry serves them. */
  artifact: 'artifacts/<artifactId>/<path>',
  /** `?q=<words>`: entries in rank order, each with its score. */
  search: 'search',
  /** `{publisher}` in; `{publisher, token}` once, or findings. No token. */
  claim: 'claim',
  /** Bearer token; the install body with a preview beside it. */
  publish: 'publish',
  /** Bearer token; `{appId}`. */
  unpublish: 'unpublish',
  /** `{appId}`; accepted always, a nudge the marketplace verifies itself. No token. */
  report: 'report',
} as const;

/** The search route's query parameter: the words. */
export const SEARCH_QUERY_PARAM = 'q';

export const entryPath = (appId: string): string =>
  MARKETPLACE_ROUTES.entry.replace('<appId>', appId);
export const previewPath = (appId: string): string =>
  MARKETPLACE_ROUTES.preview.replace('<appId>', appId);
export const artifactPath = (artifactId: string, path: string): string =>
  MARKETPLACE_ROUTES.artifact.replace('<artifactId>', artifactId).replace('<path>', path);
export const searchPath = (words: string): string =>
  `${MARKETPLACE_ROUTES.search}?${SEARCH_QUERY_PARAM}=${encodeURIComponent(words)}`;

// --- The publisher ----------------------------------------------------------------------------

/** A publisher's name has the app id's grammar (task-13.2 decision 6): claimed and compared, it is an id. */
export const PUBLISHER_NAME_PATTERN = APP_ID_PATTERN;
export const PUBLISHER_NAME_MAX_LENGTH = APP_ID_MAX_LENGTH;
export const RESERVED_PUBLISHER_NAMES: readonly string[] = RESERVED_APP_IDS;

/** The name's grammar; empty when the name may be claimed. */
export function checkPublisherName(name: string): string[] {
  const errors: string[] = [];
  if (name.length === 0) errors.push('a publisher name is required');
  else if (!PUBLISHER_NAME_PATTERN.test(name)) {
    errors.push(
      `publisher name ${JSON.stringify(name)} is not a slug: lowercase letters, digits and hyphens, starting with a letter`,
    );
  }
  if (name.length > PUBLISHER_NAME_MAX_LENGTH) {
    errors.push(
      `publisher name ${JSON.stringify(name)} is longer than ${PUBLISHER_NAME_MAX_LENGTH} characters`,
    );
  }
  if (RESERVED_PUBLISHER_NAMES.includes(name)) {
    errors.push(`publisher name ${JSON.stringify(name)} is reserved`);
  }
  return errors;
}

/** The token: this many random bytes, spelled base64url without padding, no prefix. */
export const PUBLISHER_TOKEN_BYTES = 32;
export const PUBLISHER_TOKEN_PATTERN = /^[A-Za-z0-9_-]{43}$/;

/** A fresh token from Web Crypto — Node and the browser alike. The marketplace mints one per claim. */
export function mintPublisherToken(): string {
  const bytes = new Uint8Array(PUBLISHER_TOKEN_BYTES);
  globalThis.crypto.getRandomValues(bytes);
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

/** The token's form; empty when it is one. */
export function checkPublisherToken(token: string): string[] {
  if (token.length === 0) return ['a token is required'];
  return PUBLISHER_TOKEN_PATTERN.test(token) ? [] : ['the token is not in its form'];
}

/**
 * What the marketplace stores for a token, and compares a presented one against: SHA-256 in the
 * artifact hashes' `sha256-<base64>` form.
 */
export function hashPublisherToken(token: string): Promise<string> {
  return hashArtifactFile(new TextEncoder().encode(token));
}

// --- The index entry --------------------------------------------------------------------------

/** An artifact id as the entry names a build: `sha256-<base64url>`, unpadded (task-11.4 decision 10). */
const ARTIFACT_ID_PATTERN = '^sha256-[A-Za-z0-9_-]{43}$';

/**
 * The part of an A2A AgentCard the entry's readers rely on; structural, so the sdk depends on no
 * A2A package. The entry stores the card verbatim: every other field rides along.
 */
export interface PublishedCard {
  name: string;
  description: string;
  url: string;
  /** The agent's version — the app's version as the index sees it. */
  version: string;
  skills?: {
    id?: string;
    name: string;
    description: string;
    tags?: string[];
    examples?: string[];
    [key: string]: unknown;
  }[];
  capabilities?: {extensions?: {uri: string; params?: Record<string, unknown>}[]};
  securitySchemes?: Record<string, unknown>;
  security?: Record<string, string[]>[];
  [key: string]: unknown;
}

/** The flag on an entry whose live card is ahead of the Store: what the Store lacks, and when seen. */
export interface AheadOfStore extends Drift {
  seenAt: string;
}

/** One entry per app id (task-13.2 decision 5): the marketplace's index as it is served. */
export interface IndexEntry {
  appId: string;
  /** The publisher's name. */
  publisher: string;
  /** What the marketplace fetched the live card from; what the registry stores at install. */
  cardUrl: string;
  /** The card as published, verbatim; its `version` is the app's version. */
  card: PublishedCard;
  /** Catalog id to artifact id: the builds. */
  catalogs: Record<string, string>;
  /** Every version this app id has published, in publish order; the last is the card's. */
  versions: string[];
  publishedAt: string;
  /** Catalog ids this app once published and its current card no longer names. */
  retired: string[];
  /** Absent when the live card and the entry agree. */
  aheadOfStore?: AheadOfStore;
}

export const INDEX_ENTRY_SCHEMA = {
  $schema: 'https://json-schema.org/draft/2020-12/schema',
  $id: 'https://a2uiverse.dev/contracts/marketplace-entry',
  title: 'A2UIVerse marketplace index entry',
  description:
    'One entry per app id, as the marketplace serves it at apps/<appId>/entry.json and lists it in index.json. Written by the marketplace at publish; read by the orchestrator for the update check and install from the marketplace, by Stellify for the ahead-of-the-Store notices, and by the Store page. Versioned with the sdk; a change to its shape is additive.',
  type: 'object',
  additionalProperties: false,
  required: [
    'appId',
    'publisher',
    'cardUrl',
    'card',
    'catalogs',
    'versions',
    'publishedAt',
    'retired',
  ],
  properties: {
    appId: {type: 'string', minLength: 1},
    publisher: {type: 'string', minLength: 1, description: "The publisher's name."},
    cardUrl: {
      type: 'string',
      minLength: 1,
      description:
        'Where the marketplace fetched the live card from; what the registry stores at install.',
    },
    card: {
      type: 'object',
      required: ['name', 'description', 'url', 'version'],
      properties: {
        name: {type: 'string'},
        description: {type: 'string'},
        url: {type: 'string'},
        version: {type: 'string', minLength: 1, description: "The agent's version: the app's."},
      },
      description: 'The A2A AgentCard as published, verbatim.',
    },
    catalogs: {
      type: 'object',
      propertyNames: {minLength: 1},
      additionalProperties: {type: 'string', pattern: ARTIFACT_ID_PATTERN},
      description: 'Catalog id to artifact id: the builds.',
    },
    versions: {
      type: 'array',
      minItems: 1,
      uniqueItems: true,
      items: {type: 'string', minLength: 1},
      description:
        "Every version this app id has published, in publish order; the last is the card's.",
    },
    publishedAt: {type: 'string', minLength: 1},
    retired: {
      type: 'array',
      uniqueItems: true,
      items: {type: 'string', minLength: 1},
      description: 'Catalog ids this app once published and its current card no longer names.',
    },
    aheadOfStore: {
      type: 'object',
      additionalProperties: false,
      required: ['catalogIds', 'seenAt'],
      properties: {
        catalogIds: {type: 'array', uniqueItems: true, items: {type: 'string', minLength: 1}},
        version: {type: 'string', minLength: 1},
        seenAt: {type: 'string', minLength: 1},
      },
      description:
        'What the live card declares and the Store lacks — catalog ids, a version — and when the marketplace saw it. Absent when they agree.',
    },
  },
} as const;

const ajv = new Ajv2020({allErrors: true, strict: true, allowUnionTypes: true});
const entrySchema = ajv.compile(INDEX_ENTRY_SCHEMA);

/**
 * An entry against the schema, then what the schema cannot say: the card's version is the last
 * published one, and a retired id is not among the catalogs.
 */
export function validateIndexEntry(input: unknown): Validation<IndexEntry> {
  const errors = schemaErrors(entrySchema, input);
  if (errors.length > 0) return {ok: false, errors};
  const entry = input as IndexEntry;
  const last = entry.versions[entry.versions.length - 1];
  if (last !== entry.card.version) {
    errors.push(
      `/versions: the last published version is ${JSON.stringify(last)}, the card’s is ${JSON.stringify(entry.card.version)}`,
    );
  }
  for (const id of entry.retired) {
    if (id in entry.catalogs) {
      errors.push(`/retired: ${JSON.stringify(id)} is retired and among the catalogs`);
    }
  }
  return errors.length === 0 ? {ok: true, value: entry} : {ok: false, errors};
}

// --- The captured preview ---------------------------------------------------------------------

/** Who captured the paint: the marketplace, live at publish, or the publisher, through `preview`. */
export const PREVIEW_CAPTURED_BY = ['marketplace', 'publisher'] as const;
export type PreviewCapturedBy = (typeof PREVIEW_CAPTURED_BY)[number];

/** The app's preview (task-13.2 decision 7): the smoke test's paint, stored with the published version. */
export interface PreviewDocument {
  appId: string;
  /** The card version the paint was captured at. */
  version: string;
  /** The request text the agent was sent. */
  words: string;
  /** The A2UI server-to-client messages in order, every kind kept, surface ids as the agent wrote them. */
  messages: Record<string, unknown>[];
  capturedBy: PreviewCapturedBy;
  capturedAt: string;
}

export const PREVIEW_SCHEMA = {
  $schema: 'https://json-schema.org/draft/2020-12/schema',
  $id: 'https://a2uiverse.dev/contracts/marketplace-preview',
  title: 'A2UIVerse marketplace preview',
  description:
    "An app's preview, served at apps/<appId>/preview.json: the smoke test's paint, stored with the published version — the A2UI messages the agent answered with, in order, for the Store page to render through the client's ordinary loader. Captured by the marketplace at publish, or by the publisher's preview for an app that needs sign-in and sent beside the artifacts; checked the same way either way. Versioned with the sdk; a change to its shape is additive.",
  type: 'object',
  additionalProperties: false,
  required: ['appId', 'version', 'words', 'messages', 'capturedBy', 'capturedAt'],
  properties: {
    appId: {type: 'string', minLength: 1},
    version: {
      type: 'string',
      minLength: 1,
      description: 'The card version the paint was captured at.',
    },
    words: {type: 'string', description: 'The request text the agent was sent.'},
    messages: {
      type: 'array',
      minItems: 1,
      items: {
        type: 'object',
        required: ['version'],
        properties: {version: {type: 'string'}},
        description: 'One A2UI server-to-client message, as the agent sent it.',
      },
      description:
        'The A2UI server-to-client messages in order, every kind kept — createSurface, updateComponents, updateDataModel, deleteSurface — surface ids as the agent wrote them.',
    },
    capturedBy: {type: 'string', enum: [...PREVIEW_CAPTURED_BY]},
    capturedAt: {type: 'string', minLength: 1},
  },
} as const;

const previewSchema = ajv.compile(PREVIEW_SCHEMA);

/** A preview document against its schema. Whether its paint passes is `checkPaint`'s. */
export function validatePreview(input: unknown): Validation<PreviewDocument> {
  const errors = schemaErrors(previewSchema, input);
  return errors.length === 0 ? {ok: true, value: input as PreviewDocument} : {ok: false, errors};
}

// --- The wire bodies --------------------------------------------------------------------------

type Body = Record<string, unknown>;
const bodyOf = (body: unknown): Body =>
  typeof body === 'object' && body !== null && !Array.isArray(body) ? (body as Body) : {};

/** `claim`, in: the name to claim. */
export interface ClaimRequest {
  publisher: string;
}
export const CLAIM_REQUEST_FIELDS = [
  'publisher',
] as const satisfies readonly (keyof ClaimRequest)[];

/** `claim`, out, once: the name and its token. A taken name answers with findings. */
export interface ClaimResponse {
  publisher: string;
  token: string;
}
export const CLAIM_RESPONSE_FIELDS = [
  'publisher',
  'token',
] as const satisfies readonly (keyof ClaimResponse)[];

export function readClaimRequest(body: unknown): Validation<ClaimRequest> {
  const b = bodyOf(body);
  if (typeof b.publisher !== 'string') return {ok: false, errors: ['publisher: expected a string']};
  return {ok: true, value: {publisher: b.publisher}};
}

/** `publish`, in: the registry's install body with a preview beside it, each catalog's files as base64. */
export interface PublishRequest {
  appId: string;
  /** The card's full URL: the live card is what the marketplace fetches. */
  cardUrl: string;
  catalogs: {files: Record<string, string>}[];
  /** The publisher's captured paint, for an app that needs sign-in. */
  preview?: PreviewDocument;
}
export const PUBLISH_REQUEST_FIELDS = [
  'appId',
  'cardUrl',
  'catalogs',
  'preview',
] as const satisfies readonly (keyof PublishRequest)[];
export const PUBLISH_CATALOG_FIELDS = ['files'] as const;

/** A publish request read: each catalog's files decoded, by path relative to the artifact's root. */
export interface PublishBody {
  appId: string;
  cardUrl: string;
  catalogs: Map<string, Uint8Array>[];
  preview?: PreviewDocument;
}

/** A path inside an artifact: relative, `/`-separated, no `.` or `..` segment. */
function isSafePath(path: string): boolean {
  if (path === '' || path.startsWith('/') || path.includes('\\')) return false;
  return path.split('/').every(segment => segment !== '' && segment !== '.' && segment !== '..');
}

function fromBase64(text: string): Uint8Array {
  const binary = atob(text);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

/** `{appId, cardUrl, catalogs: [{files: {<path>: <base64>}}], preview?}`, every finding collected. */
export function readPublishRequest(body: unknown): Validation<PublishBody> {
  const b = bodyOf(body);
  const errors: string[] = [];
  if (typeof b.appId !== 'string') errors.push('appId: expected a string');
  if (typeof b.cardUrl !== 'string') errors.push('cardUrl: expected a string');
  if (!Array.isArray(b.catalogs)) errors.push('catalogs: expected a list');
  const catalogs: Map<string, Uint8Array>[] = [];
  for (const [i, catalog] of (Array.isArray(b.catalogs) ? b.catalogs : []).entries()) {
    const files = (catalog as {files?: unknown} | null)?.files;
    if (typeof files !== 'object' || files === null || Array.isArray(files)) {
      errors.push(`catalogs[${i}].files: expected a map of path to base64`);
      continue;
    }
    const decoded = new Map<string, Uint8Array>();
    for (const [path, content] of Object.entries(files)) {
      if (typeof content !== 'string' || !isSafePath(path)) {
        errors.push(
          `catalogs[${i}].files[${JSON.stringify(path)}]: expected a relative path to base64`,
        );
        continue;
      }
      try {
        decoded.set(path, fromBase64(content));
      } catch {
        errors.push(`catalogs[${i}].files[${JSON.stringify(path)}]: not base64`);
      }
    }
    catalogs.push(decoded);
  }
  let preview: PreviewDocument | undefined;
  if (b.preview !== undefined) {
    const read = validatePreview(b.preview);
    if (read.ok) preview = read.value;
    else errors.push(...read.errors.map(e => `preview${e}`));
  }
  if (errors.length > 0) return {ok: false, errors};
  return {
    ok: true,
    value: {
      appId: b.appId as string,
      cardUrl: b.cardUrl as string,
      catalogs,
      ...(preview !== undefined ? {preview} : {}),
    },
  };
}

/** `publish`, out, when it took: what install answers, with the version published. */
export interface PublishOutcome {
  ok: true;
  appId: string;
  /** The card's version, now published. */
  version: string;
  summary: string;
  notes: string[];
}
export const PUBLISH_RESPONSE_FIELDS = [
  'ok',
  'appId',
  'version',
  'summary',
  'notes',
] as const satisfies readonly (keyof PublishOutcome)[];

/** What every refused write answers, as the registry's write routes do. */
export interface Refusal {
  ok: false;
  findings: string[];
}
export const REFUSAL_FIELDS = ['ok', 'findings'] as const satisfies readonly (keyof Refusal)[];

export type PublishResult = PublishOutcome | Refusal;

/** `unpublish`, in: the app to remove from the index, the whole app. */
export interface UnpublishRequest {
  appId: string;
}
export const UNPUBLISH_REQUEST_FIELDS = [
  'appId',
] as const satisfies readonly (keyof UnpublishRequest)[];

/** `report`, in: an app a registry found ahead of the Store; the app id and nothing about the person. */
export interface ReportRequest {
  appId: string;
}
export const REPORT_REQUEST_FIELDS = ['appId'] as const satisfies readonly (keyof ReportRequest)[];

function readAppIdBody(body: unknown): Validation<{appId: string}> {
  const b = bodyOf(body);
  if (typeof b.appId !== 'string' || b.appId === '') {
    return {ok: false, errors: ['appId: expected a string']};
  }
  return {ok: true, value: {appId: b.appId}};
}

export const readUnpublishRequest = (body: unknown): Validation<UnpublishRequest> =>
  readAppIdBody(body);
export const readReportRequest = (body: unknown): Validation<ReportRequest> => readAppIdBody(body);

/** `search`, out: entries in rank order, each with its score. */
export interface SearchResult {
  entry: IndexEntry;
  score: number;
}
export interface SearchResponse {
  results: SearchResult[];
}
export const SEARCH_RESPONSE_FIELDS = [
  'results',
] as const satisfies readonly (keyof SearchResponse)[];
export const SEARCH_RESULT_FIELDS = [
  'entry',
  'score',
] as const satisfies readonly (keyof SearchResult)[];

export function readSearchResponse(data: unknown): Validation<SearchResponse> {
  const b = bodyOf(data);
  if (!Array.isArray(b.results)) return {ok: false, errors: ['results: expected a list']};
  const errors: string[] = [];
  const results: SearchResult[] = [];
  b.results.forEach((result, i) => {
    const r = bodyOf(result);
    const entry = validateIndexEntry(r.entry);
    if (!entry.ok) errors.push(...entry.errors.map(e => `results[${i}].entry${e}`));
    if (typeof r.score !== 'number') errors.push(`results[${i}].score: expected a number`);
    if (entry.ok && typeof r.score === 'number') results.push({entry: entry.value, score: r.score});
  });
  return errors.length === 0 ? {ok: true, value: {results}} : {ok: false, errors};
}

// --- The update state -------------------------------------------------------------------------

/**
 * The eight states (task-13.2 decision 8), in precedence order: one per installed app, the first
 * match. The orchestrator computes them and serves them over `orchestratorApi`.
 */
export const UPDATE_STATES = [
  'unknown',
  'not-published',
  'ahead-of-store',
  'update-required',
  'major-update',
  'card-update',
  'newer-build',
  'up-to-date',
] as const;
export type UpdateStateKind = (typeof UPDATE_STATES)[number];

/** A catalog whose build moved: the installed artifact id and the published one. */
export interface BuildMove {
  catalogId: string;
  installed: string;
  published: string;
}
export const BUILD_MOVE_FIELDS = [
  'catalogId',
  'installed',
  'published',
] as const satisfies readonly (keyof BuildMove)[];

/** A security scheme on the published card with scopes the installed one lacks — all of them for a new scheme. */
export interface NewScopes {
  scheme: string;
  scopes: string[];
}
export const NEW_SCOPES_FIELDS = [
  'scheme',
  'scopes',
] as const satisfies readonly (keyof NewScopes)[];

interface StateBase {
  appId: string;
  installedVersion: string;
}

export type UpdateState = StateBase &
  (
    | {state: 'unknown'}
    | {state: 'not-published'}
    | {state: 'ahead-of-store'; publishedVersion: string; catalogIds: string[]; version?: string}
    | {state: 'update-required'; publishedVersion: string; retired: string[]}
    | {
        state: 'major-update';
        publishedVersion: string;
        newCatalogIds: string[];
        builds: BuildMove[];
      }
    | {state: 'card-update'; publishedVersion: string; newScopes: NewScopes[]; builds: BuildMove[]}
    | {state: 'newer-build'; publishedVersion: string; builds: BuildMove[]}
    | {state: 'up-to-date'; publishedVersion: string}
  );

/** The fields every state carries. */
export const UPDATE_STATE_FIELDS = ['appId', 'state', 'installedVersion'] as const;

/** The detail fields each state carries, required and optional; no other detail may be present. */
export const UPDATE_STATE_DETAILS: Record<
  UpdateStateKind,
  {required: readonly string[]; optional: readonly string[]}
> = {
  unknown: {required: [], optional: []},
  'not-published': {required: [], optional: []},
  'ahead-of-store': {required: ['publishedVersion', 'catalogIds'], optional: ['version']},
  'update-required': {required: ['publishedVersion', 'retired'], optional: []},
  'major-update': {required: ['publishedVersion', 'newCatalogIds', 'builds'], optional: []},
  'card-update': {required: ['publishedVersion', 'newScopes', 'builds'], optional: []},
  'newer-build': {required: ['publishedVersion', 'builds'], optional: []},
  'up-to-date': {required: ['publishedVersion'], optional: []},
};

const isStringList = (value: unknown): value is string[] =>
  Array.isArray(value) && value.every(v => typeof v === 'string');

const isBuildMove = (value: unknown): value is BuildMove => {
  const b = bodyOf(value);
  return BUILD_MOVE_FIELDS.every(field => typeof b[field] === 'string');
};

const isNewScopes = (value: unknown): value is NewScopes => {
  const b = bodyOf(value);
  return typeof b.scheme === 'string' && isStringList(b.scopes);
};

/** Each detail field's shape. */
const DETAIL_SHAPES: Record<string, (value: unknown) => boolean> = {
  publishedVersion: value => typeof value === 'string',
  catalogIds: isStringList,
  version: value => typeof value === 'string',
  retired: isStringList,
  newCatalogIds: isStringList,
  newScopes: value => Array.isArray(value) && value.every(isNewScopes),
  builds: value => Array.isArray(value) && value.every(isBuildMove),
};

/**
 * The update state a served object carries, if it is one and well formed: a known state, the
 * common fields, every detail the state requires in its shape, and no detail of another state.
 */
export function readUpdateState(data: unknown): UpdateState | undefined {
  const b = bodyOf(data);
  const {appId, state, installedVersion} = b;
  if (typeof appId !== 'string' || typeof installedVersion !== 'string') return undefined;
  if (!UPDATE_STATES.includes(state as UpdateStateKind)) return undefined;
  const details = UPDATE_STATE_DETAILS[state as UpdateStateKind];
  const allowed = new Set([...details.required, ...details.optional]);
  for (const key of Object.keys(b)) {
    if ((UPDATE_STATE_FIELDS as readonly string[]).includes(key)) continue;
    if (!allowed.has(key)) return undefined;
  }
  for (const key of details.required) {
    if (!(key in b) || !DETAIL_SHAPES[key]!(b[key])) return undefined;
  }
  for (const key of details.optional) {
    if (key in b && !DETAIL_SHAPES[key]!(b[key])) return undefined;
  }
  return b as unknown as UpdateState;
}
