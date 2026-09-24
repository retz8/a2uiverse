/**
 * The merged view's press lines (task 8.5), in the shell's words, composed from the facts the
 * runtime paints on the shell `Slot` (task-8.4 decision 13) and the presses the host holds: the row
 * above a landed view (decision 6) and the lines on a collapsed merge (decision 7). Pure — the
 * view draws what these return.
 */
import type {CompositionOperation, OperationKind} from '@a2uiverse/sdk';
import type {PressRecord} from '../../press-state.js';
import type {SlotCallFailed, SlotCollapse} from './slot.schema.js';

/** What the runtime paints on the shell `Slot` that the lines are drawn from. */
export interface MergeFacts {
  /** The join's home source, when the plan has one: the collapse on it carries its Retry. */
  home?: string;
  late?: string[];
  working?: {sources: string[]};
  callFailed?: SlotCallFailed;
  retrying?: string[];
  declined?: {reason: string};
  collapse?: SlotCollapse;
}

/** One line: a sentence, the spinner while something runs, and at most one press. */
export interface PressLine {
  text: string;
  working?: boolean;
  press?: {label: string; operation: CompositionOperation};
  /** Said politely from the slot: the outcomes the progress line does not say (decision 15). */
  announce?: boolean;
}

export const UNREACHED_WORDS = 'That didn’t reach A2UIVerse.';
export const LOST_WORDS = 'Lost the connection to A2UIVerse. Ask again to see where this stands.';
export const UNUPDATED_WORDS = 'The merged view couldn’t be updated.';
export const UNMADE_WORDS = 'The merged view couldn’t be made.';

/** `a`, `a and b`, `a, b and c`. */
export function listed(names: readonly string[]): string {
  return names.length < 2 ? names.join('') : `${names.slice(0, -1).join(', ')} and ${names.at(-1)}`;
}

type Name = (appId: string) => string;

/** The Include press named for its object: one late source by name, several as "all". */
const includeLabel = (late: readonly string[], name: Name) =>
  late.length === 1 ? `Include ${name(late[0]!)}` : 'Include all';

const find = (
  presses: readonly PressRecord[],
  status: PressRecord['status'],
  kinds: OperationKind[],
) => presses.find(p => p.status === status && kinds.includes(p.operation.kind));

/** A line whose press did not reach the orchestrator says so beside the press that tries again. */
function withUnreached(line: PressLine, presses: readonly PressRecord[]): PressLine {
  if (!line.press || !find(presses, 'unreached', [line.press.operation.kind])) return line;
  return {...line, text: `${line.text} ${UNREACHED_WORDS}`, announce: true};
}

/**
 * The row above a landed merged view. While a press's call runs, only the working sentence;
 * otherwise "couldn't be updated" with Try again, then the late sources' line with Include — two
 * rows only when both stand.
 */
export function landedLines(
  facts: MergeFacts,
  presses: readonly PressRecord[],
  name: Name,
): PressLine[] {
  const names = (ids: readonly string[]) => listed(ids.map(name));
  const sent = find(presses, 'sent', ['include', 'tryAgain']);
  if (facts.working || sent) {
    if (facts.working && find(presses, 'lost', ['include', 'tryAgain']))
      return [{text: LOST_WORDS, announce: true}];
    const sources = facts.working?.sources ?? sent?.operation.sources ?? [];
    return [
      {
        text: sources.length > 0 ? `Including ${names(sources)}…` : 'Updating the merged view…',
        working: true,
      },
    ];
  }
  const lines: PressLine[] = [];
  if (facts.callFailed?.kind === 'update') {
    lines.push({
      text: UNUPDATED_WORDS,
      press: {label: 'Try again', operation: {kind: 'tryAgain', sources: []}},
      announce: true,
    });
  }
  const late = facts.late ?? [];
  if (late.length > 0) {
    const failed = facts.callFailed?.kind === 'include' ? facts.callFailed.sources : [];
    const again = late.filter(source => failed.includes(source));
    const fresh = late.filter(source => !failed.includes(source));
    // Said for the reader, not the mechanism (task-8.7 decision 21): the view was made before
    // the source answered, so it is not in it — no "merge", no deadline.
    const text =
      again.length === 0
        ? `${names(late)} answered after this view was made.`
        : fresh.length === 0
          ? `Couldn’t include ${names(again)}.`
          : `Couldn’t include ${names(again)}. ${names(fresh)} answered after this view was made.`;
    lines.push({
      text,
      press: {
        label: again.length > 0 && fresh.length === 0 ? 'Include again' : includeLabel(late, name),
        operation: {kind: 'include', sources: late},
      },
    });
  }
  return lines.map(line => withUnreached(line, presses));
}

/**
 * The lines on a collapsed merge: the working sentence while a press makes it, the waiting sentence
 * while a Retry that could bring it back runs — or is pressed and not yet painted — "couldn't be
 * made" with Try again, a collapse on the home source with that source's Retry on the line itself
 * (task-8.7 decision 23), else the decline's reason or the cause's own line; under a decline's
 * line, the late sources with Include. The collapse line is the caller's — the reason, or the
 * cause's words.
 */
export function collapsedLines(
  facts: MergeFacts,
  presses: readonly PressRecord[],
  name: Name,
  collapseLine: string | undefined,
): PressLine[] {
  const names = (ids: readonly string[]) => listed(ids.map(name));
  const sent = find(presses, 'sent', ['include', 'tryAgain']);
  const making = facts.working !== undefined || sent !== undefined;
  const retrying = facts.retrying ?? [];
  // The sources whose Retry the collapse line carries (task-8.7 decisions 23 and 24): the home
  // source when the merge collapsed on it, every source that did not arrive when too few did.
  const collapse = facts.declined ? undefined : facts.collapse;
  const retryable =
    collapse?.cause === 'home' && facts.home !== undefined
      ? [facts.home]
      : collapse?.cause === 'few'
        ? (collapse.failed ?? [])
        : [];
  const retrySent = retryable.filter(source =>
    presses.some(
      p => p.status === 'sent' && p.operation.kind === 'retry' && p.operation.sources[0] === source,
    ),
  );
  let first: PressLine | undefined;
  if (making) {
    first =
      facts.working && find(presses, 'lost', ['include', 'tryAgain'])
        ? {text: LOST_WORDS, announce: true}
        : {text: 'Making the merged view…', working: true};
  } else if (retrying.length > 0) {
    const lost = presses.some(
      p =>
        p.status === 'lost' &&
        p.operation.kind === 'retry' &&
        retrying.includes(p.operation.sources[0]!),
    );
    first = lost
      ? {text: LOST_WORDS, announce: true}
      : {text: `Waiting for ${names(retrying)}, then merging…`, working: true};
  } else if (retrySent.length > 0) {
    // Drawn at the press, before the paint says `retrying` (task-8.5 decision 8).
    first = {text: `Waiting for ${names(retrySent)}, then merging…`, working: true};
  } else if (!facts.declined && facts.collapse?.cause === 'unmade') {
    first = {
      text: UNMADE_WORDS,
      press: {label: 'Try again', operation: {kind: 'tryAgain', sources: []}},
    };
  } else if (collapseLine && retryable.length > 0) {
    // The view's own action: the same Retry the tiles carry, on the line where the view was, so
    // the reader is not sent hunting for it — one source by name, several as "all", which the
    // host sends as one Retry per source.
    first = {
      text: collapseLine,
      press: {
        label: retryable.length === 1 ? `Retry ${name(retryable[0]!)}` : 'Retry all',
        operation: {kind: 'retry', sources: retryable},
      },
    };
  } else if (collapseLine) {
    first = {text: collapseLine};
  }
  const lines = first ? [first] : [];
  const late = facts.late ?? [];
  if (facts.declined && late.length > 0 && !making) {
    lines.push({
      text: `${names(late)} ${late.length === 1 ? 'has' : 'have'} answered since.`,
      press: {label: includeLabel(late, name), operation: {kind: 'include', sources: late}},
    });
  }
  return lines.map(line => withUnreached(line, presses));
}

/** The vendor slot's own press: Retry, where it stands for this source. */
export function retryStatus(
  presses: readonly PressRecord[],
  source: string,
): PressRecord['status'] | undefined {
  return presses.find(p => p.operation.kind === 'retry' && p.operation.sources[0] === source)
    ?.status;
}
