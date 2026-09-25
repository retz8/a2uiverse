/**
 * The platform readers over orchestrator state (task-6.4 decision 5): the Registry, the composition
 * the question was asked from, and its ancestry in the trail (task-9.3 decision 2). Each
 * projection is a pure function of the state it reads, so the readers are testable without a
 * model and the executor is not involved.
 */
import type {HeldComposition} from '../composition/compositions.js';
import type {CompositionState} from '../composition/state.js';
import type {Registry} from '../registry/registry.js';
import {SHELL_SOURCE_ID} from '../registry/types.js';
import type {CompositionSlot, CompositionView, InstalledApp, PlatformReaders} from './readers.js';

export interface PlatformReaderDeps {
  registry: Registry;
  /** The open composition in this context, when one exists. */
  composition(contextId: string): CompositionState | undefined;
  /** This composition and the ones it was asked from, oldest first, open or closed. */
  ancestry(contextId: string): readonly HeldComposition[];
}

export function platformReaders(deps: PlatformReaderDeps): PlatformReaders {
  return {
    installedApps: () => installedApps(deps.registry),
    thisComposition: askedFrom => {
      const state = askedFrom === undefined ? undefined : deps.composition(askedFrom);
      return state ? compositionView(state) : undefined;
    },
    recentTurns: askedFrom =>
      askedFrom === undefined ? [] : deps.ancestry(askedFrom).map(compositionLine),
  };
}

/** Every installed app with its card's content — the platform is not one. */
export function installedApps(registry: Registry): InstalledApp[] {
  return registry.list().map(record => {
    const card = registry.card(record.id);
    return {
      id: record.id,
      displayName: record.displayName,
      ...(card ? {name: card.name, description: card.description} : {}),
      skills: (card?.skills ?? []).map(({name, description}) => ({name, description})),
      reachable: Boolean(card),
    };
  });
}

/** The composition as structure only: never a partition's contents, never the synthesis document. */
export function compositionView(state: CompositionState): CompositionView {
  const slots = [...state.slots.values()]
    .filter(({plan}) => plan.source !== SHELL_SOURCE_ID)
    .map(({plan, state: slotState}): CompositionSlot => ({
      source: plan.source,
      displayName: plan.displayName,
      state: slotState === 'pending' && state.arrived.has(plan.source) ? 'arrived' : slotState,
    }));
  const view: CompositionView = {utterance: state.utterance, slots, gaps: [...state.gaps]};
  if (state.slots.has(SHELL_SOURCE_ID)) view.mergedView = mergedViewOf(state);
  return view;
}

function mergedViewOf(state: CompositionState): NonNullable<CompositionView['mergedView']> {
  const {mergedView} = state;
  if (!mergedView) return {state: 'pending'};
  if (mergedView.outcome === 'synthesized') return {state: 'live'};
  const collapsed = mergedView.outcome === 'declined' ? 'declined' : 'collapsed';
  return mergedView.reason ? {state: collapsed, reason: mergedView.reason} : {state: collapsed};
}

/**
 * One line per context of an ancestry (task-9.3 decision 2): when it was opened, what was asked,
 * which sources answered and how, what became of the merged view, and whether it is still
 * loading or was closed. Written from the composition state, never the journal, so a composition
 * whose turn has not closed still has its line.
 */
export function compositionLine(held: HeldComposition): string {
  if (held.kind === 'closed') {
    const {record} = held;
    const sources = record.answered.length === 0 ? 'no source' : record.answered.join(', ');
    return `${new Date(record.openedAt).toISOString()} · ${JSON.stringify(record.utterance)} → ${sources}${mergedClause(record.mergedView)} · closed`;
  }
  const {state} = held;
  const vendors = [...state.slots.values()].filter(({plan}) => plan.source !== SHELL_SOURCE_ID);
  const sources =
    vendors.length === 0
      ? 'no source'
      : vendors
          .map(({plan, state: slotState}) => {
            const at =
              slotState === 'pending'
                ? state.arrived.has(plan.source)
                  ? 'answered'
                  : 'loading'
                : slotState;
            return `${plan.source} (${at})`;
          })
          .join(', ');
  const standing = state.answeredAt === undefined ? 'still loading' : 'answered';
  return `${new Date(state.openedAt).toISOString()} · ${JSON.stringify(state.utterance)} → ${sources}${mergedClause(state.mergedView)} · ${standing}`;
}

function mergedClause(mergedView: CompositionState['mergedView']): string {
  if (!mergedView) return '';
  if (mergedView.outcome === 'synthesized') return ' · merged view live';
  const what = mergedView.outcome === 'declined' ? 'merged view declined' : 'merged view collapsed';
  return mergedView.reason ? ` · ${what}: ${mergedView.reason}` : ` · ${what}`;
}
