import {describe, expect, test} from 'vitest';
import {retiredLines, unnamedRows} from './retirement';

describe('retiredLines', () => {
  test('the ids the earlier card named and the later one does not', () => {
    expect(retiredLines(['a', 'b', 'c'], ['b', 'd'])).toEqual(['a', 'c']);
  });

  test('nothing retired when the later card keeps every id, however many it adds', () => {
    expect(retiredLines(['a'], ['a', 'b'])).toEqual([]);
    expect(retiredLines([], ['a'])).toEqual([]);
  });

  test('each id once, in the earlier card’s order', () => {
    expect(retiredLines(['b', 'a', 'b'], [])).toEqual(['b', 'a']);
  });
});

describe('unnamedRows', () => {
  test('the held rows no record names, by catalog id and by artifact id', () => {
    const held = {a: 'sha-1', b: 'sha-2', c: 'sha-3'};
    const records = [{a: 'sha-1'}, {a: 'sha-1', c: 'sha-3'}];
    expect(unnamedRows(held, records)).toEqual({catalogIds: ['b'], artifactIds: ['sha-2']});
  });

  test('a row named at another hash is still a row something names, but its old artifact is not', () => {
    const held = {a: 'sha-new'};
    const records = [{a: 'sha-old'}];
    expect(unnamedRows(held, records)).toEqual({catalogIds: [], artifactIds: ['sha-new']});
  });

  test('no records leaves every row unnamed; no rows leaves nothing', () => {
    expect(unnamedRows({a: 'sha-1'}, [])).toEqual({catalogIds: ['a'], artifactIds: ['sha-1']});
    expect(unnamedRows({}, [{a: 'sha-1'}])).toEqual({catalogIds: [], artifactIds: []});
  });
});
