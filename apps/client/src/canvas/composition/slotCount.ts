/**
 * How many slots a surface lays out — 0 for an uncomposed paint.
 *
 * This is what drives adaptive weight: the composition's *structure* is constant, but a lone
 * fragment should own the canvas as a Phase 1 paint did, while several need the separation that
 * makes them read as distinct sources. It counts the shell's own `Slot` components rather than
 * the placement map, because the question is how many slots the plan laid out, not how many have
 * been filled so far — the answer must not change as fragments arrive.
 */

/** The slice of a surface this needs; `SurfaceModel` satisfies it structurally. */
export interface SlotCountable {
  componentsModel: {readonly entries: IterableIterator<[string, {readonly type?: string}]>};
}

export function slotCountOf(surface: SlotCountable | undefined): number {
  if (!surface) return 0;
  let slots = 0;
  for (const [, component] of surface.componentsModel.entries) {
    if (component.type === 'Slot') slots++;
  }
  return slots;
}
