/**
 * The page's Markdown renderer draws the subset the basic catalog's `Text` promises: no HTML, no
 * links, no images.
 */
import {describe, expect, it} from 'vitest';
import {renderMarkdown} from './markdown';

describe('renderMarkdown', () => {
  it('draws emphasis, lists and paragraphs', async () => {
    const html = await renderMarkdown('**Free** shipping\n\n- one\n- two');
    expect(html).toContain('<strong>Free</strong>');
    expect(html).toContain('<li>one</li>');
    expect(html).toMatch(/^<p>/);
  });

  it('draws a link as its text and an image as its alt text', async () => {
    const html = await renderMarkdown(
      '[see the shop](https://shop.example) ![a lamp](https://shop.example/lamp.png) <https://shop.example>',
    );
    expect(html).not.toMatch(/<a\b|<img\b|href|src=/);
    expect(html).toContain('see the shop');
    expect(html).toContain('a lamp');
    expect(html).toContain('https://shop.example');
  });

  it('escapes HTML a string carries', async () => {
    const html = await renderMarkdown('<img src=x onerror="alert(1)"> and <b>bold</b>');
    expect(html).not.toMatch(/<img\b|<b>/);
    expect(html).toContain('&lt;img');
  });
});
