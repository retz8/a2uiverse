/**
 * The preview's artifact files from the marketplace (task-14.4 decisions 4, 5), checked as install
 * checks them before any is served: the descriptor's bytes hash to the artifact id in the path,
 * and each file's bytes to the hash the descriptor lists for its path. Nothing is written into the
 * registry; a descriptor that checked out is held in memory, so each later file costs one hash.
 */
import {
  ARTIFACT_DESCRIPTOR_FILE,
  artifactIdOf,
  hashArtifactFile,
  validateArtifactDescriptor,
} from '@a2uiverse/sdk';
import type {MarketplaceClient} from '../registry/marketplace.js';

/** What a relayed file came to. */
export type RelayedFile =
  | {kind: 'file'; bytes: Uint8Array}
  /** No such artifact at the marketplace, or no such file in its descriptor. */
  | {kind: 'not-found'}
  | {kind: 'unreached'; reason: string}
  /** The bytes are not what their id or their descriptor says: refused, never served. */
  | {kind: 'mismatch'; reason: string};

type HeldDescriptor =
  | {kind: 'descriptor'; bytes: Uint8Array; files: Readonly<Record<string, string>>}
  | Exclude<RelayedFile, {kind: 'file'}>;

export class ArtifactRelay {
  readonly #marketplace: MarketplaceClient;
  /** Descriptors that checked out, by artifact id; a failure is not held, so the next read asks again. */
  readonly #descriptors = new Map<string, Promise<HeldDescriptor>>();

  constructor(marketplace: MarketplaceClient) {
    this.#marketplace = marketplace;
  }

  async file(artifactId: string, path: string): Promise<RelayedFile> {
    const descriptor = await this.#descriptor(artifactId);
    if (descriptor.kind !== 'descriptor') return descriptor;
    if (path === ARTIFACT_DESCRIPTOR_FILE) return {kind: 'file', bytes: descriptor.bytes};
    const expected = descriptor.files[path];
    if (expected === undefined) return {kind: 'not-found'};
    const fetched = await this.#marketplace.fetchFile(artifactId, path);
    if (fetched.kind !== 'bytes') return fetched;
    const actual = await hashArtifactFile(fetched.bytes);
    if (actual !== expected) {
      return {
        kind: 'mismatch',
        reason: `${artifactId}/${path} hashes to ${actual}, its descriptor says ${expected}`,
      };
    }
    return {kind: 'file', bytes: fetched.bytes};
  }

  #descriptor(artifactId: string): Promise<HeldDescriptor> {
    let held = this.#descriptors.get(artifactId);
    if (!held) {
      held = this.#fetchDescriptor(artifactId);
      this.#descriptors.set(artifactId, held);
      void held.then(result => {
        if (result.kind !== 'descriptor') this.#descriptors.delete(artifactId);
      });
    }
    return held;
  }

  async #fetchDescriptor(artifactId: string): Promise<HeldDescriptor> {
    const fetched = await this.#marketplace.fetchFile(artifactId, ARTIFACT_DESCRIPTOR_FILE);
    if (fetched.kind !== 'bytes') return fetched;
    const id = await artifactIdOf(fetched.bytes);
    if (id !== artifactId) {
      return {kind: 'mismatch', reason: `the descriptor served as ${artifactId} hashes to ${id}`};
    }
    let parsed: unknown;
    try {
      parsed = JSON.parse(new TextDecoder().decode(fetched.bytes));
    } catch (err) {
      return {
        kind: 'mismatch',
        reason: `${artifactId}'s descriptor is not JSON: ${(err as Error).message}`,
      };
    }
    const descriptor = validateArtifactDescriptor(parsed);
    if (!descriptor.ok) {
      return {
        kind: 'mismatch',
        reason: `${artifactId}'s descriptor does not read: ${descriptor.errors.join('; ')}`,
      };
    }
    return {kind: 'descriptor', bytes: fetched.bytes, files: descriptor.value.files};
  }
}
