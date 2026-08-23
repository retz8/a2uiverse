/**
 * Drives the REAL MessageProcessor (as detail-surface-repro.test.tsx does) so the
 * genuine "Surface already exists" throw is exercised, not a stand-in for it.
 */
import {describe, it, expect, vi, beforeEach, afterEach} from 'vitest';
import {MessageProcessor} from '@a2ui/web_core/v0_9';
import type {A2uiMessage} from '@a2ui/web_core/v0_9';
import {CATALOG} from 'primer-a2ui-adapter';
import {applyA2uiMessages} from './applyMessages';

const create = (surfaceId: string, catalogId: string = CATALOG.id): A2uiMessage =>
  ({version: 'v0.9', createSurface: {surfaceId, catalogId}}) as unknown as A2uiMessage;

const components = (surfaceId: string, comps: unknown[]): A2uiMessage =>
  ({
    version: 'v0.9',
    updateComponents: {surfaceId, root: 'root', components: comps},
  }) as unknown as A2uiMessage;

const data = (surfaceId: string, path: string, contents: unknown): A2uiMessage =>
  ({version: 'v0.9', updateDataModel: {surfaceId, path, contents}}) as unknown as A2uiMessage;

const text = (id: string, value: string) => ({id, component: 'Text', text: value});

function processor() {
  return new MessageProcessor([CATALOG], async () => {});
}

let errorSpy: ReturnType<typeof vi.spyOn>;
beforeEach(() => {
  errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
});
afterEach(() => {
  errorSpy.mockRestore();
});

describe('applyA2uiMessages — repaint on repeat createSurface', () => {
  it('repaints a re-created surface with a clean slate', () => {
    const p = processor();
    const onMessageError = vi.fn();

    applyA2uiMessages(p, [
      create('chat'),
      components('chat', [
        {id: 'root', component: 'Stack', children: ['a', 'b']},
        text('a', 'alpha'),
        text('b', 'beta'),
      ]),
      data('chat', '/', {x: 1, y: 2}),
    ]);
    const first = p.model.getSurface('chat');

    // Turn 2 re-creates the same id and deliberately does NOT redeclare 'b'.
    applyA2uiMessages(
      p,
      [
        create('chat'),
        components('chat', [{id: 'root', component: 'Stack', children: ['a']}, text('a', 'gamma')]),
        data('chat', '/x', 9),
      ],
      {onMessageError},
    );

    const second = p.model.getSurface('chat');
    expect(second).toBeDefined();
    expect(second).not.toBe(first); // a genuinely new SurfaceModel
    expect(second?.componentsModel.get('a')?.properties.text).toBe('gamma');
    expect(second?.componentsModel.get('b')).toBeUndefined(); // no stale component
    expect(second?.dataModel.get('/y')).toBeUndefined(); // no stale data
    expect(onMessageError).not.toHaveBeenCalled();
  });

  it('creates a surface normally when the id is new', () => {
    const p = processor();
    const onMessageError = vi.fn();

    applyA2uiMessages(p, [create('fresh')], {onMessageError});

    expect(p.model.getSurface('fresh')).toBeDefined();
    expect(onMessageError).not.toHaveBeenCalled();
  });

  it('treats a second create for the same id within one batch as a repaint', () => {
    const p = processor();
    const onMessageError = vi.fn();

    // The exists-check must be evaluated live per message, not precomputed per batch.
    applyA2uiMessages(
      p,
      [
        create('s'),
        components('s', [text('root', 'one')]),
        create('s'),
        components('s', [text('root', 'two')]),
      ],
      {onMessageError},
    );

    expect(p.model.getSurface('s')?.componentsModel.get('root')?.properties.text).toBe('two');
    expect(onMessageError).not.toHaveBeenCalled();
  });

  it('reports a repaint whose catalog is unknown, then keeps going', () => {
    const p = processor();
    const onMessageError = vi.fn();
    applyA2uiMessages(p, [create('chat'), components('chat', [text('root', 'alpha')])]);

    applyA2uiMessages(p, [create('chat', 'no-such-catalog'), create('other')], {
      onMessageError,
    });

    expect(onMessageError).toHaveBeenCalledTimes(1);
    // Documented, accepted consequence: the synthetic delete already ran.
    expect(p.model.getSurface('chat')).toBeUndefined();
    expect(p.model.getSurface('other')).toBeDefined(); // the batch kept going
  });
});

describe('applyA2uiMessages — per-message isolation', () => {
  it('does not let a rejected message cost the rest of the batch', () => {
    const p = processor();
    const onMessageError = vi.fn();
    const ghost = components('ghost', [text('root', 'nope')]);

    applyA2uiMessages(p, [ghost, create('chat'), components('chat', [text('root', 'survived')])], {
      onMessageError,
    });

    expect(onMessageError).toHaveBeenCalledTimes(1);
    expect(onMessageError.mock.calls[0][1]).toBe(ghost); // the failing message
    expect(p.model.getSurface('chat')?.componentsModel.get('root')?.properties.text).toBe(
      'survived',
    );
    expect(errorSpy).toHaveBeenCalled();
  });

  it('never throws, even with no error handler supplied', () => {
    const p = processor();

    expect(() => applyA2uiMessages(p, [components('ghost', [text('root', 'x')])])).not.toThrow();
  });
});
