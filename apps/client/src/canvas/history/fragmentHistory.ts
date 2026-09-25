/**
 * The fragment's history on the client (SPEC §6.5; phase-9 decisions 2, 3; task 9.7): each
 * source's paints inside this canvas as a linear back/forward stack, and the wiring the merged
 * view accepted remembered per combination of the sources' steps — the client's half of what the
 * orchestrator holds in its `History` (task 9.4), counted the same way so the index a step
 * reports names the same paint on both sides.
 *
 * - **The count runs at the wire** (task-9.7 decision 2): every vendor `createSurface` the canvas
 *   receives is a step the moment it arrives, before any apply or staging decision, whatever the
 *   surface id or the paint's kind. A create that never reached the stage, one the client could
 *   not draw, and a question-kind create each occupy their index as a placeholder that holds
 *   nothing to return to; the neighbour computation skips placeholders. A create landing after a
 *   step back takes the next index and drops the steps past it, with every wiring entry filed
 *   with the source at a dropped index.
 * - **A step holds the paint as last seen** (decision 1): the current step is the live surface
 *   itself; a copy — the surface's tree, its data model with every update the vendor pushed into
 *   it, its title — is taken only when the stack moves off it, by `leaving`, which the turn
 *   runner calls before it destroys the surface. A step back makes that copy the live surface
 *   again, so leaving it later captures it afresh.
 * - **The wiring memory** (decision 3): the accepted synthesis payload is filed under the current
 *   combination — every source with a stack, mapped to its current index, keyed as the
 *   orchestrator keys it — and recalled on a step back to a combination already seen. A
 *   combination never seen is covered, as the orchestrator covers it, by the entry filed over
 *   fewer sources with every source it names where it stands now (task-9.9 decision 16).
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

/** Where a source stands in its history, as the orchestrator counts it. */
export interface HistoryStack {
  length: number;
  at: number;
}

/** The wiring accepted over a combination: the synthesis surface it was painted on, and its payload. */
export interface RememberedWiring {
  target: {surfaceId: string; source: string};
  payload: SynthesisPayload;
}

/** What a step back hands the runner: the copy to make live again, and the title its meta led with. */
export interface RestorableStep {
  paint: PaintCopy;
  title?: string;
}

export interface FragmentHistoryOptions {
  /** The source's paint as it stands on the stage now — undefined when nothing of it is live. */
  capture(source: string): PaintCopy | undefined;
}

export interface FragmentHistory {
  /** A vendor create arrived: one step of its source, the newest current. */
  paint(source: string): void;
  /**
   * The current step's paint claimed its slot: its title, and whether it is a question — a
   * question is never returned to.
   */
  landed(source: string, meta: {title?: string; question?: boolean}): void;
  /** The stack is moving off the paint on screen: capture it before the surface is destroyed. */
  leaving(source: string): void;
  /** The paint on screen left with its failed slot: nothing to return to there. */
  dropped(source: string): void;
  /**
   * The reader steps the source to `index`: the paint to restore with its title, the stack moved
   * there; undefined when the index is the current one, past the stack, or a placeholder —
   * nothing to restore.
   */
  stepTo(source: string, index: number): RestorableStep | undefined;
  /** The two neighbours of the paint on screen with a paint to return to; undefined for a source with no stack. */
  neighbours(source: string): {back?: HistoryStep; forward?: HistoryStep} | undefined;
  stackOf(source: string): HistoryStack | undefined;
  /** Every painted source's current index — the key the wiring is remembered under. */
  combination(): Record<string, number>;
  /** File the accepted wiring under the current combination, over an earlier entry there. */
  remember(entry: RememberedWiring): void;
  /** The wiring accepted over the current combination, when it was seen. */
  recall(): RememberedWiring | undefined;
  /**
   * The wiring filed over fewer sources than paint now, every source it names at the step it
   * stands on now: the one naming the most, the later filed on a tie. Undefined when none covers
   * the current combination.
   */
  recallCovering(): RememberedWiring | undefined;
  /** The composition left the canvas: the stacks and the memory go with it. */
  retire(): void;
  /** Bumped on every change; what a view subscribes to. */
  version(): number;
  subscribe(listener: () => void): () => void;
}

interface Step {
  title?: string;
  /** The paint reached its slot and is not a question: there is something here to return to. */
  returnable: boolean;
  /** The copy taken when the stack moved off this step; absent while it is the live surface. */
  paint?: PaintCopy;
  /** The copy is taken: the step is no longer what is on screen. */
  left: boolean;
}

interface Stack {
  steps: Step[];
  /** The index reported to the orchestrator: the newest create, or the step the reader went to. */
  at: number;
  /** The step whose paint fills the slot — behind `at` between a create's arrival and its landing. */
  shown: number;
}

export function createFragmentHistory({capture}: FragmentHistoryOptions): FragmentHistory {
  const stacks = new Map<string, Stack>();
  const remembered = new Map<string, RememberedWiring>();
  const listeners = new Set<() => void>();
  let version = 0;

  const changed = () => {
    version += 1;
    for (const listener of listeners) listener();
  };

  const key = () =>
    JSON.stringify(
      [...stacks]
        .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
        .map(([id, stack]) => [id, stack.at]),
    );

  const keyOf = (k: string): Record<string, number> =>
    Object.fromEntries(JSON.parse(k) as [string, number][]);

  /** The steps of `source` from `index` on are gone: so is every entry filed with one of them. */
  const drop = (source: string, index: number) => {
    for (const k of [...remembered.keys()]) {
      const at = keyOf(k)[source];
      if (at !== undefined && at >= index) remembered.delete(k);
    }
  };

  const paint = (source: string) => {
    const stack = stacks.get(source);
    const step: Step = {returnable: false, left: false};
    if (!stack) {
      stacks.set(source, {steps: [step], at: 0, shown: 0});
      changed();
      return;
    }
    if (stack.at < stack.steps.length - 1) {
      drop(source, stack.at + 1);
      stack.steps.length = stack.at + 1;
    }
    stack.steps.push(step);
    stack.at = stack.steps.length - 1;
    changed();
  };

  const landed: FragmentHistory['landed'] = (source, meta) => {
    const stack = stacks.get(source);
    if (!stack) return;
    const step = stack.steps[stack.at]!;
    step.title = meta.title;
    step.returnable = !meta.question;
    step.left = false;
    delete step.paint;
    stack.shown = stack.at;
    changed();
  };

  const leaving = (source: string) => {
    const stack = stacks.get(source);
    if (!stack) return;
    const step = stack.steps[stack.shown]!;
    if (step.left) return;
    step.left = true;
    if (!step.returnable) return;
    const copy = capture(source);
    if (copy) step.paint = copy;
    else delete step.paint;
    changed();
  };

  const dropped = (source: string) => {
    const stack = stacks.get(source);
    if (!stack) return;
    const step = stack.steps[stack.shown]!;
    step.returnable = false;
    delete step.paint;
    changed();
  };

  const stepTo: FragmentHistory['stepTo'] = (source, index) => {
    const stack = stacks.get(source);
    if (!stack || index < 0 || index >= stack.steps.length || index === stack.shown)
      return undefined;
    const step = stack.steps[index]!;
    if (!step.paint) return undefined;
    leaving(source);
    stack.at = index;
    stack.shown = index;
    step.left = false;
    changed();
    return {paint: step.paint, ...(step.title !== undefined ? {title: step.title} : {})};
  };

  const neighbourOf = (stack: Stack, index: number): HistoryStep | undefined => {
    const step = stack.steps[index];
    return step
      ? {step: index, ...(step.title !== undefined ? {title: step.title} : {})}
      : undefined;
  };

  const neighbours: FragmentHistory['neighbours'] = source => {
    const stack = stacks.get(source);
    if (!stack) return undefined;
    let back: number | undefined;
    for (let i = stack.shown - 1; i >= 0; i--) {
      if (stack.steps[i]!.paint) {
        back = i;
        break;
      }
    }
    let forward: number | undefined;
    for (let i = stack.shown + 1; i < stack.steps.length; i++) {
      if (stack.steps[i]!.paint) {
        forward = i;
        break;
      }
    }
    return {
      ...(back !== undefined ? {back: neighbourOf(stack, back)} : {}),
      ...(forward !== undefined ? {forward: neighbourOf(stack, forward)} : {}),
    };
  };

  return {
    paint,
    landed,
    leaving,
    dropped,
    stepTo,
    neighbours,
    stackOf: source => {
      const stack = stacks.get(source);
      return stack ? {length: stack.steps.length, at: stack.at} : undefined;
    },
    combination: () => Object.fromEntries([...stacks].map(([id, stack]) => [id, stack.at])),
    remember: entry => {
      remembered.set(key(), entry);
    },
    recall: () => remembered.get(key()),
    recallCovering: () => {
      const now = Object.fromEntries([...stacks].map(([id, stack]) => [id, stack.at]));
      let best: {entry: RememberedWiring; named: number} | undefined;
      for (const [k, entry] of remembered) {
        const named = Object.entries(keyOf(k));
        if (named.length >= stacks.size) continue;
        if (!named.every(([id, at]) => now[id] === at)) continue;
        if (best && named.length < best.named) continue;
        best = {entry, named: named.length};
      }
      return best?.entry;
    },
    retire: () => {
      if (stacks.size === 0 && remembered.size === 0) return;
      stacks.clear();
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
