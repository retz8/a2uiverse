import {describe, expect, test} from 'vitest';
import type {SynthesisPayload} from './synthesis';
import {validateSynthesisPayload} from './validate';

const payload: SynthesisPayload = {
  dataModel: {
    counts: {gmail: {op: 'count', args: [{surface: 'gmail:inbox', pointer: '/messages'}]}},
    entries: [
      {
        when: {
          op: 'value',
          args: [{surface: 'gmail:inbox', pointer: '/messages[id="m_1"]/receivedAt'}],
        },
        what: {
          op: 'value',
          args: [{surface: 'gmail:inbox', pointer: '/messages[id="m_1"]/subject'}],
        },
      },
      {
        when: {
          op: 'value',
          args: [{surface: 'github:prs', pointer: '/pulls[number=812]/updatedAt'}],
        },
        what: {
          op: 'value',
          args: [{surface: 'github:prs', pointer: '/pulls[number=812]/title'}],
        },
      },
    ],
  },
  sorts: [
    {
      path: '/entries',
      options: [
        {key: '/when', label: 'Time'},
        {key: '/what', label: 'Title'},
      ],
      key: '/when',
      direction: 'asc',
    },
  ],
};

const clone = <T>(value: T): T => JSON.parse(JSON.stringify(value)) as T;

test('accepts a payload and rejects one carrying anything else', () => {
  expect(validateSynthesisPayload(payload)).toEqual({ok: true, value: payload});
  const {sorts: _dropped, ...noSorts} = payload;
  void _dropped;
  expect(validateSynthesisPayload(noSorts).ok).toBe(false);
  // The generation baseline left the payload with task 5.10; nothing may reintroduce it.
  expect(validateSynthesisPayload({...payload, computedAgainst: {'gmail:inbox': 1}}).ok).toBe(
    false,
  );
});

test('rejects a scalar leaf, naming its path', () => {
  const bad = clone(payload);
  (bad.dataModel.entries as unknown[])[0] = {when: 'literal'};
  const result = validateSynthesisPayload(bad);
  expect(result.ok).toBe(false);
  if (!result.ok) expect(result.errors.join('\n')).toContain('/entries/0/when');
});

test('rejects a formula whose op is not a string or whose args are not refs', () => {
  const bad = clone(payload);
  bad.dataModel.counts = {gmail: {op: 'count', args: [{surface: 'gmail:inbox'}]}} as never;
  expect(validateSynthesisPayload(bad).ok).toBe(false);
});

test('rejects a malformed pointer, naming it', () => {
  const bad = clone(payload);
  (bad.dataModel.entries as {when: {args: {pointer: string}[]}}[])[0].when.args[0].pointer =
    '/messages[id=m_1]/receivedAt';
  const result = validateSynthesisPayload(bad);
  expect(result.ok).toBe(false);
  if (!result.ok) expect(result.errors.join('\n')).toContain('/messages[id=m_1]/receivedAt');
});

test('rejects a sort whose path is not an array of the model', () => {
  const bad = clone(payload);
  bad.sorts[0].path = '/counts';
  const result = validateSynthesisPayload(bad);
  expect(result.ok).toBe(false);
  if (!result.ok) expect(result.errors.join('\n')).toContain('/counts');
});

test('rejects a sort option whose key does not resolve to a formula in every element', () => {
  const bad = clone(payload);
  bad.sorts[0].options.push({key: '/where', label: 'Where'});
  const result = validateSynthesisPayload(bad);
  expect(result.ok).toBe(false);
  if (!result.ok) expect(result.errors.join('\n')).toContain('/where');
});

test('rejects a second declaration over the same array (task-5.7: one declaration per array)', () => {
  const twice = clone(payload);
  twice.sorts.push({
    ...clone(twice.sorts[0]!),
    options: [{key: '/what', label: 'Title'}],
    key: '/what',
  });
  const out = validateSynthesisPayload(twice);
  expect(out.ok).toBe(false);
  if (!out.ok)
    expect(out.errors).toEqual([
      '/sorts/1: path /entries is already declared at /sorts/0 — one declaration per array',
    ]);
});

test('rejects a sort option whose key is a formula with no refs in some element (task-5.7: a key that can never resolve)', () => {
  const unkeyed = clone(payload);
  (unkeyed.dataModel.entries as Array<Record<string, unknown>>)[1]!.when = {op: 'value', args: []};
  const out = validateSynthesisPayload(unkeyed);
  expect(out.ok).toBe(false);
  if (!out.ok)
    expect(out.errors).toEqual([
      '/sorts/0: option key /when is a formula with no refs in element 1 of /entries — an element whose key can never resolve does not belong in a sorted array; give it its own array',
    ]);
});

test('rejects a sort whose initial key is not one of its options', () => {
  const bad = clone(payload);
  bad.sorts[0].key = '/detail';
  expect(validateSynthesisPayload(bad).ok).toBe(false);
});

test('the derived model may not use the reserved root key "sorts"', () => {
  const bad = clone(payload);
  (bad.dataModel as Record<string, unknown>).sorts = {op: 'value', args: []};
  const result = validateSynthesisPayload(bad);
  expect(result.ok).toBe(false);
  if (!result.ok) expect(result.errors.join('\n')).toContain('sorts');
});

const G = (pointer: string) => ({surface: 'github:prs', pointer});
const C = (pointer: string) => ({surface: 'circleci:runs', pointer});
const L = (pointer: string) => ({surface: 'linear:my-issues', pointer});
const row = () => ({
  title: {op: 'value', args: [G('/pulls[number=142]/title')]},
  ci: {op: 'value', args: [C('/runs[id="r1"]/status')]},
  issue: {op: 'value', args: [L('/started[id="A2U-5"]/status')]},
  match: {
    branch: {op: 'equal', args: [G('/pulls[number=142]/branch'), C('/runs[id="r1"]/branch')]},
    'issue in branch': {
      op: 'contains',
      args: [G('/pulls[number=142]/branch'), L('/started[id="A2U-5"]/id')],
    },
  },
});
const joined = (match: unknown): SynthesisPayload =>
  ({dataModel: {pulls: [{...row(), match}]}, sorts: []}) as unknown as SynthesisPayload;

describe('the match claim', () => {
  test('accepts named relations, each over two refs in two different apps', () => {
    const ok: SynthesisPayload = {dataModel: {pulls: [row()]}, sorts: []} as never;
    expect(validateSynthesisPayload(ok)).toEqual({ok: true, value: ok});
  });

  test('accepts a match claim on the root', () => {
    const {match, ...cells} = row();
    const ok = {dataModel: {...cells, match}, sorts: []} as unknown as SynthesisPayload;
    expect(validateSynthesisPayload(ok).ok).toBe(true);
  });

  test('requires none: an object joining several apps without a match claim is accepted', () => {
    const {match: _dropped, ...cells} = row();
    void _dropped;
    const ok = {dataModel: {pulls: [cells]}, sorts: []} as unknown as SynthesisPayload;
    expect(validateSynthesisPayload(ok).ok).toBe(true);
  });

  test('rejects an empty match claim', () => {
    const result = validateSynthesisPayload(joined({}));
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.errors.join('\n')).toContain('/pulls/0/match');
  });

  test('rejects a nested match claim', () => {
    const nested = {ci: {branch: row().match.branch}};
    expect(validateSynthesisPayload(joined(nested)).ok).toBe(false);
  });

  test('rejects a relation written without a name', () => {
    expect(validateSynthesisPayload(joined(row().match.branch)).ok).toBe(false);
  });

  test('rejects a relation over one ref or over three', () => {
    const one = {branch: {op: 'equal', args: [G('/pulls[number=142]/branch')]}};
    const three = {
      branch: {
        op: 'equal',
        args: [
          G('/pulls[number=142]/branch'),
          C('/runs[id="r1"]/branch'),
          L('/started[id="A2U-5"]/id'),
        ],
      },
    };
    expect(validateSynthesisPayload(joined(one)).ok).toBe(false);
    expect(validateSynthesisPayload(joined(three)).ok).toBe(false);
  });

  test('rejects a relation whose two refs are in the same app, naming it', () => {
    const same = {
      branch: {
        op: 'equal',
        args: [G('/pulls[number=142]/branch'), {surface: 'github:detail', pointer: '/branch'}],
      },
    };
    const result = validateSynthesisPayload(joined(same));
    expect(result).toEqual({
      ok: false,
      errors: [
        '/pulls/0/match/branch: a relation joins two different apps; both refs are in github',
      ],
    });
  });

  test('rejects a relation whose ref names no app, naming it', () => {
    const bare = {
      branch: {
        op: 'equal',
        args: [G('/pulls[number=142]/branch'), {surface: 'runs', pointer: '/b'}],
      },
    };
    const result = validateSynthesisPayload(joined(bare));
    expect(result).toEqual({
      ok: false,
      errors: [
        '/pulls/0/match/branch: ref surface "runs" names no app — a surface is <appId>:<surfaceId>',
      ],
    });
  });

  test("reports a malformed pointer inside a relation, like any leaf's", () => {
    const bad = {
      branch: {op: 'equal', args: [G('/pulls[number=142/branch'), C('/runs[id="r1"]/branch')]},
    };
    const result = validateSynthesisPayload(joined(bad));
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.errors.join('\n')).toContain('/pulls/0/match/branch');
  });
});

describe('a nested sort path (task-7.12)', () => {
  const cell = (pointer: string) => ({op: 'value', args: [{surface: 'circleci:runs', pointer}]});
  const nested = (): SynthesisPayload =>
    ({
      dataModel: {
        rows: [
          {
            title: cell('/runs[id="a"]/branch'),
            runs: [{when: cell('/runs[id="a"]/when')}, {when: cell('/runs[id="b"]/when')}],
          },
          {title: cell('/runs[id="c"]/branch'), runs: []},
        ],
      },
      sorts: [
        {
          path: '/rows',
          options: [{key: '/title', label: 'Branch'}],
          key: '/title',
          direction: 'asc',
        },
        {
          path: '/rows/*/runs',
          options: [{key: '/when', label: 'Time'}],
          key: '/when',
          direction: 'desc',
        },
      ],
    }) as unknown as SynthesisPayload;

  test('accepts a list inside every row, an empty one included', () => {
    expect(validateSynthesisPayload(nested()).ok).toBe(true);
  });

  test('rejects a row without the list, naming where it should be', () => {
    const gap = nested();
    delete (gap.dataModel.rows as Array<Record<string, unknown>>)[1]!.runs;
    const out = validateSynthesisPayload(gap);
    expect(out.ok).toBe(false);
    if (!out.ok)
      expect(out.errors).toEqual([
        '/sorts/1: path /rows/*/runs reaches no array at /rows/1/runs — every element it passes through carries the list, [] when it has none',
      ]);
  });

  test('checks every option key in every element of every list, naming the list', () => {
    const unkeyed = nested();
    const runs = (unkeyed.dataModel.rows as Array<{runs: Array<Record<string, unknown>>}>)[0]!.runs;
    runs[1]!.when = {op: 'value', args: []};
    const out = validateSynthesisPayload(unkeyed);
    expect(out.ok).toBe(false);
    if (!out.ok)
      expect(out.errors).toEqual([
        '/sorts/1: option key /when is a formula with no refs in element 1 of /rows/0/runs — an element whose key can never resolve does not belong in a sorted array; give it its own array',
      ]);
  });

  test('one declaration per nested path', () => {
    const twice = nested();
    twice.sorts.push(clone(twice.sorts[1]!));
    const out = validateSynthesisPayload(twice);
    expect(out.ok).toBe(false);
    if (!out.ok)
      expect(out.errors).toEqual([
        '/sorts/2: path /rows/*/runs is already declared at /sorts/1 — one declaration per array',
      ]);
  });

  test('reports a path stepping into an array by position, and a malformed path, without throwing', () => {
    const positional = nested();
    positional.sorts[1]!.path = '/rows/0/runs';
    const out = validateSynthesisPayload(positional);
    expect(out.ok).toBe(false);
    if (!out.ok) expect(out.errors.join('\n')).toContain('steps through an array with *');

    const malformed = nested();
    malformed.sorts[1]!.path = '/rows[x/runs';
    expect(() => validateSynthesisPayload(malformed)).not.toThrow();
    expect(validateSynthesisPayload(malformed).ok).toBe(false);
  });
});
