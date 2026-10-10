import {describe, expect, test} from 'vitest';
import {loadConfig} from '../src/config.js';

describe('loadConfig', () => {
  test('defaults: port 10002, the state directory, the card and smoke timeouts', () => {
    const config = loadConfig({});
    expect(config.port).toBe(10002);
    expect(config.stateDir.endsWith('.state')).toBe(true);
    expect(config.cardTimeoutMs).toBe(10_000);
    expect(config.smokeTimeoutMs).toBe(60_000);
  });

  test('reads PORT, STATE_DIR, A2UIVERSE_CARD_TIMEOUT_SECONDS, A2UIVERSE_SMOKE_TIMEOUT_SECONDS', () => {
    const config = loadConfig({
      PORT: '4242',
      STATE_DIR: '/tmp/market',
      A2UIVERSE_CARD_TIMEOUT_SECONDS: '0.5',
      A2UIVERSE_SMOKE_TIMEOUT_SECONDS: '120',
    });
    expect(config.port).toBe(4242);
    expect(config.stateDir).toBe('/tmp/market');
    expect(config.cardTimeoutMs).toBe(500);
    expect(config.smokeTimeoutMs).toBe(120_000);
  });

  test('a port or a timeout that is not a positive number is refused, naming the variable', () => {
    expect(() => loadConfig({PORT: 'x'})).toThrow('PORT');
    expect(() => loadConfig({A2UIVERSE_CARD_TIMEOUT_SECONDS: '-1'})).toThrow(
      'A2UIVERSE_CARD_TIMEOUT_SECONDS',
    );
    expect(() => loadConfig({A2UIVERSE_SMOKE_TIMEOUT_SECONDS: '0'})).toThrow(
      'A2UIVERSE_SMOKE_TIMEOUT_SECONDS',
    );
  });
});
