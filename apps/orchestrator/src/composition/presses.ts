/** A press the merge waited on (task-8.10 decision 7): its source and how long it held the merge. */
export interface PressWait {
  source: string;
  ms: number;
}

/**
 * The reader's presses in flight on one composition, per source (task-8.10 decision 1): a press
 * runs from the action's arrival until its dispatch settles — answered, failed, or at the hard
 * cap. A source with a press in flight is not quiescent, and the merge that would read it waits.
 */
export class Presses {
  readonly #inFlight = new Map<string, number>();
  /**
   * A renderer function's answer on its way to its agent (task-21.13 decision 9): in flight for
   * the merge, as a press is, and never a press the one-at-a-time rule refuses another for.
   */
  readonly #answering = new Map<string, number>();
  readonly #listeners = new Set<(source: string) => void>();

  begin(source: string, kind: 'press' | 'answer' = 'press'): void {
    const counts = kind === 'press' ? this.#inFlight : this.#answering;
    counts.set(source, (counts.get(source) ?? 0) + 1);
  }

  end(source: string, kind: 'press' | 'answer' = 'press'): void {
    const counts = kind === 'press' ? this.#inFlight : this.#answering;
    const left = (counts.get(source) ?? 1) - 1;
    if (left > 0) counts.set(source, left);
    else counts.delete(source);
    for (const listener of [...this.#listeners]) listener(source);
  }

  /** Whether `source` has a press in flight. */
  running(source: string): boolean {
    return this.#inFlight.has(source);
  }

  /** The sources among `sources` with a press or a function's answer in flight. */
  pressing(sources: ReadonlySet<string>): string[] {
    return [...sources].filter(source => this.#inFlight.has(source) || this.#answering.has(source));
  }

  /** Calls `listener` each time a press ends; returns the unsubscribe. */
  onEnd(listener: (source: string) => void): () => void {
    this.#listeners.add(listener);
    return () => this.#listeners.delete(listener);
  }

  /**
   * Resolves once no source of `within()` — read afresh after every press ends — has a press in
   * flight, or when `signal` aborts; returns each source it waited on and for how long.
   */
  async quiet(within: () => ReadonlySet<string>, signal?: AbortSignal): Promise<PressWait[]> {
    const startedAt = Date.now();
    const waits: PressWait[] = [];
    const waiting = new Set<string>();
    for (;;) {
      const pressing = new Set(this.pressing(within()));
      for (const source of waiting) {
        if (pressing.has(source)) continue;
        waiting.delete(source);
        waits.push({source, ms: Date.now() - startedAt});
      }
      if (pressing.size === 0 || signal?.aborted) return waits;
      for (const source of pressing) waiting.add(source);
      await this.#nextEnd(signal);
    }
  }

  #nextEnd(signal: AbortSignal | undefined): Promise<void> {
    return new Promise(resolve => {
      const done = () => {
        unsubscribe();
        signal?.removeEventListener('abort', done);
        resolve();
      };
      const unsubscribe = this.onEnd(done);
      signal?.addEventListener('abort', done, {once: true});
    });
  }
}
