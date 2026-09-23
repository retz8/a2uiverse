/**
 * A reserved column's state, by the source the column is marked to (task-8.5 decision 12): what the
 * client tells the shell catalog's `Table` through `SlotStateContext`. The authored cells once the
 * source is in the merge; unavailable once it failed; loading while it loads, while its Retry runs,
 * and while it is being included; not included while it waits for Include. A source that answered in
 * words with no screen keeps the authored cells too. Every word is the shell catalog's; the client
 * only says which.
 */
import type {SourceSlotState} from '@a2uiverse/shell-catalog';
import type {CanvasState} from '../canvasStore';

type ColumnInputs = Pick<CanvasState, 'merge' | 'slotStates' | 'placement' | 'presses'>;

/** Whether the reader's Retry of this source is pressed or still running. */
export function retrying({presses}: Pick<CanvasState, 'presses'>, source: string): boolean {
  return presses.some(
    press =>
      press.operation.kind === 'retry' &&
      press.operation.sources[0] === source &&
      (press.status === 'sent' || press.status === 'running'),
  );
}

export function columnState(state: ColumnInputs, source: string): SourceSlotState {
  const {merge, slotStates, placement, presses} = state;
  if (merge?.merged?.includes(source)) return 'filled';
  const painted = slotStates.get(source);
  if (painted === 'failed' && !retrying(state, source)) return 'failed';
  const including = presses.some(
    press =>
      press.status === 'sent' &&
      press.operation.kind === 'include' &&
      press.operation.sources.includes(source),
  );
  if (merge?.working?.sources.includes(source) || including) return 'pending';
  if (merge?.late?.includes(source)) return 'late';
  if (painted === 'collapsed') return 'collapsed';
  return placement.has(source) ? 'filled' : 'pending';
}
