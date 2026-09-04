import type {Ref, SynthesisWiring} from '@a2uiverse/sdk';

/**
 * The IntegrityChecker (SPEC §10; phase decision 13): per-binding validity,
 * answered from generations. A ref is valid while its surface's generation is
 * the one the wiring was computed against. Under index-only refs every ref
 * into one surface shares that answer — the interface is per binding, the
 * implementation per partition; key resolution is Phase 5's second answer path.
 */
export function refValid(
  ref: Ref,
  computedAgainst: Record<string, number>,
  generations: Record<string, number>,
): boolean {
  return (generations[ref.surface] ?? 0) === (computedAgainst[ref.surface] ?? 0);
}

/** Whether the live wiring still holds, and which surfaces broke it. Gates re-synthesis. */
export function checkWiring(
  wiring: SynthesisWiring,
  generations: Record<string, number>,
): {valid: boolean; invalid: string[]} {
  const invalid: string[] = [];
  for (const entity of wiring.entities) {
    for (const cell of entity.cells) {
      for (const ref of cell.args) {
        if (!refValid(ref, wiring.computedAgainst, generations) && !invalid.includes(ref.surface)) {
          invalid.push(ref.surface);
        }
      }
    }
  }
  return {valid: invalid.length === 0, invalid};
}
