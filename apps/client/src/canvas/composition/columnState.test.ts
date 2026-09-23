/**
 * A reserved column's state by its source (task-8.5 decision 12): the authored cells once in the
 * merge, unavailable once failed, loading while it loads, retries or is included, not included while
 * it waits for Include.
 */
import {describe, expect, it} from 'vitest';
import {createCanvasStore} from '../canvasStore';
import {columnState} from './columnState';

describe('columnState', () => {
  it('before a merge: loading until placed, then the authored cells; failed once failed', () => {
    const store = createCanvasStore();
    expect(columnState(store.getState(), 'circleci')).toBe('pending');
    store.placeFragment('circleci', {surfaceId: 'circleci:runs', source: 'circleci'});
    expect(columnState(store.getState(), 'circleci')).toBe('filled');
    store.mergeSlotStates(new Map([['github', 'failed' as const]]));
    expect(columnState(store.getState(), 'github')).toBe('failed');
  });

  it('a source in the merge draws its authored cells, whatever else holds', () => {
    const store = createCanvasStore();
    store.setMerge({merged: ['linear'], late: ['linear']});
    expect(columnState(store.getState(), 'linear')).toBe('filled');
  });

  it('a late source is not included; loading while an Include is pressed or runs', () => {
    const store = createCanvasStore();
    store.placeFragment('circleci', {surfaceId: 'circleci:runs', source: 'circleci'});
    store.setMerge({merged: ['linear'], late: ['circleci']});
    expect(columnState(store.getState(), 'circleci')).toBe('late');
    const key = store.addPress({kind: 'include', sources: ['circleci']});
    expect(columnState(store.getState(), 'circleci')).toBe('pending');
    store.removePress(key);
    store.setMerge({merged: ['linear'], working: {sources: ['circleci']}});
    expect(columnState(store.getState(), 'circleci')).toBe('pending');
  });

  it('a failed source reads loading again from its Retry’s press', () => {
    const store = createCanvasStore();
    store.setMerge({merged: ['linear']});
    store.mergeSlotStates(new Map([['circleci', 'failed' as const]]));
    expect(columnState(store.getState(), 'circleci')).toBe('failed');
    store.addPress({kind: 'retry', sources: ['circleci']});
    expect(columnState(store.getState(), 'circleci')).toBe('pending');
  });

  it('a source that answered in words keeps the authored cells', () => {
    const store = createCanvasStore();
    store.setMerge({merged: ['linear']});
    store.mergeSlotStates(new Map([['gmail', 'collapsed' as const]]));
    expect(columnState(store.getState(), 'gmail')).toBe('collapsed');
  });
});
