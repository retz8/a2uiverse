import {expect, test} from 'vitest';
import {parsePointer, PointerSyntaxError, resolvePointer} from './pointer';

const partition = {
  messages: [
    {id: 'm_1', subject: 'Leave form due', from: 'hr@corp', tags: ['todo', 'hr']},
    {id: 'm_2', subject: 'Re: Q4 roadmap', from: 'cto@corp', tags: []},
    {id: 'dup', subject: 'first'},
    {id: 'dup', subject: 'second'},
  ],
  pulls: [{number: 812, title: 'Synthesizer'}],
  'a/b': {'~': 'escaped'},
  empty: null,
};

test('parses index and key segments as steps', () => {
  expect(parsePointer('/messages/0/subject')).toEqual([
    {kind: 'key', key: 'messages'},
    {kind: 'key', key: '0'},
    {kind: 'key', key: 'subject'},
  ]);
  expect(parsePointer('')).toEqual([]);
});

test('parses a predicate segment as a key step followed by a predicate step', () => {
  expect(parsePointer('/messages[id="m_1"]/subject')).toEqual([
    {kind: 'key', key: 'messages'},
    {kind: 'predicate', tests: [{field: 'id', value: 'm_1'}]},
    {kind: 'key', key: 'subject'},
  ]);
  expect(parsePointer('/pulls[number=812]/title')).toEqual([
    {kind: 'key', key: 'pulls'},
    {kind: 'predicate', tests: [{field: 'number', value: 812}]},
    {kind: 'key', key: 'title'},
  ]);
});

test('parses a compound predicate as one step of several tests', () => {
  expect(parsePointer('/messages[id="dup",subject="second"]')).toEqual([
    {kind: 'key', key: 'messages'},
    {
      kind: 'predicate',
      tests: [
        {field: 'id', value: 'dup'},
        {field: 'subject', value: 'second'},
      ],
    },
  ]);
});

test('splits compound tests on separators, not on commas inside a literal', () => {
  expect(parsePointer('/messages[subject="a,b",id="m_1"]')).toEqual([
    {kind: 'key', key: 'messages'},
    {
      kind: 'predicate',
      tests: [
        {field: 'subject', value: 'a,b'},
        {field: 'id', value: 'm_1'},
      ],
    },
  ]);
});

test('a slash inside a predicate literal is content, not a segment separator', () => {
  // GitHub names a pull request by `repository` and `number`; the repository carries a slash.
  expect(parsePointer('/prs[repository="a2ui-project/a2ui",number=2531]/title')).toEqual([
    {kind: 'key', key: 'prs'},
    {
      kind: 'predicate',
      tests: [
        {field: 'repository', value: 'a2ui-project/a2ui'},
        {field: 'number', value: 2531},
      ],
    },
    {kind: 'key', key: 'title'},
  ]);
});

test('unescapes RFC 6901 ~1 and ~0', () => {
  expect(parsePointer('/a~1b/~0')).toEqual([
    {kind: 'key', key: 'a/b'},
    {kind: 'key', key: '~'},
  ]);
});

test('rejects a pointer that is not empty and does not start with a slash', () => {
  expect(() => parsePointer('messages')).toThrow(PointerSyntaxError);
});

test('rejects a malformed predicate', () => {
  expect(() => parsePointer('/messages[id]')).toThrow(PointerSyntaxError);
  expect(() => parsePointer('/messages[id=m_1]')).toThrow(PointerSyntaxError);
  expect(() => parsePointer('/messages[=1]')).toThrow(PointerSyntaxError);
  expect(() => parsePointer('/messages[id="x"')).toThrow(PointerSyntaxError);
  expect(() => parsePointer('/messages[a/b="x"]')).toThrow(PointerSyntaxError);
});

test('resolves the root', () => {
  expect(resolvePointer(partition, '')).toEqual({found: true, value: partition});
});

test('a positional segment into an array says so rather than resolving', () => {
  // Elements are selected by key, never by position (task-5.10 decision 1). The reason is
  // distinct from `missing` so the caller can report the rule instead of a data fault.
  expect(resolvePointer(partition, '/messages/1/subject')).toEqual({
    found: false,
    reason: 'positional',
  });
  expect(resolvePointer(partition, '/messages/0/tags/1')).toEqual({
    found: false,
    reason: 'positional',
  });
});

test('an integer key into an object is an ordinary property name', () => {
  expect(resolvePointer({'0': 'zero'}, '/0')).toEqual({found: true, value: 'zero'});
});

test('a compound predicate over a slashed literal resolves', () => {
  const prs = {
    prs: [
      {number: 11, repository: 'a/b'},
      {number: 11, repository: 'a/c'},
    ],
  };
  expect(resolvePointer(prs, '/prs[repository="a/c",number=11]/repository')).toEqual({
    found: true,
    value: 'a/c',
  });
});

test('a compound predicate resolves what one field cannot', () => {
  expect(resolvePointer(partition, '/messages[id="dup",subject="second"]/subject')).toEqual({
    found: true,
    value: 'second',
  });
});

test('resolves a predicate ref to the one element whose field equals the literal', () => {
  expect(resolvePointer(partition, '/messages[id="m_2"]/from')).toEqual({
    found: true,
    value: 'cto@corp',
  });
  expect(resolvePointer(partition, '/pulls[number=812]/title')).toEqual({
    found: true,
    value: 'Synthesizer',
  });
});

test('compares the predicate literal by JSON equality, not by string', () => {
  expect(resolvePointer(partition, '/pulls[number="812"]/title')).toEqual({
    found: false,
    reason: 'missing',
  });
});

test('a predicate matching nothing is missing', () => {
  expect(resolvePointer(partition, '/messages[id="gone"]/subject')).toEqual({
    found: false,
    reason: 'missing',
  });
});

test('a predicate matching several elements is ambiguous', () => {
  expect(resolvePointer(partition, '/messages[id="dup"]/subject')).toEqual({
    found: false,
    reason: 'ambiguous',
  });
});

test('a predicate against a non-array is missing', () => {
  expect(resolvePointer(partition, '/a~1b[x=1]')).toEqual({found: false, reason: 'missing'});
});

test('a missing key, a non-canonical index, and a null value are not found', () => {
  expect(resolvePointer(partition, '/nothing')).toEqual({found: false, reason: 'missing'});
  // Non-canonical integers were never positional, so they stay a plain miss.
  expect(resolvePointer(partition, '/messages/01')).toEqual({found: false, reason: 'missing'});
  expect(resolvePointer(partition, '/messages/-1')).toEqual({found: false, reason: 'missing'});
  expect(resolvePointer(partition, '/empty')).toEqual({found: false, reason: 'null'});
});

test('resolves escaped keys', () => {
  expect(resolvePointer(partition, '/a~1b/~0')).toEqual({found: true, value: 'escaped'});
});
