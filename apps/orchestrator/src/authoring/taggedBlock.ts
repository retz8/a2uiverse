/**
 * The one tagged-block extractor the orchestrator's authors share (task-6.3 decision 10): a model
 * that authors UI answers inside one tag of its own — never `<a2ui-json>`, whose client-side
 * extractor must never take this content — and the author reads that boundary back.
 */

export type TaggedBlock = {ok: true; body: string} | {ok: false; error: string};

/**
 * The body of the one `<tag>` block in a model's answer, trimmed. Text outside the block is
 * tolerated (models preface); no block, an unclosed block, an empty block, or several blocks is an
 * error the caller hands back to the model.
 */
export function extractTaggedBlock(text: string, tag: string): TaggedBlock {
  const open = `<${tag}>`;
  const close = `</${tag}>`;
  const start = text.indexOf(open);
  if (start < 0) return {ok: false, error: `no <${tag}> block in the answer`};
  const end = text.indexOf(close, start + open.length);
  if (end < 0) return {ok: false, error: `the <${tag}> block is not closed`};
  if (text.indexOf(open, end + close.length) >= 0) {
    return {ok: false, error: `more than one <${tag}> block; answer with exactly one`};
  }
  const body = text.slice(start + open.length, end).trim();
  if (body === '') return {ok: false, error: `the <${tag}> block is empty`};
  return {ok: true, body};
}
