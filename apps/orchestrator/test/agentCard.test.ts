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

  test('carries the platform’s hand-authored skills beside palette, no union of app skills (phase-6 decision 1)', () => {
    expect(card.skills.map(s => s.id)).toEqual([
      'palette',
      'platform',
      'canvas',
      'installed-apps',
      'find-and-install',
      'publish',
    ]);
    expect(card.name).toBe('A2UIVerse Orchestrator');
    // Each platform skill carries examples: they are what the Router embeds and what lets the
    // Planner tell a platform question from a capability gap.
    for (const skill of card.skills.slice(1)) {
      expect(skill.examples?.length).toBeGreaterThan(0);
      expect(skill.description.length).toBeGreaterThan(40);
    }
    const text = JSON.stringify(card.skills);
    expect(text).not.toMatch(/github|gmail|calendar/i);
  });

  test('answers whether an app is out of date, and how an app is published (task-14.5 decision 12)', () => {
    const skill = (id: string) => card.skills.find(s => s.id === id)!;
    expect(skill('installed-apps').description).toMatch(/update/);
    expect(skill('installed-apps').examples).toContain('is anything out of date?');
    expect(skill('publish').description).toMatch(/Stellify/);
    expect(skill('publish').description).toMatch(/Publish/);
    expect(skill('publish').examples).toContain('how do I put my own app in the Store?');
  });
});
