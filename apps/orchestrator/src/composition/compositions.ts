/**
 * The compositions of a session (task 9.3): one composition per A2A context, held from the utterance
 * that opened it until the user closes it, and after that a light record — enough for the trail's
 * ancestry to stay whole through it. In memory for the session (phase-9 decision 14); a reload
 * starts fresh on both sides.
 */
import {SHELL_SOURCE_ID} from '../registry/types.js';
import type {CompositionState} from './state.js';

/** What a closed composition leaves behind (task-9.3 decision 5): its line in an ancestry, nothing heavy. */
export interface ClosedComposition {
  utterance: string;
  title?: string;
  parent?: string;
  openedAt: number;
  closedAt: number;
  /** The sources that had answered, in slot order. */
  answered: string[];
  mergedView?: CompositionState['mergedView'];
}

export type HeldComposition =
  {kind: 'open'; state: CompositionState} | {kind: 'closed'; record: ClosedComposition};

/** How many compositions the recent-turns reader walks up the ancestry. */
export const ANCESTRY_DEPTH = 5;

export class Compositions {
  readonly #open = new Map<string, CompositionState>();
  readonly #closed = new Map<string, ClosedComposition>();

  /** The open composition in this context, if any. */
  get(contextId: string): CompositionState | undefined {
    return this.#open.get(contextId);
  }

  open(contextId: string, state: CompositionState): void {
    this.#open.set(contextId, state);
  }

  /** Every open composition. */
  openStates(): IterableIterator<CompositionState> {
    return this.#open.values();
  }

  /** Whether this context is a composition the session holds, open or closed. */
  has(contextId: string): boolean {
    return this.#open.has(contextId) || this.#closed.has(contextId);
  }

  isClosed(contextId: string): boolean {
    return this.#closed.has(contextId);
  }

  /** The composition in this context, open or closed. */
  find(contextId: string): HeldComposition | undefined {
    const state = this.#open.get(contextId);
    if (state) return {kind: 'open', state};
    const record = this.#closed.get(contextId);
    return record ? {kind: 'closed', record} : undefined;
  }

  /** A composition closed before it was planned: what its utterance turn knew, kept as its record. */
  closeUnplanned(contextId: string, record: ClosedComposition): void {
    this.#closed.set(contextId, record);
  }

  /** Closes the open composition in this context: its light record kept, the state let go. */
  close(contextId: string, closedAt = Date.now()): ClosedComposition | undefined {
    const state = this.#open.get(contextId);
    if (!state) return undefined;
    this.#open.delete(contextId);
    const record: ClosedComposition = {
      utterance: state.utterance,
      ...(state.title !== undefined ? {title: state.title} : {}),
      ...(state.parent !== undefined ? {parent: state.parent} : {}),
      openedAt: state.openedAt,
      closedAt,
      answered: [...state.slots.keys()].filter(
        appId => appId !== SHELL_SOURCE_ID && state.arrived.has(appId),
      ),
      ...(state.mergedView ? {mergedView: state.mergedView} : {}),
    };
    this.#closed.set(contextId, record);
    return record;
  }

  /**
   * The composition and its ancestors, oldest first, at most `depth` of them — the chain the user
   * walked to ask from this composition (task-9.3 decision 2). A parent the session does not hold ends
   * the chain.
   */
  ancestry(contextId: string, depth = ANCESTRY_DEPTH): HeldComposition[] {
    const chain: HeldComposition[] = [];
    const seen = new Set<string>();
    let at: string | undefined = contextId;
    while (at !== undefined && chain.length < depth && !seen.has(at)) {
      seen.add(at);
      const held = this.find(at);
      if (!held) break;
      chain.push(held);
      at = held.kind === 'open' ? held.state.parent : held.record.parent;
    }
    return chain.reverse();
  }
}
