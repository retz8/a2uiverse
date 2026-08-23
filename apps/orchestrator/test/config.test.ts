import {describe, expect, test} from 'vitest';
import {loadConfig} from '../src/config.js';

describe('loadConfig', () => {
  test('defaults: port 10001, base URL derived from port, debug ids off, no overrides', () => {
    const config = loadConfig({});
    expect(config.port).toBe(10001);
    expect(config.baseUrl).toBe('http://localhost:10001');
    expect(config.debugIds).toBe(false);
    expect(config.agentUrls).toEqual({});
    expect(config.stateDir.endsWith('.state')).toBe(true);
  });

  test('reads PORT, BASE_URL, STATE_DIR, A2UIVERSE_DEBUG_IDS, A2UIVERSE_AGENT_URLS', () => {
    const config = loadConfig({
      PORT: '4242',
      BASE_URL: 'https://x-4242.asse.devtunnels.ms',
      STATE_DIR: '/tmp/state',
      A2UIVERSE_DEBUG_IDS: 'true',
      A2UIVERSE_AGENT_URLS: '{"github":"http://localhost:10002"}',
    });
    expect(config.port).toBe(4242);
    expect(config.baseUrl).toBe('https://x-4242.asse.devtunnels.ms');
    expect(config.stateDir).toBe('/tmp/state');
    expect(config.debugIds).toBe(true);
    expect(config.agentUrls).toEqual({github: 'http://localhost:10002'});
  });

  test('a non-integer PORT names the key in its error', () => {
    expect(() => loadConfig({PORT: 'abc'})).toThrow('PORT');
  });

  test('invalid A2UIVERSE_AGENT_URLS JSON names the key in its error', () => {
    expect(() => loadConfig({A2UIVERSE_AGENT_URLS: '{nope'})).toThrow('A2UIVERSE_AGENT_URLS');
  });
});
