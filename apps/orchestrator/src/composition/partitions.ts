import type {Ref} from '@a2uiverse/sdk';
import type {VendorEvent} from '../agentsPool/relay.js';
import {a2uiMessagesIn, partsOf} from '../journal/surfaces.js';

type Model = Record<string, unknown>;

/**
 * The orchestrator's materialized copy of every surface's data model, keyed by
 * namespaced surface id — the Synthesizer's input (SPEC §10: all partitions,
 * names and values) and the generation bookkeeping the IntegrityChecker reads.
 *
 * Generations (task-4.4 decision 3): per surface, an integer that only goes up.
 * Before the first synthesis there is no snapshot, so any change bumps (SPEC §5
 * t5, arrival). After `snapshot()` a change bumps only when an array present in
 * the snapshot is present now with different contents — the one change that can
 * silently re-point an index ref. A missing array is absent, not invalid; an
 * identical one is nothing. Arrays only: a scalar outside any array is free.
 */
export class Partitions {
  readonly #models = new Map<string, Model>();
  readonly #generations = new Map<string, number>();
  #snapshot: Map<string, Model> | undefined;

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
      this.#afterChange(surface);
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

  resolve(ref: Ref): {found: true; value: unknown} | {found: false} {
    const model = this.#models.get(ref.surface);
    if (model === undefined) return {found: false};
    return resolvePointer(model, ref.pointer);
  }

  generation(surface: string): number {
    return this.#generations.get(surface) ?? 0;
  }

  generations(): Record<string, number> {
    return Object.fromEntries(this.#generations);
  }

  generationsOf(surfaces: readonly string[]): Record<string, number> {
    return Object.fromEntries(surfaces.map(s => [s, this.generation(s)]));
  }

  /** Records the live models as the baseline the next wiring is computed against. */
  snapshot(): void {
    this.#snapshot = new Map(
      [...this.#models].map(([s, m]) => [s, structuredClone(m)] as [string, Model]),
    );
  }

  #applyMessage(message: Record<string, unknown>): string | undefined {
    const create = op(message.createSurface);
    if (create) {
      const surface = create.surfaceId as string;
      this.#models.set(surface, {});
      this.#generations.set(surface, this.#generations.get(surface) ?? 0);
      return undefined;
    }
    const remove = op(message.deleteSurface);
    if (remove) {
      // Removal is absence, never a bump: refs stop resolving and may resolve again.
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
      this.#afterChange(surface);
      return surface;
    }
    return undefined;
  }

  #afterChange(surface: string): void {
    const base = this.#snapshot?.get(surface);
    if (base === undefined) {
      this.#bump(surface);
      return;
    }
    if (anyArrayRepointed(base, this.#models.get(surface))) this.#bump(surface);
  }

  #bump(surface: string): void {
    this.#generations.set(surface, this.generation(surface) + 1);
  }
}

function op(value: unknown): Record<string, unknown> | undefined {
  return typeof value === 'object' && value !== null
    ? (value as Record<string, unknown>)
    : undefined;
}

/**
 * True when an array in `base` is present at the same path in `live` with
 * different contents. A missing array is absence; an equal one is nothing.
 */
function anyArrayRepointed(base: unknown, live: unknown): boolean {
  if (Array.isArray(base)) {
    if (!Array.isArray(live)) return false;
    return !deepEqual(base, live);
  }
  if (typeof base !== 'object' || base === null) return false;
  if (typeof live !== 'object' || live === null) return false;
  for (const [key, value] of Object.entries(base)) {
    if (anyArrayRepointed(value, (live as Record<string, unknown>)[key])) return true;
  }
  return false;
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
  if (pointer === '') return [];
  return pointer
    .split('/')
    .slice(1)
    .map(t => t.replace(/~1/g, '/').replace(/~0/g, '~'));
}

function resolvePointer(
  root: unknown,
  pointer: string,
): {found: true; value: unknown} | {found: false} {
  let node: unknown = root;
  for (const token of tokens(pointer)) {
    if (Array.isArray(node)) {
      const i = Number(token);
      if (!Number.isInteger(i) || i < 0 || i >= node.length) return {found: false};
      node = node[i];
    } else if (typeof node === 'object' && node !== null && token in node) {
      node = (node as Model)[token];
    } else {
      return {found: false};
    }
  }
  return {found: true, value: node};
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
