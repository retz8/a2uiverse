/**
 * The parked session (task 8.4): one per parked visit, created on park and disposed on
 * unpark. A frozen snapshot becomes a rendered surface by reconstructing its wire messages
 * and pushing them through a sandbox MessageProcessor — the identical path a live paint
 * takes (catalog resolution, data binding, local functions, action dispatch), never a
 * second bespoke surface constructor (task-8.4 spec decision 4). The sandbox is outside
 * the live registry by construction: the live processor holds no reference to it.
 *
 * While parked, the sandbox is authoritative for the data model and the stored entry is
 * stale; `commit` is the teardown write-back that replaces the entry's frozen data model
 * wholesale (decisions 2–3).
 */
import {MessageProcessor} from '@a2ui/web_core/v0_9';
import type {ActionListener, A2uiMessage, Catalog, ComponentApi} from '@a2ui/web_core/v0_9';
import type {CanvasStore} from '../canvasStore';
import type {PaintEntry} from './paint';
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

  const processor = new MessageProcessor<T>(catalogs, onAction);
  const messages = [
    {version: 'v0.9', createSurface: {surfaceId, catalogId}},
    {
      version: 'v0.9',
      updateComponents: {surfaceId, components: Object.values(snapshot.tree).map(wireComponent)},
    },
    {version: 'v0.9', updateDataModel: {surfaceId, value: thaw(snapshot.dataModel) ?? {}}},
  ] as unknown as A2uiMessage[];
  processor.processMessages(messages);

  const commit = () => {
    const surface = processor.model.getSurface(surfaceId);
    if (!surface) return;
    store.replaceSnapshotDataModel(paintId, deepFreeze(thaw(surface.dataModel.get('/')) ?? {}));
  };

  return {processor, surfaceId, commit};
}
