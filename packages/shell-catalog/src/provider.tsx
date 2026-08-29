import type {CSSProperties, ReactNode} from 'react';

/**
 * The shell catalog's `--a2ui-*` values, bound to Radix Themes variables with
 * explicit fallbacks for headless rendering (no Radix ambient). Written only on
 * the Provider's own wrapper — never `:root` — so composition with other
 * catalogs stays collision-free.
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
 * Wraps every shell-catalog surface. `display: contents` keeps the wrapper out
 * of layout; custom properties still cascade to the subtree.
 */
export function Provider({children}: {children: ReactNode}) {
  return (
    <div
      className="a2uiverse-shell-catalog"
      style={{display: 'contents', ...SHELL_TOKENS} as CSSProperties}
    >
      {children}
    </div>
  );
}
