/**
 * Ref validity (SPEC §6.2): the per-binding answer both the IntegrityChecker
 * and the client's stale marker give. A predicate ref is valid while its key
 * resolves — resolution itself answers that — and never goes stale. An index
 * ref is stale when the partition's generation moved since the payload was
 * computed, in either direction; a surface never stamped on either side
 * counts as matched.
 */
import {parsePointer} from './pointer';
import type {Ref} from './synthesis';

const CANONICAL_INDEX = /^(0|[1-9][0-9]*)$/;

/**
 * Whether a pointer may index into an array by position — any integer key
 * step — and so must be guarded by the partition's generation. Conservative:
 * an integer object key counts.
 */
export function isGenerationGuarded(pointer: string): boolean {
  return parsePointer(pointer).some(step => step.kind === 'key' && CANONICAL_INDEX.test(step.key));
}

export type RefValidity = 'valid' | 'stale';

export function refValidity(
  ref: Ref,
  computedAgainst: Record<string, number>,
  seen: Record<string, number>,
): RefValidity {
  if (!isGenerationGuarded(ref.pointer)) return 'valid';
  const was = computedAgainst[ref.surface];
  const now = seen[ref.surface];
  if (was === undefined || now === undefined) return 'valid';
  return was === now ? 'valid' : 'stale';
}
