import {describe, expect, test} from 'vitest';
import {loadConfig} from '../src/config.js';

describe('loadConfig — synthesizer (task 4.4)', () => {
  test('the Synthesizer follows the Planner model by default, at low effort', () => {
    const config = loadConfig({A2UIVERSE_PLANNER_MODEL: 'gemini-x'});
    expect(config.synthesizerModelId).toBe('gemini-x');
    expect(config.synthesizerEffort).toBe('low');
  });
  test('unset, the Planner (task 7.8) and the Synthesizer (task 7.13) run on gemini-3.7-flash, the Synthesizer at low effort', () => {
    const config = loadConfig({});
    expect(config.plannerModelId).toBe('gemini-3.7-flash');
    expect(config.synthesizerModelId).toBe('gemini-3.7-flash');
    expect(config.synthesizerEffort).toBe('low');
  });
  test('reads A2UIVERSE_SYNTHESIZER_MODEL and A2UIVERSE_SYNTHESIZER_EFFORT', () => {
    const config = loadConfig({
      A2UIVERSE_SYNTHESIZER_MODEL: 'gemini-y',
      A2UIVERSE_SYNTHESIZER_EFFORT: 'default',
    });
    expect(config.synthesizerModelId).toBe('gemini-y');
    expect(config.synthesizerEffort).toBe('default');
    expect(() => loadConfig({A2UIVERSE_SYNTHESIZER_EFFORT: 'max'})).toThrow(
      'A2UIVERSE_SYNTHESIZER_EFFORT',
    );
  });
});

describe('loadConfig', () => {
  test('defaults: port 10001, base URL derived from port, debug ids off, the state directory', () => {
    const config = loadConfig({});
    expect(config.port).toBe(10001);
    expect(config.baseUrl).toBe('http://localhost:10001');
    expect(config.debugIds).toBe(false);
    expect(config.stateDir.endsWith('.state')).toBe(true);
  });

  test('reads PORT, BASE_URL, STATE_DIR, A2UIVERSE_DEBUG_IDS', () => {
    const config = loadConfig({
      PORT: '4242',
      BASE_URL: 'https://x-4242.asse.devtunnels.ms',
      STATE_DIR: '/tmp/state',
      A2UIVERSE_DEBUG_IDS: 'true',
    });
    expect(config.port).toBe(4242);
    expect(config.baseUrl).toBe('https://x-4242.asse.devtunnels.ms');
    expect(config.stateDir).toBe('/tmp/state');
    expect(config.debugIds).toBe(true);
  });

  test('the roster’s variables are gone: the orchestrator boots from its registry alone (task-11.4 decision 16)', () => {
    const config = loadConfig({
      A2UIVERSE_AGENTS_DIR: '../a2uiverse-apps',
      A2UIVERSE_AGENT_URLS: '{"github":"http://localhost:10002"}',
    });
    expect(config).not.toHaveProperty('agentsDir');
    expect(config).not.toHaveProperty('agentUrls');
  });

  test('a non-integer PORT names the key in its error', () => {
    expect(() => loadConfig({PORT: 'abc'})).toThrow('PORT');
  });
});

describe('loadConfig — deadlines and the fault map (task 8.3)', () => {
  test('unset, the soft deadline is 10 s and the hard cap 300 s, and no fault is set', () => {
    const config = loadConfig({});
    expect(config.softDeadlineMs).toBe(10_000);
    expect(config.hardCapMs).toBe(300_000);
    expect(config.faults.size).toBe(0);
  });
  test('both lengths are read in seconds, fractions allowed; nonsense fails boot naming the variable', () => {
    const config = loadConfig({
      A2UIVERSE_SOFT_DEADLINE_SECONDS: '0.5',
      A2UIVERSE_HARD_CAP_SECONDS: '12',
    });
    expect(config.softDeadlineMs).toBe(500);
    expect(config.hardCapMs).toBe(12_000);
    expect(() => loadConfig({A2UIVERSE_HARD_CAP_SECONDS: '0'})).toThrow(
      'A2UIVERSE_HARD_CAP_SECONDS',
    );
    expect(() => loadConfig({A2UIVERSE_SOFT_DEADLINE_SECONDS: 'soon'})).toThrow(
      'A2UIVERSE_SOFT_DEADLINE_SECONDS',
    );
  });
  test('A2UIVERSE_FAULTS is JSON keyed by app id; each fault is checked', () => {
    const {faults} = loadConfig({
      A2UIVERSE_FAULTS: JSON.stringify({
        github: {fault: 'delay', seconds: 40},
        circleci: {fault: 'fail', message: 'Project not found', seconds: 2, every: true},
        linear: {fault: 'hang'},
      }),
    });
    expect(faults.get('github')).toEqual({fault: 'delay', seconds: 40});
    expect(faults.get('circleci')).toEqual({
      fault: 'fail',
      message: 'Project not found',
      seconds: 2,
      every: true,
    });
    expect(faults.get('linear')).toEqual({fault: 'hang'});
    const bad = (value: unknown) => () => loadConfig({A2UIVERSE_FAULTS: JSON.stringify(value)});
    expect(bad({github: {fault: 'explode'}})).toThrow('A2UIVERSE_FAULTS.github.fault');
    expect(bad({github: {fault: 'delay'}})).toThrow('A2UIVERSE_FAULTS.github.seconds');
    expect(bad({github: {fault: 'hang', message: 'x'}})).toThrow('A2UIVERSE_FAULTS.github.message');
    expect(bad({github: {fault: 'hang', when: 1}})).toThrow('unknown field');
    expect(() => loadConfig({A2UIVERSE_FAULTS: '{'})).toThrow('A2UIVERSE_FAULTS: invalid JSON');
  });
});
