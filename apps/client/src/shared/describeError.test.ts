import {describe, it, expect} from 'vitest';
import {describeError} from './describeError';

describe('describeError', () => {
  it('uses an Error message', () => {
    expect(describeError(new Error('Surface user-profile already exists.'))).toBe(
      'Surface user-profile already exists.',
    );
  });

  it('uses a non-empty string as-is', () => {
    expect(describeError('boom')).toBe('boom');
  });

  it('falls back when there is nothing to say', () => {
    expect(describeError(new Error(''))).toBe('Unknown error.');
    expect(describeError({})).toBe('Unknown error.');
    expect(describeError(undefined)).toBe('Unknown error.');
  });
});
