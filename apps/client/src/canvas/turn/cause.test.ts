/** The cause vocabulary: the question cut to the trail label's length. */
import {describe, it, expect} from 'vitest';
import {truncateUtterance} from './cause';

describe('truncateUtterance', () => {
  it('leaves a short question alone and cuts a long one with an ellipsis', () => {
    expect(truncateUtterance('show my PRs')).toBe('show my PRs');
    const cut = truncateUtterance('a'.repeat(80));
    expect(cut).toHaveLength(49);
    expect(cut.endsWith('…')).toBe(true);
  });
});
