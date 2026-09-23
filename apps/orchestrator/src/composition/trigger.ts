/**
 * The synthesis trigger (SPEC §5.3; task-8.3 decisions 1, 4, 8, 9): from where each dispatched
 * source stands, what the turn does about its one automatic synthesis. A merge is possible once
 * at least two sources arrived — the home source among them under a join. Every source settled
 * releases it, or collapses the merge when too few arrived; while some are still out, a possible
 * merge arms the soft deadline, restarted by each settle. The home source is never on the soft
 * deadline: without it no merge is possible, and a home source that failed collapses the merge
 * at once.
 */

export type TriggerDecision =
  /** Nothing to release yet, and no soft deadline to run. */
  | {kind: 'wait'}
  /** A merge is possible and sources are still out: (re)start the soft deadline. */
  | {kind: 'arm'}
  /** Every source settled over a possible merge: release it now. */
  | {kind: 'release'; by: 'settled' | 'home'}
  /** No merge can be made: collapse its slot, with no call. */
  | {kind: 'collapse'; cause: 'home' | 'few'};

export interface TriggerInput {
  /** The dispatched vendor sources. */
  sources: readonly string[];
  /** Those that arrived, failed or reached the hard cap. */
  settled: ReadonlySet<string>;
  /** Those that arrived holding a surface and have not failed since. */
  arrived: ReadonlySet<string>;
  /** The join's home source, under a join hypothesis. */
  home?: string;
  /** The source whose settling asks the question, if one did. */
  justSettled?: string;
}

export function mergePossible(arrived: ReadonlySet<string>, home: string | undefined): boolean {
  return arrived.size >= 2 && (home === undefined || arrived.has(home));
}

export function decideTrigger(input: TriggerInput): TriggerDecision {
  const {sources, settled, arrived, home, justSettled} = input;
  if (home !== undefined && settled.has(home) && !arrived.has(home)) {
    return {kind: 'collapse', cause: 'home'};
  }
  const possible = mergePossible(arrived, home);
  const out = sources.filter(source => !settled.has(source));
  if (out.length === 0) {
    if (!possible) return {kind: 'collapse', cause: 'few'};
    return {kind: 'release', by: home !== undefined && justSettled === home ? 'home' : 'settled'};
  }
  return possible ? {kind: 'arm'} : {kind: 'wait'};
}
