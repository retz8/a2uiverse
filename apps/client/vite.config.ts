import react from '@vitejs/plugin-react';
import {configDefaults, defineConfig} from 'vitest/config';

export default defineConfig({
  plugins: [react()],
  // A catalog linked from a2uiverse-apps to work on it locally resolves its peers from its own
  // `node_modules`; dedupe so one copy of React and the A2UI runtime serves the page.
  resolve: {dedupe: ['react', 'react-dom', '@a2ui/react', '@a2ui/web_core']},
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
      deps: {
        inline: [
          'github-catalog',
          'gmail-catalog',
          'calendar-catalog',
          'circleci-catalog',
          'linear-catalog',
          'shop-a-catalog',
          'shop-b-catalog',
          '@primer/react',
        ],
      },
    },
  },
});
