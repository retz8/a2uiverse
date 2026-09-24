import {parseSurfaceId} from '@a2uiverse/sdk';
import type {VendorEvent} from '../agentsPool/relay.js';
import {a2uiMessagesIn, partsOf} from '../journal/surfaces.js';
import {SHELL_SOURCE_ID} from '../registry/types.js';
import type {LiveSynthesis} from './state.js';

/** Where a source stands in its history: how many steps it has, and the one on screen. */
export interface Stack {
  length: number;
  at: number;
}

/** What is remembered per combination of steps: the wiring accepted over it, and the merge's set. */
export interface Remembered {
  synthesis: LiveSynthesis;
  merged: ReadonlySet<string>;
}

/**
 * The fragment's history on the composition (SPEC §6.5, task 9.4). Each agent's paints in the
 * canvas are a linear back/forward stack, one step per `createSurface` from that source in
 * stream order — a repeat of the same id, a new id, a question surface alike — counted from 0
 * and the same way the client counts, so the index a step reports names the same paint on both
 * sides; an `updateDataModel` changes the current step and a `deleteSurface` counts nothing. A
 * create after a step back takes the next index and drops the steps past it. The wiring the
 * merged view accepted is remembered per combination of every painted source's current index,
 * so a step back to a combination already seen restores it with no call; an entry filed with a
 * source at a dropped index is purged, its index reused by a paint it was never accepted over.
 * The shell's own surfaces never count. Nothing here is a paint: the client holds each step's
 * tree and data model (task-9.2 decision 7).
 */
export class History {
  readonly #stacks = new Map<string, Stack>();
  readonly #remembered = new Map<string, Remembered>();

  /** Counts every create in a relayed event as a step of its source. */
  observe(event: VendorEvent): void {
    for (const part of partsOf(event)) {
      if (part.kind !== 'data') continue;
      for (const message of a2uiMessagesIn(part.data)) {
        const create = message.createSurface;
        if (typeof create !== 'object' || create === null) continue;
        const surfaceId = (create as {surfaceId?: unknown}).surfaceId;
        if (typeof surfaceId !== 'string') continue;
        const appId = parseSurfaceId(surfaceId)?.appId;
        if (appId === undefined || appId === SHELL_SOURCE_ID) continue;
        this.#paint(appId);
      }
    }
  }

  stackOf(appId: string): Stack | undefined {
    const stack = this.#stacks.get(appId);
    return stack ? {...stack} : undefined;
  }

  /** The client reported the fragment at `index`: true when the stack holds that step. */
  stepTo(appId: string, index: number): boolean {
    const stack = this.#stacks.get(appId);
    if (!stack || index < 0 || index >= stack.length) return false;
    stack.at = index;
    return true;
  }

  /** Every painted source's current index — the key the wiring is remembered under. */
  combination(): Record<string, number> {
    return Object.fromEntries([...this.#stacks].map(([appId, {at}]) => [appId, at]));
  }

  /** Files the wiring under the current combination, over an earlier entry there. */
  remember(entry: Remembered): void {
    this.#remembered.set(this.#key(), entry);
  }

  /** The wiring accepted over the current combination, when it was seen. */
  recall(): Remembered | undefined {
    return this.#remembered.get(this.#key());
  }

  #paint(appId: string): void {
    const stack = this.#stacks.get(appId);
    if (!stack) {
      this.#stacks.set(appId, {length: 1, at: 0});
      return;
    }
    if (stack.at < stack.length - 1) this.#drop(appId, stack.at + 1);
    stack.length = stack.at + 2;
    stack.at = stack.length - 1;
  }

  /** The steps of `appId` from `index` on are gone: so is every entry filed with one of them. */
  #drop(appId: string, index: number): void {
    for (const key of [...this.#remembered.keys()]) {
      const at = keyOf(key)[appId];
      if (at !== undefined && at >= index) this.#remembered.delete(key);
    }
  }

  #key(): string {
    return JSON.stringify(
      [...this.#stacks]
        .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
        .map(([id, s]) => [id, s.at]),
    );
  }
}

function keyOf(key: string): Record<string, number> {
  return Object.fromEntries(JSON.parse(key) as [string, number][]);
}
