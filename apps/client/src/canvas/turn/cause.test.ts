/**
 * The cause vocabulary: one cause-derived phrase in two registers — the bare title and the
 * decorated in-flight label.
 */
import {describe, it, expect} from 'vitest';
import type {A2uiClientAction} from '@a2ui/web_core/v0_9';
import type {PaintCause} from './cause';
import {describeCause, titleOfCause, truncateUtterance} from './cause';

const action = (name: string, context: Record<string, unknown> = {}): A2uiClientAction => ({
  name,
  context,
  surfaceId: 'stage',
  sourceComponentId: 'root',
  timestamp: '2026-08-14T00:00:00Z',
});

const utterance = (text: string): PaintCause => ({kind: 'utterance', payload: {text}});

describe('titleOfCause', () => {
  it('quotes an utterance', () => {
    expect(titleOfCause(utterance('show my PRs'))).toBe('“show my PRs”');
  });

  it('truncates a long utterance', () => {
    const title = titleOfCause(utterance('a'.repeat(80)));
    expect(title.length).toBeLessThan(60);
    expect(title).toMatch(/…”$/);
  });

  it('labels a surface action by its subject', () => {
    expect(
      titleOfCause({
        kind: 'surface-action',
        payload: {action: action('open-issue', {number: 117})},
      }),
    ).toBe('open issue #117');
  });

  it('yields nothing for an empty action', () => {
    expect(
      titleOfCause({
        kind: 'surface-action',
        payload: {action: action('')},
      }),
    ).toBe('');
  });

  it('labels an overlay answer by its question', () => {
    expect(
      titleOfCause({
        kind: 'overlay-answer',
        payload: {question: 'Which repository?', answer: action('confirm')},
      }),
    ).toBe('answered “Which repository?”');
  });

  it('labels an overlay answer by the action when the question is unknown', () => {
    expect(
      titleOfCause({
        kind: 'overlay-answer',
        payload: {answer: action('confirm')},
      }),
    ).toBe('confirm');
  });
});

describe('describeCause', () => {
  it('decorates the bare phrase as activity', () => {
    expect(describeCause(utterance('show my PRs'))).toBe('“show my PRs” — generating…');
  });

  it('falls back to a generic label when the cause derives to nothing', () => {
    expect(
      describeCause({
        kind: 'surface-action',
        payload: {action: action('')},
      }),
    ).toBe('Generating…');
  });
});

describe('truncateUtterance', () => {
  it('leaves a short question alone and cuts a long one with an ellipsis', () => {
    expect(truncateUtterance('show my PRs')).toBe('show my PRs');
    const cut = truncateUtterance('a'.repeat(80));
    expect(cut).toHaveLength(49);
    expect(cut.endsWith('…')).toBe(true);
  });
});
