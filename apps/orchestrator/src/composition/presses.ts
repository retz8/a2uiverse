/** A press the merge waited on (task-8.10 decision 7): its source and how long it held the merge. */
export interface PressWait {
  appId: string;
  ms: number;
}

/**
 * The reader's presses in flight on one composition, per source (task-8.10 decision 1): a press
 * runs from the action's arrival until its dispatch settles — answered, failed, or at the hard
 * cap. A source with a press in flight is not quiescent, and the merge that would read it waits.
 */
export class Presses {
  readonly #inFlight = new Map<string, number>();
  readonly #listeners = new Set<(appId: string) => void>();

  begin(appId: string): void {
    this.#inFlight.set(appId, (this.#inFlight.get(appId) ?? 0) + 1);
  }

  end(appId: string): void {
    const left = (this.#inFlight.get(appId) ?? 1) - 1;
    if (left > 0) this.#inFlight.set(appId, left);
    else this.#inFlight.delete(appId);
    for (const listener of [...this.#listeners]) listener(appId);
  }

  /** The sources among `appIds` with a press in flight. */
  pressing(appIds: ReadonlySet<string>): string[] {
    return [...appIds].filter(appId => this.#inFlight.has(appId));
  }

  /** Calls `listener` each time a press ends; returns the unsubscribe. */
  onEnd(listener: (appId: string) => void): () => void {
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
      for (const appId of waiting) {
        if (pressing.has(appId)) continue;
        waiting.delete(appId);
        waits.push({appId, ms: Date.now() - startedAt});
      }
      if (pressing.size === 0 || signal?.aborted) return waits;
      for (const appId of pressing) waiting.add(appId);
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
