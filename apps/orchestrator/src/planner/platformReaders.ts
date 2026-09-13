/**
 * The platform readers over orchestrator state (task-6.4 decision 5): the Registry, the
 * conversation's composition, the journal's ring. Each projection is a pure function of the state
 * it reads, so the readers are testable without a model and the executor is not involved.
 */
import type {CompositionState} from '../composition/state.js';
import type {JournalEntry} from '../journal/types.js';
import type {Registry} from '../registry/registry.js';
import {SHELL_SOURCE_ID} from '../registry/types.js';
import type {CanvasSlot, CanvasView, InstalledApp, PlatformReaders} from './readers.js';

export interface PlatformReaderDeps {
  registry: Registry;
  /** The conversation's current composition, when one exists. */
  canvas(conversationId: string): CompositionState | undefined;
  /** The conversation's last closed turns, oldest first. */
  recent(conversationId: string): readonly JournalEntry[];
}

export function platformReaders(deps: PlatformReaderDeps): PlatformReaders {
  return {
    installedApps: () => installedApps(deps.registry),
    thisCanvas: conversationId => {
      const state = deps.canvas(conversationId);
      return state ? canvasView(state) : undefined;
    },
    recentTurns: conversationId => deps.recent(conversationId).map(recentTurnLine),
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
export function canvasView(state: CompositionState): CanvasView {
  const slots = [...state.slots.values()]
    .filter(({plan}) => plan.source !== SHELL_SOURCE_ID)
    .map(({plan, state: slotState}): CanvasSlot => ({
      source: plan.source,
      displayName: plan.displayName,
      state: slotState === 'pending' && state.arrived.has(plan.source) ? 'arrived' : slotState,
    }));
  const view: CanvasView = {utterance: state.utterance, slots, gaps: [...state.gaps]};
  if (state.slots.has(SHELL_SOURCE_ID)) view.mergedView = mergedViewOf(state);
  return view;
}

function mergedViewOf(state: CompositionState): NonNullable<CanvasView['mergedView']> {
  const {mergedView} = state;
  if (!mergedView) return {state: 'pending'};
  if (mergedView.outcome === 'synthesized') return {state: 'live'};
  const collapsed = mergedView.outcome === 'declined' ? 'declined' : 'collapsed';
  return mergedView.reason ? {state: collapsed, reason: mergedView.reason} : {state: collapsed};
}

/** One line per turn: when, what was asked, which sources answered and how, the outcome. */
export function recentTurnLine(entry: JournalEntry): string {
  const sources =
    entry.dispatch.length === 0
      ? 'no source'
      : entry.dispatch.map(d => `${d.appId} (${d.outcome})`).join(', ');
  return `${entry.at} · ${entry.kind} ${JSON.stringify(entry.descriptor)} → ${sources} · ${entry.outcome}`;
}
