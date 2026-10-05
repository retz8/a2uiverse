import {parseSurfaceId} from '@a2uiverse/sdk';
import type {VendorEvent} from '../agentsPool/relay.js';
import {a2uiMessagesIn, partsOf} from '../journal/surfaces.js';
import {SHELL_SOURCE_ID} from '../registry/types.js';
import type {LiveSynthesis} from './state.js';

/** A source's paints: how many it has made in this composition, and the one on screen. */
export interface Paints {
  count: number;
  at: number;
}

/** What is remembered per combination of paints: the wiring accepted over it, and the merge's set. */
export interface Remembered {
  synthesis: LiveSynthesis;
  merged: ReadonlySet<string>;
}

/** A wiring remembered over fewer sources than paint now: the sources that painted since. */
export interface Covering {
  remembered: Remembered;
  since: string[];
}

/**
 * The fragment's history on the composition (SPEC §6.5, tasks 9.4 and 10.9). Each agent's paints in
 * the composition are numbered by paint id, one per `createSurface` from that source in stream
 * order — a repeat of the same id, a new id, a question surface alike — counted from 0 and the
 * same way the client counts, so the paint id a step reports names the same paint on both sides;
 * an `updateDataModel` changes the paint on screen and a `deleteSurface` counts nothing. No paint
 * is ever dropped: the list of visits the arrows walk lives on the client alone, and the
 * orchestrator keeps which paint each source has on screen (task-10.9 decision 6). The wiring the
 * merged view accepted is remembered per combination of every painted source's paint on screen,
 * so a step to a combination already seen restores it with no call, whatever route reached it. A
 * combination never seen is covered by one remembered over fewer sources — every source it names
 * on the paint it shows now, the rest having painted since (task-9.9 decision 16). The shell's
 * own surfaces never count. Nothing here is a paint: the client holds each paint's tree and data
 * model (task-9.2 decision 7).
 */
export class History {
  readonly #paints = new Map<string, Paints>();
  readonly #remembered = new Map<string, Remembered>();

  /** Counts every create in a relayed event as a paint of its source, the newest on screen. */
  observe(event: VendorEvent): void {
    for (const part of partsOf(event)) {
      if (part.kind !== 'data') continue;
      for (const message of a2uiMessagesIn(part.data)) {
        const create = message.createSurface;
        if (typeof create !== 'object' || create === null) continue;
        const surfaceId = (create as {surfaceId?: unknown}).surfaceId;
        if (typeof surfaceId !== 'string') continue;
        const source = parseSurfaceId(surfaceId)?.source;
        if (source === undefined || source === SHELL_SOURCE_ID) continue;
        this.#paint(source);
      }
    }
  }

  paintsOf(source: string): Paints | undefined {
    const paints = this.#paints.get(source);
    return paints ? {...paints} : undefined;
  }

  /** The client reported the fragment showing paint `id`: true when the source made that paint. */
  stepTo(source: string, id: number): boolean {
    const paints = this.#paints.get(source);
    if (!paints || id < 0 || id >= paints.count) return false;
    paints.at = id;
    return true;
  }

  /** Every painted source's paint on screen — the key the wiring is remembered under. */
  combination(): Record<string, number> {
    return Object.fromEntries([...this.#paints].map(([source, {at}]) => [source, at]));
  }

  /** Files the wiring under the current combination, over an earlier entry there. */
  remember(entry: Remembered): void {
    this.#remembered.set(this.#key(), entry);
  }

  /** The wiring accepted over the current combination, when it was seen. */
  recall(): Remembered | undefined {
    return this.#remembered.get(this.#key());
  }

  /**
   * The wiring remembered over fewer sources than paint now, every source it names on the paint
   * it shows now: the one naming the most sources, the later filed on a tie. Undefined when none
   * covers the current combination.
   */
  recallCovering(): Covering | undefined {
    const now = this.combination();
    let best: {remembered: Remembered; named: string[]} | undefined;
    for (const [key, remembered] of this.#remembered) {
      const named = Object.entries(keyOf(key));
      if (named.length >= Object.keys(now).length) continue;
      if (!named.every(([source, at]) => now[source] === at)) continue;
      if (best && named.length < best.named.length) continue;
      best = {remembered, named: named.map(([source]) => source)};
    }
    if (!best) return undefined;
    const named = new Set(best.named);
    return {
      remembered: best.remembered,
      since: Object.keys(now).filter(source => !named.has(source)),
    };
  }

  #paint(source: string): void {
    const paints = this.#paints.get(source);
    if (!paints) {
      this.#paints.set(source, {count: 1, at: 0});
      return;
    }
    paints.at = paints.count;
    paints.count += 1;
  }

  #key(): string {
    return JSON.stringify(
      [...this.#paints]
        .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
        .map(([id, s]) => [id, s.at]),
    );
  }
}

function keyOf(key: string): Record<string, number> {
  return Object.fromEntries(JSON.parse(key) as [string, number][]);
}
