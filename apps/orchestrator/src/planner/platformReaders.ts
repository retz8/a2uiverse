/**
 * The platform readers over orchestrator state (task-6.4 decision 5): the Registry, the composition
 * the question was asked from, and its ancestry in the trail (task-9.3 decision 2). Each
 * projection is a pure function of the state it reads, so the readers are testable without a
 * model and the executor is not involved.
 */
import {updateWords} from '@a2uiverse/sdk';
import {asksSignIn, Sources} from '../accounts/accounts.js';
import type {HeldComposition} from '../composition/compositions.js';
import type {CompositionState} from '../composition/state.js';
import type {Registry} from '../registry/registry.js';
import type {HeldUpdates} from '../registry/updates.js';
import {SHELL_SOURCE_ID} from '../registry/types.js';
import type {CompositionSlot, CompositionView, InstalledApp, PlatformReaders} from './readers.js';

export interface PlatformReaderDeps {
  registry: Registry;
  /** Each app's sources and accounts (task 12.4); none held when omitted. */
  sources?: Sources;
  /** The update result as last computed (task-14.5 decision 1); every app not checked when omitted. */
  updates?: {held(): HeldUpdates | undefined};
  /** The clock, in epoch milliseconds; the system's when omitted. */
  now?: () => number;
  /** The open composition in this context, when one exists. */
  composition(contextId: string): CompositionState | undefined;
  /** This composition and the ones it was asked from, oldest first, open or closed. */
  ancestry(contextId: string): readonly HeldComposition[];
}

export function platformReaders(deps: PlatformReaderDeps): PlatformReaders {
  const sources = deps.sources ?? new Sources(deps.registry);
  return {
    installedApps: () =>
      installedApps(deps.registry, sources, deps.updates?.held(), (deps.now ?? Date.now)()),
    thisComposition: askedFrom => {
      const state = askedFrom === undefined ? undefined : deps.composition(askedFrom);
      return state ? compositionView(state, sources) : undefined;
    },
    recentTurns: askedFrom =>
      askedFrom === undefined ? [] : deps.ancestry(askedFrom).map(compositionLine),
  };
}

/** What the reader says of an app that hands no catalog: it paints in the basic catalog (task-11.2 decision 8). */
export const BASIC_CATALOG_WORDS = 'basic catalog';

/**
 * Every installed app with its card's content — this run's card, the stored one when the agent was
 * down at startup — its catalogs, whether it is reachable this run, whether it asks sign-in, its
 * accounts by source and label, never a credential (task-12.6 decision 9), and its update state as
 * last computed in the App Library's words, with how long ago — never a check run (task-14.5
 * decisions 5 to 7). The platform is not one.
 */
export function installedApps(
  registry: Registry,
  sources: Sources = new Sources(registry),
  held?: HeldUpdates,
  now: number = Date.now(),
): InstalledApp[] {
  const installed = new Map(registry.installed().map(record => [record.id, record]));
  return registry.list().map(record => {
    const fetched = registry.card(record.id);
    const card = fetched ?? registry.storedCard(record.id);
    const state = held?.states.get(record.id);
    const source = installed.get(record.id)?.source ?? 'local';
    return {
      id: record.id,
      displayName: record.displayName,
      ...(card ? {name: card.name, description: card.description} : {}),
      skills: (card?.skills ?? []).map(({name, description}) => ({name, description})),
      catalogs: record.catalogs.length > 0 ? [...record.catalogs] : [BASIC_CATALOG_WORDS],
      reachable: Boolean(fetched),
      signIn: asksSignIn(card),
      accounts: sources
        .of(record.id)
        .flatMap(({source, label}) => (label === undefined ? [] : [{source, label}])),
      update: updateWords(state, source),
      ...(state && held ? {checked: checkedAgo(held.checkedAt, now)} : {}),
    };
  });
}

/** How long before `now` a check that began at `at` ran, in words: "checked 12 minutes ago". */
export function checkedAgo(at: number, now: number): string {
  const minutes = Math.floor((now - at) / 60_000);
  if (minutes < 1) return 'checked just now';
  const [n, unit] =
    minutes < 60
      ? [minutes, 'minute']
      : minutes < 24 * 60
        ? [Math.floor(minutes / 60), 'hour']
        : [Math.floor(minutes / (24 * 60)), 'day'];
  return `checked ${n} ${unit}${n === 1 ? '' : 's'} ago`;
}

/**
 * The composition as structure only: never a partition's contents, never the synthesis document.
 * An account's slot carries its label; an account choice still waiting is listed by its app
 * (task-12.6 decision 9); a gap, until an install fills it.
 */
export function compositionView(state: CompositionState, sources?: Sources): CompositionView {
  const slots = [...state.slots.values()]
    .filter(({plan}) => plan.source !== SHELL_SOURCE_ID)
    .map(({plan, state: slotState}): CompositionSlot => {
      const label = sources?.label(plan.source);
      return {
        source: plan.source,
        displayName: plan.displayName,
        ...(label !== undefined ? {label} : {}),
        state: slotState === 'pending' && state.arrived.has(plan.source) ? 'arrived' : slotState,
      };
    });
  for (const [appId, choice] of state.choices) {
    if (choice.chosen !== undefined) continue;
    slots.push({source: appId, displayName: choice.displayName, state: 'choosing-account'});
  }
  // A gap an install filled reads as its slot (task-15.4 decision 11); the installed line, as done.
  const gaps = [...state.gaps.values()].filter(gap => !gap.filled).map(gap => gap.words);
  const view: CompositionView = {utterance: state.utterance, slots, gaps};
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
 * which sources answered and how — each by its one name (task-12.6 decision 9) — what became of the merged view, and whether it is still
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
            return `${plan.name} (${at})`;
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
