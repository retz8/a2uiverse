import {describe, expect, test} from 'vitest';
import {classifyTurn, unnamespaceAction} from '../src/composition/classify.js';
import {shellSurfaceId, slotNameFor} from '../src/composition/constants.js';
import {filterClientDataModel, vendorMetadata} from '../src/composition/partition.js';
import {outcomeToSlotState} from '../src/composition/state.js';
import {emptyTouches} from '../src/journal/surfaces.js';

describe('constants', () => {
  test('shell surface and slot names are derived, namespaced, stable', () => {
    expect(shellSurfaceId()).toBe('shell:main');
    expect(slotNameFor('gmail')).toBe('slot-gmail');
  });
});

describe('outcomeToSlotState', () => {
  const touched = {...emptyTouches(), created: ['github:s1']};
  test('failed and timeout fail the slot', () => {
    expect(outcomeToSlotState('failed', touched)).toBe('failed');
    expect(outcomeToSlotState('timeout', emptyTouches())).toBe('failed');
  });
  test('cancelled collapses', () => {
    expect(outcomeToSlotState('cancelled', touched)).toBe('collapsed');
  });
  test('clean completion with zero surfaces collapses; with surfaces it is left to the client', () => {
    expect(outcomeToSlotState('completed', emptyTouches())).toBe('collapsed');
    expect(outcomeToSlotState('completed', touched)).toBeUndefined();
  });
});

describe('classifyTurn', () => {
  const base = {kind: 'message' as const, messageId: 'm', role: 'user' as const};
  test('text is an utterance', () => {
    expect(classifyTurn({...base, parts: [{kind: 'text', text: 'catch me up'}]})).toEqual({
      kind: 'utterance',
      text: 'catch me up',
    });
  });
  test('an action part routes as an action with its namespaced surfaceId', () => {
    const data = {
      version: 'v0.9',
      action: {
        name: 'submit',
        surfaceId: 'github:s1',
        sourceComponentId: 'b',
        timestamp: 't',
        context: {},
      },
    };
    expect(classifyTurn({...base, parts: [{kind: 'data', data}]})).toEqual({
      kind: 'action',
      part: data,
      surfaceId: 'github:s1',
    });
  });
  test('a VALIDATION_FAILED error part classifies as clientError', () => {
    const data = {
      version: 'v0.9',
      error: {code: 'VALIDATION_FAILED', surfaceId: 'gmail:s2', path: '/x', message: 'bad'},
    };
    expect(classifyTurn({...base, parts: [{kind: 'data', data}]})).toEqual({
      kind: 'clientError',
      code: 'VALIDATION_FAILED',
      surfaceId: 'gmail:s2',
    });
  });
  test('nothing usable is unknown', () => {
    expect(classifyTurn({...base, parts: [{kind: 'text', text: '   '}]})).toEqual({
      kind: 'unknown',
    });
    expect(classifyTurn({...base, parts: []})).toEqual({kind: 'unknown'});
  });
});

describe('unnamespaceAction', () => {
  test('rewrites only the action surfaceId', () => {
    const data = {
      version: 'v0.9',
      action: {
        name: 'submit',
        surfaceId: 'github:s1',
        sourceComponentId: 'b',
        timestamp: 't',
        context: {},
      },
    };
    const out = unnamespaceAction(data, 's1');
    expect((out.action as {surfaceId: string}).surfaceId).toBe('s1');
    expect((data.action as {surfaceId: string}).surfaceId).toBe('github:s1');
  });
});

describe('partition filter', () => {
  const metadata = {
    a2uiClientCapabilities: {'v0.9': {supportedCatalogIds: ['cat']}},
    a2uiClientDataModel: {
      version: 'v0.9',
      surfaces: {
        'github:s1': {a: 1},
        'gmail:s2': {b: 2},
        'un-namespaced': {c: 3},
      },
    },
    a2uiForkContext: {anything: true},
  };

  test('keeps only the owner surfaces, keys un-namespaced', () => {
    expect(filterClientDataModel(metadata, 'github')).toEqual({
      version: 'v0.9',
      surfaces: {s1: {a: 1}},
    });
  });

  test('empty partition filters to undefined', () => {
    expect(filterClientDataModel(metadata, 'calendar')).toBeUndefined();
    expect(filterClientDataModel(undefined, 'github')).toBeUndefined();
  });

  test('vendorMetadata carries only A2UI-standard keys with the filtered model', () => {
    const out = vendorMetadata(metadata, 'gmail');
    expect(out).toEqual({
      a2uiClientCapabilities: {'v0.9': {supportedCatalogIds: ['cat']}},
      a2uiClientDataModel: {version: 'v0.9', surfaces: {s2: {b: 2}}},
    });
  });

  test('vendorMetadata is undefined when nothing survives', () => {
    expect(vendorMetadata({a2uiForkContext: {x: 1}}, 'github')).toBeUndefined();
    expect(vendorMetadata(undefined, 'github')).toBeUndefined();
  });
});
