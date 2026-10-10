/**
 * The catalog contracts (SPEC §9.1, task 11.2): what a catalog package exposes, what the client
 * lends a loaded catalog, and the checks the registry and the marketplace share — coverage in both
 * directions, entitlement, the app id, the card's declaration read. The
 * normative definition is `../contracts/catalog.json`; `catalog.contract.test.ts` asserts this
 * projection against it. The artifact half — the descriptor and its files — lives in `artifact.ts`.
 * The contracts carry no version of their own: they are versioned with the sdk, whose every consumer
 * ships from this monorepo; the one version inside them is A2UI's, keying the host interfaces.
 *
 * Nothing here describes an agent: the app is its A2A AgentCard, read as written. The one thing the
 * sdk reads off a card is the A2UI extension's `supportedCatalogIds`, validated against the pinned
 * `server_capabilities.json`.
 */
import {Ajv2020} from 'ajv/dist/2020.js';
import {BASIC_CATALOG_ID, SERVER_CAPABILITIES_SCHEMA} from './a2ui/spec.generated.js';
import {schemaErrors, type Validation} from './validate.js';

export {BASIC_CATALOG_ID};

/** The A2UI A2A extension's URI: the entry of a card's `capabilities.extensions` that carries the catalog declaration. */
export const A2UI_EXTENSION_URI = 'https://a2ui.org/a2a-extension/a2ui/v0.9.1';

/** The metadata key a client's capabilities ride under on every message to an agent (A2UI). */
export const A2UI_CLIENT_CAPABILITIES_KEY = 'a2uiClientCapabilities';

/** The version key inside the capabilities objects on both sides, as the pinned schemas name it. */
export const A2UI_CAPABILITIES_VERSION_KEY = 'v0.9';

// --- The export contract ---------------------------------------------------------------------

/** What a catalog package's entry exposes (task-11.2 decision 1). */
export const CATALOG_EXPORTS = {
  required: ['CATALOG'],
  optional: ['Provider'],
} as const;

/**
 * The shape of `CATALOG` the sdk relies on — `@a2ui/web_core`'s `Catalog`, by its public fields,
 * so the sdk depends on no renderer.
 */
export interface CatalogLike {
  readonly id: string;
  readonly components: ReadonlyMap<string, unknown>;
  readonly functions?: ReadonlyMap<string, unknown>;
}

const isObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const isCatalogLike = (value: unknown): value is CatalogLike =>
  isObject(value) &&
  typeof value.id === 'string' &&
  value.id !== '' &&
  value.components instanceof Map;

/** A React component as a module exports it: a function, or a `memo`/`forwardRef` object. */
const isComponentLike = (value: unknown): boolean =>
  typeof value === 'function' || (isObject(value) && '$$typeof' in value);

/**
 * The export contract over a loaded module's namespace: `CATALOG` present and catalog-shaped,
 * `Provider` a component when present, and the catalog's id the expected one when given. Run by the
 * client at load — Stellify evaluates nothing and reads the entry's export names from its bundle
 * instead (task 11.3) — and empty when the module conforms.
 */
export function checkCatalogExports(
  module: Record<string, unknown>,
  expectedCatalogId?: string,
): string[] {
  const errors: string[] = [];
  const catalog = module.CATALOG;
  if (catalog === undefined) {
    errors.push('the entry exports no CATALOG — export your Catalog from @a2ui/web_core');
  } else if (!isCatalogLike(catalog)) {
    errors.push('CATALOG is not a Catalog: it needs a string id and a components map');
  } else if (expectedCatalogId !== undefined && catalog.id !== expectedCatalogId) {
    errors.push(
      `CATALOG.id is ${JSON.stringify(catalog.id)}, the descriptor says ${JSON.stringify(expectedCatalogId)}`,
    );
  }
  if (module.Provider !== undefined && !isComponentLike(module.Provider)) {
    errors.push('Provider is exported but is not a component');
  }
  return errors;
}

// --- The host-module interface ----------------------------------------------------------------

/** The A2UI version the one interface lent today is keyed by (task-11.2 decision 2). */
export const HOST_INTERFACE_VERSION = '0.9.1';

/**
 * The host interfaces the platform supplies, by the A2UI version each lends: an artifact built
 * against another is refused at install (task-11.4 decision 4) and at load.
 */
export const SUPPORTED_HOST_INTERFACES: readonly string[] = [HOST_INTERFACE_VERSION];

/** Whether an artifact's host interface is one the platform supplies; empty when it is. */
export function checkHostInterface(
  version: string,
  supported: readonly string[] = SUPPORTED_HOST_INTERFACES,
): string[] {
  if (supported.includes(version)) return [];
  const list = supported.map(v => JSON.stringify(v)).join(', ');
  return [
    `host interface ${JSON.stringify(version)} is not one the platform supplies (it supplies ${list})`,
  ];
}

/** The global the client registers the interface under, before any artifact loads. */
export const HOST_INTERFACE_GLOBAL = '__a2uiverse_host__';

/**
 * Exactly what the host lends: Stellify externalizes these and refuses any other specifier under a
 * host package. `react-dom/client` is lent beside `react-dom` because React 19 keeps `createRoot`
 * there alone and design systems reach it (task 11.3).
 */
export const HOST_SPECIFIERS = [
  'react',
  'react/jsx-runtime',
  'react-dom',
  'react-dom/client',
  '@a2ui/react/v0_9',
  '@a2ui/web_core/v0_9',
  'zod',
] as const;

export type HostSpecifier = (typeof HOST_SPECIFIERS)[number];

/** The interface's stylesheet loader, which an artifact's stylesheet imports are rewritten to. */
export const HOST_STYLESHEET_LOADER = 'loadStylesheet';

/** What the client registers under {@link HOST_INTERFACE_GLOBAL}. */
export interface HostInterface {
  version: string;
  /** The client's own module namespace for each specifier. */
  modules: Record<HostSpecifier, unknown>;
  /** Loads the stylesheet at `url` once; resolves when it has applied. */
  loadStylesheet(url: string): Promise<void>;
}

/** The packages a host specifier belongs to; a specifier under one of these that is not lent is refused at pack. */
export const HOST_PACKAGES = [
  'react',
  'react-dom',
  '@a2ui/react',
  '@a2ui/web_core',
  'zod',
] as const;

const packageOf = (specifier: string): string => {
  const parts = specifier.split('/');
  return specifier.startsWith('@') ? parts.slice(0, 2).join('/') : parts[0];
};

/**
 * How Stellify treats one import specifier: `host` for a lent specifier, `refuse` for another
 * specifier under a host package, `bundle` for everything else.
 */
export function classifySpecifier(specifier: string): 'host' | 'refuse' | 'bundle' {
  if ((HOST_SPECIFIERS as readonly string[]).includes(specifier)) return 'host';
  return (HOST_PACKAGES as readonly string[]).includes(packageOf(specifier)) ? 'refuse' : 'bundle';
}

// --- The card's declaration -------------------------------------------------------------------

/** The part of an A2A AgentCard the sdk reads; structural, so the sdk depends on no A2A package. */
export interface CardWithExtensions {
  capabilities?: {
    extensions?: {uri: string; params?: Record<string, unknown>}[];
  };
}

const ajv = new Ajv2020({allErrors: true, strict: true, allowUnionTypes: true});
const serverCapabilities = ajv.compile(SERVER_CAPABILITIES_SCHEMA);
const serverCapabilitiesVersion = ajv.compile(
  (SERVER_CAPABILITIES_SCHEMA.properties as Record<string, Record<string, unknown>>)[
    A2UI_CAPABILITIES_VERSION_KEY
  ],
);

/**
 * The catalog ids a card declares under the A2UI extension's `params.supportedCatalogIds`,
 * validated against the pinned `server_capabilities.json`. No A2UI extension, or one with no ids,
 * is a valid card that declares nothing — the basic-catalog fallback (task-11.2 decision 8). A
 * malformed declaration is an error, never treated as none.
 *
 * Upstream's extension guide writes the params flat (`{supportedCatalogIds}`), as the fields of
 * the schema's version entry, and so does its Python agent SDK; a card may also key them by
 * version (`{"v0.9": {supportedCatalogIds}}`), the shape of the schema's whole object. Both are
 * read, each against the schema's matching part.
 */
export function readSupportedCatalogIds(card: CardWithExtensions): Validation<string[]> {
  const extension = card.capabilities?.extensions?.find(e => e.uri === A2UI_EXTENSION_URI);
  const params = extension?.params;
  if (params === undefined) return {ok: true, value: []};
  const versioned = Object.keys(params).some(key => /^v\d/.test(key));
  const errors = versioned
    ? schemaErrors(serverCapabilities, params)
    : schemaErrors(serverCapabilitiesVersion, params);
  if (errors.length > 0) {
    return {ok: false, errors: errors.map(e => `A2UI extension params${e}`)};
  }
  const inner = versioned
    ? ((params as Record<string, Record<string, unknown>>)[A2UI_CAPABILITIES_VERSION_KEY] ?? {})
    : params;
  const ids = (inner.supportedCatalogIds as string[] | undefined) ?? [];
  return {ok: true, value: [...new Set(ids)]};
}

/** The `a2uiClientCapabilities` metadata value the hub attaches: the ids this agent may paint in. */
export function clientCapabilities(
  supportedCatalogIds: readonly string[],
): Record<string, unknown> {
  return {[A2UI_CAPABILITIES_VERSION_KEY]: {supportedCatalogIds: [...supportedCatalogIds]}};
}

// --- Coverage and entitlement -----------------------------------------------------------------

/** Catalogs every app may paint in without handing an artifact: the standard basic catalog and nothing else. */
export const PUBLIC_CATALOG_IDS: readonly string[] = [BASIC_CATALOG_ID];

export interface CoverageResult {
  /** Declared by the card, neither handed nor public. */
  missing: string[];
  /** Handed, not declared by the card — an orphan artifact. */
  orphan: string[];
}

/**
 * Two-directional coverage (task-11.2 decision 6): every declared id handed or public, every
 * handed artifact declared. Empty lists both ways is a covered install or publish.
 */
export function checkCoverage(
  declared: readonly string[],
  handed: readonly string[],
  publicIds: readonly string[] = PUBLIC_CATALOG_IDS,
): CoverageResult {
  const handedSet = new Set(handed);
  const declaredSet = new Set(declared);
  const publicSet = new Set(publicIds);
  return {
    missing: [...declaredSet].filter(id => !handedSet.has(id) && !publicSet.has(id)),
    orphan: [...handedSet].filter(id => !declaredSet.has(id)),
  };
}

/** Coverage as lines the registry or the marketplace prints; empty when covered. */
export function coverageErrors(coverage: CoverageResult): string[] {
  return [
    ...coverage.missing.map(
      id =>
        `the card declares catalog ${JSON.stringify(id)} but no artifact for it was handed and it is not public`,
    ),
    ...coverage.orphan.map(
      id =>
        `an artifact for catalog ${JSON.stringify(id)} was handed but the card does not declare it`,
    ),
  ];
}

/**
 * An app's entitlement (task-11.2 decision 7): the public catalogs and the ids handed at its
 * install, in that order, each once. Fixed at install.
 */
export function entitlementOf(
  handed: readonly string[],
  publicIds: readonly string[] = PUBLIC_CATALOG_IDS,
): string[] {
  return [...new Set([...publicIds, ...handed])];
}

// --- The app id -------------------------------------------------------------------------------

/** A slug: lowercase ASCII letters, digits and hyphens, starting with a letter (task-11.2 decision 11). */
export const APP_ID_PATTERN = /^[a-z][a-z0-9-]*$/;
export const APP_ID_MAX_LENGTH = 63;
/** Ids no app may claim; `shell` is the platform's own source id. */
export const RESERVED_APP_IDS: readonly string[] = ['shell'];

/** The app id's grammar; empty when the id may be claimed. */
export function checkAppId(id: string): string[] {
  const errors: string[] = [];
  if (id.length === 0) errors.push('an app id is required');
  else if (!APP_ID_PATTERN.test(id)) {
    errors.push(
      `app id ${JSON.stringify(id)} is not a slug: lowercase letters, digits and hyphens, starting with a letter`,
    );
  }
  if (id.length > APP_ID_MAX_LENGTH) {
    errors.push(`app id ${JSON.stringify(id)} is longer than ${APP_ID_MAX_LENGTH} characters`);
  }
  if (RESERVED_APP_IDS.includes(id)) errors.push(`app id ${JSON.stringify(id)} is reserved`);
  return errors;
}

/**
 * Claiming an id in an index — the marketplace's at publish, the registry's at install-over
 * excluded: the grammar, then uniqueness. Empty when the id may be claimed.
 */
export function claimAppId(id: string, taken: ReadonlySet<string>): string[] {
  const errors = checkAppId(id);
  if (errors.length === 0 && taken.has(id)) {
    errors.push(`app id ${JSON.stringify(id)} is already taken`);
  }
  return errors;
}
