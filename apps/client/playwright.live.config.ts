import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {defineConfig, devices} from '@playwright/test';
import {AGENT_CARD, CLIENT_PORT, ORCHESTRATOR, ORCHESTRATOR_PORT} from './e2e-live/stack';

/**
 * The e2e suite on the real stack on `localhost` (task-12.12 decision 8), beside the replay suite
 * (`playwright.config.ts`): an orchestrator on a scratch state directory, one deterministic agent
 * on the kit's sign-in from the sibling `a2uiverse-apps` checkout started and installed by the
 * launcher, and the client pointed at that orchestrator. The Planner runs live — the orchestrator's
 * `.env` brings its key. On demand only, outside `pnpm verify`; the agent's roster port must be
 * free. The agent keeps its sign-in store in a scratch folder too, never the checkout's own
 * (task-12.13 decision 55).
 */
const STATE_DIR = join(tmpdir(), 'a2uiverse-e2e-live-state');
const AGENT_STATE = join(tmpdir(), 'a2uiverse-e2e-live-agents');

export default defineConfig({
  testDir: './e2e-live',
  // One stack, one orchestrator's session: the tests run in turn.
  workers: 1,
  timeout: 240_000,
  use: {baseURL: `http://localhost:${CLIENT_PORT}`, timezoneId: 'UTC'},
  projects: [
    {name: 'chromium', use: {...devices['Desktop Chrome'], viewport: {width: 1280, height: 900}}},
  ],
  webServer: [
    {
      command: `rm -rf ${STATE_DIR} && pnpm --filter @a2uiverse/orchestrator dev`,
      url: `${ORCHESTRATOR}/.well-known/agent-card.json`,
      env: {PORT: String(ORCHESTRATOR_PORT), BASE_URL: ORCHESTRATOR, STATE_DIR},
      reuseExistingServer: false,
      timeout: 180_000,
    },
    {
      // Installs the app into the orchestrator above once both answer; every address on localhost.
      command: `rm -rf ${AGENT_STATE} && node ../../scripts/dev-agents.mjs --only github --mode deterministic --agent-state ${AGENT_STATE}`,
      url: AGENT_CARD,
      env: {ORCHESTRATOR_URL: ORCHESTRATOR, STATE_DIR, A2UIVERSE_PUBLIC_URL: ''},
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
