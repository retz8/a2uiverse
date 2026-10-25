/**
 * The page's Markdown renderer, which `SurfaceFrame` hands every surface: body text in any catalog
 * renders the subset the basic catalog's `Text` promises — raw HTML escaped, a link as its text,
 * an image as its alt text. With HTML off, every tag in the output is markdown-it's own and no
 * link or image attribute survives, so nothing a vendor string carries reaches the page as markup.
 */
import MarkdownIt from 'markdown-it';
import type {MarkdownRenderer} from '@a2ui/web_core/v0_9/basic_catalog';

const md = new MarkdownIt({html: false, linkify: false, typographer: false});

md.renderer.rules.link_open = () => '';
md.renderer.rules.link_close = () => '';
md.renderer.rules.image = (tokens, idx, options, env, self) =>
  md.utils.escapeHtml(self.renderInlineAsText(tokens[idx].children ?? [], options, env));

/**
 * A text that is one paragraph comes back inline, as a plain text draws: web_core gives a paragraph
 * inside its `Text` a size and line height of its own. Several paragraphs, or a list, come back as
 * blocks.
 */
export const renderMarkdown: MarkdownRenderer = async markdown => {
  const env = {};
  const tokens = md.parse(markdown, env);
  if (
    tokens.length === 3 &&
    tokens[0].type === 'paragraph_open' &&
    tokens[2].type === 'paragraph_close'
  ) {
    return md.renderer.renderInline(tokens[1].children ?? [], md.options, env);
  }
  // markdown-it ends every block with a newline; the last one would sit in the text as a space.
  return md.renderer.render(tokens, md.options, env).trimEnd();
};
