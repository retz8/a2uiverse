import {describe, expect, test} from 'vitest';
import {A2UI_EXTENSION_URI_V091, buildAgentCard} from '../src/agentCard.js';

describe('buildAgentCard', () => {
  const card = buildAgentCard('https://x-10001.asse.devtunnels.ms');

  test('advertises the given base URL over JSON-RPC with streaming', () => {
    expect(card.url).toBe('https://x-10001.asse.devtunnels.ms');
    expect(card.preferredTransport).toBe('JSONRPC');
    expect(card.capabilities.streaming).toBe(true);
    expect(card.protocolVersion).toBe('0.3.0');
  });

  test('declares the A2UI v0.9.1 extension with no params', () => {
    const ext = card.capabilities.extensions?.find(e => e.uri === A2UI_EXTENSION_URI_V091);
    expect(ext).toBeDefined();
    expect(ext?.params).toBeUndefined();
  });

  test('is minimal: one generic palette skill, no union of app skills', () => {
    expect(card.skills.map(s => s.id)).toEqual(['palette']);
    expect(card.name).toBe('A2UIVerse Orchestrator');
  });
});
