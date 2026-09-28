/**
 * The catalog artifact (SPEC §9.1, task 11.2): the descriptor `artifact.json` at the root of a
 * packed catalog, and the checks over its files. Normative definition:
 * `../contracts/catalog-artifact.v1.schema.json`, mirrored here as the schema the sdk compiles —
 * the sdk runs in the browser too — and asserted equal by `catalog.contract.test.ts`. The pack
 * tool writes a descriptor; the marketplace, the registry and the client validate it with this one
 * compiled schema and one error format.
 */
import {Ajv2020} from 'ajv/dist/2020.js';
import {schemaErrors, type Validation} from './validate.js';

/** The descriptor's file name at the artifact's root. */
export const ARTIFACT_DESCRIPTOR_FILE = 'artifact.json';

/** The version of the descriptor contract this projection writes and reads. */
export const ARTIFACT_CONTRACT_VERSION = '1.0.0';

/** A path relative to the artifact's root: no leading slash, no `..` segment, no backslash. */
const RELATIVE_PATH_PATTERN = '^(?!/)(?!.*(^|/)\\.\\.(/|$))[^\\\\]+$';

/** `sha256-<base64>`: a SHA-256 digest is 32 bytes, 43 base64 characters and one `=`. */
const HASH_PATTERN = '^sha256-[A-Za-z0-9+/]{43}=$';

export const ARTIFACT_DESCRIPTOR_SCHEMA = {
  $schema: 'https://json-schema.org/draft/2020-12/schema',
  $id: 'https://a2uiverse.dev/contracts/catalog-artifact/v1',
  title: 'A2UIVerse catalog artifact descriptor',
  description:
    'artifact.json at the root of a catalog artifact (catalog.v1.json, artifact). Written by the pack tool; validated by the marketplace at publish, the registry at install and the client at load, with one compiled schema.',
  type: 'object',
  additionalProperties: false,
  required: [
    'contract',
    'catalogId',
    'entry',
    'schema',
    'hostInterface',
    'files',
    'package',
    'packedBy',
  ],
  properties: {
    contract: {
      type: 'string',
      pattern: '^1\\.[0-9]+\\.[0-9]+$',
      description:
        'The version of this descriptor contract the artifact was written to; its own line, apart from hostInterface.',
    },
    catalogId: {
      type: 'string',
      minLength: 1,
      description:
        "The catalog's id — CATALOG.id, equal to the catalogId inside the schema file. Not necessarily a resolvable URI (A2UI).",
    },
    entry: {
      $ref: '#/$defs/relativePath',
      description: "The one ESM, relative to the artifact's root; a key of files.",
    },
    schema: {
      $ref: '#/$defs/relativePath',
      description: "The catalog's catalog.json, relative to the artifact's root; a key of files.",
    },
    hostInterface: {
      type: 'string',
      pattern: '^[0-9]+\\.[0-9]+\\.[0-9]+$',
      description:
        'The version of the host-module interface the entry was built against — the A2UI version the host lends.',
    },
    files: {
      type: 'object',
      minProperties: 2,
      propertyNames: {$ref: '#/$defs/relativePath'},
      additionalProperties: {
        type: 'string',
        pattern: HASH_PATTERN,
        description: "The file's SHA-256 digest, base64, in the sha256-<base64> form.",
      },
      description:
        "Every file of the artifact but this descriptor, by path relative to the artifact's root, with its hash.",
    },
    package: {
      type: 'object',
      additionalProperties: false,
      required: ['name', 'version'],
      properties: {
        name: {type: 'string', minLength: 1},
        version: {type: 'string', minLength: 1},
      },
      description:
        'The catalog package the artifact was packed from, as its package.json names it.',
    },
    packedBy: {
      type: 'object',
      additionalProperties: false,
      required: ['tool', 'version'],
      properties: {
        tool: {type: 'string', minLength: 1},
        version: {type: 'string', minLength: 1},
      },
      description: 'The pack tool build that wrote the artifact.',
    },
  },
  $defs: {
    relativePath: {
      type: 'string',
      pattern: RELATIVE_PATH_PATTERN,
      description:
        "A path relative to the artifact's root: no leading slash, no .. segment, no backslash.",
    },
  },
} as const;

export interface ArtifactDescriptor {
  contract: string;
  catalogId: string;
  entry: string;
  schema: string;
  hostInterface: string;
  files: Record<string, string>;
  package: {name: string; version: string};
  packedBy: {tool: string; version: string};
}

const ajv = new Ajv2020({allErrors: true, strict: true, allowUnionTypes: true});
const descriptorSchema = ajv.compile(ARTIFACT_DESCRIPTOR_SCHEMA);

/**
 * A descriptor against the schema, then what the schema cannot say: the entry and the schema file
 * are listed among the files.
 */
export function validateArtifactDescriptor(input: unknown): Validation<ArtifactDescriptor> {
  const errors = schemaErrors(descriptorSchema, input);
  if (errors.length > 0) return {ok: false, errors};
  const descriptor = input as ArtifactDescriptor;
  for (const field of ['entry', 'schema'] as const) {
    if (!(descriptor[field] in descriptor.files)) {
      errors.push(`/${field}: ${JSON.stringify(descriptor[field])} is not listed in files`);
    }
  }
  return errors.length === 0 ? {ok: true, value: descriptor} : {ok: false, errors};
}

function toBase64(bytes: Uint8Array): string {
  let binary = '';
  for (let i = 0; i < bytes.length; i += 0x8000) {
    binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  }
  return btoa(binary);
}

/** A file's hash in the descriptor's form, `sha256-<base64>`, by Web Crypto — Node and the browser alike. */
export async function hashArtifactFile(bytes: Uint8Array): Promise<string> {
  const digest = await globalThis.crypto.subtle.digest('SHA-256', bytes as BufferSource);
  return `sha256-${toBase64(new Uint8Array(digest))}`;
}

/**
 * The artifact's files against its descriptor: every listed file present with its hash, no file
 * present that is not listed. `files` is every file of the artifact but the descriptor, by path
 * relative to the root. Empty when they agree.
 */
export async function verifyArtifactFiles(
  descriptor: ArtifactDescriptor,
  files: ReadonlyMap<string, Uint8Array>,
): Promise<string[]> {
  const errors: string[] = [];
  for (const [path, expected] of Object.entries(descriptor.files)) {
    const bytes = files.get(path);
    if (bytes === undefined) {
      errors.push(`${path}: listed in the descriptor but missing`);
      continue;
    }
    const actual = await hashArtifactFile(bytes);
    if (actual !== expected)
      errors.push(`${path}: hash is ${actual}, the descriptor says ${expected}`);
  }
  for (const path of files.keys()) {
    if (!(path in descriptor.files))
      errors.push(`${path}: present but not listed in the descriptor`);
  }
  return errors;
}

/**
 * The artifact's catalog schema against its descriptor: an object whose `catalogId` is the
 * descriptor's and whose `components` is an object. Whether the schema's components validate a
 * tree is the A2UI validator's, which compiles it.
 */
export function checkArtifactSchema(descriptor: ArtifactDescriptor, schema: unknown): string[] {
  if (typeof schema !== 'object' || schema === null || Array.isArray(schema)) {
    return [`${descriptor.schema}: not a JSON object`];
  }
  const errors: string[] = [];
  const {catalogId, components} = schema as Record<string, unknown>;
  if (catalogId !== descriptor.catalogId) {
    errors.push(
      `${descriptor.schema}: catalogId is ${JSON.stringify(catalogId)}, the descriptor says ${JSON.stringify(descriptor.catalogId)}`,
    );
  }
  if (typeof components !== 'object' || components === null || Array.isArray(components)) {
    errors.push(`${descriptor.schema}: components is not an object`);
  }
  return errors;
}
