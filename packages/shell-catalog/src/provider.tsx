import {createContext, useContext, useState, type ReactNode} from 'react';
import {Theme, ThemeContext} from '@radix-ui/themes';
import './radix-themes.scoped.css';

/**
 * Where the bundle's floating content mounts: a portal root inside the Provider's
 * wrapper, so a popover opened by a shell component stays inside the bundle
 * boundary (SPEC §9.2 — "anchors any portal root") and the scoped stylesheet
 * reaches it. `null` until the anchor has mounted; a consumer then falls back to
 * Radix's default for that first render.
 */
export const PortalRootContext = createContext<HTMLElement | null>(null);

/**
 * The Theme the shell fixes when there is no host Theme to inherit from: Radix's own defaults,
 * stated. Under a host Theme none of these are set, so the shell's components read the host's
 * accent, gray, radius and scaling and the shell matches the page it is on.
 */
const STANDALONE_THEME = {accentColor: 'indigo', grayColor: 'slate'} as const;

/**
 * The bundle's one Provider and one CSS setup (SPEC §9.2): a Radix `Theme`
 * scoped to its own wrapper, bringing Radix Themes' stylesheet as a scoped copy
 * (`scripts/scope-radix.mjs` rewrites Radix's `:root` onto this wrapper), painting
 * no background of its own, anchoring a portal root after its content. The host's
 * appearance is read from its Theme and set explicitly, because the scoped sheet
 * declares the light tokens on the wrapper itself and only an explicit `dark`
 * class on the same element outranks them; with no host the Provider is light.
 * `asChild` folds the Theme onto the wrapper so there is one element, and
 * `display: contents` keeps that element out of layout — inherited properties and
 * custom properties still cascade. Radix Themes is the whole of what it brings:
 * every component of the catalog renders on it (task-5.9 decision 2), so there is
 * no token vocabulary of the shell's own for the wrapper to carry.
 */
export function Provider({children}: {children: ReactNode}) {
  const host = useContext(ThemeContext);
  const appearance = host?.appearance === 'dark' ? 'dark' : 'light';
  const [portalRoot, setPortalRoot] = useState<HTMLElement | null>(null);
  return (
    <Theme
      asChild
      appearance={appearance}
      hasBackground={false}
      {...(host ? {} : STANDALONE_THEME)}
    >
      <div className="a2uiverse-shell-catalog" style={{display: 'contents'}}>
        <PortalRootContext.Provider value={portalRoot}>{children}</PortalRootContext.Provider>
        <div data-a2uiverse-portal-root="" ref={setPortalRoot} style={{display: 'contents'}} />
      </div>
    </Theme>
  );
}
