/**
 * Provenance builders for a canvas turn: they read the store and the active parked session to
 * assemble the cause and fork metadata a dispatch needs. A parked view makes a turn a fork —
 * its cause records the parent it forked from, and the turn reports the parked snapshot's data
 * model rather than the live head's. The parked view stays mounted through the turn — the view
 * returns to live only when the forked paint lands.
 */
import type {A2uiClientDataModel} from '@a2ui/web_core/v0_9';
import type {ReactComponentImplementation} from '@a2ui/react/v0_9';
import type {ForkContext} from '../../a2a/messages';
import type {CanvasStore} from '../canvasStore';
import {currentPaintId} from '../canvasStore';
import {entryTitle} from './paint';
import type {ParkedSession} from './parkedSession';

/** The mutable holder ParkedStage registers its live session into on mount. */
export type ParkedHolder = {session: ParkedSession<ReactComponentImplementation> | null};

export interface CauseContext {
  /** The paint the user is looking at — the cause's parent. */
  parentId(): number | null;
  /** The fork half of a cause: parked ⇒ forked, with the parent's title denormalised. */
  forkFields(): {forked: boolean; parentTitle?: string};
  /** The wire half of a fork: the parked paint's identity, as message metadata. */
  forkContextOf(): ForkContext | undefined;
  /** A forked turn reports the parked view's data model — what the user acted on. */
  parkedClientDataModel(): A2uiClientDataModel | undefined;
}

export function createCauseContext(store: CanvasStore, parkedHolder: ParkedHolder): CauseContext {
  const parentId = () => currentPaintId(store.getState());

  const forkFields = (): {forked: boolean; parentTitle?: string} => {
    const state = store.getState();
    if (state.viewing === null) return {forked: false};
    const entry = state.timeline.find(e => e.paintId === state.viewing);
    return {forked: true, ...(entry ? {parentTitle: entryTitle(entry)} : {})};
  };

  const forkContextOf = (): ForkContext | undefined => {
    const state = store.getState();
    if (state.viewing === null) return undefined;
    const index = state.timeline.findIndex(e => e.paintId === state.viewing);
    if (index < 0) return undefined;
    const entry = state.timeline[index];
    return {
      paintId: entry.paintId,
      title: entryTitle(entry),
      paintedAt: entry.paintedAt,
      // Depth behind the live head at dispatch — the agent-meaningful position (ring indexes
      // shift under eviction; the paintId is the stable identifier).
      position: state.timeline.length - 1 - index,
    };
  };

  const parkedClientDataModel = (): A2uiClientDataModel | undefined => {
    const parked = parkedHolder.session;
    const surface = parked?.processor.model.getSurface(parked.surfaceId);
    if (!parked || !surface) return undefined;
    return {
      version: 'v0.9',
      surfaces: {[parked.surfaceId]: surface.dataModel.get('/') as Record<string, unknown>},
    };
  };

  return {parentId, forkFields, forkContextOf, parkedClientDataModel};
}
