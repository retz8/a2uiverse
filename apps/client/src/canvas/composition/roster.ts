/**
 * The turn's source roster, read off the shell's own paint.
 *
 * The orchestrator is canonical for composition state; the client keeps projections of what it
 * painted. `placement` is one — slot → the fragment filling it — but it is only written when a
 * fragment actually lands, so it can say nothing about a source that speaks without painting,
 * and its iteration order is fill order rather than plan order. The roster is the other: the
 * ordered sources the shell reserved slots for, known from first paint.
 *
 * Display names live in the Registry and reach the client only here, as a prop on the shell
 * catalog's `Attribution` components. The stamp is deliberately not extended to carry them —
 * that would put the same fact on the wire twice, on the very event that already holds it.
 *
 * The synthesis slot is shell content (task-5.5 decision 1): painted with no attribution
 * beside it, its `Slot` declares `content: "shell"`, and the roster reads it as the reserved
 * shell source — the one the merged view's own stamp names.
 */
import type {A2uiMessage} from '@a2ui/web_core/v0_9';
import type {RosterEntry} from '../canvasStore';

/** The reserved source id the hub stamps its own content with — the shell speaking as itself. */
export const SHELL_SOURCE = 'shell';

/** The shell catalog's own composition primitives. */
const ATTRIBUTION = 'Attribution';
const SLOT = 'Slot';

interface ShellComponent {
  component?: unknown;
  appId?: unknown;
  displayName?: unknown;
  name?: unknown;
  label?: unknown;
  content?: unknown;
}

/**
 * The roster carried by a shell paint's components, in the order they were painted — which is
 * slot order, since the painter emits one attribution per leaf as it walks the plan.
 *
 * Undefined when the paint names no source. A shell repaint is how the orchestrator flips a
 * slot's state, and a repaint may legally carry only the components it changed — so a paint
 * with no attribution in it is one that says nothing about the roster, not one that declares
 * the composition has no sources. Reading it as the latter drops the display names mid-turn and
 * the stack falls back to raw app ids.
 */
export function rosterFromShellMessages(
  messages: readonly A2uiMessage[],
): RosterEntry[] | undefined {
  const roster: RosterEntry[] = [];
  for (const message of messages) {
    const update = (message as {updateComponents?: {components?: unknown}}).updateComponents;
    if (!update || !Array.isArray(update.components)) continue;
    // The painter emits one attribution per leaf immediately before the slot it introduces, so
    // pairing them is what tells the client which slot a source owns — without the client
    // reconstructing the orchestrator's slot-naming scheme for itself.
    let pending: {appId: string; displayName: string} | undefined;
    for (const raw of update.components as ShellComponent[]) {
      if (!raw) continue;
      if (raw.component === ATTRIBUTION) {
        const {appId, displayName} = raw;
        pending =
          typeof appId === 'string'
            ? {
                appId,
                displayName: typeof displayName === 'string' && displayName ? displayName : appId,
              }
            : undefined;
        continue;
      }
      if (raw.component !== SLOT || typeof raw.name !== 'string') continue;
      if (raw.content === 'shell') {
        // Shell content pairs with no attribution: the slot itself says whose it is.
        pending = undefined;
        roster.push({
          appId: SHELL_SOURCE,
          displayName: typeof raw.label === 'string' && raw.label ? raw.label : SHELL_SOURCE,
          slot: raw.name,
        });
        continue;
      }
      if (pending) {
        roster.push({...pending, slot: raw.name});
        pending = undefined;
      }
    }
  }
  return roster.length > 0 ? roster : undefined;
}
