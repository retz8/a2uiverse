/**
 * Serialize-on-swap (task 8.3): materialize a live surface into plain deep-frozen JSON —
 * the snapshot content the timeline stores (phase-8 spec decisions 12 and 21). Captured once,
 * when the surface leaves the canvas; immutability is enforced (deep-frozen), not promised.
 */

/** The slice of SurfaceModel serialization needs; SurfaceModel satisfies it structurally. */
export interface SnapshotSourceSurface {
  componentsModel: {
    readonly entries: IterableIterator<[string, {readonly componentTree: unknown}]>;
  };
  dataModel: {get(path: string): unknown};
}

export interface SerializedSurface {
  /** Flat component-id → component-tree-node map — the A2UI wire shape. */
  tree: Readonly<Record<string, unknown>>;
  dataModel: unknown;
}

/**
 * JSON round-trip copy: the models hand out their state by reference (`componentTree` nodes,
 * the data-model root), and both are JSON-shaped by construction — they came off the wire.
 */
function jsonCopy(value: unknown): unknown {
  if (value === undefined) return undefined;
  return JSON.parse(JSON.stringify(value)) as unknown;
}

export function deepFreeze<T>(value: T): T {
  if (value !== null && typeof value === 'object' && !Object.isFrozen(value)) {
    Object.freeze(value);
    for (const child of Object.values(value)) deepFreeze(child);
  }
  return value;
}

/** Capture a surface's component tree and data model as plain deep-frozen JSON. */
export function serializeSurface(surface: SnapshotSourceSurface): SerializedSurface {
  const tree: Record<string, unknown> = {};
  for (const [id, component] of surface.componentsModel.entries) {
    tree[id] = jsonCopy(component.componentTree);
  }
  return deepFreeze({tree, dataModel: jsonCopy(surface.dataModel.get('/')) ?? {}});
}
