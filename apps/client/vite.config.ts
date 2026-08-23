import react from '@vitejs/plugin-react';
import {configDefaults, defineConfig} from 'vitest/config';

export default defineConfig({
  plugins: [react()],
  // `@primer/react`'s AnchoredOverlay CSS uses `@position-try` (CSS anchor positioning), which
  // the lightningcss version Vite bundles does not recognise — it throws "Unknown at rule"
  // rather than warning, failing the production build outright. Error recovery keeps the build
  // alive; the rules survive into the bundle. Remove once lightningcss understands the at-rule.
  css: {lightningcss: {errorRecovery: true}},
  resolve: {
    // `primer-a2ui-adapter` is a `link:` dependency, so its peers resolve from its own
    // `node_modules`; dedupe so one copy of React, the A2UI runtime and Primer serves both.
    dedupe: [
      'react',
      'react-dom',
      '@a2ui/react',
      '@a2ui/web_core',
      '@primer/react',
      '@primer/octicons-react',
      'zod',
    ],
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/setupTests.ts'],
    exclude: [...configDefaults.exclude, 'e2e/**'],
    server: {
      // Inline Primer so Vite transforms its internal CSS imports
      // (otherwise externalized .css hits Node's loader and throws).
      deps: {inline: ['@primer/react']},
    },
  },
});
