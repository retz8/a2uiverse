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
 * shell source — the one the merged view's own stamp names — with the join's nouns the painter
 * wrote on it (task-7.15), when the merge is over an entity. A gap slot is the capability tile,
 * the catalog's own: it names no source and enters no roster.
 */
import type {A2uiMessage} from '@a2ui/web_core/v0_9';
import type {JoinNouns, PaintedMerge, PaintedSlotState, RosterEntry} from '../canvasStore';

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
  state?: unknown;
  join?: unknown;
  merged?: unknown;
  late?: unknown;
  working?: unknown;
  callFailed?: unknown;
  retrying?: unknown;
  declined?: unknown;
  collapse?: unknown;
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
        const join = joinNouns(raw.join);
        roster.push({
          appId: SHELL_SOURCE,
          displayName: typeof raw.label === 'string' && raw.label ? raw.label : SHELL_SOURCE,
          ...(join ? {join} : {}),
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

/** The merged view's join nouns as painted — a home and string nouns — or nothing. */
function joinNouns(raw: unknown): JoinNouns | undefined {
  if (typeof raw !== 'object' || raw === null) return undefined;
  const {home, nouns} = raw as {home?: unknown; nouns?: unknown};
  if (typeof home !== 'string' || typeof nouns !== 'object' || nouns === null) return undefined;
  const entries = Object.entries(nouns).filter(
    (entry): entry is [string, string] => typeof entry[1] === 'string',
  );
  return {home, nouns: Object.fromEntries(entries)};
}

const PAINTED_STATES: readonly string[] = ['pending', 'failed', 'collapsed'];

/**
 * The state each `Slot` in a shell paint declares, by source — the synthesis slot under
 * `SHELL_SOURCE`. A slot painted with no state maps to null: whatever it said before no longer
 * holds. Sources the paint does not carry are absent, since a repaint may carry only what changed.
 */
export function slotStatesOf(
  messages: readonly A2uiMessage[],
): Map<string, PaintedSlotState | null> {
  const states = new Map<string, PaintedSlotState | null>();
  for (const message of messages) {
    const update = (message as {updateComponents?: {components?: unknown}}).updateComponents;
    if (!update || !Array.isArray(update.components)) continue;
    for (const raw of (update.components as ShellComponent[]).filter(Boolean)) {
      if (raw.component !== SLOT || typeof raw.source !== 'string') continue;
      const source = raw.content === 'shell' ? SHELL_SOURCE : raw.source;
      states.set(
        source,
        typeof raw.state === 'string' && PAINTED_STATES.includes(raw.state)
          ? (raw.state as PaintedSlotState)
          : null,
      );
    }
  }
  return states;
}

const strings = (raw: unknown): string[] | undefined =>
  Array.isArray(raw) && raw.every(item => typeof item === 'string') ? raw : undefined;

/**
 * What the orchestrator painted on the merged view's slot, when the paint carries it (task-8.4
 * decision 13): the merge's own source set, the late sources, a press's call running or failed, the
 * retried sources a collapsed merge waits on, the decline and the collapse's cause. The shell
 * catalog validated the props on apply; this reads them for the progress line and the columns.
 * Undefined when the paint carries no merged view's slot — a repaint says only what it carries.
 */
export function mergeFactsOf(messages: readonly A2uiMessage[]): PaintedMerge | undefined {
  let facts: PaintedMerge | undefined;
  for (const message of messages) {
    const update = (message as {updateComponents?: {components?: unknown}}).updateComponents;
    if (!update || !Array.isArray(update.components)) continue;
    for (const raw of (update.components as ShellComponent[]).filter(Boolean)) {
      if (raw.component !== SLOT || raw.content !== 'shell') continue;
      const merged = strings(raw.merged);
      const late = strings(raw.late);
      const retrying = strings(raw.retrying);
      const working = raw.working as PaintedMerge['working'];
      const callFailed = raw.callFailed as PaintedMerge['callFailed'];
      const declined = raw.declined as PaintedMerge['declined'];
      const collapse = raw.collapse as PaintedMerge['collapse'];
      facts = {
        ...(merged ? {merged} : {}),
        ...(late ? {late} : {}),
        ...(retrying ? {retrying} : {}),
        ...(working && strings(working.sources) ? {working} : {}),
        ...(callFailed && strings(callFailed.sources) ? {callFailed} : {}),
        ...(declined && typeof declined.reason === 'string' ? {declined} : {}),
        ...(collapse && typeof collapse.cause === 'string' ? {collapse} : {}),
      };
    }
  }
  return facts;
}

/** The roster alone — see `ShellPaintSlots.roster`. */
export function rosterFromShellMessages(
  messages: readonly A2uiMessage[],
): RosterEntry[] | undefined {
  return shellPaintSlots(messages).roster;
}

/** A mounted shell surface's components, in the wire shape `shellPaintSlots` reads. */
interface MountedComponents {
  readonly componentsModel: {
    readonly entries: Iterable<[string, {id: string; type: string; properties: object}]>;
  };
}

/**
 * The roster of a mounted shell surface, read off its own paint (task-7.7 decision 10): what a
 * parked composition names its apps by, since the store's roster belongs to the live turn.
 */
export function rosterOfSurface(surface: MountedComponents): RosterEntry[] {
  const components = [...surface.componentsModel.entries].map(([, model]) => ({
    ...model.properties,
    id: model.id,
    component: model.type,
  }));
  const paint = {updateComponents: {components}} as unknown as A2uiMessage;
  return shellPaintSlots([paint]).roster ?? [];
}
