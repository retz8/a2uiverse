import {expect, test} from 'vitest';
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
