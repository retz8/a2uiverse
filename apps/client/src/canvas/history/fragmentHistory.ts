/**
 * The fragment's history on the client (SPEC §6.5; phase-9 decisions 2, 3; tasks 9.7, 10.9): each
 * source's paints inside this canvas, kept once by paint id and never dropped, and the list of
 * visits its two arrows walk; and the wiring the merged view accepted, remembered per combination
 * of the paints on screen — the client's half of what the orchestrator holds in its `History`
 * (task 9.4), counted the same way so the paint id a step reports names the same paint on both
 * sides. The list of visits is the client's alone (task-10.9 decision 6).
 *
 * - **The count runs at the wire** (task-9.7 decision 2): every vendor `createSurface` the canvas
 *   receives is a paint the moment it arrives, before any apply or staging decision, whatever the
 *   surface id or the paint's kind, and is visited at once. A create that never reached the
 *   stage, one the client could not draw, and a question-kind create each take their paint id as
 *   a placeholder that holds nothing to return to; the neighbour computation skips placeholders.
 * - **A new paint after a Back records where the reader landed** (task-10.9 decision 4): a create
 *   arriving while the reader is not on the last visit first appends the paint they landed on,
 *   then the new one; the paints passed through on the way back are not visited again.
 * - **A paint is kept as last seen** (task-9.7 decision 1): the paint on screen is the live
 *   surface itself; a copy — the surface's tree, its data model with every update the vendor
 *   pushed into it, its title — is taken only when the reader moves off it, by `leaving`, which
 *   the turn runner calls before it destroys the surface. A step makes that copy the live surface
 *   again, so leaving it later captures it afresh.
 * - **The wiring memory** (task-9.7 decision 3, task-10.9 decision 5): the accepted synthesis
 *   payload is filed under the current combination — every painted source mapped to the paint it
 *   has on screen, keyed as the orchestrator keys it — and recalled on a step to a combination
 *   already seen, whatever route reached it. A combination never seen is covered, as the
 *   orchestrator covers it, by the entry filed over fewer sources with every source it names on
 *   the paint it shows now (task-9.9 decision 16).
 *
 * Nothing here touches the processor or the store: the runtime supplies `capture`, and the turn
 * runner restores a copy the step hands back. In memory for the session; retired with the
 * composition.
 */
import type {SynthesisPayload} from '@a2uiverse/sdk';
import type {HistoryStep} from '@a2uiverse/shell-catalog';

/** One paint as the stack keeps it: the surface's wire shape, ready to be created again. */
export interface PaintCopy {
  surfaceId: string;
  catalogId: string;
  /** The create's own flag: a surface the client reports in its data model stays one when restored. */
  sendDataModel: boolean;
  /** Flat component-id → component-tree node — the A2UI wire shape. */
  tree: Readonly<Record<string, unknown>>;
  dataModel: unknown;
}

/** Where a source stands in its history: the paint ids it visited, and the position reported. */
export interface HistoryVisits {
  visits: number[];
  at: number;
}

/** The wiring accepted over a combination: the synthesis surface it was painted on, and its payload. */
export interface RememberedWiring {
  target: {surfaceId: string; source: string};
  payload: SynthesisPayload;
}

/**
 * What a step hands the runner: the copy to make live again, the title its meta led with, and
 * the paint id the step reports to the orchestrator.
 */
export interface RestorableStep {
  paint: PaintCopy;
  title?: string;
  id: number;
}

export interface FragmentHistoryOptions {
  /** The source's paint as it stands on the stage now — undefined when nothing of it is live. */
  capture(source: string): PaintCopy | undefined;
}

export interface FragmentHistory {
  /** A vendor create arrived: one paint of its source, visited at once. */
  paint(source: string): void;
  /**
   * The newest paint claimed its slot: its title, and whether it is a question — a question is
   * never returned to.
   */
  landed(source: string, meta: {title?: string; question?: boolean}): void;
  /** The reader is moving off the paint on screen: capture it before the surface is destroyed. */
  leaving(source: string): void;
  /** The paint on screen left with its failed slot: nothing to return to there. */
  dropped(source: string): void;
  /**
   * The reader steps the source to the visit at `position`: the paint to restore with its title
   * and paint id, the reader moved there; undefined when that visit is past the list, holds the
   * paint on screen, or holds a placeholder — nothing to restore.
   */
  stepTo(source: string, position: number): RestorableStep | undefined;
  /**
   * The nearest visit each way holding a paint to return to other than the one on screen, each
   * named by its position; undefined for a source that has not painted.
   */
  neighbours(source: string): {back?: HistoryStep; forward?: HistoryStep} | undefined;
  visitsOf(source: string): HistoryVisits | undefined;
  /** Every painted source's paint on screen — the key the wiring is remembered under. */
  combination(): Record<string, number>;
  /** File the accepted wiring under the current combination, over an earlier entry there. */
  remember(entry: RememberedWiring): void;
  /** The wiring accepted over the current combination, when it was seen. */
  recall(): RememberedWiring | undefined;
  /**
   * The wiring filed over fewer sources than paint now, every source it names on the paint it
   * shows now: the one naming the most, the later filed on a tie. Undefined when none covers the
   * current combination.
   */
  recallCovering(): RememberedWiring | undefined;
  /** The composition left the canvas: the paints, the visits and the memory go with it. */
  retire(): void;
  /** Bumped on every change; what a view subscribes to. */
  version(): number;
  subscribe(listener: () => void): () => void;
}

interface Paint {
  title?: string;
  /** The paint reached its slot and is not a question: there is something here to return to. */
  returnable: boolean;
  /** The copy taken when the reader moved off this paint; absent while it is the live surface. */
  copy?: PaintCopy;
  /** The copy is taken: the paint is no longer what is on screen. */
  left: boolean;
}

interface Source {
  /** Every paint the source made, by paint id. */
  paints: Paint[];
  /** The paint ids the reader visited, in order: what the arrows walk. */
  visits: number[];
  /** The visit reported to the orchestrator: the newest create's, or the one the reader went to. */
  at: number;
  /** The visit whose paint fills the slot — behind `at` between a create's arrival and its landing. */
  shown: number;
}

export function createFragmentHistory({capture}: FragmentHistoryOptions): FragmentHistory {
  const sources = new Map<string, Source>();
  const remembered = new Map<string, RememberedWiring>();
  const listeners = new Set<() => void>();
  let version = 0;

  const changed = () => {
    version += 1;
    for (const listener of listeners) listener();
  };

  const onScreen = (): Record<string, number> =>
    Object.fromEntries([...sources].map(([id, source]) => [id, source.visits[source.at]!]));

  const key = () =>
    JSON.stringify(Object.entries(onScreen()).sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0)));

  const keyOf = (k: string): Record<string, number> =>
    Object.fromEntries(JSON.parse(k) as [string, number][]);

  /** The paint in the visit at `position`. */
  const paintAt = (source: Source, position: number) => source.paints[source.visits[position]!]!;

  const paint = (id: string) => {
    const source = sources.get(id);
    const made: Paint = {returnable: false, left: false};
    if (!source) {
      sources.set(id, {paints: [made], visits: [0], at: 0, shown: 0});
      changed();
      return;
    }
    const {visits} = source;
    // Off the last visit: where the reader landed is visited again first (task-10.9 decision 4).
    if (source.at < visits.length - 1) {
      visits.push(visits[source.at]!);
      source.shown = visits.length - 1;
    }
    source.paints.push(made);
    visits.push(source.paints.length - 1);
    source.at = visits.length - 1;
    changed();
  };

  const landed: FragmentHistory['landed'] = (id, meta) => {
    const source = sources.get(id);
    if (!source) return;
    const made = paintAt(source, source.at);
    made.title = meta.title;
    made.returnable = !meta.question;
    made.left = false;
    delete made.copy;
    source.shown = source.at;
    changed();
  };

  const leaving = (id: string) => {
    const source = sources.get(id);
    if (!source) return;
    const shown = paintAt(source, source.shown);
    if (shown.left) return;
    shown.left = true;
    if (!shown.returnable) return;
    const copy = capture(id);
    if (copy) shown.copy = copy;
    else delete shown.copy;
    changed();
  };

  const dropped = (id: string) => {
    const source = sources.get(id);
    if (!source) return;
    const shown = paintAt(source, source.shown);
    shown.returnable = false;
    delete shown.copy;
    changed();
  };

  const stepTo: FragmentHistory['stepTo'] = (id, position) => {
    const source = sources.get(id);
    if (!source || position < 0 || position >= source.visits.length) return undefined;
    const paintId = source.visits[position]!;
    if (paintId === source.visits[source.shown]) return undefined;
    const target = source.paints[paintId]!;
    if (!target.copy) return undefined;
    leaving(id);
    source.at = position;
    source.shown = position;
    target.left = false;
    changed();
    return {
      paint: target.copy,
      ...(target.title !== undefined ? {title: target.title} : {}),
      id: paintId,
    };
  };

  /** A visit the arrows can land on: a copy to restore, and not the paint on screen. */
  const reachable = (source: Source, position: number) =>
    source.visits[position] !== source.visits[source.shown] &&
    paintAt(source, position).copy !== undefined;

  const neighbourOf = (source: Source, position: number): HistoryStep => {
    const {title} = paintAt(source, position);
    return {step: position, ...(title !== undefined ? {title} : {})};
  };

  const neighbours: FragmentHistory['neighbours'] = id => {
    const source = sources.get(id);
    if (!source) return undefined;
    let back: number | undefined;
    for (let i = source.shown - 1; i >= 0; i--) {
      if (reachable(source, i)) {
        back = i;
        break;
      }
    }
    let forward: number | undefined;
    for (let i = source.shown + 1; i < source.visits.length; i++) {
      if (reachable(source, i)) {
        forward = i;
        break;
      }
    }
    return {
      ...(back !== undefined ? {back: neighbourOf(source, back)} : {}),
      ...(forward !== undefined ? {forward: neighbourOf(source, forward)} : {}),
    };
  };

  return {
    paint,
    landed,
    leaving,
    dropped,
    stepTo,
    neighbours,
    visitsOf: id => {
      const source = sources.get(id);
      return source ? {visits: [...source.visits], at: source.at} : undefined;
    },
    combination: onScreen,
    remember: entry => {
      remembered.set(key(), entry);
    },
    recall: () => remembered.get(key()),
    recallCovering: () => {
      const now = onScreen();
      let best: {entry: RememberedWiring; named: number} | undefined;
      for (const [k, entry] of remembered) {
        const named = Object.entries(keyOf(k));
        if (named.length >= sources.size) continue;
        if (!named.every(([id, at]) => now[id] === at)) continue;
        if (best && named.length < best.named) continue;
        best = {entry, named: named.length};
      }
      return best?.entry;
    },
    retire: () => {
      if (sources.size === 0 && remembered.size === 0) return;
      sources.clear();
      remembered.clear();
      changed();
    },
    version: () => version,
    subscribe: listener => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
  };
}
