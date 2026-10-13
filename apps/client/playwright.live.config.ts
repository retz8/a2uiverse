import {defineConfig, devices} from '@playwright/test';
import {
  AGENT_CARD,
  AGENT_STATE,
  CLIENT_PORT,
  MARKETPLACE,
  MARKETPLACE_PORT,
  MARKETPLACE_STATE,
  ORCHESTRATOR,
  ORCHESTRATOR_PORT,
  PUBLISHER_FILE,
  SCRATCH,
  SHOP_B_CARD,
  STATE_DIR,
} from './e2e-live/stack';

/**
 * The e2e suite on the real stack on `localhost` (task-12.12 decision 8), beside the replay suite
 * (`playwright.config.ts`), one stack for every story (task-14.10 decision 11): a marketplace and an
 * orchestrator of the suite's own on scratch state, the marketplace on a port of its own (decision
 * 4); the launcher under `--publish` publishing GitHub, Gmail and Shop A as the dev publisher, kept in a
 * scratch file, and installing both from that marketplace; Shop B started by a second launcher,
 * neither published nor installed — the app the publisher claimed on the page publishes (decision
 * 3); and the client pointed at that orchestrator. Each scratch folder is wiped at the start but
 * the two model caches. The Planner runs live — the orchestrator's `.env` brings its key. On demand
 * only, outside `pnpm verify`; the apps' roster ports must be free. The agents keep their sign-in
 * stores in a scratch folder too, never the checkout's own (task-12.13 decision 55).
 */
const LAUNCHER = 'node ../../scripts/dev-agents.mjs --mode deterministic';

export default defineConfig({
  testDir: './e2e-live',
  // One stack, one orchestrator's session: the tests run in turn, each leaving it as it found it.
  workers: 1,
  timeout: 300_000,
  use: {baseURL: `http://localhost:${CLIENT_PORT}`, timezoneId: 'UTC'},
  projects: [
    {name: 'chromium', use: {...devices['Desktop Chrome'], viewport: {width: 1280, height: 900}}},
  ],
  // Started in order, each once the one before it answers.
  webServer: [
    {
      command: `pnpm exec tsx e2e-live/fresh-state.ts ${SCRATCH} && pnpm --filter @a2uiverse/marketplace dev`,
      url: `${MARKETPLACE}/index.json`,
      env: {PORT: String(MARKETPLACE_PORT), STATE_DIR: MARKETPLACE_STATE},
      reuseExistingServer: false,
      timeout: 180_000,
    },
    {
      command: 'pnpm --filter @a2uiverse/orchestrator dev',
      url: `${ORCHESTRATOR}/.well-known/agent-card.json`,
      env: {
        PORT: String(ORCHESTRATOR_PORT),
        BASE_URL: ORCHESTRATOR,
        STATE_DIR,
        MARKETPLACE_URL: MARKETPLACE,
      },
      reuseExistingServer: false,
      timeout: 180_000,
    },
    {
      // Publishes and installs the three once the orchestrator and the marketplace answer.
      command: `${LAUNCHER} --tier default,mocks --only github,gmail,shop-a --publish --publisher-file ${PUBLISHER_FILE} --agent-state ${AGENT_STATE}`,
      url: AGENT_CARD,
      env: {
        ORCHESTRATOR_URL: ORCHESTRATOR,
        STATE_DIR,
        MARKETPLACE_URL: MARKETPLACE,
        A2UIVERSE_PUBLIC_URL: '',
      },
      reuseExistingServer: false,
      timeout: 300_000,
    },
    {
      command: `${LAUNCHER} --tier mocks --only shop-b --no-install --agent-state ${AGENT_STATE}`,
      url: SHOP_B_CARD,
      env: {A2UIVERSE_PUBLIC_URL: ''},
      reuseExistingServer: false,
      timeout: 300_000,
    },
    {
      command: `pnpm exec vite --port ${CLIENT_PORT} --strictPort`,
      url: `http://localhost:${CLIENT_PORT}`,
      env: {VITE_ORCHESTRATOR_URL: ORCHESTRATOR},
      reuseExistingServer: false,
      timeout: 120_000,
    },
  ],
});
