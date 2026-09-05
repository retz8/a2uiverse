import {
  refsOf,
  refValidity,
  type ChangeAccount,
  type Ref,
  type SynthesisPayload,
} from '@a2uiverse/sdk';

/**
 * The IntegrityChecker (SPEC §6.2, §10): per-binding validity over the sdk's kit. A predicate
 * ref is valid while its key resolves and never goes stale; an index ref is stale when its
 * surface's generation moved since the payload was computed. Gates re-synthesis, and accounts
 * for what broke so the Synthesizer can re-point it (task-5.4 decision 6).
 */
export function refValid(
  ref: Ref,
  computedAgainst: Record<string, number>,
  generations: Record<string, number>,
): boolean {
  return refValidity(ref, computedAgainst, generations) === 'valid';
}

/** Whether the live synthesis still holds, and which surfaces broke it. */
export function checkSynthesisPayload(
  payload: SynthesisPayload,
  generations: Record<string, number>,
): {valid: boolean; invalid: string[]} {
  const invalid: string[] = [];
  for (const ref of refsOf(payload.dataModel)) {
    if (!refValid(ref, payload.computedAgainst, generations) && !invalid.includes(ref.surface)) {
      invalid.push(ref.surface);
    }
  }
  return {valid: invalid.length === 0, invalid};
}

/**
 * The runtime's account of why a re-synthesis runs: the refs that went stale, grouped by the
 * surface whose generation moved, and the refs that no longer resolve. Each ref once.
 */
export function changeAccount(
  payload: SynthesisPayload,
  generations: Record<string, number>,
  partitions: {resolve(ref: Ref): {found: boolean}},
): ChangeAccount {
  const stale: Record<string, Ref[]> = {};
  const absent: Ref[] = [];
  const seen = new Set<string>();
  for (const ref of refsOf(payload.dataModel)) {
    const key = `${ref.surface}${ref.pointer}`;
    if (seen.has(key)) continue;
    seen.add(key);
    if (!refValid(ref, payload.computedAgainst, generations)) {
      (stale[ref.surface] ??= []).push(ref);
    } else if (!partitions.resolve(ref).found) {
      absent.push(ref);
    }
  }
  return {stale, absent};
}
