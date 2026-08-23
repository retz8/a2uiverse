import {describe, it, expect} from 'vitest';
import type {A2uiClientAction} from '@a2ui/web_core/v0_9';
import {describeAction} from './describeAction';

const action = (a: {name?: string; context?: Record<string, unknown>}) =>
  ({surfaceId: 's', sourceComponentId: 'c', ...a}) as unknown as A2uiClientAction;

describe('describeAction', () => {
  it('humanizes the action name and appends a numeric context value as an id', () => {
    expect(describeAction(action({name: 'open-issue', context: {number: 117}}))).toBe(
      'open issue #117',
    );
  });

  it('appends a string context value verbatim', () => {
    expect(describeAction(action({name: 'submit', context: {label: 'bug'}}))).toBe('submit bug');
  });

  it('uses just the humanized name when there is no scalar context', () => {
    expect(describeAction(action({name: 'refresh', context: {}}))).toBe('refresh');
  });

  it('splits on underscores too', () => {
    expect(describeAction(action({name: 'view_pr', context: {id: 42}}))).toBe('view pr #42');
  });

  it('takes the first scalar and skips non-scalar context values', () => {
    expect(describeAction(action({name: 'go', context: {rows: [1, 2], number: 9}}))).toBe('go #9');
  });

  it('returns empty when nothing is derivable', () => {
    expect(describeAction(action({name: '', context: {}}))).toBe('');
  });
});
