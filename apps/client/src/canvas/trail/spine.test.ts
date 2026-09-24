/**
 * The trail's spine: lanes from the parent links, connectors down to the parent (board F5).
 */
import {describe, expect, it} from 'vitest';
import {LANE_X, ROW_HEIGHT, spineOf} from './spine';
import type {TrailEntry} from './trailStore';

const entry = (id: string, parent?: string): TrailEntry => ({
  id,
  question: id,
  askedAt: 0,
  loading: false,
  ...(parent ? {parent} : {}),
});

describe('spineOf', () => {
  it('a straight lineage sits on the mainline, each node joined to the one below', () => {
    const spine = spineOf([entry('c', 'b'), entry('b', 'a'), entry('a')]);
    expect(spine.lanes).toBe(1);
    expect(spine.nodes.map(n => [n.lane, n.y])).toEqual([
      [0, 28],
      [0, 84],
      [0, 140],
    ]);
    expect(spine.connectors.map(c => c.path)).toEqual([`M${LANE_X} 28 V84`, `M${LANE_X} 84 V140`]);
  });

  it('a branch takes the next lane and curves into its parent, as F5 draws it', () => {
    // F5's four: the status question from the apps one, the calendar question a branch from the
    // oldest, the apps question, the oldest.
    const spine = spineOf([
      entry('status', 'apps'),
      entry('calendar', 'attention'),
      entry('apps', 'attention'),
      entry('attention'),
    ]);
    expect(spine.lanes).toBe(2);
    expect(spine.nodes[1]).toMatchObject({lane: 1, x: 30, y: 84});
    expect(spine.connectors.find(c => c.from.id === 'calendar')?.path).toBe(
      'M30 84 V170 C30 186 14 182 14 196',
    );
    // The lineage runs straight through beside the branch, as F5's mainline does.
    expect(spine.nodes[0]).toMatchObject({lane: 0});
    expect(spine.connectors.find(c => c.from.id === 'status')?.path).toBe('M14 28 V140');
  });

  it('a child asked from a branch inherits its lane; a second branch takes a third', () => {
    // Newest first: e from d (a branch), d from a, c from a (another branch), b from a, a.
    const spine = spineOf([
      entry('e', 'd'),
      entry('d', 'a'),
      entry('c', 'a'),
      entry('b', 'a'),
      entry('a'),
    ]);
    const lane = (id: string) => spine.nodes.find(n => n.id === id)!.lane;
    expect(lane('a')).toBe(0);
    expect(lane('b')).toBe(0);
    expect(lane('c')).toBe(1);
    expect(lane('d')).toBe(2);
    expect(lane('e')).toBe(2);
    expect(spine.lanes).toBe(3);
  });

  it('a parent that is not among the rows runs the line off the bottom edge', () => {
    const spine = spineOf([entry('b', 'elsewhere'), entry('a')]);
    expect(spine.connectors[0].path).toBe(`M${LANE_X} 28 V${2 * ROW_HEIGHT}`);
    expect(spine.nodes[0].lane).toBe(0);
  });
});
