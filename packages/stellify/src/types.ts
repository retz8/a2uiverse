/** Stellify's public shapes. Self-contained on purpose: the sdk is inlined into the build, never a dependency of a vendor's. */

/** `stellify.config.ts`'s default export. Every field optional; an absent file means every default. */
export interface StellifyConfig {
  /** The built entry, relative to the package root. Default: what `exports["."]` (then `main`) names. */
  entry?: string;
  /** The catalog schema, relative to the package root. Default: `catalogs/v0.9.1/catalog.json`. */
  schema?: string;
  /** The catalog's id; must equal the schema's `catalogId` when set. */
  catalogId?: string;
  /** Where `pack` writes, relative to the package root. Default: `dist/artifact`. */
  outDir?: string;
}

/** What the API takes beside the config file: the same fields, for a caller without one, plus the host interface. */
export interface StellifyOptions extends StellifyConfig {
  /** The host-module interface version to build against. Default: the one the sdk lends today. */
  hostInterface?: string;
}

/** One thing that refuses the artifact: the file it is about, relative to the package root, and why. */
export interface Finding {
  file: string;
  reason: string;
}

/** `artifact.json`, as the sdk's catalog artifact contract defines it. */
export interface ArtifactDescriptor {
  catalogId: string;
  entry: string;
  schema: string;
  hostInterface: string;
  files: Record<string, string>;
  package: {name: string; version: string};
  packedBy: {tool: string; version: string};
}

/** What `stellify()` returns: the artifact in memory, or the findings that refuse it. */
export interface StellifyResult {
  /** The package packed, absolute. */
  packageDir: string;
  /** Where `pack` would write, absolute. */
  outDir: string;
  /** The descriptor, when there are no findings. */
  descriptor: ArtifactDescriptor | null;
  /** Every file of the artifact but the descriptor, by path relative to the artifact's root, sorted. */
  files: Map<string, Uint8Array>;
  /** Empty when the package packs. */
  findings: Finding[];
}

/** The publisher's home-directory configuration: one publisher per machine (task-13.4 decision 1). */
export interface PublisherRecord {
  /** The marketplace's address, given once at claim. */
  marketplace: string;
  /** The publisher's name. */
  publisher: string;
  /** The token the marketplace minted at claim; returned once, kept here, never printed. */
  token: string;
}

/** An app's preview, as the sdk's marketplace contract defines it: the smoke test's paint. */
export interface PreviewDocument {
  appId: string;
  /** The card version the paint was captured at. */
  version: string;
  /** The request text the agent was sent. */
  words: string;
  /** The A2UI server-to-client messages in order, surface ids as the agent wrote them. */
  messages: Record<string, unknown>[];
  capturedBy: 'marketplace' | 'publisher';
  capturedAt: string;
}

/** One of the publisher's apps ahead of the Store (phase-13 decision 14): what its live card declares and the Store lacks. */
export interface Notice {
  appId: string;
  catalogIds: string[];
  version?: string;
  /** When the marketplace saw the drift. */
  seenAt: string;
}

/** What `preview` takes (task-13.4 decisions 5–8, 12). */
export interface PreviewOptions {
  appId: string;
  cardUrl: string;
  /** Each packed artifact's files by path relative to its root, the descriptor among them. */
  catalogs: readonly ReadonlyMap<string, Uint8Array>[];
  /** The publisher's own credential for a card that requires sign-in; ignored for one that does not. */
  credential?: string;
  /** The marketplace's address, for the catalogs it already holds and the notices; none makes no contact. */
  marketplace?: string;
  /** The publisher's name, for the held rows and the notices. */
  publisher?: string;
  /** How long the card fetch may take. Default: 10 s. */
  cardTimeoutMs?: number;
  /** How long the smoke request may take. Default: 60 s. */
  smokeTimeoutMs?: number;
  now?: () => Date;
}

/** What `preview` returns: the document, or the findings that refuse it; never a throw. */
export interface PreviewResult {
  /** The captured paint, when there are no findings. */
  document: PreviewDocument | null;
  /** Whether the card requires sign-in; absent when the card could not be read. */
  signIn?: boolean;
  findings: string[];
  /** The publisher's apps ahead of the Store, when the marketplace was reached. */
  notices: Notice[];
  /** What happened that refuses nothing: a credential not sent, a marketplace not reached. */
  notes: string[];
}

export interface ClaimOptions {
  marketplace: string;
  /** The name to claim: lowercase letters, digits and hyphens, starting with a letter. */
  name: string;
}

export type ClaimResult =
  | {ok: true; marketplace: string; publisher: string; token: string}
  | {ok: false; status?: number; findings: string[]};

export interface PublishOptions {
  marketplace: string;
  token: string;
  appId: string;
  /** The card's full URL: the live card is what the marketplace fetches. */
  cardUrl: string;
  /** Each packed artifact's files by path relative to its root, the descriptor among them. */
  catalogs: readonly ReadonlyMap<string, Uint8Array>[];
  /** The paint `preview` captured, for an app whose card requires sign-in. */
  preview?: PreviewDocument;
}

export type PublishResult =
  | {ok: true; appId: string; version: string; summary: string; notes: string[]}
  | {ok: false; status?: number; findings: string[]};

export interface UnpublishOptions {
  marketplace: string;
  token: string;
  appId: string;
}

export type UnpublishResult =
  {ok: true; appId: string} | {ok: false; status?: number; findings: string[]};

export interface ListOptions {
  marketplace: string;
  publisher: string;
}

/** One of the publisher's apps as the marketplace lists it. */
export interface PublishedApp {
  appId: string;
  /** The card's version, the app's. */
  version: string;
  cardUrl: string;
  /** Catalog id to artifact id: the builds. */
  catalogs: Record<string, string>;
  /** Catalog ids this app once published and its current card no longer names. */
  retired: string[];
  publishedAt: string;
  /** What the live card declares and the Store lacks, when the marketplace flagged it. */
  aheadOfStore?: {catalogIds: string[]; version?: string; seenAt: string};
}

export type ListResult =
  {ok: true; apps: PublishedApp[]; notices: Notice[]} | {ok: false; findings: string[]};
