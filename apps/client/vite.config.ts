import react from '@vitejs/plugin-react';
import {configDefaults, defineConfig} from 'vitest/config';

export default defineConfig({
  plugins: [react()],
  // `@primer/react`'s AnchoredOverlay CSS uses `@position-try` (CSS anchor positioning), which
  // the lightningcss version Vite bundles does not recognise — it throws "Unknown at rule"
  // rather than warning, failing the production build outright. Error recovery keeps the build
  // alive; the rules survive into the bundle. Remove once lightningcss understands the at-rule.
  css: {lightningcss: {errorRecovery: true}},
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/setupTests.ts'],
    exclude: [...configDefaults.exclude, 'e2e/**'],
    server: {
      // Inline the catalog bundles and the Primer github's ships so Vite transforms their
      // internal CSS imports (otherwise externalized .css hits Node's loader and throws).
      deps: {inline: ['github-catalog', 'gmail-catalog', 'calendar-catalog', '@primer/react']},
    },
  },
});
