/**
 * The turn's progress, read off the store: what the progress line under the question says.
 * Every sentence is computed from what the client already holds — the roster the shell paint
 * named, the slots placed, the slot states and the merged view's facts the orchestrator painted,
 * the presses the reader made. The one model word in it is the entity's noun in each source, from
 * the Planner's join hypothesis (task-7.15).
 */
import type {CanvasState, JoinNouns, RosterEntry} from './canvasStore';
import {retrying} from './composition/columnState';
import {SHELL_SOURCE} from './composition/roster';

/** Where one step of the turn stands. */
export type StepStatus = 'done' | 'working' | 'failed' | 'idle';

export interface SourceStep {
  appId: string;
  name: string;
  status: StepStatus;
}

export interface TurnProgress {
  /** In flight with nothing planned yet — the Planner's wait — or an action running inside the composition. */
  working: {kind: 'planning' | 'other'; label: string} | null;
  /** One step per vendor source the shell reserved a slot for, in slot order. */
  sources: SourceStep[];
  /** The merge, when the plan reserved one: where it stands, in the client's words (task-8.5 decision 11). */
  merge: {text: string; status: StepStatus} | null;
}

/** Something runs on the composition: the turn, or a press beside it (task-8.5 decision 10). */
export function running(state: CanvasState): boolean {
  return (
    state.inFlight !== null ||
    state.presses.some(press => press.status === 'sent' || press.status === 'running')
  );
}

const sourceStatus = (state: CanvasState, appId: string, busy: boolean): StepStatus => {
  // The reader's Retry is drawn from the press, before the paint says so.
  const retried = retrying(state, appId);
  const painted = state.slotStates.get(appId);
  if (painted === 'failed' && !retried) return 'failed';
  // A source that answered in prose without painting still answered.
  if (state.placement.has(appId) || state.prose.has(appId)) return 'done';
  if (painted === 'collapsed') return 'done';
  return busy || retried ? 'working' : 'idle';
};

export function turnProgress(state: CanvasState): TurnProgress {
  const busy = running(state);
  // A newer question was sent: the composition on stage is not what the line speaks for.
  const roster = state.superseded ? [] : state.roster;
  const vendors = roster.filter(entry => entry.appId !== SHELL_SOURCE);
  const merged = roster.find(entry => entry.appId === SHELL_SOURCE);
  // An utterance plans until its roster lands; an action runs inside the composition, its label
  // beside the composition's ticks (task-8.5 decision 13).
  const planning =
    state.inFlight !== null &&
    (state.inFlight.cause === 'utterance' || state.inFlight.cause === undefined);
  const working =
    state.inFlight === null
      ? null
      : planning
        ? roster.length === 0
          ? {kind: 'planning' as const, label: 'Planning which apps can answer'}
          : null
        : {kind: 'other' as const, label: state.inFlight.label};
  return {
    working,
    sources: vendors.map(entry => ({
      appId: entry.appId,
      name: entry.displayName,
      status: sourceStatus(state, entry.appId, busy),
    })),
    merge: merged && vendors.length > 0 ? mergeStep(state, vendors, merged.join, busy) : null,
  };
}

/** `a`, `a and b`, `a, b and c`. */
export function listed(names: readonly string[]): string {
  if (names.length <= 1) return names.join('');
  return `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]}`;
}

/**
 * The merge step (task-8.5 decision 11). Under a join the phrase is the home source's noun joined
 * to the others' — "Linear issues to GitHub PRs and CircleCI runs" — otherwise the apps listed. A
 * merge landed without some source names the view over what it holds, then one clause per missing
 * source in slot order, after the pattern of the design canvas's F6: "· no CircleCI runs to join".
 */
function mergeStep(
  state: CanvasState,
  vendors: readonly RosterEntry[],
  join: JoinNouns | undefined,
  busy: boolean,
): {text: string; status: StepStatus} {
  const facts = state.merge ?? {};
  const noun = (entry: RosterEntry) => join?.nouns[entry.appId];
  const phrase = (entry: RosterEntry) =>
    noun(entry) ? `${entry.displayName} ${noun(entry)}` : entry.displayName;
  const home = join ? vendors.find(entry => entry.appId === join.home) : undefined;
  const joined = (entries: readonly RosterEntry[]) => {
    const others = entries.filter(entry => entry !== home).map(phrase);
    if (!home || !entries.includes(home)) return listed(entries.map(phrase));
    return others.length > 0 ? `${phrase(home)} to ${listed(others)}` : phrase(home);
  };
  const by = (ids: readonly string[] | undefined) => vendors.filter(v => ids?.includes(v.appId));
  const pressed = (kind: 'include' | 'tryAgain') =>
    state.presses.find(press => press.status === 'sent' && press.operation.kind === kind);
  const shell = state.slotStates.get(SHELL_SOURCE);
  const arrived = vendors.filter(v => state.placement.has(v.appId));

  if (shell === 'collapsed') {
    if (facts.working || pressed('include') || pressed('tryAgain'))
      return {text: `Joining ${joined(arrived)}`, status: 'working'};
    if (facts.retrying?.length)
      return {
        text: `Waiting for ${listed(by(facts.retrying).map(phrase))}, then joining`,
        status: 'working',
      };
    if (facts.declined) {
      // A source that arrived after the decline was not among what it found nothing to join; it
      // waits for Include, said in its own clause after the shell catalog's line.
      const late = by(facts.late);
      const before = (entries: readonly RosterEntry[]) => entries.filter(v => !late.includes(v));
      const over = before(arrived).length > 0 ? before(arrived) : before(vendors);
      const since = late.map(entry => `${phrase(entry)} answered since`);
      return {
        text: [`Found nothing to join across ${listed(over.map(phrase))}`, ...since].join(' · '),
        status: 'idle',
      };
    }
    switch (facts.collapse?.cause) {
      case 'home':
        return {
          text: `Can’t join without ${facts.collapse.home ?? phrase(home ?? vendors[0]!)}`,
          status: 'idle',
        };
      case 'few': {
        const answered = facts.collapse.answered ?? [];
        return {
          text:
            answered.length === 0
              ? 'No app answered, nothing to join'
              : `Only ${listed(answered)} answered, nothing to join`,
          status: 'idle',
        };
      }
      default:
        return {text: `Could not join ${joined(vendors)}`, status: 'failed'};
    }
  }

  if (state.placement.has(SHELL_SOURCE) && shell !== 'failed') {
    const inMerge = facts.merged ? by(facts.merged) : vendors;
    if ((facts.working && facts.working.sources.length === 0) || pressed('tryAgain'))
      return {text: `Joining ${joined(inMerge)}`, status: 'working'};
    const including = [
      ...(facts.working?.sources ?? []),
      ...(pressed('include')?.operation.sources ?? []),
    ];
    const failedInclude = facts.callFailed?.kind === 'include' ? facts.callFailed.sources : [];
    const clauses = vendors
      .filter(entry => !inMerge.includes(entry))
      .flatMap(entry => {
        const id = entry.appId;
        if (including.includes(id)) return [`including ${phrase(entry)}`];
        if (failedInclude.includes(id)) return [`couldn’t include ${phrase(entry)}`];
        if (facts.late?.includes(id)) return [`${phrase(entry)} not in this view yet`];
        if (state.slotStates.get(id) === 'failed' && !retrying(state, id))
          return [noun(entry) ? `no ${phrase(entry)} to join` : `without ${entry.displayName}`];
        if (!state.placement.has(id) && state.slotStates.get(id) !== 'collapsed')
          return [`${phrase(entry)} still loading`];
        return [];
      });
    return {text: [`Joined ${joined(inMerge)}`, ...clauses].join(' · '), status: 'done'};
  }

  if (shell === 'failed' || !busy)
    return {text: `Could not join ${joined(vendors)}`, status: 'failed'};
  // Before the view lands the step says what the client knows (task-8.7 decision 20): a merge is
  // possible once two sources have arrived, the home source among them under a join. Until then,
  // the sources still awaited; from then, the arrived ones being joined, and one clause per source
  // still out or failed, as the landed form has them. The orchestrator paints nothing at the soft
  // deadline's release, so the sentence never claims to know whether a straggler will make it.
  const failed = (id: string) => state.slotStates.get(id) === 'failed' && !retrying(state, id);
  const out = vendors.filter(
    entry => !state.placement.has(entry.appId) && !state.prose.has(entry.appId),
  );
  const awaited = out.filter(entry => !failed(entry.appId));
  const possible = arrived.length >= 2 && (!home || arrived.includes(home));
  // Nothing arrived yet: the plan, in one short sentence, rather than every source awaited.
  if (arrived.length === 0) return {text: `Joining ${joined(vendors)}`, status: 'working'};
  if (!possible && awaited.length > 0)
    return {text: `Waiting for ${listed(awaited.map(phrase))}, then joining`, status: 'working'};
  const clauses = out.map(entry =>
    failed(entry.appId)
      ? noun(entry)
        ? `no ${phrase(entry)} to join`
        : `without ${entry.displayName}`
      : `${phrase(entry)} still loading`,
  );
  const over = arrived.length > 0 ? arrived : vendors;
  return {text: [`Joining ${joined(over)}`, ...clauses].join(' · '), status: 'working'};
}
