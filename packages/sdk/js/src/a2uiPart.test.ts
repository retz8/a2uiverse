import {describe, expect, test} from 'vitest';
import {
  A2UI_MIME_TYPE,
  A2UI_SHELL_MIME_TYPE,
  a2uiMessagesIn,
  a2uiPart,
  shellPart,
  withA2uiMessages,
} from './a2uiPart';

const create = {version: 'v0.9', createSurface: {surfaceId: 's', catalogId: 'c'}};
const remove = {version: 'v0.9.1', deleteSurface: {surfaceId: 's'}};

describe('a2uiMessagesIn', () => {
  test('one message object is read', () => {
    expect(a2uiMessagesIn(create)).toEqual([create]);
  });

  test('a bare list is read, each entry judged on its own', () => {
    const unspoken = {version: 'v0.8', beginRendering: {surfaceId: 's'}};
    expect(a2uiMessagesIn([create, remove])).toEqual([create, remove]);
    expect(a2uiMessagesIn([create, {noVersion: true}, 'text', null, [remove], unspoken])).toEqual([
      create,
      unspoken,
    ]);
    expect(a2uiMessagesIn([])).toEqual([]);
  });

  test('an object holding a messages list is not read', () => {
    expect(a2uiMessagesIn({messages: [create, remove]})).toEqual([]);
  });

  test('any other body carries none', () => {
    expect(a2uiMessagesIn({paintMeta: {surfaceId: 's'}})).toEqual([]);
    expect(a2uiMessagesIn({version: 9, createSurface: {surfaceId: 's'}})).toEqual([]);
    expect(a2uiMessagesIn('text')).toEqual([]);
    expect(a2uiMessagesIn(null)).toEqual([]);
    expect(a2uiMessagesIn(undefined)).toEqual([]);
  });
});

describe('withA2uiMessages', () => {
  const renamed = (message: Record<string, unknown>) => ({...message, renamed: true});

  test('one message is replaced, a list entry by entry, in the form it came in', () => {
    expect(withA2uiMessages(create, renamed)).toEqual({...create, renamed: true});
    const other = {paintMeta: {surfaceId: 's'}};
    expect(withA2uiMessages([create, other, remove], renamed)).toEqual([
      {...create, renamed: true},
      other,
      {...remove, renamed: true},
    ]);
  });

  test('data carrying no message, or left as it was, is handed back itself', () => {
    const meta = {paintMeta: {surfaceId: 's'}};
    const wrapped = {messages: [create]};
    const list = [create, remove];
    expect(withA2uiMessages(meta, renamed)).toBe(meta);
    expect(withA2uiMessages(wrapped, renamed)).toBe(wrapped);
    expect(withA2uiMessages('text', renamed)).toBe('text');
    expect(withA2uiMessages(list, message => message)).toBe(list);
    expect(withA2uiMessages(create, message => message)).toBe(create);
  });
});

describe('the parts the platform writes', () => {
  test('an A2UI part is one message, marked application/a2ui+json in both fields', () => {
    expect(A2UI_MIME_TYPE).toBe('application/a2ui+json');
    expect(a2uiPart(create)).toEqual({
      content: {$case: 'data', value: create},
      metadata: {mimeType: 'application/a2ui+json'},
      filename: '',
      mediaType: 'application/a2ui+json',
    });
  });

  test('the mark is the same whatever A2UI version the message is stamped', () => {
    expect(a2uiPart(remove).mediaType).toBe('application/a2ui+json');
    expect(a2uiPart(remove).metadata).toEqual({mimeType: 'application/a2ui+json'});
  });

  test("a part of the A2UIVerse extension's own is marked application/a2ui-shell+json in both fields", () => {
    expect(A2UI_SHELL_MIME_TYPE).toBe('application/a2ui-shell+json');
    const body = {paintMeta: {surfaceId: 'shell:main', title: 'Inbox'}};
    expect(shellPart(body)).toEqual({
      content: {$case: 'data', value: body},
      metadata: {mimeType: 'application/a2ui-shell+json'},
      filename: '',
      mediaType: 'application/a2ui-shell+json',
    });
  });
});
