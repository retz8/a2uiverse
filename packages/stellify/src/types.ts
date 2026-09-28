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
