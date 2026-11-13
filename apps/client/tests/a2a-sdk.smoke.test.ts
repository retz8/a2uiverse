import {describe, it, expect} from 'vitest';
import {ClientFactory, JsonRpcTransportFactory} from '@a2a-js/sdk/client';

describe('@a2a-js/sdk resolution', () => {
  it('exposes ClientFactory and JsonRpcTransportFactory under the bundler', () => {
    expect(typeof ClientFactory.prototype.createFromUrl).toBe('function');
    expect(typeof JsonRpcTransportFactory).toBe('function');
  });
});
