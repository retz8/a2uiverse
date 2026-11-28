import {describe, expect, test} from 'vitest';
import {readA2uiStamp, readsAboveV1, readsBelowV1} from './stamp';

describe('readA2uiStamp', () => {
  test('a message stamped 1.0 is current', () => {
    expect(readA2uiStamp({version: '1.0', deleteSurface: {surfaceId: 's'}})).toEqual({
      stamp: '1.0',
      current: true,
      older: false,
      newer: false,
    });
  });

  test.each(['v0.9', 'v0.9.1', '0.9', 'v0.8'])('%s is another stamp, below 1.0', stamp => {
    expect(readA2uiStamp({version: stamp})).toEqual({
      stamp,
      current: false,
      older: true,
      newer: false,
    });
  });

  test.each(['1.1', 'v2.0', '1.0.1'])('%s is another stamp, above 1.0', stamp => {
    expect(readA2uiStamp({version: stamp})).toEqual({
      stamp,
      current: false,
      older: false,
      newer: true,
    });
  });

  test.each(['v1.0', '1.0.0', 'next'])(
    '%s is another stamp, neither below nor above 1.0',
    stamp => {
      expect(readA2uiStamp({version: stamp})).toEqual({
        stamp,
        current: false,
        older: false,
        newer: false,
      });
    },
  );

  test('a message with no version, as v0.8 writes them, is not read as A2UI', () => {
    expect(readA2uiStamp({beginRendering: {surfaceId: 's', root: 'r'}})).toBeUndefined();
    expect(readA2uiStamp({version: 1})).toBeUndefined();
    expect(readA2uiStamp([{version: '1.0'}])).toBeUndefined();
    expect(readA2uiStamp(null)).toBeUndefined();
  });
});

describe('readsBelowV1', () => {
  test('reads the tail of an extension URI as a stamp is read', () => {
    expect(readsBelowV1('v0.9')).toBe(true);
    expect(readsBelowV1('v1.0')).toBe(false);
    expect(readsBelowV1('v1.1')).toBe(false);
    expect(readsBelowV1('latest')).toBe(false);
  });
});

describe('readsAboveV1', () => {
  test('a version above 1.0 by its minor, its patch or its major', () => {
    expect(readsAboveV1('v1.1')).toBe(true);
    expect(readsAboveV1('1.0.1')).toBe(true);
    expect(readsAboveV1('2.0')).toBe(true);
    expect(readsAboveV1('1.0')).toBe(false);
    expect(readsAboveV1('v0.9')).toBe(false);
    expect(readsAboveV1('latest')).toBe(false);
  });
});
