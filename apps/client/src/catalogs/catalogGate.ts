/**
 * The catalog gate (task-11.5 decisions 1, 2, 4; task-21.14 decisions 3 to 6): one per canvas, in
 * front of its turn runner. A batch that names a catalog the client does not hold yet — where it
 * creates a surface, in a component's `@catalogId`, in a function call's `catalogId` — is held,
 * and everything the canvas receives after it, on the turn or a stream beside it, in order, until
 * the catalog has loaded; then it is handed to the runner as it arrived. A batch whose catalogs
 * are all held, with nothing held before it, goes straight through, so a canvas whose catalogs
 * are loaded runs exactly as it did when they were compiled in. An agent's renderer function call
 * is a batch like any other: it waits behind what is held, and its catalog is loaded first.
 *
 * While a fragment's catalog loads its slot stays pending: the fragment has not claimed it, its
 * tick on the progress line and its judgment at its settled marker wait behind it. A catalog a
 * surface's components need that fails to load fails its fragment: the batch that names it and
 * every later message for that surface are dropped, and the failure is reported, with the
 * catalog that failed, for the hub to fail the slot under `load`; a fresh create of the surface —
 * a Retry's answer — loads again. A function call whose catalog fails to load is delivered all
 * the same, for the release to answer with its own error.
 *
 * The gate also says which build each catalog of a paint is drawn in (task-15.6 decisions 2 to
 * 5; task-21.14 decision 5): each catalog a surface uses at the build its stamp names for it when
 * the surface first uses it, else the one the table names — a create taking every catalog its own
 * batch names for its surface, so it is drawn once with all of them; a change to the components
 * of a surface it saw created, a build its stamp names for a catalog the surface uses — a move,
 * when it is another than the surface's own — and a catalog the surface uses for the first time.
 * A move whose build fails to load is delivered with no build, the surface staying in its own, the
 * failure logged and not reported.
 */
import type {AgentToRendererMessage} from '@a2ui/web_core/v1_0';
import type {CompositionStamp, PaintMeta, SynthesisPayload} from '@a2uiverse/sdk';
import type {SideStream, TurnHandle, TurnRunner} from '../canvas/turn/canvasTurn';
import {targetOf} from '../canvas/turn/turnMessages';
import type {ResolvedCatalog} from './clientCatalogs';
import type {BuildSource} from './loader';
import type {PaintBuilds} from './paintBuilds';

/** A fragment whose catalog did not load. */
export interface CatalogLoadFailure {
  /** Namespaced, as the hub sent it. */
  surfaceId: string;
  /** The catalog that did not load. */
  catalogId: string;
  /** The client's reason, for the journal. */
  message: string;
  /** The stamp of the event that carried the batch naming it. */
  stamp?: CompositionStamp;
}

export interface CatalogGateOptions {
  /** Where the build a paint is drawn in is found, and loaded when it is not held. */
  builds: Pick<BuildSource, 'held' | 'load'>;
  /** Where the builds each message is drawn in are assigned. */
  book: PaintBuilds;
  onLoadFailure(failure: CatalogLoadFailure): void;
}

type Deliver = (
  messages: AgentToRendererMessage[],
  stamp?: CompositionStamp,
  synthesis?: SynthesisPayload,
) => void;

export interface CatalogGate {
  /** Hand a batch to `deliver` now, or once the catalogs it names have loaded. */
  apply(
    deliver: Deliver,
    messages: AgentToRendererMessage[],
    stamp?: CompositionStamp,
    synthesis?: SynthesisPayload,
  ): void;
  /** Run a step in its place behind whatever is held. */
  run(step: () => void): void;
}

const describe = (err: unknown) => (err instanceof Error ? err.message : String(err));

const isObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

/** Every catalog a function call names, down through the calls in its arguments. */
function callCatalogsIn(value: unknown, into: Set<string>): void {
  if (Array.isArray(value)) {
    for (const entry of value) callCatalogsIn(entry, into);
    return;
  }
  if (!isObject(value)) return;
  if ('@call' in value && typeof value.catalogId === 'string') into.add(value.catalogId);
  for (const entry of Object.values(value)) callCatalogsIn(entry, into);
}

/** Every catalog a list of components names: each one's `@catalogId`, and each call's. */
function componentCatalogsIn(components: unknown, into: Set<string>): void {
  if (!Array.isArray(components)) return;
  for (const component of components) {
    if (!isObject(component)) continue;
    const catalogId = component['@catalogId'];
    if (typeof catalogId === 'string') into.add(catalogId);
    callCatalogsIn(component, into);
  }
}

/** What a message names: the surface it is on, and every catalog it draws in or runs a call in. */
function namedIn(message: AgentToRendererMessage): {surfaceId?: string; catalogs: Set<string>} {
  const catalogs = new Set<string>();
  const m = message as {
    createSurface?: {surfaceId?: unknown; catalogId?: unknown; components?: unknown};
    updateComponents?: {surfaceId?: unknown; components?: unknown};
    callRendererFunction?: {callFunction?: {catalogId?: unknown}};
  };
  if (m.createSurface) {
    if (typeof m.createSurface.catalogId === 'string') catalogs.add(m.createSurface.catalogId);
    componentCatalogsIn(m.createSurface.components, catalogs);
  } else if (m.updateComponents) {
    componentCatalogsIn(m.updateComponents.components, catalogs);
  } else if (m.callRendererFunction) {
    const catalogId = m.callRendererFunction.callFunction?.catalogId;
    if (typeof catalogId === 'string') catalogs.add(catalogId);
  }
  return {
    ...('callRendererFunction' in message ? {} : {surfaceId: targetOf(message).surfaceId}),
    catalogs,
  };
}

/**
 * A build a message needs: for a create, each catalog its batch names for its surface; for a
 * change to a surface already drawn, a catalog it uses for the first time (`join`) or another
 * build named for one it uses (`move`); for a function call, the catalog it runs in.
 */
interface Need {
  kind: 'create' | 'join' | 'move' | 'call';
  catalogId: string;
  named?: string;
}

const keyOf = ({catalogId, named}: Pick<Need, 'catalogId' | 'named'>) =>
  `${catalogId} ${named ?? ''}`;

/** Whether a need that fails to load fails its fragment. */
const failsFragment = (need: Need) => need.kind === 'create' || need.kind === 'join';

export function createCatalogGate({builds, book, onLoadFailure}: CatalogGateOptions): CatalogGate {
  const queue: (() => void | Promise<void>)[] = [];
  let draining = false;
  /** Surfaces whose catalog failed to load: their later messages have nowhere to land. */
  const failed = new Set<string>();
  /** Each surface created through the gate, with every catalog it draws in. */
  const surfaces = new Map<string, Set<string>>();

  /** Each message's needs, read over the batch as it stands against what the gate has seen. */
  const plan = (messages: AgentToRendererMessage[], stamp?: CompositionStamp) => {
    const named = (catalogId: string) => stamp?.builds?.[catalogId];
    const need = (kind: Need['kind'], catalogId: string): Need => {
      const build = named(catalogId);
      return {kind, catalogId, ...(build ? {named: build} : {})};
    };
    const needs = new Map<AgentToRendererMessage, Need[]>();
    /** Surfaces created in this batch, by the create's own needs. */
    const created = new Map<string, Need[]>();
    /** What each surface this batch changes uses, as the batch has it so far. */
    const using = new Map<string, Set<string>>();
    for (const message of messages) {
      const {kind} = targetOf(message);
      const {surfaceId, catalogs} = namedIn(message);
      if (kind === 'call') {
        needs.set(
          message,
          [...catalogs].map(catalogId => need('call', catalogId)),
        );
        continue;
      }
      if (surfaceId === undefined) continue;
      if (kind === 'create') {
        const own = [...catalogs].map(catalogId => need('create', catalogId));
        created.set(surfaceId, own);
        using.set(surfaceId, new Set(catalogs));
        needs.set(message, own);
        continue;
      }
      if (kind === 'delete') {
        created.delete(surfaceId);
        using.delete(surfaceId);
        continue;
      }
      if (!('updateComponents' in message)) continue;
      const ownCreate = created.get(surfaceId);
      if (ownCreate) {
        // Named in the create's own batch: drawn with the create.
        const uses = using.get(surfaceId)!;
        for (const catalogId of catalogs) {
          if (uses.has(catalogId)) continue;
          uses.add(catalogId);
          ownCreate.push(need('create', catalogId));
        }
        continue;
      }
      const uses = using.get(surfaceId) ?? new Set(surfaces.get(surfaceId));
      using.set(surfaceId, uses);
      if (!surfaces.has(surfaceId)) continue;
      const own: Need[] = [];
      for (const catalogId of new Set([...uses, ...catalogs])) {
        if (!uses.has(catalogId)) {
          uses.add(catalogId);
          own.push(need('join', catalogId));
        } else if (named(catalogId)) own.push(need('move', catalogId));
      }
      if (own.length > 0) needs.set(message, own);
    }
    return needs;
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

  /** The builds the planned batch needs that are not held, one per build. */
  const missingIn = (needs: ReadonlyMap<AgentToRendererMessage, Need[]>) => {
    const missing = new Map<string, Need>();
    for (const list of needs.values()) {
      for (const need of list) {
        if (builds.held(need.catalogId, need.named)) continue;
        const key = keyOf(need);
        // A fragment's need is the stronger: its failure fails the fragment.
        if (!missing.has(key) || failsFragment(need)) missing.set(key, need);
      }
    }
    return [...missing.values()];
  };

  const deliverKept = (
    deliver: Deliver,
    messages: AgentToRendererMessage[],
    needs: ReadonlyMap<AgentToRendererMessage, Need[]>,
    stamp: CompositionStamp | undefined,
    synthesis: SynthesisPayload | undefined,
    unloaded: ReadonlyMap<string, string>,
  ) => {
    const kept: AgentToRendererMessage[] = [];
    for (const message of messages) {
      const {kind, surfaceId} = targetOf(message);
      const own = needs.get(message) ?? [];
      const failing =
        kind === 'call' ? undefined : own.find(n => failsFragment(n) && unloaded.has(keyOf(n)));
      if (surfaceId !== undefined && failing) {
        failed.add(surfaceId);
        onLoadFailure({
          surfaceId,
          catalogId: failing.catalogId,
          message: unloaded.get(keyOf(failing))!,
          ...(stamp ? {stamp} : {}),
        });
        continue;
      }
      if (kind === 'create' && surfaceId !== undefined) {
        failed.delete(surfaceId);
        surfaces.set(surfaceId, new Set(own.map(n => n.catalogId)));
      } else if (surfaceId !== undefined && failed.has(surfaceId)) continue;
      if (kind === 'delete' && surfaceId !== undefined) surfaces.delete(surfaceId);
      if (kind === 'update' && surfaceId !== undefined) {
        const uses = surfaces.get(surfaceId);
        for (const n of own) uses?.add(n.catalogId);
      }
      const held = own.flatMap((n): ResolvedCatalog[] => {
        const build = builds.held(n.catalogId, n.named);
        return build ? [build] : [];
      });
      if (held.length > 0) book.assign(message, held);
      kept.push(message);
    }
    deliver(kept, stamp, synthesis);
  };

  const NONE: ReadonlyMap<string, string> = new Map();

  return {
    apply: (deliver, messages, stamp, synthesis) => {
      if (idle()) {
        const needs = plan(messages, stamp);
        if (missingIn(needs).length === 0) {
          deliverKept(deliver, messages, needs, stamp, synthesis, NONE);
          return;
        }
      }
      enqueue(async () => {
        const needs = plan(messages, stamp);
        const unloaded = new Map<string, string>();
        await Promise.all(
          missingIn(needs).map(need =>
            builds.load(need.catalogId, need.named).catch(err => {
              if (failsFragment(need)) unloaded.set(keyOf(need), describe(err));
              else if (need.kind === 'move')
                console.warn(
                  `[A2UI:catalogs] ${need.catalogId} at ${need.named} did not load; its surfaces stay in their build`,
                  err,
                );
              else console.warn(`[A2UI:catalogs] ${need.catalogId} did not load for a call`, err);
            }),
          ),
        );
        deliverKept(deliver, messages, needs, stamp, synthesis, unloaded);
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
    restoreSynthesis: runner.restoreSynthesis,
  };
}
