/**
 * Pure message-shape inspection for the turn runner: which surface a streamed message
 * targets, and a surface's root component type/title. These read the wire and the processor
 * model without mutating anything — the turn runner (`canvasTurn.ts`) owns all state and
 * orchestration and calls into here.
 */
import type {AgentToRendererMessage} from '@a2ui/web_core/v1_0';

/** The slice of a live/staging surface the runner reads: root type, title, catalog, data model. */
export interface CanvasSurface {
  componentsModel: {
    get(id: string): CanvasComponent | undefined;
    readonly entries: IterableIterator<
      [string, CanvasComponent & {readonly componentTree: unknown}]
    >;
  };
  dataModel: {get(path: string): unknown};
  readonly sendDataModel: boolean;
  /** From v1.0 a surface may name no default catalog, each component naming its own. */
  readonly defaultCatalog: CanvasCatalog | undefined;
}

/** The slice of a catalog the runner reads: its id, and each component's schema. */
export interface CanvasCatalog {
  readonly id: string;
  readonly components: ReadonlyMap<string, {schema: {safeParse(v: unknown): {success: boolean}}}>;
}

export interface CanvasComponent {
  type: string;
  properties: Record<string, unknown>;
  /** The catalog the component is drawn in: the one it names, else the surface's default. */
  readonly catalog: CanvasCatalog | undefined;
  readonly metadata: unknown;
}

/** The slice of MessageProcessor the runner drives; MessageProcessor satisfies it. */
export interface TurnProcessor {
  processMessages(messages: AgentToRendererMessage[]): void;
  readonly model: {
    getSurface(id: string): CanvasSurface | undefined;
    readonly surfacesMap: ReadonlyMap<string, CanvasSurface>;
    deleteSurface(id: string): void;
  };
}

/** Every surface's root component id, fixed by the renderer. */
export const ROOT_COMPONENT_ID = 'root';

export type MessageTarget = {
  kind: 'create' | 'update' | 'delete' | 'call' | 'other';
  surfaceId?: string;
};

/**
 * Classify a streamed message by what it does and to which surface. An agent's renderer function
 * call targets no surface here: it changes none, and whatever was dropped or refused of a surface
 * it names, the agent still gets its answer (`callSurfaceOf`).
 */
export function targetOf(message: AgentToRendererMessage): MessageTarget {
  const m = message as {
    createSurface?: {surfaceId?: unknown};
    updateComponents?: {surfaceId?: unknown};
    updateDataModel?: {surfaceId?: unknown};
    deleteSurface?: {surfaceId?: unknown};
  };
  const id = (v: {surfaceId?: unknown} | undefined) =>
    typeof v?.surfaceId === 'string' ? v.surfaceId : undefined;
  if (m.createSurface) return {kind: 'create', surfaceId: id(m.createSurface)};
  if (m.updateComponents) return {kind: 'update', surfaceId: id(m.updateComponents)};
  if (m.updateDataModel) return {kind: 'update', surfaceId: id(m.updateDataModel)};
  if (m.deleteSurface) return {kind: 'delete', surfaceId: id(m.deleteSurface)};
  if ('callRendererFunction' in message) return {kind: 'call'};
  return {kind: 'other'};
}

/** The surface a renderer function call runs against, when it names one. */
export function callSurfaceOf(message: AgentToRendererMessage): string | undefined {
  const call = (message as {callRendererFunction?: {surfaceId?: unknown}}).callRendererFunction;
  return typeof call?.surfaceId === 'string' ? call.surfaceId : undefined;
}

/**
 * Re-validate a settled surface against its catalogs — the ids of components whose final
 * properties fail the schema of the catalog each is drawn in (task-21.14 decision 12). The processor validates every streamed batch and throws a
 * partial one away, so mid-stream failures say nothing about the paint; this is the judgment
 * that does.
 */
export function invalidComponentsOf(surface: CanvasSurface): string[] {
  const invalid: string[] = [];
  for (const [id, component] of surface.componentsModel.entries) {
    const api = (component.catalog ?? surface.defaultCatalog)?.components.get(component.type);
    if (api && !api.schema.safeParse(component.properties).success) invalid.push(id);
  }
  return invalid;
}
