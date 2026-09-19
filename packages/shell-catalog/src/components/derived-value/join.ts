import type {Ref} from '@a2uiverse/sdk';
import type {RelationKind, RelationOp} from '../../functions/relations.js';

/**
 * A cell's join (task-7.5 decisions 6, 8, 9, 12): what the evaluator writes beside a cell's value
 * when the object the cell belongs to carries a match claim — the mark `DerivedValue` draws and
 * the evidence it discloses, computed by `cellJoin` from the object's evaluated relations — and
 * the element a tap on the cell navigates to. React-free: the evaluator calls the rule; the
 * component only draws.
 */

/** Where a relation stands now: absent when either side does not resolve; `judged` never fails. */
export type RelationState = 'holds' | 'fails' | 'absent';

/** One side of a relation: the app it reads, its ref, and the value the ref resolved to. */
export interface RelationSide {
  app: string;
  ref: Ref;
  /** Undefined when the ref does not resolve. */
  value?: unknown;
}

/** One relation of a match claim, evaluated. */
export interface EvaluatedRelation {
  /** The Synthesizer's words for what matched — the relation's key under `match`. */
  name: string;
  kind: RelationKind;
  op: RelationOp;
  state: RelationState;
  sides: [RelationSide, RelationSide];
}

/** How a value's tie to its row stands: in the row's core, guessed, or broken. */
export type JoinMark = 'none' | 'guessed' | 'broken';

export interface CellJoin {
  mark: JoinMark;
  /** The apps the cell reads, in the order of its refs — whose join this is. */
  apps: string[];
  /** The relations touching the cell's apps. */
  evidence: EvaluatedRelation[];
}

/** The element a cell names in a vendor's fragment: where navigation lands. */
export interface CellTarget {
  app: string;
  /** The namespaced surface id (`<appId>:<surfaceId>`). */
  surface: string;
  pointer: string;
}

/** What the host does when a cell is activated. */
export type NavigationHandler = (target: CellTarget) => void;

/** The host's display name for an app; undefined when it has none, and the app id stands in. */
export type AppDisplayName = (appId: string) => string | undefined;

const SEVERITY: Record<JoinMark, number> = {none: 0, guessed: 1, broken: 2};

/**
 * Each app's mark in a claimed object (decision 9). A relation that is absent keeps the link it
 * made, so only a fact that fails changes a mark: facts that hold or are absent tie apps into
 * groups, and the largest group is the row's core, unmarked — none when no single group is
 * largest. Outside it, an app whose only links fail is broken; any other app is guessed.
 */
function appMarks(claim: readonly EvaluatedRelation[]): Map<string, JoinMark> {
  const group = new Map<string, string>();
  const find = (app: string): string => {
    const parent = group.get(app) ?? app;
    if (parent === app) return app;
    const root = find(parent);
    group.set(app, root);
    return root;
  };
  const apps = new Set(claim.flatMap(relation => relation.sides.map(side => side.app)));
  const cutOnly = new Set(apps);
  for (const {kind, state, sides} of claim) {
    const [a, b] = [sides[0].app, sides[1].app];
    if (kind === 'fact' && state === 'fails') continue;
    cutOnly.delete(a);
    cutOnly.delete(b);
    if (kind === 'fact') group.set(find(a), find(b));
  }
  const sizes = new Map<string, number>();
  for (const app of apps) sizes.set(find(app), (sizes.get(find(app)) ?? 0) + 1);
  const largest = Math.max(...sizes.values());
  const leaders = [...sizes].filter(([, size]) => size === largest);
  const core = leaders.length === 1 ? leaders[0]![0] : undefined;

  const marks = new Map<string, JoinMark>();
  for (const app of apps) {
    marks.set(app, find(app) === core ? 'none' : cutOnly.has(app) ? 'broken' : 'guessed');
  }
  return marks;
}

/**
 * The join of one cell of a claimed object: the worst mark among the cell's apps that resolved —
 * an app the claim ties in by no relation is guessed, an absent app adds no mark — and the
 * relations touching any of its apps. Undefined when the object carries no match claim.
 */
export function cellJoin(
  claim: readonly EvaluatedRelation[],
  apps: readonly string[],
  absentApps: readonly string[] = [],
): CellJoin | undefined {
  if (claim.length === 0) return undefined;
  const marks = appMarks(claim);
  const own = [...new Set(apps)];
  const mark = own
    .filter(app => !absentApps.includes(app))
    .map(app => marks.get(app) ?? 'guessed')
    .reduce<JoinMark>((worst, next) => (SEVERITY[next] > SEVERITY[worst] ? next : worst), 'none');
  const evidence = claim.filter(relation => relation.sides.some(side => own.includes(side.app)));
  return {mark, apps: own, evidence};
}
