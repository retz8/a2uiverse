/**
 * The sixth seam between the shell catalog and its host (task-15.8 decision 1): an app's Install,
 * Update and Show it here, pressed on a slot's offer or its update tile. The host shows the consent
 * card where the install or the update asks for it, floating from the button pressed, makes the
 * install, and sends the press that fills the slot — so the handler is called inside the click,
 * with that button. Where a press stands, and which apps the host holds installed at which version,
 * change over time, like `PressStateContext`, and the catalog draws the slot's states from them;
 * the handler goes on `createCatalog`'s options.
 */
import {createContext} from 'react';
import type {InstallRefusal} from '@a2uiverse/sdk';

/** Install or Update an app from a slot, or show an app installed elsewhere in it. */
export type AppActKind = 'install' | 'update' | 'show';

/**
 * An app pressed in a slot, and where: an offer's slot by the gap's words, an update tile's by its
 * source; the surface and the component, as every press carries them.
 */
export interface AppActRequest {
  kind: AppActKind;
  appId: string;
  gap?: string;
  source?: string;
  surfaceId: string;
  componentId: string;
  /** The button pressed: the consent card floats from it. */
  anchor: HTMLElement;
}

export type AppActHandler = (request: AppActRequest) => void;

/** Which slot a press was made in: an offer's by the gap's words, an update tile's by its source. */
export type AppActSlot = {gap: string} | {source: string};

/**
 * An Install or Update pressed in a slot, as the host knows it: running, or refused with the
 * Store's cause. None once it lands — the slot's fill press then carries it — or when cancelled.
 */
export type AppActStatus =
  {appId: string; status: 'running'} | {appId: string; status: 'refused'; cause: InstallRefusal};

export interface AppActState {
  /** The press made in a slot, if one is running or was refused. */
  act: (slot: AppActSlot) => AppActStatus | undefined;
  /** The version the host holds an app installed at — its card's as installed — none when it is not installed. */
  installed: (appId: string) => string | undefined;
}

/** Default: no press made, no app known installed — every slot draws what was painted. */
export const AppActContext = createContext<AppActState>({
  act: () => undefined,
  installed: () => undefined,
});
