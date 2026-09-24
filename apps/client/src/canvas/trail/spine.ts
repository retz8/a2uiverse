/**
 * The trail's spine (task 9.6, board F5): the lanes the entries sit in and the connectors between
 * them — a git graph over the trail's parent links. Newest first, row by row: an entry runs in its
 * parent's lane when that lane is clear between the two — the lineage straight through, past the
 * branches beside it — else it takes the first lane free down to its parent; a root sits on lane 0.
 * Each entry's connector runs from its node down to its parent's node: straight in the same lane,
 * a curve into the parent's lane otherwise. Pure geometry over row indices, in CSS px.
 */
import type {TrailEntry} from './trailStore';

/** F5's measures: 56px rows, the mainline at x=14, a lane every 16px, nodes on the row's centre. */
export const ROW_HEIGHT = 56;
export const LANE_X = 14;
export const LANE_GAP = 16;
/** The connector leaves its lane this far above the parent's node. */
const CURVE_RISE = 26;

export interface SpineNode {
  id: string;
  row: number;
  lane: number;
  x: number;
  y: number;
}

export interface SpineConnector {
  /** The entry, and the parent its line runs to; `toRow` may lie past the last row (a parent elsewhere). */
  from: SpineNode;
  path: string;
}

export interface Spine {
  nodes: SpineNode[];
  connectors: SpineConnector[];
  /** How many lanes the spine uses — its width. */
  lanes: number;
}

const nodeX = (lane: number) => LANE_X + lane * LANE_GAP;
const nodeY = (row: number) => row * ROW_HEIGHT + ROW_HEIGHT / 2;

/**
 * The connector from a node down to its parent's: vertical in one lane; otherwise vertical to
 * just above the parent, then a cubic into the parent's node (F5's `V170 C30 186 14 182 14 196`).
 */
function connectorPath(from: SpineNode, toLane: number, toRow: number): string {
  const x2 = nodeX(toLane);
  const y2 = nodeY(toRow);
  if (toLane === from.lane) return `M${from.x} ${from.y} V${y2}`;
  const knee = y2 - CURVE_RISE;
  return `M${from.x} ${from.y} V${knee} C${from.x} ${knee + 16} ${x2} ${y2 - 14} ${x2} ${y2}`;
}

/**
 * The spine over `entries` newest first. `resolveRow` says where a parent that is not among these
 * rows sits — past the end for a parent in an older group, or nowhere (closed) for none.
 */
export function spineOf(entries: readonly TrailEntry[]): Spine {
  const rowOf = new Map(entries.map((entry, row) => [entry.id, row]));
  const lanes = new Array<number>(entries.length).fill(0);
  /** Which rows each lane is busy on: a node, or a connector passing through. */
  const busy: Array<Set<number>> = [];
  const occupy = (lane: number, fromRow: number, toRow: number) => {
    busy[lane] ??= new Set();
    for (let row = fromRow; row <= toRow; row++) busy[lane].add(row);
  };
  const free = (lane: number, fromRow: number, toRow: number) => {
    for (let row = fromRow; row <= toRow; row++) if (busy[lane]?.has(row)) return false;
    return true;
  };
  // Oldest first, so a parent's lane is known before its children ask for theirs.
  for (let row = entries.length - 1; row >= 0; row--) {
    const entry = entries[row];
    const parentRow = entry.parent === undefined ? undefined : rowOf.get(entry.parent);
    if (parentRow === undefined) {
      // A root, or a parent elsewhere: the mainline.
      lanes[row] = 0;
      occupy(0, row, row);
      continue;
    }
    // The parent's own lane when nothing sits in it between the two — the lineage runs straight
    // through, past the branches beside it, as F5's mainline does; else the first free lane.
    let lane = lanes[parentRow];
    if (!free(lane, row, parentRow - 1)) {
      lane = 1;
      while (!free(lane, row, parentRow - 1)) lane++;
    }
    lanes[row] = lane;
    occupy(lane, row, parentRow - 1);
  }
  const nodes: SpineNode[] = entries.map((entry, row) => ({
    id: entry.id,
    row,
    lane: lanes[row],
    x: nodeX(lanes[row]),
    y: nodeY(row),
  }));
  const connectors: SpineConnector[] = [];
  for (const node of nodes) {
    const entry = entries[node.row];
    if (entry.parent === undefined) continue;
    const parentRow = rowOf.get(entry.parent);
    // A parent in an older group: the line runs off the bottom edge, in this lane.
    if (parentRow === undefined) {
      connectors.push({from: node, path: `M${node.x} ${node.y} V${entries.length * ROW_HEIGHT}`});
      continue;
    }
    connectors.push({from: node, path: connectorPath(node, lanes[parentRow], parentRow)});
  }
  return {nodes, connectors, lanes: Math.max(0, ...lanes) + 1};
}
