/**
 * The synthesis session (task-4.5 decisions 3–6): the one object that holds a composition's
 * synthesis state between wiring arrival and teardown — the wiring, the subscriptions that
 * re-run the evaluator, the latest generation seen per surface, the sort the user chose, and
 * the last output written.
 *
 * It lives beside the live processor and is fed by the turn runner: generations off every
 * stamp before that event's messages apply, the wiring once the synthesis surface is live, and
 * a retire when the composition leaves the canvas. Nothing in React reads it — `DerivedValue`
 * and `SortControl` read the data model it writes.
 *
 * Re-evaluation rides the data model's own reactivity: a root subscription on every surface
 * the wiring refs fires on any nested write, whether from a vendor's `updateDataModel` or a
 * two-way edit inside its fragment, and a `/sort` subscription on the synthesis surface catches
 * the sort control's write-back. One mechanism, three change sources. Those runs are coalesced
 * to one microtask, so a vendor batch of several data-model messages evaluates once; intake and
 * a generation note evaluate synchronously, so the first render already carries values and a
 * bump marks stale before anything else happens. The evaluator's own root write is guarded so it
 * cannot re-trigger itself, and an unchanged output is not written.
 */
import type {FunctionImplementation} from '@a2ui/web_core/v0_9';
import type {Sort, SynthesisWiring} from '@a2uiverse/sdk';
import {evaluate as evaluateWiring, type SynthesisModel} from './bindingEvaluator';
import {validateWiring} from './wiringSchema';

/** A wiring the client could not accept — what becomes a `VALIDATION_FAILED` report. */
export interface SynthesisFailure {
  /** Namespaced, as the hub sent it. */
  surfaceId: string;
  slot: string;
  path: string;
  message: string;
}

/** What the turn runner feeds the session. */
export interface SynthesisIntake {
  /** The generations on a relayed event's stamp — noted before that event's messages apply. */
  noteGenerations(generations: Readonly<Record<string, number>>): void;
  /** The synthesis surface reached the live processor, with the wiring that rode its paint. */
  accept(target: {surfaceId: string; slot: string}, wiring: unknown): void;
  /** The composition left the canvas. */
  retire(): void;
}

interface ObservableDataModel {
  get(path: string): unknown;
  set(path: string, value: unknown): unknown;
  subscribe(path: string, onChange: (value: unknown) => void): {unsubscribe(): void};
}

/** The slice of MessageProcessor the session reads; MessageProcessor satisfies it structurally. */
export interface SynthesisProcessor {
  readonly model: {getSurface(id: string): {dataModel: ObservableDataModel} | undefined};
  onSurfaceCreated(handler: (surface: {id: string}) => void): {unsubscribe(): void};
  onSurfaceDeleted(handler: (id: string) => void): {unsubscribe(): void};
}

export interface SynthesisSessionOptions {
  processor: SynthesisProcessor;
  /** The shell catalog's functions — the operator vocabulary the evaluator dispatches to. */
  functions: ReadonlyMap<string, FunctionImplementation>;
  /** The operator names the shell catalog declares; a wiring naming another is invalid. */
  operators: readonly string[];
  onInvalid?: (failure: SynthesisFailure) => void;
}

export interface SynthesisSession extends SynthesisIntake {
  /** The live wiring, if one was accepted. */
  readonly wiring: SynthesisWiring | undefined;
  /** The last output written to the synthesis surface. */
  readonly output: SynthesisModel | undefined;
  /** The generation the session has seen per surface. */
  readonly generations: Readonly<Record<string, number>>;
  /** Recompute and write; a no-op without a live wiring and surface. */
  evaluate(): void;
  dispose(): void;
}

const sortOf = (value: unknown): Sort | undefined => {
  const candidate = value as {field?: unknown; direction?: unknown} | null | undefined;
  if (typeof candidate?.field !== 'string') return undefined;
  if (candidate.direction !== 'asc' && candidate.direction !== 'desc') return undefined;
  return {field: candidate.field, direction: candidate.direction};
};

export function createSynthesisSession({
  processor,
  functions,
  operators,
  onInvalid,
}: SynthesisSessionOptions): SynthesisSession {
  let wiring: SynthesisWiring | undefined;
  let surfaceId: string | undefined;
  /** The sort the user chose this turn; sticks across re-synthesis while its field exists. */
  let userSort: Sort | undefined;
  let output: SynthesisModel | undefined;
  let outputJson: string | undefined;
  let generations: Record<string, number> = {};
  const subscriptions = new Map<string, {unsubscribe(): void}>();
  let writing = false;
  let scheduled = false;

  /** Every surface the wiring refs — what the session watches. */
  const refSurfaces = (): Set<string> => {
    const surfaces = new Set<string>();
    if (!wiring) return surfaces;
    for (const entity of wiring.entities)
      for (const cell of entity.cells) for (const ref of cell.args) surfaces.add(ref.surface);
    return surfaces;
  };

  const unwatch = (id: string) => {
    subscriptions.get(id)?.unsubscribe();
    subscriptions.delete(id);
  };

  const unwatchAll = () => {
    for (const sub of subscriptions.values()) sub.unsubscribe();
    subscriptions.clear();
  };

  const evaluate = () => {
    if (!wiring || !surfaceId) return;
    const target = processor.model.getSurface(surfaceId);
    if (!target) return;
    const next = evaluateWiring({
      wiring,
      models: surface => processor.model.getSurface(surface)?.dataModel.get('/'),
      generations,
      sort: userSort,
      functions,
    });
    const json = JSON.stringify(next);
    if (json === outputJson) return;
    output = next;
    outputJson = json;
    writing = true;
    try {
      // One root write (decision 4): no render sees new entities beside an old sort object.
      target.dataModel.set('/', next);
    } finally {
      writing = false;
    }
  };

  /** Data-model changes coalesce: however many writes land in one task, one evaluation. */
  const schedule = () => {
    if (scheduled) return;
    scheduled = true;
    queueMicrotask(() => {
      scheduled = false;
      evaluate();
    });
  };

  const watch = (id: string) => {
    unwatch(id);
    const surface = processor.model.getSurface(id);
    if (!surface) return;
    const isSynthesis = id === surfaceId;
    const sub = surface.dataModel.subscribe(isSynthesis ? '/sort' : '/', value => {
      if (writing) return;
      if (isSynthesis) {
        // The sort control wrote the whole object back; the user's choice is now in force.
        userSort = sortOf(value) ?? userSort;
      }
      schedule();
    });
    subscriptions.set(id, sub);
  };

  const noteGenerations: SynthesisIntake['noteGenerations'] = incoming => {
    let changed = false;
    for (const [surface, generation] of Object.entries(incoming)) {
      if (generations[surface] === generation) continue;
      generations = {...generations, [surface]: generation};
      changed = true;
    }
    // A bump alone marks stale, before any data write follows it.
    if (changed) evaluate();
  };

  const accept: SynthesisIntake['accept'] = (target, raw) => {
    const result = validateWiring(raw, operators);
    if (!result.ok) {
      unwatchAll();
      wiring = undefined;
      outputJson = undefined;
      const {path, message} = result;
      onInvalid?.({surfaceId: target.surfaceId, slot: target.slot, path, message});
      return;
    }
    wiring = result.wiring;
    surfaceId = target.surfaceId;
    outputJson = undefined;
    unwatchAll();
    for (const surface of refSurfaces()) watch(surface);
    watch(surfaceId);
    evaluate();
  };

  const retire: SynthesisIntake['retire'] = () => {
    unwatchAll();
    wiring = undefined;
    surfaceId = undefined;
    userSort = undefined;
    output = undefined;
    outputJson = undefined;
    generations = {};
  };

  // A surface the wiring refs may be re-created by a vendor repaint (a fresh data model to
  // watch) or deleted (its refs go absent); the synthesis surface itself is re-created on
  // every re-synthesis, and its new wiring is accepted right after.
  const created = processor.onSurfaceCreated(surface => {
    if (!wiring) return;
    if (surface.id === surfaceId || refSurfaces().has(surface.id)) {
      watch(surface.id);
      schedule();
    }
  });
  const deleted = processor.onSurfaceDeleted(id => {
    unwatch(id);
    if (wiring && id !== surfaceId && refSurfaces().has(id)) schedule();
  });

  return {
    get wiring() {
      return wiring;
    },
    get output() {
      return output;
    },
    get generations() {
      return generations;
    },
    noteGenerations,
    accept,
    retire,
    evaluate,
    dispose: () => {
      retire();
      created.unsubscribe();
      deleted.unsubscribe();
    },
  };
}
