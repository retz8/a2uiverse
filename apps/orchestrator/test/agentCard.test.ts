import {describe, expect, test} from 'vitest';
import {A2UI_EXTENSION_URIS, A2UI_VERSIONS} from '@a2uiverse/sdk';
import {buildAgentCard} from '../src/agentCard.js';

describe('buildAgentCard', () => {
  const card = buildAgentCard('https://x-10001.asse.devtunnels.ms');

  test('advertises the given base URL over JSON-RPC with streaming', () => {
    expect(card.url).toBe('https://x-10001.asse.devtunnels.ms');
    expect(card.preferredTransport).toBe('JSONRPC');
    expect(card.capabilities.streaming).toBe(true);
    expect(card.protocolVersion).toBe('0.3.0');
  });

  test('declares one bare A2UI extension entry per version the platform speaks, none required (task-19.2 decision 5)', () => {
    const extensions = card.capabilities.extensions ?? [];
    expect(extensions.map(e => e.uri)).toEqual(A2UI_VERSIONS.map(v => A2UI_EXTENSION_URIS[v]));
    for (const [i, ext] of extensions.entries()) {
      expect(ext.params).toBeUndefined();
      expect(ext.required).toBe(false);
      expect(ext.description).toContain(A2UI_VERSIONS[i]);
    }
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
