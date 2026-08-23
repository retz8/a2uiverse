/**
 * Pure message-shape inspection for the turn runner: which surface a streamed message
 * targets, and a surface's root component type/title. These read the wire and the processor
 * model without mutating anything — the turn runner (`canvasTurn.ts`) owns all state and
 * orchestration and calls into here.
 */
import type {A2uiMessage} from '@a2ui/web_core/v0_9';
import type {SnapshotSourceSurface} from '../timeline/snapshotSurface';

/** The slice of a live/staging surface the runner reads: root type, title, catalog, serialization. */
export interface CanvasSurface extends SnapshotSourceSurface {
  componentsModel: SnapshotSourceSurface['componentsModel'] & {
    get(id: string): CanvasComponent | undefined;
    readonly entries: IterableIterator<
      [string, CanvasComponent & {readonly componentTree: unknown}]
    >;
  };
  /** Captured into the entry so rehydration can rebuild the surface's createSurface. */
  catalog: {
    readonly id: string;
    readonly components: ReadonlyMap<string, {schema: {safeParse(v: unknown): {success: boolean}}}>;
  };
}

export interface CanvasComponent {
  type: string;
  properties: Record<string, unknown>;
}

/** The slice of MessageProcessor the runner drives; MessageProcessor satisfies it. */
export interface TurnProcessor {
  processMessages(messages: A2uiMessage[]): void;
  readonly model: {
    getSurface(id: string): CanvasSurface | undefined;
    readonly surfacesMap: ReadonlyMap<string, CanvasSurface>;
    deleteSurface(id: string): void;
  };
}

/** Questions arrive as `ConfirmationDialog` surfaces — the structural recognition fallback. */
export const QUESTION_ROOT_TYPE = 'ConfirmationDialog';
/** Every surface's root component id, fixed by the renderer. */
export const ROOT_COMPONENT_ID = 'root';

export type MessageTarget = {kind: 'create' | 'update' | 'delete' | 'other'; surfaceId?: string};

/** Classify a streamed message by what it does and to which surface. */
export function targetOf(message: A2uiMessage): MessageTarget {
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
  return {kind: 'other'};
}

export const rootTypeOf = (processor: TurnProcessor, surfaceId: string): string | undefined =>
  processor.model.getSurface(surfaceId)?.componentsModel.get(ROOT_COMPONENT_ID)?.type;

/** The dialog's title when statically known — a literal on the wire, not a data binding. */
export function questionTitleOf(processor: TurnProcessor, surfaceId: string): string | undefined {
  const root = processor.model.getSurface(surfaceId)?.componentsModel.get(ROOT_COMPONENT_ID);
  const title = root?.properties?.title as {literalString?: unknown} | string | undefined;
  if (typeof title === 'string') return title;
  return typeof title?.literalString === 'string' ? title.literalString : undefined;
}

/**
 * Re-validate a settled surface against its catalog — the ids of components whose final
 * properties fail their schema. The processor validates every streamed batch and throws a
 * partial one away, so mid-stream failures say nothing about the paint; this is the judgment
 * that does.
 */
export function invalidComponentsOf(surface: CanvasSurface): string[] {
  const invalid: string[] = [];
  for (const [id, component] of surface.componentsModel.entries) {
    const api = surface.catalog.components.get(component.type);
    if (api && !api.schema.safeParse(component.properties).success) invalid.push(id);
  }
  return invalid;
}
