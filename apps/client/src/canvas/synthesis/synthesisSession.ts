/**
 * The synthesis session (task-4.5 decisions 3–6, carried into 5.5): the one object that holds a
 * composition's synthesis state between payload arrival and teardown — the payload, the
 * subscriptions that re-run the evaluator, the latest generation seen per surface, the user's
 * sort choices by array path, and the last output written.
 *
 * It lives beside the live processor and is fed by the turn runner: generations off every
 * stamp before that event's messages apply, the payload once the synthesis surface is live,
 * and a retire when the composition leaves the canvas. Nothing in React reads it —
 * `DerivedValue` and `SortControl` read the data model it writes.
 *
 * Re-evaluation rides the data model's own reactivity: a root subscription on every surface
 * the payload refs fires on any nested write, whether from a vendor's `updateDataModel` or a
 * two-way edit inside its fragment, and a `/sorts` subscription on the synthesis surface catches
 * a sort control's write-back. One mechanism, three change sources. Those runs are coalesced
 * to one microtask, so a vendor batch of several data-model messages evaluates once; intake and
 * a generation note evaluate synchronously, so the first render already carries values and a
 * bump marks stale before anything else happens. The evaluator's own root write is guarded so it
 * cannot re-trigger itself, and an unchanged output is not written.
 */
import type {FunctionImplementation} from '@a2ui/web_core/v0_9';
import {refsOf, type SynthesisPayload} from '@a2uiverse/sdk';
import type {PaintSynthesis} from '../timeline/paint';
import {
  choicesOf,
  evaluate as evaluatePayload,
  type EvaluatedModel,
  type SortChoice,
} from './bindingEvaluator';
import {validatePayload} from './intake';

/** A payload the client could not accept — what becomes a `VALIDATION_FAILED` report. */
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
  /** The synthesis surface reached the live processor, with the payload that rode its paint. */
  accept(target: {surfaceId: string; slot: string}, payload: unknown): void;
  /** The composition left the canvas. */
  retire(): void;
  /** What a parked entry carries of the synthesis: the payload, its surface, and the generations it was computed against. */
  capture?(): PaintSynthesis | undefined;
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
  /** The operator names the shell catalog declares; a payload naming another is invalid. */
  operators: readonly string[];
  onInvalid?: (failure: SynthesisFailure) => void;
}

/** The reserved root key the runtime writes the declarations to; what the sort controls write back. */
export const SORTS_PATH = '/sorts';

export interface SynthesisSession extends SynthesisIntake {
  /** The live payload, if one was accepted. */
  readonly payload: SynthesisPayload | undefined;
  /** The last output written to the synthesis surface. */
  readonly output: EvaluatedModel | undefined;
  /** The generation the session has seen per surface. */
  readonly generations: Readonly<Record<string, number>>;
  /** Recompute and write; a no-op without a live payload and surface. */
  evaluate(): void;
  dispose(): void;
}

export function createSynthesisSession({
  processor,
  functions,
  operators,
  onInvalid,
}: SynthesisSessionOptions): SynthesisSession {
  let payload: SynthesisPayload | undefined;
  let surfaceId: string | undefined;
  /** The user's choices this turn, by array path; they stick across a re-synthesis while the key exists. */
  const choices = new Map<string, SortChoice>();
  let output: EvaluatedModel | undefined;
  let outputJson: string | undefined;
  let generations: Record<string, number> = {};
  const subscriptions = new Map<string, {unsubscribe(): void}>();
  let writing = false;
  let scheduled = false;

  /** Every surface the payload refs — what the session watches. */
  const refSurfaces = (): Set<string> =>
    new Set(payload ? refsOf(payload.dataModel).map(ref => ref.surface) : []);

  const unwatch = (id: string) => {
    subscriptions.get(id)?.unsubscribe();
    subscriptions.delete(id);
  };

  const unwatchAll = () => {
    for (const sub of subscriptions.values()) sub.unsubscribe();
    subscriptions.clear();
  };

  const evaluate = () => {
    if (!payload || !surfaceId) return;
    const target = processor.model.getSurface(surfaceId);
    if (!target) return;
    const next = evaluatePayload({
      payload,
      models: surface => processor.model.getSurface(surface)?.dataModel.get('/'),
      generations,
      choices,
      functions,
    });
    const json = JSON.stringify(next);
    if (json === outputJson) return;
    output = next;
    outputJson = json;
    writing = true;
    try {
      // One root write (task-4.5 decision 4): no render sees new rows beside old declarations.
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
    const sub = surface.dataModel.subscribe(isSynthesis ? SORTS_PATH : '/', value => {
      if (writing) return;
      if (isSynthesis) {
        // A sort control wrote its declaration back; the user's choice on that array is in force.
        for (const [path, choice] of choicesOf(value)) choices.set(path, choice);
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
    const result = validatePayload(raw, operators);
    if (!result.ok) {
      unwatchAll();
      payload = undefined;
      outputJson = undefined;
      const {path, message} = result;
      onInvalid?.({surfaceId: target.surfaceId, slot: target.slot, path, message});
      return;
    }
    payload = result.payload;
    surfaceId = target.surfaceId;
    outputJson = undefined;
    unwatchAll();
    for (const surface of refSurfaces()) watch(surface);
    watch(surfaceId);
    evaluate();
  };

  const capture: SynthesisIntake['capture'] = () =>
    payload && surfaceId ? {surfaceId, payload, generations: {...generations}} : undefined;

  const retire: SynthesisIntake['retire'] = () => {
    unwatchAll();
    payload = undefined;
    surfaceId = undefined;
    choices.clear();
    output = undefined;
    outputJson = undefined;
    generations = {};
  };

  // A surface the payload refs may be re-created by a vendor repaint (a fresh data model to
  // watch) or deleted (its refs go absent); the synthesis surface itself is re-created on
  // every re-synthesis, and its new payload is accepted right after.
  const created = processor.onSurfaceCreated(surface => {
    if (!payload) return;
    if (surface.id === surfaceId || refSurfaces().has(surface.id)) {
      watch(surface.id);
      schedule();
    }
  });
  const deleted = processor.onSurfaceDeleted(id => {
    unwatch(id);
    if (payload && id !== surfaceId && refSurfaces().has(id)) schedule();
  });

  return {
    get payload() {
      return payload;
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
    capture,
    evaluate,
    dispose: () => {
      retire();
      created.unsubscribe();
      deleted.unsubscribe();
    },
  };
}
