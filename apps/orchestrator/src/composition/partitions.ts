import {parseSurfaceId, resolvePointer, type Ref, type Resolution} from '@a2uiverse/sdk';
import type {VendorEvent} from '../agentsPool/relay.js';
import {a2uiMessagesIn, partsOf} from '../journal/surfaces.js';

type Model = Record<string, unknown>;

/** A read-only window on some sources' partitions. */
export interface PartitionsView {
  has(surface: string): boolean;
  get(surface: string): unknown;
  entries(): Array<[surface: string, model: unknown]>;
  resolve(ref: Ref): Resolution;
}

/**
 * The orchestrator's materialized copy of every surface's data model, keyed by
 * namespaced surface id — the Synthesizer's input (SPEC §10: all partitions,
 * names and values) and what the IntegrityChecker resolves refs against.
 */
export class Partitions {
  readonly #models = new Map<string, Model>();

  /** Applies the A2UI ops in a relayed event; returns the surfaces whose data changed. */
  apply(event: VendorEvent): string[] {
    const changed: string[] = [];
    for (const part of partsOf(event)) {
      if (part.kind !== 'data') continue;
      for (const message of a2uiMessagesIn(part.data)) {
        const surface = this.#applyMessage(message);
        if (surface && !changed.includes(surface)) changed.push(surface);
      }
    }
    return changed;
  }

  /** The client's returned view of its surfaces (two-way edits); returns the known surfaces that changed. */
  applyClientDataModel(surfaces: Record<string, unknown>): string[] {
    const changed: string[] = [];
    for (const [surface, model] of Object.entries(surfaces)) {
      if (!this.#models.has(surface) || typeof model !== 'object' || model === null) continue;
      if (deepEqual(this.#models.get(surface), model)) continue;
      this.#models.set(surface, structuredClone(model) as Model);
      changed.push(surface);
    }
    return changed;
  }

  get(surface: string): unknown {
    return this.#models.get(surface);
  }

  has(surface: string): boolean {
    return this.#models.has(surface);
  }

  entries(): Array<[surface: string, model: unknown]> {
    return [...this.#models.entries()];
  }

  /** Whether the source holds a surface now: what arriving means (task-8.3 decision 5). */
  holdsSurfaceOf(appId: string): boolean {
    return [...this.#models.keys()].some(surface => parseSurfaceId(surface)?.appId === appId);
  }

  /**
   * The partitions of the given sources only — the merge's source set, or the sources one
   * synthesis runs over (task-8.3 decision 11). A surface of any other source is not there: the
   * Synthesizer's refs into it are refused, and the IntegrityChecker's walk does not see it.
   */
  view(appIds: ReadonlySet<string>): PartitionsView {
    const within = (surface: string) => appIds.has(parseSurfaceId(surface)?.appId ?? '');
    return {
      has: surface => within(surface) && this.has(surface),
      get: surface => (within(surface) ? this.get(surface) : undefined),
      entries: () => this.entries().filter(([surface]) => within(surface)),
      resolve: ref => (within(ref.surface) ? this.resolve(ref) : {found: false, reason: 'missing'}),
    };
  }

  /** What the given sources' surfaces hold now, to ask later what changed (task-8.10 decision 2). */
  snapshot(appIds: ReadonlySet<string>): ReadonlyMap<string, unknown> {
    return new Map(this.view(appIds).entries());
  }

  /** The given sources' surfaces holding other data than at the snapshot — added and gone ones too. */
  changedSince(snapshot: ReadonlyMap<string, unknown>, appIds: ReadonlySet<string>): string[] {
    const now = new Map(this.view(appIds).entries());
    const surfaces = new Set([...snapshot.keys(), ...now.keys()]);
    return [...surfaces].filter(
      surface =>
        snapshot.has(surface) !== now.has(surface) ||
        !deepEqual(snapshot.get(surface), now.get(surface)),
    );
  }

  /**
   * Resolves a ref through the sdk's kit (phase decision 23): a value, or absent with the
   * reason — which the checklist reports, so a positional segment is named as the rule it
   * broke rather than as missing data (task-5.10 decision 8).
   */
  resolve(ref: Ref): Resolution {
    const model = this.#models.get(ref.surface);
    if (model === undefined) return {found: false, reason: 'missing'};
    return resolvePointer(model, ref.pointer);
  }

  #applyMessage(message: Record<string, unknown>): string | undefined {
    const create = op(message.createSurface);
    if (create) {
      const surface = create.surfaceId as string;
      // One surface per slot (SPEC §4.1: repaint is surface replacement): a source's later
      // surface retires its earlier one, as the client's slot does — a vendor that paints a
      // detail as a new surface never deletes its list, and refs into a surface the canvas no
      // longer holds must stop resolving here too, or absence is seen on one side only.
      const appId = parseSurfaceId(surface)?.appId;
      if (appId !== undefined) {
        for (const other of [...this.#models.keys()]) {
          if (other !== surface && parseSurfaceId(other)?.appId === appId) {
            this.#models.delete(other);
          }
        }
      }
      this.#models.set(surface, {});
      return undefined;
    }
    const remove = op(message.deleteSurface);
    if (remove) {
      // Removal is absence: refs stop resolving and may resolve again.
      this.#models.delete(remove.surfaceId as string);
      return undefined;
    }
    const update = op(message.updateDataModel);
    if (update) {
      const surface = update.surfaceId as string;
      const path = typeof update.path === 'string' ? update.path : '';
      const before = this.#models.get(surface) ?? {};
      const after = setPointer(before, path, structuredClone(update.value));
      if (deepEqual(before, after)) return undefined;
      this.#models.set(surface, after);
      return surface;
    }
    return undefined;
  }
}

function op(value: unknown): Record<string, unknown> | undefined {
  return typeof value === 'object' && value !== null
    ? (value as Record<string, unknown>)
    : undefined;
}

function deepEqual(a: unknown, b: unknown): boolean {
  if (a === b) return true;
  if (typeof a !== 'object' || typeof b !== 'object' || a === null || b === null) return false;
  if (Array.isArray(a) !== Array.isArray(b)) return false;
  if (Array.isArray(a)) {
    return (
      a.length === (b as unknown[]).length && a.every((v, i) => deepEqual(v, (b as unknown[])[i]))
    );
  }
  const ka = Object.keys(a);
  const kb = Object.keys(b);
  if (ka.length !== kb.length) return false;
  return ka.every(k => k in (b as object) && deepEqual((a as Model)[k], (b as Model)[k]));
}

function tokens(pointer: string): string[] {
  // A2UI's `updateDataModel.path` defaults to "/" and means the root (spec: "Defaults to `/`"),
  // where RFC 6901 would read "/" as the empty-string key. The root wins: no data model keys
  // itself on "", and a mock's whole-model paint at "/" must land as the model, not under "".
  if (pointer === '' || pointer === '/') return [];
  return pointer
    .split('/')
    .slice(1)
    .map(t => t.replace(/~1/g, '/').replace(/~0/g, '~'));
}

/** Immutable set: returns a new root with `value` at `pointer` (root when empty), creating objects on the way. */
function setPointer(root: Model, pointer: string, value: unknown): Model {
  const path = tokens(pointer);
  if (path.length === 0) {
    return typeof value === 'object' && value !== null && !Array.isArray(value)
      ? (value as Model)
      : {};
  }
  const out: Model = {...root};
  let cursor: Record<string, unknown> | unknown[] = out;
  path.forEach((token, i) => {
    const last = i === path.length - 1;
    if (Array.isArray(cursor)) {
      const idx = Number(token);
      if (last) cursor[idx] = value;
      else {
        const next = cursor[idx];
        const copy = Array.isArray(next) ? [...next] : {...(next as Model | undefined)};
        cursor[idx] = copy;
        cursor = copy;
      }
    } else if (last) {
      cursor[token] = value;
    } else {
      const next = cursor[token];
      const copy = Array.isArray(next) ? [...next] : {...(next as Model | undefined)};
      cursor[token] = copy;
      cursor = copy;
    }
  });
  return out;
}
