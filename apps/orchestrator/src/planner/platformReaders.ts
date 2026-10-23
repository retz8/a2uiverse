/**
 * The platform readers over orchestrator state (task-6.4 decision 5): the Registry, the composition
 * the question was asked from, and its ancestry in the trail (task-9.3 decision 2). Each
 * projection is a pure function of the state it reads, so the readers are testable without a
 * model and the executor is not involved.
 */
import {updateWords} from '@a2uiverse/sdk';
import {asksSignIn, Sources} from '../accounts/accounts.js';
import type {HeldComposition} from '../composition/compositions.js';
import type {CompositionState, SlotState} from '../composition/state.js';
import type {Registry} from '../registry/registry.js';
import type {HeldUpdates} from '../registry/updates.js';
import {SHELL_SOURCE_ID} from '../registry/types.js';
import type {
  AppStanding,
  CompositionApp,
  CompositionView,
  InstalledApp,
  PlatformReaders,
} from './readers.js';

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
 * The canvas a question was asked from, in the person's words (task-15.11 decision 29): what was
 * asked, each app and how its answer stands — an account's by its name when it is not the app's —
 * the merged view and why it does not show, and what no installed app does yet. Never a
 * partition's contents.
 */
export function compositionView(state: CompositionState, sources?: Sources): CompositionView {
  const apps = [...state.slots.values()]
    .filter(({plan}) => plan.source !== SHELL_SOURCE_ID)
    .map(({plan, state: slotState}): CompositionApp => {
      const label = sources?.label(plan.source);
      return {
        app: plan.displayName,
        ...(label !== undefined && label !== plan.displayName ? {account: label} : {}),
        state: standing(slotState, state.arrived.has(plan.source)),
      };
    });
  for (const [, choice] of state.choices) {
    if (choice.chosen !== undefined) continue;
    apps.push({app: choice.displayName, state: 'waiting for you to choose an account'});
  }
  // A gap an install filled reads as its app (task-15.4 decision 11); the installed line, as done.
  const nothingInstalledFor = [...state.gaps.values()]
    .filter(gap => !gap.filled)
    .map(gap => gap.words);
  const view: CompositionView = {question: state.utterance, apps, nothingInstalledFor};
  if (state.slots.has(SHELL_SOURCE_ID)) view.mergedView = mergedViewOf(state);
  return view;
}

/** A slot's state as the person would say it. */
function standing(slotState: SlotState, arrived: boolean): AppStanding {
  switch (slotState) {
    case 'pending':
      return arrived ? 'answered' : 'still loading';
    case 'collapsed':
      return 'answered with nothing to show';
    case 'failed':
      return 'couldn’t answer';
    case 'authority':
      return 'waiting for you to sign in';
    case 'update':
      return 'needs an update';
  }
}

function mergedViewOf(state: CompositionState): NonNullable<CompositionView['mergedView']> {
  const {mergedView} = state;
  if (!mergedView) return {state: 'being made'};
  switch (mergedView.outcome) {
    case 'synthesized':
      return {state: 'showing'};
    case 'skipped': {
      // Fewer than two answered: who did, never a count of sources.
      const answered = [...state.slots.values()]
        .filter(({plan}) => plan.source !== SHELL_SOURCE_ID && state.arrived.has(plan.source))
        .map(({plan}) => plan.displayName);
      return {
        state: 'not shown',
        why: answered.length === 0 ? 'no app answered' : `only ${listed(answered)} answered`,
      };
    }
    case 'declined':
      return {state: 'not shown', why: mergedView.reason ?? 'there was nothing to put together'};
    default:
      return {state: 'not shown', why: 'it couldn’t be made'};
  }
}

function listed(names: readonly string[]): string {
  return names.length < 2 ? names.join('') : `${names.slice(0, -1).join(', ')} and ${names.at(-1)}`;
}

/**
 * One line per context of an ancestry (task-9.3 decision 2): when it was opened, what was asked,
 * which apps answered and how — each by its one name (task-12.6 decision 9), in the person's words
 * (task-15.11 decision 29) — what became of the merged view, and whether it is still loading or
 * was closed. Written from the composition state, never the journal, so a composition
 * whose turn has not closed still has its line.
 */
export function compositionLine(held: HeldComposition): string {
  if (held.kind === 'closed') {
    const {record} = held;
    const apps = record.answered.length === 0 ? 'no app' : record.answered.join(', ');
    return `${new Date(record.openedAt).toISOString()} · ${JSON.stringify(record.utterance)} → ${apps}${mergedClause(record.mergedView, record.answered)} · closed`;
  }
  const {state} = held;
  const vendors = [...state.slots.values()].filter(({plan}) => plan.source !== SHELL_SOURCE_ID);
  const apps =
    vendors.length === 0
      ? 'no app'
      : vendors
          .map(
            ({plan, state: slotState}) =>
              `${plan.name} (${standing(slotState, state.arrived.has(plan.source))})`,
          )
          .join(', ');
  const answered = vendors
    .filter(({plan}) => state.arrived.has(plan.source))
    .map(({plan}) => plan.displayName);
  const standingLine = state.answeredAt === undefined ? 'still loading' : 'answered';
  return `${new Date(state.openedAt).toISOString()} · ${JSON.stringify(state.utterance)} → ${apps}${mergedClause(state.mergedView, answered)} · ${standingLine}`;
}

function mergedClause(
  mergedView: CompositionState['mergedView'],
  answered: readonly string[],
): string {
  if (!mergedView) return '';
  if (mergedView.outcome === 'synthesized') return ' · merged view showing';
  const why =
    mergedView.outcome === 'skipped'
      ? answered.length === 0
        ? 'no app answered'
        : `only ${listed(answered)} answered`
      : mergedView.outcome === 'declined'
        ? (mergedView.reason ?? 'there was nothing to put together')
        : 'it couldn’t be made';
  return ` · merged view not shown: ${why}`;
}
