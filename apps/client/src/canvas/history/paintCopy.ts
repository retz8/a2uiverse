/**
 * A paint's copy (task 9.7): a live surface materialised as plain JSON — its component tree and
 * data model as they stand — and the wire messages that make it a live surface again. The copy
 * is taken once, when the reader moves off the paint, and a restore takes the identical path a
 * live paint takes through the processor: catalog resolution, data binding, local functions,
 * action dispatch — never a second surface constructor.
 *
 * A surface may mix catalogs (task-21.14 decisions 1, 5): the copy keeps each component in the
 * catalog it was drawn in, and each catalog the surface holds at the build it was drawn in.
 */
import type {AgentToRendererMessage} from '@a2ui/web_core/v1_0';
import {A2UI_VERSION} from '@a2uiverse/sdk';
import {resolvedOf} from '../../catalogs/clientCatalogs';
import type {PaintCopy} from './fragmentHistory';

/** The slice of SurfaceModel a copy reads; SurfaceModel satisfies it structurally. */
export interface CopiableSurface {
  /** From v1.0 a surface may name no default catalog, each component naming its own. */
  readonly defaultCatalog: {readonly id: string} | undefined;
  readonly sendDataModel: boolean;
  componentsModel: {
    readonly entries: IterableIterator<
      [
        string,
        {
          readonly type: string;
          readonly properties: Record<string, unknown>;
          readonly catalog: {readonly id: string} | undefined;
          readonly metadata: unknown;
        },
      ]
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
  const defaultId = surface.defaultCatalog?.id;
  const tree: Record<string, unknown> = {};
  /** Each catalog the surface draws in, as the object it holds. */
  const used = new Map<string, object>();
  if (surface.defaultCatalog) used.set(surface.defaultCatalog.id, surface.defaultCatalog);
  // Read from the model's type and properties, not its `componentTree`: that spreads the
  // properties over the type, so a component with a prop of its own named `type` (Linear's
  // StatusIcon) would come back under that prop's value. The model keeps a component's catalog
  // and metadata beside its properties; each is written back as the envelope key it came in.
  for (const [id, component] of surface.componentsModel.entries) {
    const catalogId = component.catalog?.id;
    if (component.catalog && catalogId !== undefined) used.set(catalogId, component.catalog);
    tree[id] = jsonCopy({
      ...component.properties,
      id,
      component: component.type,
      ...(catalogId !== undefined && catalogId !== defaultId ? {'@catalogId': catalogId} : {}),
      ...(component.metadata !== undefined ? {'@metadata': component.metadata} : {}),
    });
  }
  const builds: Record<string, string> = {};
  for (const [catalogId, catalog] of used) {
    const build = resolvedOf(catalog)?.build;
    if (build) builds[catalogId] = build;
  }
  return {
    surfaceId,
    ...(defaultId !== undefined ? {catalogId: defaultId} : {}),
    sendDataModel: surface.sendDataModel,
    tree,
    dataModel: jsonCopy(surface.dataModel.get('/')) ?? {},
    ...(Object.keys(builds).length > 0 ? {builds} : {}),
  };
}

/** The copy's three wire messages: create, the whole tree, the whole data model — stamped `1.0`. */
export function rebuildMessages(copy: PaintCopy): AgentToRendererMessage[] {
  return [
    {
      version: A2UI_VERSION,
      createSurface: {
        surfaceId: copy.surfaceId,
        ...(copy.catalogId !== undefined ? {catalogId: copy.catalogId} : {}),
        ...(copy.sendDataModel ? {sendDataModel: true} : {}),
      },
    },
    {
      version: A2UI_VERSION,
      updateComponents: {
        surfaceId: copy.surfaceId,
        components: Object.values(copy.tree).map(jsonCopy),
      },
    },
    {
      version: A2UI_VERSION,
      updateDataModel: {surfaceId: copy.surfaceId, value: jsonCopy(copy.dataModel) ?? {}},
    },
  ] as AgentToRendererMessage[];
}
