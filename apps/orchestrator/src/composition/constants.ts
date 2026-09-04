import {namespaceSurfaceId} from '@a2uiverse/sdk';
import {SHELL_SOURCE_ID} from '../registry/types.js';

/** The shell's one surface per utterance turn, un-namespaced half. */
export const SHELL_SURFACE_ID = 'main';

/** The shell surface follows the same namespacing law as fragments: `shell:main`. */
export function shellSurfaceId(): string {
  return namespaceSurfaceId(SHELL_SOURCE_ID, SHELL_SURFACE_ID);
}

/**
 * Slot names are orchestrator-derived — the Planner never invents
 * identifiers. One slot per agent per turn keeps this collision-free; M8
 * widens the key for multi-account.
 */
export function slotNameFor(appId: string): string {
  return `slot-${appId}`;
}

/** The synthesis slot is the shell's own slot (task-4.4 decision 6); its attribution names the merged view. */
export const SYNTHESIS_DISPLAY_NAME = 'Synthesis';
