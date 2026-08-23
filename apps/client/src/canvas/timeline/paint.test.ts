/**
 * The paint vocabulary (tasks 8.3 + 8.4): one cause-derived phrase in two registers — the
 * bare history-list title and the decorated in-flight label — plus the per-entry title
 * fallback chain (agent title → cause phrase → humanized surface id).
 */
import {describe, it, expect} from 'vitest';
import type {A2uiClientAction} from '@a2ui/web_core/v0_9';
import type {PaintCause, PaintEntry} from './paint';
import {describeCause, entryTitle, titleOfCause} from './paint';

const action = (name: string, context: Record<string, unknown> = {}): A2uiClientAction => ({
  name,
  context,
  surfaceId: 'stage',
  sourceComponentId: 'root',
  timestamp: '2026-08-14T00:00:00Z',
});

const utterance = (text: string): PaintCause => ({
  kind: 'utterance',
  parent: null,
  forked: false,
  payload: {text},
});

const entry = (overrides: Partial<PaintEntry>): PaintEntry => ({
  paintId: 1,
  surfaceId: 'pull-request-list',
  catalogId: 'primer',
  cause: utterance('show my PRs'),
  paintedAt: 1000,
  snapshot: null,
  ...overrides,
});

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
        parent: 1,
        forked: false,
        payload: {action: action('open-issue', {number: 117})},
      }),
    ).toBe('open issue #117');
  });

  it('yields nothing for an empty action', () => {
    expect(
      titleOfCause({
        kind: 'surface-action',
        parent: 1,
        forked: false,
        payload: {action: action('')},
      }),
    ).toBe('');
  });

  it('labels an overlay answer by its question', () => {
    expect(
      titleOfCause({
        kind: 'overlay-answer',
        parent: 2,
        forked: false,
        payload: {question: 'Which repository?', answer: action('confirm')},
      }),
    ).toBe('answered “Which repository?”');
  });

  it('labels an overlay answer by the action when the question is unknown', () => {
    expect(
      titleOfCause({
        kind: 'overlay-answer',
        parent: 2,
        forked: false,
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
        parent: 1,
        forked: false,
        payload: {action: action('')},
      }),
    ).toBe('Generating…');
  });
});

describe('entryTitle', () => {
  it('prefers the agent-authored title when present', () => {
    expect(entryTitle(entry({title: 'Open PRs on a2ui'}))).toBe('Open PRs on a2ui');
  });

  it('falls back to the cause phrase', () => {
    expect(entryTitle(entry({}))).toBe('“show my PRs”');
  });

  it('falls back to the humanized surface id when the cause derives to nothing', () => {
    expect(
      entryTitle(
        entry({
          cause: {
            kind: 'surface-action',
            parent: 1,
            forked: false,
            payload: {action: action('')},
          },
        }),
      ),
    ).toBe('Pull request list');
  });
});
