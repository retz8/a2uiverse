import {createContext, useContext, useState, type CSSProperties, type ReactNode} from 'react';
import {Theme, ThemeContext} from '@radix-ui/themes';
import './radix-themes.scoped.css';

/**
 * The shell catalog's `--a2ui-*` values, bound to Radix Themes variables with
 * explicit fallbacks. Written only on the Provider's own wrapper — never
 * `:root` — so composition with other catalogs stays collision-free.
 *
 * Only base tokens are bound; the basic catalog derives `-light`/`-dark`/`-hover`
 * variants via `color-mix()` over these at the point of use.
 */
export const SHELL_TOKENS = {
  '--a2ui-color-background': 'var(--color-background, #ffffff)',
  '--a2ui-color-on-background': 'var(--gray-12, #1c2024)',
  '--a2ui-color-surface': 'var(--color-panel-solid, #f9f9fb)',
  '--a2ui-color-on-surface': 'var(--gray-12, #1c2024)',
  '--a2ui-color-primary': 'var(--accent-9, #3e63dd)',
  '--a2ui-color-on-primary': 'var(--accent-contrast, #ffffff)',
  '--a2ui-color-secondary': 'var(--gray-4, #e8e8ec)',
  '--a2ui-color-on-secondary': 'var(--gray-12, #1c2024)',
  '--a2ui-color-border': 'var(--gray-6, #d9d9e0)',
  '--a2ui-color-input': 'var(--color-surface, #ffffff)',
  '--a2ui-color-on-input': 'var(--gray-12, #1c2024)',
  '--a2ui-border-radius': 'var(--radius-3, 6px)',
} as const satisfies Record<`--a2ui-${string}`, string>;

/**
 * Where the bundle's floating content mounts: a portal root inside the Provider's
 * wrapper, so a popover opened by a shell component stays inside the bundle
 * boundary (SPEC §9.2 — "anchors any portal root") and the scoped stylesheet
 * reaches it. `null` until the anchor has mounted; a consumer then falls back to
 * Radix's default for that first render.
 */
export const PortalRootContext = createContext<HTMLElement | null>(null);

/**
 * The bundle's one Provider and one CSS setup (SPEC §9.2): a Radix `Theme`
 * scoped to its own wrapper, bringing Radix Themes' stylesheet as a scoped copy
 * (`scripts/scope-radix.mjs` rewrites Radix's `:root` onto this wrapper), painting
 * no background of its own, anchoring a portal root after its content. The host's
 * appearance is read from its Theme and set explicitly, because the scoped sheet
 * declares the light tokens on the wrapper itself and only an explicit `dark`
 * class on the same element outranks them; with no host the Provider is light.
 * `asChild` folds the Theme onto the token wrapper so there is one element, and
 * `display: contents` keeps that element out of layout — inherited properties and
 * custom properties still cascade.
 */
export function Provider({children}: {children: ReactNode}) {
  const host = useContext(ThemeContext)?.appearance;
  const appearance = host === 'dark' ? 'dark' : 'light';
  const [portalRoot, setPortalRoot] = useState<HTMLElement | null>(null);
  return (
    <Theme asChild appearance={appearance} hasBackground={false}>
      <div
        className="a2uiverse-shell-catalog"
        style={{display: 'contents', ...SHELL_TOKENS} as CSSProperties}
      >
        <PortalRootContext.Provider value={portalRoot}>{children}</PortalRootContext.Provider>
        <div data-a2uiverse-portal-root="" ref={setPortalRoot} style={{display: 'contents'}} />
      </div>
    </Theme>
  );
}
