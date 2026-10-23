/**
 * The platform readers over orchestrator state (task-6.4 decision 5): the Registry, the composition
 * the question was asked from, and its ancestry in the trail (task-9.3 decision 2). Each
 * projection is a pure function of the state it reads, so the readers are testable without a
 * model and the executor is not involved.
 */
import {updateWords} from '@a2uiverse/sdk';
import {asksSignIn, Sources} from '../accounts/accounts.js';
import type {HeldComposition} from '../composition/compositions.js';
import type {CompositionState, SlotEntry, SlotState} from '../composition/state.js';
import type {Registry} from '../registry/registry.js';
import type {HeldUpdates} from '../registry/updates.js';
import {SHELL_SOURCE_ID} from '../registry/types.js';
import type {
  AppStanding,
  CompositionApp,
  CompositionMergedView,
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
      skills: (card?.skills ?? []).map(({name, description, examples}) => ({
        name,
        description,
        ...(examples?.length ? {examples} : {}),
      })),
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
 * The canvas a question was asked from, in the person's words (task-15.11 decisions 29, 30): what
 * was asked; each app — an account's by its name when it is not the app's — what it was asked for,
 * how its answer stands and what to do about one that isn't there; the merged view, why it does not
 * show, what it puts together, its columns and its order; and what no installed app does yet. Never
 * a partition's contents.
 */
export function compositionView(state: CompositionState, sources?: Sources): CompositionView {
  const apps = [...state.slots.values()]
    .filter(({plan}) => plan.source !== SHELL_SOURCE_ID)
    .map((entry): CompositionApp => {
      const {plan} = entry;
      const label = sources?.label(plan.source);
      const account = label !== undefined && label !== plan.displayName ? label : undefined;
      const toDo = toDoOf(entry, plan.displayName, account);
      return {
        app: plan.displayName,
        ...(account !== undefined ? {account} : {}),
        ...(plan.request ? {askedFor: plan.request} : {}),
        state: standing(entry.state, state.arrived.has(plan.source)),
        ...(toDo !== undefined ? {toDo} : {}),
      };
    });
  for (const [, choice] of state.choices) {
    if (choice.chosen !== undefined) continue;
    apps.push({
      app: choice.displayName,
      state: 'waiting for you to choose an account',
      toDo: `Choose which ${choice.displayName} account to use, in its slot`,
    });
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

/** What the person can do about an answer that isn't there, in their words. */
function toDoOf(entry: SlotEntry, app: string, account: string | undefined): string | undefined {
  const named = account === undefined ? app : `${app} (${account})`;
  switch (entry.state) {
    case 'authority':
      if (entry.authority?.connect) return `Connect ${named} from its slot`;
      if (entry.authority?.more) return `Allow ${named} more access from its slot`;
      return `Sign in to ${named} from its slot`;
    case 'update':
      switch (entry.update?.line) {
        case 'update':
          return `Update ${app} from its slot`;
        case 'waiting':
          return `Nothing yet: ${app}’s publisher hasn’t put the update in the Store`;
        case 'unreached':
          return `Press Retry on its slot once the Store can be reached`;
        default:
          return `Nothing: the Store has no update for ${app}`;
      }
    case 'failed':
      return 'Press Retry on its slot';
    default:
      return undefined;
  }
}

/** What the merged view puts together, as the progress line says it (task-8.7 decision 30). */
function joinsOf(state: CompositionState): string | undefined {
  const join = state.slots.get(SHELL_SOURCE_ID)?.plan.join;
  const vendors = [...state.slots.values()]
    .filter(({plan}) => plan.source !== SHELL_SOURCE_ID)
    .map(({plan}) => plan);
  if (vendors.length === 0) return undefined;
  const name = (plan: (typeof vendors)[number]) =>
    plan.account ? `${plan.displayName} (${plan.account})` : plan.displayName;
  if (!join) return listed(vendors.map(name));
  if (join.home === null && join.entity)
    return `${join.entity} across ${listed(vendors.map(name))}`;
  const phrase = (plan: (typeof vendors)[number]) => {
    const noun = join.nouns[plan.source];
    if (!noun) return name(plan);
    return plan.account
      ? `${plan.displayName} ${noun} (${plan.account})`
      : `${plan.displayName} ${noun}`;
  };
  const home = vendors.find(plan => plan.source === join.home);
  if (!home) return listed(vendors.map(phrase));
  const others = vendors.filter(plan => plan !== home).map(phrase);
  return others.length > 0 ? `${phrase(home)} to ${listed(others)}` : phrase(home);
}

function mergedViewOf(state: CompositionState): CompositionMergedView {
  const plan = state.slots.get(SHELL_SOURCE_ID)?.plan;
  const joins = joinsOf(state);
  const made = {
    ...(joins !== undefined ? {joins} : {}),
    ...(plan?.columns?.length ? {columns: [...plan.columns]} : {}),
  };
  const {mergedView} = state;
  if (!mergedView) return {state: 'being made', ...made};
  switch (mergedView.outcome) {
    case 'synthesized': {
      const sort = state.synthesis?.payload.sorts[0];
      const by = sort?.options.find(option => option.key === sort.key)?.label;
      return {
        state: 'showing',
        ...made,
        ...(sort && by
          ? {sortedBy: {by, order: sort.direction === 'asc' ? 'ascending' : 'descending'}}
          : {}),
      };
    }
    case 'skipped': {
      // Fewer than two answered: who did, never a count of sources.
      const answered = [...state.slots.values()]
        .filter(({plan}) => plan.source !== SHELL_SOURCE_ID && state.arrived.has(plan.source))
        .map(({plan}) => plan.displayName);
      return {
        state: 'not shown',
        why: answered.length === 0 ? 'no app answered' : `only ${listed(answered)} answered`,
        ...made,
      };
    }
    case 'declined':
      return {
        state: 'not shown',
        why: mergedView.reason ?? 'there was nothing to put together',
        ...made,
      };
    default:
      return {state: 'not shown', why: 'it couldn’t be made', ...made};
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
