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
 * sdk reads off a card is the A2UI extension's `supportedCatalogIds`, from its v1.0 entry
 * (task-21.10 decisions 5 and 6), validated against the pinned `agent_capabilities.json`.
 */
import {Ajv2020} from 'ajv/dist/2020.js';
import {AGENT_CAPABILITIES_SCHEMA, BASIC_CATALOG_ID} from './a2ui/spec.generated.js';
import {A2UI_VERSION, readsBelowV1} from './a2ui/stamp.js';
import {schemaErrors} from './validate.js';

export {BASIC_CATALOG_ID};

/** The base every A2UI version's A2A extension URI sits under: an entry under it is an A2UI entry. */
export const A2UI_EXTENSION_BASE = 'https://a2ui.org/a2a-extension/a2ui/';

/**
 * The A2UI A2A extension's URI at v1.0: the entry of a card's `capabilities.extensions` that
 * carries its catalog declaration, and the extension the hub activates on every request.
 */
export const A2UI_EXTENSION_URI = `${A2UI_EXTENSION_BASE}v${A2UI_VERSION}`;

/** The metadata key a renderer's capabilities ride under on every message to an agent (A2UI). */
export const A2UI_RENDERER_CAPABILITIES_KEY = 'a2uiRendererCapabilities';

/**
 * The metadata key a renderer's data model rides under — the surfaces created with
 * `sendDataModel: true` — on a message to an agent (A2UI's data model sync).
 */
export const A2UI_RENDERER_DATA_MODEL_KEY = 'a2uiRendererDataModel';

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

/**
 * The one interface lent today, named by the A2UI runtime release it lends — `@a2ui/react` and
 * `@a2ui/web_core` — and the A2UI version its entry points speak (task-21.10 decision 11).
 */
export const HOST_INTERFACE_VERSION = `0.16.1-v${A2UI_VERSION}`;

/**
 * The host interfaces the platform supplies, by name: an artifact built against another — one
 * packed for `0.16.1`, the v0.9 entry points among them — is refused at publish, at install
 * (task-11.4 decision 4) and at load.
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
 * Exactly what the host lends (task-21.10 decision 12): Stellify externalizes these and refuses any
 * other specifier under a host package — the `@a2ui/web_core` root and `@a2ui/web_core/universal`
 * among them. `react-dom/client` is lent beside `react-dom` because React 19 keeps `createRoot`
 * there alone and design systems reach it (task 11.3); `@a2ui/react`'s root is its one entry point
 * for every protocol version; `@a2ui/web_core/v1_0` is the v1.0 runtime and
 * `@a2ui/web_core/catalogs/basic/v1` the v1 basic catalog, which a catalog building on it shares
 * with the page.
 */
export const HOST_SPECIFIERS = [
  'react',
  'react/jsx-runtime',
  'react-dom',
  'react-dom/client',
  'zod',
  '@a2ui/react',
  '@a2ui/web_core/v1_0',
  '@a2ui/web_core/catalogs/basic/v1',
] as const;

export type HostSpecifier = (typeof HOST_SPECIFIERS)[number];

/**
 * The export names of each module the host lends, as the client lends it: Stellify refuses at pack
 * a named import a lent module does not export. Generated from the client's own modules, which a
 * client test holds it to.
 */
export {HOST_EXPORTS} from './hostExports.generated.js';

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
/** The `1.0` part of the pinned `agent_capabilities.json`, which a v1.0 entry's params are read against, flat. */
const agentCapabilities = ajv.compile(
  (AGENT_CAPABILITIES_SCHEMA.properties as Record<string, Record<string, unknown>>)[A2UI_VERSION]!,
);

/** A params key that names a version, as the keyed wrapper writes it: `1.0`, `v0.9`. */
const isVersionKey = (key: string): boolean => /^v?\d/.test(key);
const once = (ids: readonly string[]): string[] => [...new Set(ids)];

/** A card that declares A2UI, and not v1.0: the versions it declares (task-21.10 decision 6). */
export interface OtherA2uiVersions {
  /** Each A2UI entry's version as its URI names it, after the base — `v0.9`, `v1.1` — once each. */
  versions: string[];
  /** Whether every one reads as a version below 1.0. */
  allOlder: boolean;
}

/**
 * What a card declares under the A2UI extension: its catalog ids, none for a card with no A2UI
 * entry — the basic-catalog fallback — or the errors that keep it from reading. A card declaring
 * A2UI but not v1.0 fails with a finding of its own, `otherVersions`.
 */
export type CardA2uiDeclaration =
  {ok: true; value: string[]} | {ok: false; errors: string[]; otherVersions?: OtherA2uiVersions};

/**
 * The catalog ids a card declares (task-21.10 decisions 5 and 6). Every entry of its
 * `capabilities.extensions` whose URI is under {@link A2UI_EXTENSION_BASE} is an A2UI entry. A card
 * with a v1.0 entry is read from its v1.0 entries alone, two of them merging: each one's params
 * validated against the `1.0` part of the pinned `agent_capabilities.json` and read flat, and a
 * params key naming a version — the keyed wrapper — an error naming the key. A card with A2UI
 * entries and none for v1.0 fails with the versions it declares and whether all of them read below
 * 1.0. A card with no A2UI entry, or a v1.0 entry naming no ids, declares nothing — the
 * basic-catalog fallback (task-11.2 decision 8). A malformed declaration is an error, never none.
 */
export function readSupportedCatalogIds(card: CardWithExtensions): CardA2uiDeclaration {
  const entries = (card.capabilities?.extensions ?? []).filter(
    entry => typeof entry.uri === 'string' && entry.uri.startsWith(A2UI_EXTENSION_BASE),
  );
  const ours = entries.filter(entry => entry.uri === A2UI_EXTENSION_URI);
  if (entries.length > 0 && ours.length === 0) {
    const versions = once(entries.map(entry => entry.uri.slice(A2UI_EXTENSION_BASE.length)));
    const allOlder = versions.every(readsBelowV1);
    return {
      ok: false,
      errors: [
        `the card declares A2UI ${versions.join(' and ')}, not v${A2UI_VERSION}${allOlder ? '' : ', among them a version after it'}`,
      ],
      otherVersions: {versions, allOlder},
    };
  }
  const ids: string[] = [];
  const errors: string[] = [];
  const where = `A2UI v${A2UI_VERSION} extension params`;
  for (const {params} of ours) {
    if (params === undefined) continue;
    const keyed = Object.keys(params).filter(isVersionKey);
    if (keyed.length > 0) {
      errors.push(
        ...keyed.map(
          key =>
            `${where}: keyed under ${JSON.stringify(key)}; v${A2UI_VERSION} params are read flat`,
        ),
      );
      continue;
    }
    const found = schemaErrors(agentCapabilities, params);
    if (found.length > 0) errors.push(...found.map(e => `${where}${e}`));
    else ids.push(...((params.supportedCatalogIds as string[] | undefined) ?? []));
  }
  return errors.length > 0 ? {ok: false, errors} : {ok: true, value: once(ids)};
}

/**
 * The `a2uiRendererCapabilities` metadata value the hub attaches: the ids this agent may paint in,
 * under v1.0's key — `{"1.0": {supportedCatalogIds}}`, and no older key beside it.
 */
export function rendererCapabilities(ids: readonly string[]): Record<string, unknown> {
  return {[A2UI_VERSION]: {supportedCatalogIds: [...ids]}};
}

/**
 * The `a2uiRendererDataModel` metadata value: the data model of each surface created with
 * `sendDataModel: true`, by surface id — `{version: "1.0", surfaces}`.
 */
export function rendererDataModel(surfaces: Readonly<Record<string, Record<string, unknown>>>): {
  version: string;
  surfaces: Record<string, Record<string, unknown>>;
} {
  return {version: A2UI_VERSION, surfaces: {...surfaces}};
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
