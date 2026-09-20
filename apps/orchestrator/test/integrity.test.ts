/**
 * The IntegrityChecker (task-5.4 spec, amended by task 5.10): refs select elements by key, so
 * resolution is validity. A partition that reorders or repaints under a ref breaks nothing; a
 * ref that stops resolving is what gates a re-synthesis, and the change account carries it.
 */
import type {Ref, SynthesisPayload} from '@a2uiverse/sdk';
import {describe, expect, test} from 'vitest';
import {
  changeAccount,
  checkSynthesisPayload,
  firesResynthesis,
  refValid,
  seenOf,
  watchedArrays,
  watchOf,
} from '../src/composition/integrity.js';
import {Partitions} from '../src/composition/partitions.js';

const A = 'shop-a:list';
const B = 'shop-b:list';

const payload: SynthesisPayload = {
  dataModel: {
    rows: [
      {
        name: {op: 'value', args: [{surface: A, pointer: '/items[id="x100"]/name'}]},
        best: {
          op: 'min',
          args: [
            {surface: A, pointer: '/items[id="x100"]/price'},
            {surface: B, pointer: '/products[sku="x100"]/price'},
          ],
        },
      },
    ],
  },
  sorts: [],
};

/** A partition stub in which every ref resolves except the pointers named. */
function partitions(...gone: string[]) {
  return {resolve: (ref: Ref) => ({found: !gone.some(g => ref.pointer.includes(g))})};
}

test('a ref is valid while it resolves, whatever the partition did under it', () => {
  expect(refValid({surface: A, pointer: '/items[id="x100"]/name'}, partitions())).toBe(true);
  expect(refValid({surface: A, pointer: '/items[id="x100"]/name'}, partitions('x100'))).toBe(false);
});

test('the payload holds while every ref resolves; only the surfaces that broke are named', () => {
  expect(checkSynthesisPayload(payload, partitions())).toEqual({valid: true, invalid: []});
  expect(checkSynthesisPayload(payload, partitions('sku="x100"'))).toEqual({
    valid: false,
    invalid: [B],
  });
  expect(checkSynthesisPayload(payload, partitions('x100')).invalid).toEqual([A, B]);
});

test('a reorder that leaves every key resolving does not invalidate the payload', () => {
  // The property the phase is built on: keys survive a repaint that moves elements around.
  expect(checkSynthesisPayload(payload, partitions()).valid).toBe(true);
});

test('the change account names the refs that stopped resolving, once each', () => {
  expect(changeAccount(payload, partitions('sku="x100"'))).toEqual({
    absent: [{surface: B, pointer: '/products[sku="x100"]/price'}],
    appeared: [],
    unheld: [],
    repainted: [],
  });
});

test('a ref repeated across formulas is accounted once', () => {
  const twice: SynthesisPayload = {
    dataModel: {
      a: {op: 'value', args: [{surface: A, pointer: '/items[id="x100"]/name'}]},
      b: {op: 'value', args: [{surface: A, pointer: '/items[id="x100"]/name'}]},
    },
    sorts: [],
  };
  expect(changeAccount(twice, partitions('x100')).absent).toHaveLength(1);
});

describe('appearance and the relations that no longer hold (task-7.6 decisions 13–15)', () => {
  const GH = 'github:prs';
  const CI = 'circleci:runs';

  function paint(models: Record<string, unknown>, into = new Partitions()): Partitions {
    const message = (op: Record<string, unknown>) => ({
      kind: 'message' as const,
      messageId: 'm',
      role: 'agent' as const,
      parts: [{kind: 'data' as const, data: {version: 'v0.9', ...op}}],
    });
    for (const [surface, value] of Object.entries(models)) {
      if (!into.has(surface))
        into.apply(message({createSurface: {surfaceId: surface, catalogId: 'c'}}));
      into.apply(message({updateDataModel: {surfaceId: surface, value}}));
    }
    return into;
  }

  const cell = (surface: string, pointer: string) => ({op: 'value', args: [{surface, pointer}]});
  const joined: SynthesisPayload = {
    dataModel: {
      rows: [
        {
          title: cell(GH, '/prs[number=7]/title'),
          run: cell(CI, '/runs[id="r1"]/workflows[id="w1"]/status'),
          match: {
            'same branch': {
              op: 'equal',
              args: [
                {surface: GH, pointer: '/prs[number=7]/head'},
                {surface: CI, pointer: '/runs[id="r1"]/branch'},
              ],
            },
            judged: {
              op: 'judged',
              args: [
                {surface: GH, pointer: '/prs[number=7]/title'},
                {surface: CI, pointer: '/runs[id="r1"]/subject'},
              ],
            },
          },
        },
      ],
    },
    sorts: [],
  };
  const models = () => ({
    [GH]: {
      prs: [
        {number: 7, title: 'Add login', head: 'feat/login'},
        {number: 8, title: 'Fix build', head: 'fix/build'},
      ],
    },
    [CI]: {
      runs: [
        {
          id: 'r1',
          branch: 'feat/login',
          subject: 'add login',
          workflows: [{id: 'w1', status: 'failed'}],
        },
      ],
    },
  });

  test('watches every array a ref selects into by key — nested ones inside a keyed element included', () => {
    const watch = watchOf(joined, paint(models()));
    expect(watchedArrays(watch)).toEqual([
      {surface: GH, array: '/prs', fields: ['number']},
      {surface: CI, array: '/runs', fields: ['id']},
      {surface: CI, array: '/runs[id="r1"]/workflows', fields: ['id']},
    ]);
  });

  test('a key present at accept never appears — referenced or not; a new one does, as a ref selecting it', () => {
    const p = paint(models());
    const watch = watchOf(joined, p);
    expect(changeAccount(joined, p, watch).appeared).toEqual([]);
    const next = models();
    next[CI].runs[0]!.workflows.push({id: 'w2', status: 'running'});
    next[GH].prs.push({number: 9, title: 'Docs', head: 'docs'});
    paint(next, p);
    expect(changeAccount(joined, p, watch).appeared).toEqual([
      {surface: GH, pointer: '/prs[number=9]'},
      {surface: CI, pointer: '/runs[id="r1"]/workflows[id="w2"]'},
    ]);
  });

  test('an element missing the key’s fields is not keyed', () => {
    const p = paint(models());
    const watch = watchOf(joined, p);
    const next = models();
    (next[GH].prs as unknown[]).push({title: 'no number'});
    paint(next, p);
    expect(changeAccount(joined, p, watch).appeared).toEqual([]);
  });

  test('an array an earlier document referenced stays watched after a re-synthesis dropped its refs: empty while gone, its keys appear when it returns', () => {
    const p = paint(models());
    const first = watchOf(joined, p);
    // The CircleCI list gives way to a detail view; the re-synthesis drops every CircleCI ref.
    paint({[CI]: {detail: {id: 'r1'}}}, p);
    const githubOnly: SynthesisPayload = {
      dataModel: {rows: [{title: cell(GH, '/prs[number=7]/title')}]},
      sorts: [],
    };
    const second = watchOf(githubOnly, p, first);
    expect(watchedArrays(second).map(w => w.array)).toContain('/runs');
    paint(models(), p);
    expect(changeAccount(githubOnly, p, second).appeared).toEqual([
      {surface: CI, pointer: '/runs[id="r1"]'},
      {surface: CI, pointer: '/runs[id="r1"]/workflows[id="w1"]'},
    ]);
  });

  test('a fact that stops holding while its refs resolve is an unheld relation; judged never is', () => {
    const p = paint(models());
    const watch = watchOf(joined, p);
    expect(changeAccount(joined, p, watch).unheld).toEqual([]);
    const renamed = models();
    renamed[CI].runs[0]!.branch = 'feat/logout';
    renamed[CI].runs[0]!.subject = 'something else entirely';
    paint(renamed, p);
    expect(changeAccount(joined, p, watch).unheld).toEqual([
      {
        path: '/rows/0/match/same branch',
        op: 'equal',
        args: [
          {surface: GH, pointer: '/prs[number=7]/head'},
          {surface: CI, pointer: '/runs[id="r1"]/branch'},
        ],
      },
    ]);
  });
});

describe('a source the view reads nothing from, painting again (task-7.9)', () => {
  const LIST = 'circleci:runs';
  const DETAIL = 'circleci:run-detail';
  const GH = 'github:prs';

  function paint(models: Record<string, unknown>, into = new Partitions()): Partitions {
    const message = (op: Record<string, unknown>) => ({
      kind: 'message' as const,
      messageId: 'm',
      role: 'agent' as const,
      parts: [{kind: 'data' as const, data: {version: 'v0.9', ...op}}],
    });
    for (const [surface, value] of Object.entries(models)) {
      if (!into.has(surface))
        into.apply(message({createSurface: {surfaceId: surface, catalogId: 'c'}}));
      into.apply(message({updateDataModel: {surfaceId: surface, value}}));
    }
    return into;
  }

  // The view detached CircleCI: every ref it holds is GitHub's.
  const detached: SynthesisPayload = {
    dataModel: {
      rows: [{title: {op: 'value', args: [{surface: GH, pointer: '/prs[number=8]/title'}]}}],
    },
    sorts: [],
  };
  const github = {prs: [{number: 8, title: 'Effort'}]};

  test('its surface is named repainted, and that fires a re-synthesis', () => {
    const p = paint({[GH]: github, [LIST]: {runs: [{id: 'r1'}]}});
    const seen = seenOf(p);
    expect(changeAccount(detached, p, undefined, seen).repainted).toEqual([]);

    // The vendor paints a detail as a new surface: one the last accept never saw.
    paint({[DETAIL]: {run: {currentWorkflow: {status: 'Running'}}}}, p);
    const changes = changeAccount(detached, p, undefined, seen);
    expect(changes).toMatchObject({absent: [], appeared: [], repainted: [DETAIL]});
    expect(firesResynthesis(changes)).toBe(true);

    // Accepted again, the same data fires nothing; a change under it does.
    const again = seenOf(p);
    expect(changeAccount(detached, p, undefined, again).repainted).toEqual([]);
    paint({[DETAIL]: {run: {currentWorkflow: {status: 'Success'}}}}, p);
    expect(changeAccount(detached, p, undefined, again).repainted).toEqual([DETAIL]);
  });

  test('a surface the view reads is never named: its changes are the refs’ and the watch’s', () => {
    const p = paint({[GH]: github, [LIST]: {runs: []}});
    const seen = seenOf(p);
    paint({[GH]: {prs: [{number: 8, title: 'Effort, renamed'}], note: 'new'}}, p);
    const changes = changeAccount(detached, p, undefined, seen);
    expect(changes.repainted).toEqual([]);
    expect(firesResynthesis(changes)).toBe(false);
  });

  test('without what the last accept saw, nothing is named', () => {
    const p = paint({[GH]: github, [LIST]: {runs: []}});
    expect(changeAccount(detached, p).repainted).toEqual([]);
  });
});
