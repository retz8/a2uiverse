import {useEffect, useState} from 'react';
import {useMarkdownRenderer} from '@a2ui/react/v0_9';

/**
 * Body text through upstream's markdown contract (task-5.9 decision 4): `@a2ui/react` exposes a
 * `MarkdownContext` the host may fill with a renderer; this reads it and renders the text through
 * it when one is installed. With none installed the answer is `null` and the caller paints the
 * text plain — no warning, no renderer of the package's own. The rendered HTML is remembered
 * beside the text it came from, so a text change never paints the previous text's HTML while the
 * renderer is still running.
 */
export function useMarkdownHtml(text: string): string | null {
  const renderer = useMarkdownRenderer();
  const [rendered, setRendered] = useState<{text: string; html: string} | null>(null);

  useEffect(() => {
    if (!renderer) return;
    let active = true;
    renderer(text)
      .then(html => {
        if (active) setRendered({text, html});
      })
      .catch(() => {
        // A renderer that fails leaves the text plain; nothing else to do with the error here.
      });
    return () => {
      active = false;
    };
  }, [text, renderer]);

  return renderer && rendered?.text === text ? rendered.html : null;
}
