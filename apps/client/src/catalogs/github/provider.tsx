/**
 * The GitHub catalog's provider: Primer's theme + base styles around the surface mount, and
 * Primer's token stylesheets loaded on the first mount. Nothing Primer reaches the page until
 * a GitHub surface renders — the shell is Radix; Primer is scoped to the fragment. The
 * stylesheets are page-global custom properties once loaded (accepted in Phase 1). This module
 * moves into the `github-catalog` bundle at 1.5.
 */
import {useEffect, type ReactNode} from 'react';
import {BaseStyles, ThemeProvider} from '@primer/react';

let tokensLoaded: Promise<unknown> | null = null;

/**
 * Primer functional color tokens (--fgColor-*, etc.) and base motion tokens (--base-duration-*).
 * ThemeProvider sets the data-color-mode attributes these are scoped to, but the custom
 * properties ship as CSS in @primer/primitives; without the color tokens Icon fills compute to
 * black, without the motion tokens Spinner's animation shorthand is dropped.
 */
function loadPrimerTokens() {
  tokensLoaded ??= Promise.all([
    import('@primer/primitives/dist/css/functional/themes/light.css'),
    import('@primer/primitives/dist/css/functional/themes/dark.css'),
    import('@primer/primitives/dist/css/base/motion/motion.css'),
  ]);
  return tokensLoaded;
}

export function GitHubCatalogProvider({children}: {children: ReactNode}) {
  useEffect(() => {
    void loadPrimerTokens();
  }, []);
  return (
    <ThemeProvider>
      <BaseStyles>{children}</BaseStyles>
    </ThemeProvider>
  );
}
