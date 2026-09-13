import {namespaceSurfaceId} from '@a2uiverse/sdk';
import {SHELL_SOURCE_ID} from '../registry/types.js';

/** The shell's one surface per utterance turn, un-namespaced half. */
export const SHELL_SURFACE_ID = 'main';

/** The shell surface follows the same namespacing law as fragments: `shell:main`. */
export function shellSurfaceId(): string {
  return namespaceSurfaceId(SHELL_SOURCE_ID, SHELL_SURFACE_ID);
}

/** The synthesis slot is the shell's own slot (task-4.4 decision 6); its label names the merged view. */
export const SYNTHESIS_DISPLAY_NAME = 'Synthesis';
