import type {AgentCard} from '@a2a-js/sdk';
import {MockLanguageModelV3} from 'ai/test';
import {describe, expect, test} from 'vitest';
import {checkPlan, MalformedPlanError} from '../src/planner/checkPlan.js';
import {ModelPlanner} from '../src/planner/planner.js';
import {plannerProviderOptions} from '../src/planner/getModel.js';
import {plannerPrompt} from '../src/planner/prompt.js';
import type {Plan} from '../src/planner/planSchema.js';
import type {ShortlistEntry} from '../src/router/router.js';

function entry(appId: string, name: string, description: string): ShortlistEntry {
  const card: AgentCard = {
    name,
    description,
    version: '0.0.0',
    protocolVersion: '0.3.0',
    url: 'http://127.0.0.1:0',
    preferredTransport: 'JSONRPC',
    capabilities: {},
    defaultInputModes: ['text'],
    defaultOutputModes: ['text'],
    skills: [{id: 's', name: `${name} skill`, description, tags: [], examples: [`ask ${name}`]}],
  };
  return {
    record: {
      id: appId,
      displayName: name,
      agentUrl: `http://localhost/${appId}`,
      authScheme: 'none',
      catalogId: `cat-${appId}`,
      catalogPackage: `${appId}-catalog`,
    },
    card,
    score: 1,
  };
}

const shortlist = [entry('github', 'GitHub', 'code'), entry('gmail', 'Gmail', 'mail')];

const goodPlan: Plan = {
  direction: 'row',
  groups: [
    {slots: [{appId: 'github', archetype: 'card', request: 'Show a compact card of open PRs.'}]},
    {slots: [{appId: 'gmail', archetype: 'panel', request: 'Show unread mail as a tall panel.'}]},
  ],
};

function modelReturning(text: string): MockLanguageModelV3 {
  return new MockLanguageModelV3({
    doGenerate: async () => ({
      finishReason: 'stop' as const,
      usage: {inputTokens: 1, outputTokens: 1, totalTokens: 2},
      content: [{type: 'text' as const, text}],
      warnings: [],
    }),
  });
}

describe('checkPlan', () => {
  const ids = ['github', 'gmail'];
  test('accepts a reasonable plan', () => {
    expect(() => checkPlan(goodPlan, ids)).not.toThrow();
  });
  test('rejects no groups', () => {
    expect(() => checkPlan({direction: 'row', groups: []}, ids)).toThrow(MalformedPlanError);
  });
  test('rejects an empty group', () => {
    expect(() => checkPlan({direction: 'row', groups: [{slots: []}]}, ids)).toThrow('empty group');
  });
  test('rejects an off-shortlist appId', () => {
    const plan: Plan = {
      direction: 'row',
      groups: [{slots: [{appId: 'reddit', archetype: 'card', request: 'x'}]}],
    };
    expect(() => checkPlan(plan, ids)).toThrow("appId 'reddit' is not on the shortlist");
  });
  test('rejects a duplicated appId', () => {
    const plan: Plan = {
      direction: 'row',
      groups: [
        {slots: [{appId: 'github', archetype: 'card', request: 'x'}]},
        {slots: [{appId: 'github', archetype: 'panel', request: 'y'}]},
      ],
    };
    expect(() => checkPlan(plan, ids)).toThrow("appId 'github' appears twice");
  });
  test('rejects an empty request', () => {
    const plan: Plan = {
      direction: 'row',
      groups: [{slots: [{appId: 'github', archetype: 'card', request: '  '}]}],
    };
    expect(() => checkPlan(plan, ids)).toThrow("empty request for 'github'");
  });
});

describe('plannerPrompt', () => {
  test('carries the utterance and each card, never slot names', () => {
    const prompt = plannerPrompt({utterance: 'my day at a glance', shortlist});
    expect(prompt).toContain('my day at a glance');
    expect(prompt).toContain('appId: github');
    expect(prompt).toContain('GitHub skill');
    expect(prompt).toContain('ask Gmail');
    expect(prompt).not.toContain('slot-');
  });
});

describe('plannerProviderOptions', () => {
  test('low effort spends no thinking budget; default leaves the provider alone', () => {
    expect(plannerProviderOptions({effort: 'low'})).toEqual({
      google: {thinkingConfig: {thinkingBudget: 0}},
    });
    expect(plannerProviderOptions({effort: 'default'})).toBeUndefined();
  });
});

describe('ModelPlanner', () => {
  test('parses a schema-shaped plan and returns it', async () => {
    const planner = new ModelPlanner({model: modelReturning(JSON.stringify(goodPlan))});
    const plan = await planner.plan({utterance: 'catch me up', shortlist});
    expect(plan).toEqual(goodPlan);
  });

  test('malformed JSON is a broken turn', async () => {
    const planner = new ModelPlanner({model: modelReturning('not json at all')});
    await expect(planner.plan({utterance: 'x', shortlist})).rejects.toThrow();
  });

  test('a checklist violation is a broken turn', async () => {
    const offShortlist: Plan = {
      direction: 'row',
      groups: [{slots: [{appId: 'reddit', archetype: 'card', request: 'x'}]}],
    };
    const planner = new ModelPlanner({model: modelReturning(JSON.stringify(offShortlist))});
    await expect(planner.plan({utterance: 'x', shortlist})).rejects.toThrow(MalformedPlanError);
  });
});
