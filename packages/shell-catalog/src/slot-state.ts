/**
 * The second seam between the shell catalog and its host (task 8.2): the state of each source's
 * slot, which changes as the turn runs. `Table` reads it to draw a column reserved for a source
 * that has not arrived; the host fills it from the slot states it holds. A handler is not state
 * and goes on `createCatalog`'s options instead.
 */
import {createContext} from 'react';

/**
 * A source's slot as the host sees it: the three painted states, `filled` once its content mounted,
 * and `late` once it arrived after the merge and waits for Include (task-8.5 decision 12).
 */
export type SourceSlotState = 'pending' | 'filled' | 'failed' | 'collapsed' | 'late';

/** What the host knows about a source's slot; `undefined` when it knows nothing, which reads as filled. */
export type SlotStateResolver = (source: string) => SourceSlotState | undefined;

/** Default resolver: the host says nothing — every column draws what was authored. */
export const SlotStateContext = createContext<SlotStateResolver>(() => undefined);
