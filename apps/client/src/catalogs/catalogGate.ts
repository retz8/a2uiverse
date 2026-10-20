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
 *
 * The gate also says which build each paint is drawn in (task-15.6 decisions 2 to 5): a create in
 * the build its stamp names for the catalog, else the one the table names; a change to the
 * components of a surface it saw created, in the build its stamp names for that surface's catalog
 * — a move, when it is newer than the surface's own. A move whose build fails to load is delivered
 * with no build, the surface staying in its own, the failure logged and not reported.
 */
import type {A2uiMessage} from '@a2ui/web_core/v0_9';
import type {CompositionStamp, PaintMeta, SynthesisPayload} from '@a2uiverse/sdk';
import type {SideStream, TurnHandle, TurnRunner} from '../canvas/turn/canvasTurn';
import {targetOf} from '../canvas/turn/turnMessages';
import type {BuildSource} from './loader';
import type {PaintBuilds} from './paintBuilds';

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
  /** Where the build a paint is drawn in is found, and loaded when it is not held. */
  builds: Pick<BuildSource, 'held' | 'load'>;
  /** Where the build each message is drawn in is assigned. */
  book: PaintBuilds;
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

/** The surface whose components a message changes. */
function componentsOf(message: A2uiMessage): string | undefined {
  const surfaceId = (message as {updateComponents?: {surfaceId?: unknown}}).updateComponents
    ?.surfaceId;
  return typeof surfaceId === 'string' ? surfaceId : undefined;
}

/** The build a message needs: a create's, or the one a change in place may move its surface to. */
interface Need {
  kind: 'create' | 'move';
  catalogId: string;
  named?: string;
}

const keyOf = ({catalogId, named}: Need) => `${catalogId} ${named ?? ''}`;

export function createCatalogGate({builds, book, onLoadFailure}: CatalogGateOptions): CatalogGate {
  const queue: (() => void | Promise<void>)[] = [];
  let draining = false;
  /** Surfaces whose catalog failed to load: their later messages have nowhere to land. */
  const failed = new Set<string>();
  /** Each surface created through the gate, by the catalog it was created in. */
  const surfaces = new Map<string, string>();

  const needOf = (message: A2uiMessage, stamp?: CompositionStamp): Need | undefined => {
    const created = createdIn(message);
    if (created !== undefined) {
      const named = stamp?.builds?.[created];
      return {kind: 'create', catalogId: created, ...(named ? {named} : {})};
    }
    const changed = componentsOf(message);
    const catalogId = changed === undefined ? undefined : surfaces.get(changed);
    const named = catalogId === undefined ? undefined : stamp?.builds?.[catalogId];
    return catalogId !== undefined && named ? {kind: 'move', catalogId, named} : undefined;
  };

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

  /** The builds the batch needs that are not held, one per build. */
  const missingIn = (messages: A2uiMessage[], stamp?: CompositionStamp) => {
    const missing = new Map<string, Need>();
    for (const message of messages) {
      const need = needOf(message, stamp);
      if (need && !builds.held(need.catalogId, need.named)) missing.set(keyOf(need), need);
    }
    return [...missing.values()];
  };

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
      const need = needOf(message, stamp);
      if (kind === 'create' && surfaceId !== undefined && need?.kind === 'create') {
        const reason = unloaded.get(keyOf(need));
        if (reason !== undefined) {
          failed.add(surfaceId);
          onLoadFailure({
            surfaceId,
            catalogId: need.catalogId,
            message: reason,
            ...(stamp ? {stamp} : {}),
          });
          continue;
        }
        failed.delete(surfaceId);
        surfaces.set(surfaceId, need.catalogId);
      } else if (surfaceId !== undefined && failed.has(surfaceId)) continue;
      const build = need && builds.held(need.catalogId, need.named);
      if (build) book.assign(message, build);
      kept.push(message);
    }
    deliver(kept, stamp, synthesis);
  };

  const NONE: ReadonlyMap<string, string> = new Map();

  return {
    apply: (deliver, messages, stamp, synthesis) => {
      if (idle() && missingIn(messages, stamp).length === 0) {
        deliverKept(deliver, messages, stamp, synthesis, NONE);
        return;
      }
      enqueue(async () => {
        const unloaded = new Map<string, string>();
        await Promise.all(
          missingIn(messages, stamp).map(need =>
            builds.load(need.catalogId, need.named).catch(err => {
              if (need.kind === 'create') unloaded.set(keyOf(need), describe(err));
              else
                console.warn(
                  `[A2UI:catalogs] ${need.catalogId} at ${need.named} did not load; its surfaces stay in their build`,
                  err,
                );
            }),
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
    restore: runner.restore,
  };
}
