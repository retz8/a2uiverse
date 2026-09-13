/**
 * The turn's source roster, read off the shell's own paint.
 *
 * The orchestrator is canonical for composition state; the client keeps projections of what it
 * painted. `placement` is one — a slot's source → the fragment filling it — but it is only written when a
 * fragment actually lands, so it can say nothing about a source that speaks without painting,
 * and its iteration order is fill order rather than plan order. The roster is the other: the
 * ordered sources the shell reserved slots for, known from first paint.
 *
 * Display names live in the Registry and reach the client only here, as a prop on the shell
 * catalog's `Attribution` components. The stamp is deliberately not extended to carry them —
 * that would put the same fact on the wire twice, on the very event that already holds it.
 *
 * The tree is model-authored (Phase 6): ids are the Planner's, nesting is whatever it drew. The
 * painter wraps each vendor `Slot` in an `Attribution` whose `child` names it (task-6.4 decision
 * 3), so a slot's attribution is found by that link and never by where either sits in the list.
 *
 * The synthesis slot is shell content (task-5.5 decision 1): painted with no attribution
 * around it, its `Slot` declares `content: "shell"`, and the roster reads it as the reserved
 * shell source — the one the merged view's own stamp names. A gap slot is the capability tile,
 * the catalog's own: it names no source and enters no roster.
 */
import type {A2uiMessage} from '@a2ui/web_core/v0_9';
import type {RosterEntry} from '../canvasStore';

/** The reserved source id the hub stamps its own content with — the shell speaking as itself. */
export const SHELL_SOURCE = 'shell';

/** The shell catalog's own composition primitives. */
const ATTRIBUTION = 'Attribution';
const SLOT = 'Slot';

interface ShellComponent {
  id?: unknown;
  component?: unknown;
  appId?: unknown;
  displayName?: unknown;
  child?: unknown;
  source?: unknown;
  label?: unknown;
  content?: unknown;
}

/** What one shell paint says about its slots: the roster, and the vendor slots painted bare. */
export interface ShellPaintSlots {
  /**
   * The sources the paint reserved slots for, in the order the slots appear in the component
   * list. Undefined when the paint names no source: a shell repaint is how the orchestrator
   * flips a slot's state, and a repaint may legally carry only the components it changed — so a
   * paint with no slot in it says nothing about the roster rather than declaring the composition
   * has none. Reading it as the latter drops the display names mid-turn and the stack falls
   * back to raw app ids.
   */
  roster: RosterEntry[] | undefined;
  /**
   * Vendor sources whose `Slot` is the `child` of no `Attribution`, judged only on a whole-tree
   * paint — one carrying the root — since a partial repaint may carry a slot without the
   * wrapper that still stands around it. The painter wraps every vendor slot, so this is a
   * painter bug — and the one thing the shell guarantees a vendor fragment (SPEC §4.3) is that
   * it never renders unattributed, so the fragment aimed at such a slot is refused rather than
   * mounted.
   */
  unattributed: string[];
}

/** Every surface's root component id, fixed by the renderer. */
const ROOT_ID = 'root';

export function shellPaintSlots(messages: readonly A2uiMessage[]): ShellPaintSlots {
  const roster: RosterEntry[] = [];
  const unattributed: string[] = [];
  for (const message of messages) {
    const update = (message as {updateComponents?: {components?: unknown}}).updateComponents;
    if (!update || !Array.isArray(update.components)) continue;
    const components = (update.components as ShellComponent[]).filter(Boolean);
    const wholeTree = components.some(raw => raw.id === ROOT_ID);
    // The attribution wrapping each slot, by the slot's id — the `child` link is the pairing.
    const attributionOf = new Map<string, {appId: string; displayName: string}>();
    for (const raw of components) {
      if (raw.component !== ATTRIBUTION || typeof raw.child !== 'string') continue;
      const {appId, displayName} = raw;
      if (typeof appId !== 'string') continue;
      attributionOf.set(raw.child, {
        appId,
        displayName: typeof displayName === 'string' && displayName ? displayName : appId,
      });
    }
    for (const raw of components) {
      if (raw.component !== SLOT || typeof raw.source !== 'string') continue;
      if (raw.content === 'shell') {
        // Shell content pairs with no attribution: the slot itself says whose it is.
        roster.push({
          appId: SHELL_SOURCE,
          displayName: typeof raw.label === 'string' && raw.label ? raw.label : SHELL_SOURCE,
        });
        continue;
      }
      const attribution = typeof raw.id === 'string' ? attributionOf.get(raw.id) : undefined;
      if (attribution?.appId === raw.source) roster.push(attribution);
      else if (wholeTree) unattributed.push(raw.source);
    }
  }
  return {roster: roster.length > 0 ? roster : undefined, unattributed};
}

/** The roster alone — see `ShellPaintSlots.roster`. */
export function rosterFromShellMessages(
  messages: readonly A2uiMessage[],
): RosterEntry[] | undefined {
  return shellPaintSlots(messages).roster;
}
