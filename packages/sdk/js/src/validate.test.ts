import {expect, test} from 'vitest';
import type {Synthesis, SynthesisPayload} from './synthesis';
import {validateSynthesisPayload, validateSynthesizeDataModel} from './validate';

const synthesis: Synthesis = {
  tree: {
    components: [
      {id: 'root', component: 'Column', children: ['list']},
      {
        id: 'list',
        component: 'Column',
        children: {template: {componentId: 'row', dataBinding: '/entries'}},
      },
      {id: 'row', component: 'DerivedValue', value: {path: 'when'}},
    ],
  },
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
        what: {op: 'value', args: []},
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
  note: '',
};

const clone = <T>(value: T): T => JSON.parse(JSON.stringify(value)) as T;

test('accepts a synthesis', () => {
  expect(validateSynthesizeDataModel(synthesis)).toEqual({ok: true, value: synthesis});
});

test('accepts a decline', () => {
  const decline = {declined: true, reason: 'the sources share no axis'};
  expect(validateSynthesizeDataModel(decline)).toEqual({ok: true, value: decline});
});

test('rejects a decline without a reason, and a synthesis missing a part', () => {
  expect(validateSynthesizeDataModel({declined: true, reason: ''}).ok).toBe(false);
  const {note: _note, ...noNote} = synthesis;
  void _note;
  expect(validateSynthesizeDataModel(noNote).ok).toBe(false);
});

test('rejects a scalar leaf, naming its path', () => {
  const bad = clone(synthesis);
  (bad.dataModel.entries as unknown[])[0] = {when: 'literal'};
  const result = validateSynthesizeDataModel(bad);
  expect(result.ok).toBe(false);
  if (!result.ok) expect(result.errors.join('\n')).toContain('/entries/0/when');
});

test('rejects a formula whose op is not a string or whose args are not refs', () => {
  const bad = clone(synthesis);
  bad.dataModel.counts = {gmail: {op: 'count', args: [{surface: 'gmail:inbox'}]}} as never;
  expect(validateSynthesizeDataModel(bad).ok).toBe(false);
});

test('rejects a malformed pointer, naming it', () => {
  const bad = clone(synthesis);
  (bad.dataModel.entries as {when: {args: {pointer: string}[]}}[])[0].when.args[0].pointer =
    '/messages[id=m_1]/receivedAt';
  const result = validateSynthesizeDataModel(bad);
  expect(result.ok).toBe(false);
  if (!result.ok) expect(result.errors.join('\n')).toContain('/messages[id=m_1]/receivedAt');
});

test('rejects a sort whose path is not an array of the model', () => {
  const bad = clone(synthesis);
  bad.sorts[0].path = '/counts';
  const result = validateSynthesizeDataModel(bad);
  expect(result.ok).toBe(false);
  if (!result.ok) expect(result.errors.join('\n')).toContain('/counts');
});

test('rejects a sort option whose key does not resolve to a formula in every element', () => {
  const bad = clone(synthesis);
  bad.sorts[0].options.push({key: '/where', label: 'Where'});
  const result = validateSynthesizeDataModel(bad);
  expect(result.ok).toBe(false);
  if (!result.ok) expect(result.errors.join('\n')).toContain('/where');
});

test('rejects a sort whose initial key is not one of its options', () => {
  const bad = clone(synthesis);
  bad.sorts[0].key = '/detail';
  expect(validateSynthesizeDataModel(bad).ok).toBe(false);
});

test('rejects a tree without a root component or with duplicate ids', () => {
  const noRoot = clone(synthesis);
  noRoot.tree.components[0].id = 'top';
  expect(validateSynthesizeDataModel(noRoot).ok).toBe(false);
  const dup = clone(synthesis);
  dup.tree.components[2].id = 'list';
  expect(validateSynthesizeDataModel(dup).ok).toBe(false);
});

test('rejects unknown keys on either branch', () => {
  expect(validateSynthesizeDataModel({...synthesis, extra: 1}).ok).toBe(false);
  expect(validateSynthesizeDataModel({declined: true, reason: 'x', note: ''}).ok).toBe(false);
});

const payload: SynthesisPayload = {
  dataModel: synthesis.dataModel,
  sorts: synthesis.sorts,
};

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

test('the payload validator applies the same structural checks', () => {
  const bad = clone(payload);
  bad.sorts[0].path = '/counts';
  expect(validateSynthesisPayload(bad).ok).toBe(false);
});

test('the derived model may not use the reserved root key "sorts"', () => {
  const bad = clone(synthesis);
  (bad.dataModel as Record<string, unknown>).sorts = {op: 'value', args: []};
  const result = validateSynthesizeDataModel(bad);
  expect(result.ok).toBe(false);
  if (!result.ok) expect(result.errors.join('\n')).toContain('sorts');
});
