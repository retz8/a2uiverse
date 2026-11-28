import {describe, expect, test} from 'vitest';
import {A2UI_EXTENSION_URI} from '@a2uiverse/sdk';
import {buildAgentCard} from '../src/agentCard.js';

describe('buildAgentCard', () => {
  const card = buildAgentCard('https://x-10001.asse.devtunnels.ms');

  test('lists one interface, A2A 1.0 over JSON-RPC at the given base URL, with streaming (phase-20 decision 3)', () => {
    expect(card.supportedInterfaces).toEqual([
      {
        url: 'https://x-10001.asse.devtunnels.ms',
        protocolBinding: 'JSONRPC',
        protocolVersion: '1.0',
        tenant: '',
      },
    ]);
    expect(card.capabilities?.streaming).toBe(true);
  });

  test('lists one A2UI entry, for v1.0, with no params, not required (task-21.13 decision 3)', () => {
    const extensions = card.capabilities?.extensions ?? [];
    expect(extensions.map(e => e.uri)).toEqual([A2UI_EXTENSION_URI]);
    expect(extensions[0]!.params).toBeUndefined();
    expect(extensions[0]!.required).toBe(false);
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
