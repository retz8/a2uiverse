/**
 * The catalog gate (task-11.5 decisions 1, 2, 4): one per canvas, in front of its turn runner. A
 * batch that creates a surface in a catalog the client does not hold yet is held — and everything
 * the canvas receives after it, on the turn or a stream beside it, in order — until the catalog
 * has loaded; then it is handed to the runner as it arrived. A batch whose catalogs are all held,
 * with nothing held before it, goes straight through, so a canvas whose catalogs are loaded runs
 * exactly as it did when they were compiled in.
 *
 * While a fragment's catalog loads its slot stays pending: the fragment has not claimed it, its
 * tick on the progress line and its judgment at its settled marker wait behind it. A catalog that
 * fails to load fails its fragment: the create and every later message for that surface are
 * dropped, and the failure is reported for the hub to fail the slot under `load`; a fresh create
 * of the surface — a Retry's answer — loads again.
 */
import type {A2uiMessage} from '@a2ui/web_core/v0_9';
import type {CompositionStamp, PaintMeta, SynthesisPayload} from '@a2uiverse/sdk';
import type {SideStream, TurnHandle, TurnRunner} from '../canvas/turn/canvasTurn';
import {targetOf} from '../canvas/turn/turnMessages';

/** A fragment whose catalog did not load. */
export interface CatalogLoadFailure {
  /** Namespaced, as the hub sent it. */
  surfaceId: string;
  catalogId: string;
  /** The client's reason, for the journal. */
  message: string;
  /** The stamp of the event that carried the create. */
  stamp?: CompositionStamp;
}

export interface CatalogGateOptions {
  has(catalogId: string): boolean;
  load(catalogId: string): Promise<void>;
  onLoadFailure(failure: CatalogLoadFailure): void;
}

type Deliver = (
  messages: A2uiMessage[],
  stamp?: CompositionStamp,
  synthesis?: SynthesisPayload,
) => void;

export interface CatalogGate {
  /** Hand a batch to `deliver` now, or once the catalogs it creates surfaces in have loaded. */
  apply(
    deliver: Deliver,
    messages: A2uiMessage[],
    stamp?: CompositionStamp,
    synthesis?: SynthesisPayload,
  ): void;
  /** Run a step in its place behind whatever is held. */
  run(step: () => void): void;
}

const describe = (err: unknown) => (err instanceof Error ? err.message : String(err));

/** The catalog a message creates its surface in. */
function createdIn(message: A2uiMessage): string | undefined {
  const catalogId = (message as {createSurface?: {catalogId?: unknown}}).createSurface?.catalogId;
  return typeof catalogId === 'string' ? catalogId : undefined;
}

export function createCatalogGate({has, load, onLoadFailure}: CatalogGateOptions): CatalogGate {
  const queue: (() => void | Promise<void>)[] = [];
  let draining = false;
  /** Surfaces whose catalog failed to load: their later messages have nowhere to land. */
  const failed = new Set<string>();

  const drain = async () => {
    draining = true;
    while (queue.length > 0) {
      const task = queue.shift()!;
      try {
        await task();
      } catch (err) {
        console.error('[A2UI:catalogs] a held batch failed', err);
      }
    }
    draining = false;
  };
  const enqueue = (task: () => void | Promise<void>) => {
    queue.push(task);
    if (!draining) void drain();
  };
  const idle = () => !draining && queue.length === 0;

  const missingIn = (messages: A2uiMessage[]) => [
    ...new Set(messages.map(createdIn).filter((id): id is string => id !== undefined && !has(id))),
  ];

  const deliverKept = (
    deliver: Deliver,
    messages: A2uiMessage[],
    stamp: CompositionStamp | undefined,
    synthesis: SynthesisPayload | undefined,
    unloaded: ReadonlyMap<string, string>,
  ) => {
    const kept: A2uiMessage[] = [];
    for (const message of messages) {
      const {kind, surfaceId} = targetOf(message);
      const catalogId = createdIn(message);
      if (kind === 'create' && surfaceId !== undefined && catalogId !== undefined) {
        const reason = unloaded.get(catalogId);
        if (reason !== undefined) {
          failed.add(surfaceId);
          onLoadFailure({surfaceId, catalogId, message: reason, ...(stamp ? {stamp} : {})});
          continue;
        }
        failed.delete(surfaceId);
      } else if (surfaceId !== undefined && failed.has(surfaceId)) continue;
      kept.push(message);
    }
    deliver(kept, stamp, synthesis);
  };

  const NONE: ReadonlyMap<string, string> = new Map();

  return {
    apply: (deliver, messages, stamp, synthesis) => {
      if (idle() && missingIn(messages).length === 0) {
        deliverKept(deliver, messages, stamp, synthesis, NONE);
        return;
      }
      enqueue(async () => {
        const unloaded = new Map<string, string>();
        await Promise.all(
          missingIn(messages).map(catalogId =>
            load(catalogId).catch(err => void unloaded.set(catalogId, describe(err))),
          ),
        );
        deliverKept(deliver, messages, stamp, synthesis, unloaded);
      });
    },
    run: step => (idle() ? step() : enqueue(step)),
  };
}

/** The runner with every turn and stream beside it routed through the gate. */
export function gateRunner(runner: TurnRunner, gate: CatalogGate): TurnRunner {
  const gated = <H extends TurnHandle | SideStream>(handle: H): H => {
    const wrapped = Object.create(handle) as H;
    wrapped.apply = (messages, stamp, synthesis) =>
      gate.apply(handle.apply, messages, stamp, synthesis);
    wrapped.acceptPaintMeta = (meta: PaintMeta) => gate.run(() => handle.acceptPaintMeta(meta));
    wrapped.end = () => gate.run(() => handle.end());
    return wrapped;
  };
  return {
    get current() {
      return runner.current;
    },
    begin: cause => gated(runner.begin(cause)),
    beginSideStream: () => gated(runner.beginSideStream()),
    cancelAll: runner.cancelAll,
    removeOverlay: runner.removeOverlay,
    restore: runner.restore,
  };
}
