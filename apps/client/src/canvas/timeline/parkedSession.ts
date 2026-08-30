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
import type {ActionListener, A2uiMessage, Catalog, ComponentApi} from '@a2ui/web_core/v0_9';
import type {CanvasStore, PlacedFragment} from '../canvasStore';
import type {PaintEntry, PaintSnapshot} from './paint';
import {deepFreeze} from './snapshotSurface';

export interface ParkedSessionOptions<T extends ComponentApi> {
  catalogs: Catalog<T>[];
  store: CanvasStore;
  /** Receives agent-bound actions fired from the parked surface (the fork path). */
  onAction?: ActionListener;
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
  {catalogs, store, onAction}: ParkedSessionOptions<T>,
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

  const commit = () => {
    const surface = processor.model.getSurface(surfaceId);
    if (!surface) return;
    store.replaceSnapshotDataModel(paintId, deepFreeze(thaw(surface.dataModel.get('/')) ?? {}));
  };

  return {processor, surfaceId, placement, commit};
}
