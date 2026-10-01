import {createReadStream, existsSync, statSync} from 'node:fs';
import {extname, join, normalize, sep} from 'node:path';
import react from '@vitejs/plugin-react';
import type {Plugin} from 'vite';
import {configDefaults, defineConfig} from 'vitest/config';
import {REGISTRY_SNAPSHOT_DIR} from '@a2uiverse/registry-snapshot';

const CONTENT_TYPES: Record<string, string> = {
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json',
  '.woff2': 'font/woff2',
  '.woff': 'font/woff',
  '.ttf': 'font/ttf',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
};

/**
 * The registry snapshot over `orchestratorApi` (task-11.5 decision 11): with
 * `A2UIVERSE_REGISTRY_SNAPSHOT` set, the preview server serves the snapshot under `/registry` as
 * the orchestrator serves its registry — the table, and each artifact's files as immutable
 * content — so e2e's build, pointed at the preview's own origin, loads every catalog the way the
 * page does in life.
 */
function registrySnapshot(): Plugin {
  return {
    name: 'a2uiverse-registry-snapshot',
    configurePreviewServer(server) {
      if (!process.env.A2UIVERSE_REGISTRY_SNAPSHOT) return;
      server.middlewares.use('/registry', (req, res, next) => {
        const path = normalize(decodeURIComponent((req.url ?? '/').split('?')[0]!));
        const file = join(REGISTRY_SNAPSHOT_DIR, path);
        if (!file.startsWith(REGISTRY_SNAPSHOT_DIR + sep) || !existsSync(file)) return next();
        if (!statSync(file).isFile()) return next();
        res.setHeader('Content-Type', CONTENT_TYPES[extname(file)] ?? 'application/octet-stream');
        res.setHeader(
          'Cache-Control',
          path.startsWith(`${sep}artifacts${sep}`)
            ? 'public, max-age=31536000, immutable'
            : 'no-cache',
        );
        createReadStream(file).pipe(res);
      });
    },
  };
}

export default defineConfig({
  plugins: [react(), registrySnapshot()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/setupTests.ts'],
    exclude: [...configDefaults.exclude, 'e2e/**'],
  },
});
