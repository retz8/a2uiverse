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
    {kind: 'predicate', field: 'id', value: 'm_1'},
    {kind: 'key', key: 'subject'},
  ]);
  expect(parsePointer('/pulls[number=812]/title')).toEqual([
    {kind: 'key', key: 'pulls'},
    {kind: 'predicate', field: 'number', value: 812},
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

test('resolves index refs and the root', () => {
  expect(resolvePointer(partition, '/messages/1/subject')).toEqual({
    found: true,
    value: 'Re: Q4 roadmap',
  });
  expect(resolvePointer(partition, '/messages/0/tags/1')).toEqual({found: true, value: 'hr'});
  expect(resolvePointer(partition, '')).toEqual({found: true, value: partition});
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

test('a missing key, an out-of-range or non-canonical index, and a null value are not found', () => {
  expect(resolvePointer(partition, '/nothing')).toEqual({found: false, reason: 'missing'});
  expect(resolvePointer(partition, '/messages/9')).toEqual({found: false, reason: 'missing'});
  expect(resolvePointer(partition, '/messages/01')).toEqual({found: false, reason: 'missing'});
  expect(resolvePointer(partition, '/messages/-1')).toEqual({found: false, reason: 'missing'});
  expect(resolvePointer(partition, '/empty')).toEqual({found: false, reason: 'null'});
});

test('resolves escaped keys', () => {
  expect(resolvePointer(partition, '/a~1b/~0')).toEqual({found: true, value: 'escaped'});
});
