/** The shared tagged-block extractor (task-6.3 decision 10). */
import {describe, expect, test} from 'vitest';
import {extractTaggedBlock} from '../src/authoring/taggedBlock.js';

describe('extractTaggedBlock', () => {
  const tag = 'synthesize-data-model';
  const doc = '{"declined": true, "reason": "r"}';

  test('reads the one block, trimmed, tolerating prose around it', () => {
    const text = `Here you go.\n<${tag}>\n${doc}\n</${tag}>\nDone.`;
    expect(extractTaggedBlock(text, tag)).toEqual({ok: true, body: doc});
  });

  test('no block, an unclosed block, an empty block and two blocks are each an error', () => {
    expect(extractTaggedBlock(doc, tag).ok).toBe(false);
    expect(extractTaggedBlock(`<${tag}>${doc}`, tag).ok).toBe(false);
    expect(extractTaggedBlock(`<${tag}>  </${tag}>`, tag).ok).toBe(false);
    const twice = `<${tag}>${doc}</${tag}><${tag}>${doc}</${tag}>`;
    expect(extractTaggedBlock(twice, tag)).toMatchObject({
      ok: false,
      error: expect.stringContaining('one'),
    });
  });

  test('reads only its own tag: never an a2ui-json block', () => {
    expect(extractTaggedBlock(`<a2ui-json>[]</a2ui-json>`, tag).ok).toBe(false);
    expect(extractTaggedBlock(`<other>${doc}</other>`, 'other')).toEqual({ok: true, body: doc});
  });
});
