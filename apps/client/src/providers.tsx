import type {ReactNode} from 'react';
import {Theme} from '@radix-ui/themes';
import '@radix-ui/themes/styles.css';

/** The shell's design system: Radix Themes. Vendor fragments bring their own (see `catalogs/`). */
export function Providers({children}: {children: ReactNode}) {
  return <Theme>{children}</Theme>;
}
