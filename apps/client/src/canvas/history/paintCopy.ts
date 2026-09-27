/**
 * A paint's copy (task 9.7): a live surface materialised as plain JSON — its component tree and
 * data model as they stand — and the wire messages that make it a live surface again. The copy
 * is taken once, when the reader moves off the paint, and a restore takes the identical path a
 * live paint takes through the processor: catalog resolution, data binding, local functions,
 * action dispatch — never a second surface constructor.
 */
import type {A2uiMessage} from '@a2ui/web_core/v0_9';
import type {PaintCopy} from './fragmentHistory';

/** The slice of SurfaceModel a copy reads; SurfaceModel satisfies it structurally. */
export interface CopiableSurface {
  readonly catalog: {readonly id: string};
  readonly sendDataModel: boolean;
  componentsModel: {
    readonly entries: IterableIterator<
      [string, {readonly type: string; readonly properties: Record<string, unknown>}]
    >;
  };
  dataModel: {get(path: string): unknown};
}

/** The slice of MessageProcessor a copy is taken from. */
export interface CopySource {
  readonly model: {getSurface(id: string): CopiableSurface | undefined};
}

/**
 * JSON round-trip copy: the models hand out their state by reference (component properties,
 * the data-model root), and both are JSON-shaped by construction — they came off the wire.
 */
function jsonCopy(value: unknown): unknown {
  if (value === undefined) return undefined;
  return JSON.parse(JSON.stringify(value)) as unknown;
}

/** The surface as it stands now, or undefined when it is not live. */
export function capturePaint(processor: CopySource, surfaceId: string): PaintCopy | undefined {
  const surface = processor.model.getSurface(surfaceId);
  if (!surface) return undefined;
  const tree: Record<string, unknown> = {};
  // Read from the model's type and properties, not its `componentTree`: that spreads the
  // properties over the type, so a component with a prop of its own named `type` (Linear's
  // StatusIcon) would come back under that prop's value.
  for (const [id, component] of surface.componentsModel.entries) {
    tree[id] = jsonCopy({...component.properties, id, component: component.type});
  }
  return {
    surfaceId,
    catalogId: surface.catalog.id,
    sendDataModel: surface.sendDataModel,
    tree,
    dataModel: jsonCopy(surface.dataModel.get('/')) ?? {},
  };
}

/** The copy's three wire messages: create, the whole tree, the whole data model. */
export function rebuildMessages(copy: PaintCopy): A2uiMessage[] {
  return [
    {
      version: 'v0.9',
      createSurface: {
        surfaceId: copy.surfaceId,
        catalogId: copy.catalogId,
        ...(copy.sendDataModel ? {sendDataModel: true} : {}),
      },
    },
    {
      version: 'v0.9',
      updateComponents: {
        surfaceId: copy.surfaceId,
        components: Object.values(copy.tree).map(jsonCopy),
      },
    },
    {
      version: 'v0.9',
      updateDataModel: {surfaceId: copy.surfaceId, value: jsonCopy(copy.dataModel) ?? {}},
    },
  ] as unknown as A2uiMessage[];
}
