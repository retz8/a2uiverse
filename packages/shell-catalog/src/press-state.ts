/**
 * The third seam between the shell catalog and its host (task 8.5): the reader's presses — Retry,
 * Include, Try again — as the host holds them until the paint catches up, and whether a press can
 * be made from here at all. `Slot` reads it to draw a press the moment it is made, to say in place
 * when one never reached the orchestrator or lost its connection, and to draw its buttons disabled
 * where no press can be made: a parked composition, or a canvas a newer question is replacing.
 * State that changes over time, like `SlotStateContext`; the handler a button raises goes on
 * `createCatalog`'s options.
 */
import {createContext} from 'react';
import type {CompositionOperation} from '@a2uiverse/sdk';

/**
 * Where a press stands as the host knows it: `sent` from the click until the paint catches up,
 * `unreached` when it never reached the orchestrator, `lost` when its stream broke after it had
 * answered. A press the paint has caught up with is not the slot's to draw.
 */
export type PressStatus = 'sent' | 'unreached' | 'lost';

export interface PressRecord {
  operation: CompositionOperation;
  status: PressStatus;
}

export interface PressState {
  /** Whether a press can be made from this surface now; false draws every press button disabled. */
  enabled: boolean;
  presses: readonly PressRecord[];
}

/** Default: presses can be made and none is outstanding — every slot draws what was painted. */
export const PressStateContext = createContext<PressState>({enabled: true, presses: []});
