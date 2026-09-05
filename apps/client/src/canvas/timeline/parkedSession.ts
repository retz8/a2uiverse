/**
 * The parked session: one per parked visit, created on park and disposed on
 * unpark. A frozen snapshot becomes a rendered surface by reconstructing its wire messages
 * and pushing them through a sandbox MessageProcessor — the identical path a live paint
 * takes (catalog resolution, data binding, local functions, action dispatch), never a
 * second bespoke surface constructor. The sandbox is outside
 * the live registry by construction: the live processor holds no reference to it.
 *
 * While parked, the sandbox is authoritative for the data model and the stored entry is
 * stale; `commit` is the teardown write-back that replaces the entry's frozen data model
 * wholesale.
 */
import {MessageProcessor} from '@a2ui/web_core/v0_9';
import type {
  ActionListener,
  A2uiMessage,
  Catalog,
  ComponentApi,
  FunctionImplementation,
} from '@a2ui/web_core/v0_9';
import {choicesOf, evaluate} from '../synthesis/bindingEvaluator';
import {SORTS_PATH} from '../synthesis/synthesisSession';
import type {CanvasStore, PlacedFragment} from '../canvasStore';
import type {PaintEntry, PaintSnapshot} from './paint';
import {deepFreeze} from './snapshotSurface';

export interface ParkedSessionOptions<T extends ComponentApi> {
  catalogs: Catalog<T>[];
  store: CanvasStore;
  /** Receives agent-bound actions fired from the parked surface (the fork path). */
  onAction?: ActionListener;
  /** The shell catalog's functions — what a parked synthesis re-sorts with. */
  functions?: ReadonlyMap<string, FunctionImplementation>;
}

export interface ParkedSession<T extends ComponentApi> {
  processor: MessageProcessor<T>;
  surfaceId: string;
  /**
   * The composition's placement, restored alongside its surfaces — what the parked shell's
   * slots resolve against. Empty for an uncomposed paint.
   */
  placement: ReadonlyMap<string, PlacedFragment>;
  /** Teardown write-back: replace the entry's data model with the sandbox's, frozen. */
  commit(): void;
}

/** A stored `componentTree` node (`{id, type, ...properties}`) back to its wire shape. */
function wireComponent(node: unknown): Record<string, unknown> {
  const {type, ...rest} = node as {id: string; type: string} & Record<string, unknown>;
  return {...rest, component: type};
}

/** Thawed deep copy — the snapshot is frozen; the sandbox needs a working copy. */
function thaw(value: unknown): unknown {
  if (value === undefined) return undefined;
  return JSON.parse(JSON.stringify(value)) as unknown;
}

export function createParkedSession<T extends ComponentApi>(
  entry: PaintEntry,
  {catalogs, store, onAction, functions}: ParkedSessionOptions<T>,
): ParkedSession<T> {
  const {snapshot, surfaceId, catalogId, paintId} = entry;
  if (!snapshot)
    throw new Error(`Paint #${paintId} has no snapshot — the live paint is not parkable.`);

  /** One surface's three wire messages — the identical path a live paint takes. */
  const rebuild = (id: string, catalog: string, content: PaintSnapshot): A2uiMessage[] =>
    [
      {version: 'v0.9', createSurface: {surfaceId: id, catalogId: catalog}},
      {
        version: 'v0.9',
        updateComponents: {
          surfaceId: id,
          components: Object.values(content.tree).map(wireComponent),
        },
      },
      {version: 'v0.9', updateDataModel: {surfaceId: id, value: thaw(content.dataModel) ?? {}}},
    ] as unknown as A2uiMessage[];

  const processor = new MessageProcessor<T>(catalogs, onAction);
  processor.processMessages(rebuild(surfaceId, catalogId, snapshot));

  // A composition rehydrates whole: the shell alone would render a layout of empty slots.
  const placement = new Map<string, PlacedFragment>();
  for (const fragment of entry.fragments ?? []) {
    if (!fragment.snapshot) continue;
    processor.processMessages(rebuild(fragment.surfaceId, fragment.catalogId, fragment.snapshot));
    placement.set(fragment.slot, {surfaceId: fragment.surfaceId, source: fragment.source});
  }

  // A parked synthesis re-sorts over its own frozen partitions (task 4.8): sort crosses no wire,
  // so the sort controls keep working here — the captured payload evaluated against the
  // sandbox's data. Nothing live is subscribed.
  const sort = watchSort(entry, processor, functions);

  const commit = () => {
    sort?.unsubscribe();
    const surface = processor.model.getSurface(surfaceId);
    if (!surface) return;
    store.replaceSnapshotDataModel(paintId, deepFreeze(thaw(surface.dataModel.get('/')) ?? {}));
  };

  return {processor, surfaceId, placement, commit};
}

function watchSort<T extends ComponentApi>(
  entry: PaintEntry,
  processor: MessageProcessor<T>,
  functions: ReadonlyMap<string, FunctionImplementation> | undefined,
): {unsubscribe(): void} | undefined {
  const captured = entry.synthesis;
  if (!captured || !functions) return undefined;
  const target = processor.model.getSurface(captured.surfaceId);
  if (!target) return undefined;
  let writing = false;
  let scheduled = false;
  // Deferred like the live session's evaluation: a root write from inside the sort
  // subscription itself is a cycle to the data model.
  return target.dataModel.subscribe(SORTS_PATH, value => {
    if (writing || scheduled) return;
    scheduled = true;
    queueMicrotask(() => {
      scheduled = false;
      const next = evaluate({
        payload: captured.payload,
        models: surface => processor.model.getSurface(surface)?.dataModel.get('/'),
        choices: choicesOf(value),
        functions,
      });
      writing = true;
      try {
        target.dataModel.set('/', next);
      } finally {
        writing = false;
      }
    });
  });
}
