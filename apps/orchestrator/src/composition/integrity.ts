import {refsOf, type ChangeAccount, type Ref, type SynthesisPayload} from '@a2uiverse/sdk';

/**
 * The IntegrityChecker (SPEC §6.2, §10): per-binding validity over the sdk's kit. Refs select
 * elements by key, so resolution *is* validity (task-5.10 decisions 1 and 4) — a ref is good
 * while its keys resolve, and a partition that merely reorders or repaints under it breaks
 * nothing. Gates re-synthesis, and accounts for what broke so the Synthesizer can re-point it
 * (task-5.4 decision 6).
 */
export function refValid(ref: Ref, partitions: {resolve(ref: Ref): {found: boolean}}): boolean {
  return partitions.resolve(ref).found;
}

/** Whether the live synthesis still holds, and which surfaces broke it. */
export function checkSynthesisPayload(
  payload: SynthesisPayload,
  partitions: {resolve(ref: Ref): {found: boolean}},
): {valid: boolean; invalid: string[]} {
  const invalid: string[] = [];
  for (const ref of refsOf(payload.dataModel)) {
    if (!refValid(ref, partitions) && !invalid.includes(ref.surface)) {
      invalid.push(ref.surface);
    }
  }
  return {valid: invalid.length === 0, invalid};
}

/**
 * The runtime's account of why a re-synthesis runs: the refs that no longer resolve. Each ref
 * once. There is one kind of breakage now — a ref that stopped resolving — so the account has
 * one half and the Synthesizer is told one thing.
 */
export function changeAccount(
  payload: SynthesisPayload,
  partitions: {resolve(ref: Ref): {found: boolean}},
): ChangeAccount {
  const absent: Ref[] = [];
  const seen = new Set<string>();
  for (const ref of refsOf(payload.dataModel)) {
    const key = `${ref.surface}${ref.pointer}`;
    if (seen.has(key)) continue;
    seen.add(key);
    if (!refValid(ref, partitions)) absent.push(ref);
  }
  return {absent};
}
