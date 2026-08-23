import {describe, it, expect} from 'vitest';
import {A2AClient} from '@a2a-js/sdk/client';

describe('@a2a-js/sdk resolution', () => {
  it('exposes A2AClient.fromCardUrl under the bundler', () => {
    expect(typeof A2AClient.fromCardUrl).toBe('function');
  });
});
