/**
 * The turn's progress, read off the store: what the progress line under the question says.
 * Every word is computed from what the client already holds — the roster the shell paint named,
 * the slots placed, the slot states the orchestrator painted — never written by a model.
 */
import type {CanvasState} from './canvasStore';
import {SHELL_SOURCE} from './composition/roster';

/** Where one step of the turn stands. */
export type StepStatus = 'done' | 'working' | 'failed' | 'idle';

export interface SourceStep {
  appId: string;
  name: string;
  status: StepStatus;
}

export interface TurnProgress {
  /** In flight with nothing planned yet: the Planner's wait, or an action's. */
  working: {kind: 'planning' | 'other'; label: string} | null;
  /** One step per vendor source the shell reserved a slot for, in slot order. */
  sources: SourceStep[];
  /** The merge, when the plan reserved one: the apps it joins and where it stands. */
  join: {names: string[]; status: StepStatus} | null;
}

const sourceStatus = (state: CanvasState, appId: string, inFlight: boolean): StepStatus => {
  if (state.slotStates.get(appId) === 'failed') return 'failed';
  // A source that answered in prose without painting still answered.
  if (state.placement.has(appId) || state.prose.has(appId)) return 'done';
  if (state.slotStates.get(appId) === 'collapsed') return 'done';
  return inFlight ? 'working' : 'idle';
};

const joinStatus = (state: CanvasState, inFlight: boolean): StepStatus => {
  if (state.placement.has(SHELL_SOURCE)) return 'done';
  if (state.slotStates.get(SHELL_SOURCE) === 'failed') return 'failed';
  // Declined: the shell said why in words instead of painting the merge.
  if (state.prose.has(SHELL_SOURCE)) return 'failed';
  return inFlight ? 'working' : 'failed';
};

export function turnProgress(state: CanvasState): TurnProgress {
  const inFlight = state.inFlight !== null;
  const vendors = state.roster.filter(entry => entry.appId !== SHELL_SOURCE);
  const merged = state.roster.some(entry => entry.appId === SHELL_SOURCE);
  const working =
    state.inFlight && state.roster.length === 0
      ? state.inFlight.cause === 'utterance' || state.inFlight.cause === undefined
        ? {kind: 'planning' as const, label: 'Planning which apps can answer'}
        : {kind: 'other' as const, label: state.inFlight.label}
      : null;
  return {
    working,
    sources: vendors.map(entry => ({
      appId: entry.appId,
      name: entry.displayName,
      status: sourceStatus(state, entry.appId, inFlight),
    })),
    join: merged
      ? {names: vendors.map(entry => entry.displayName), status: joinStatus(state, inFlight)}
      : null,
  };
}

/** `a`, `a and b`, `a, b and c`. */
export function listed(names: readonly string[]): string {
  if (names.length <= 1) return names.join('');
  return `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]}`;
}

/** The join step's words for where it stands. */
export function joinSentence(join: NonNullable<TurnProgress['join']>): string {
  const apps = listed(join.names);
  switch (join.status) {
    case 'working':
      return `Joining ${apps}`;
    case 'done':
      return `Joined ${apps}`;
    default:
      return `Could not join ${apps}`;
  }
}
