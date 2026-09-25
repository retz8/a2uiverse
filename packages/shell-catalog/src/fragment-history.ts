/**
 * The fourth seam between the shell catalog and its host (task 9.5): where each source's fragment
 * stands in its history — the paints the agent made in this canvas, a linear back/forward stack
 * the host holds (SPEC §6.5). `Attribution` reads it to draw a back arrow when there is a step to
 * go back to and a forward arrow when there is one to go forward to, each named by that paint's
 * title. The host computes the two neighbours from its stacks; the catalog computes nothing.
 * State that changes over time, like `SlotStateContext`; the handler an arrow raises goes on
 * `createCatalog`'s options.
 */
import {createContext} from 'react';

/** A step the fragment can go to: the index the arrow reports, and the paint's title when the agent named one. */
export interface HistoryStep {
  step: number;
  title?: string;
}

/**
 * The two neighbours of the paint on screen; absent, there is nowhere to go that way. `busy`
 * says the source's repaint is in flight (task-9.7 decision 6): the arrows stay on the row and
 * draw disabled, as they do where no press can be made, until the paint lands.
 */
export interface FragmentHistory {
  back?: HistoryStep;
  forward?: HistoryStep;
  busy?: boolean;
}

/** What the host knows about a source's history; `undefined` when it knows nothing, which draws no arrow. */
export type FragmentHistoryResolver = (source: string) => FragmentHistory | undefined;

/** Default resolver: the host says nothing — no arrow is drawn. */
export const FragmentHistoryContext = createContext<FragmentHistoryResolver>(() => undefined);
