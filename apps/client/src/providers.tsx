import {useEffect, useState, type CSSProperties, type ReactNode} from 'react';
import {Theme} from '@radix-ui/themes';
import '@radix-ui/themes/styles.css';

const DARK = '(prefers-color-scheme: dark)';

/**
 * Follow the OS appearance. Radix resolves `inherit` against an ancestor rather than the
 * media query, so the shell reads it directly — and this is the one palette the shell
 * catalog's tokens map onto, which is what keeps orchestrator-painted surfaces and the
 * client's own chrome in the same appearance.
 */
function useSystemAppearance(): 'light' | 'dark' {
  const [appearance, setAppearance] = useState<'light' | 'dark'>(() =>
    typeof window !== 'undefined' && window.matchMedia?.(DARK).matches ? 'dark' : 'light',
  );
  useEffect(() => {
    const query = window.matchMedia?.(DARK);
    if (!query) return;
    const onChange = () => setAppearance(query.matches ? 'dark' : 'light');
    query.addEventListener('change', onChange);
    return () => query.removeEventListener('change', onChange);
  }, []);
  return appearance;
}

/**
 * A button of the shell's shows the pointer, as every other pressable thing on the canvas does:
 * Radix's own cursor token, left at `default` by Radix (task-9.9 decision 24). The shell
 * catalog's Provider sets the same on its own Theme.
 */
const CURSORS = {'--cursor-button': 'pointer'} as CSSProperties;

/** The shell's design system: Radix Themes. Vendor fragments bring their own (see `catalogs/`). */
export function Providers({children}: {children: ReactNode}) {
  return (
    <Theme appearance={useSystemAppearance()} style={CURSORS}>
      {children}
    </Theme>
  );
}
